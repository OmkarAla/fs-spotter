import logging
from datetime import timedelta

from celery import shared_task
from django.db import transaction

from . import engine
from .geometry import decode_polyline
from .models import RouteCheckpoint, RouteJob, RouteOption
from .providers import get_routing_provider, get_weather_provider
from .providers.errors import ProviderError
from .providers.types import Location
from .sampling import sample_route

logger = logging.getLogger(__name__)


@shared_task
def process_route_job(job_id):
    logger.info(f"Starting processing for job {job_id}")

    try:
        with transaction.atomic():
            job = RouteJob.objects.select_for_update().get(id=job_id)
            job.status = 'PROCESSING'
            job.error_message = ''
            job.save(update_fields=['status', 'error_message'])
            # Clear previous results for idempotency. Checkpoints reference
            # route options, so they must be deleted first.
            RouteCheckpoint.objects.filter(job=job).delete()
            RouteOption.objects.filter(job=job).delete()

        origin = Location(
            job.origin,
            job.origin_latitude,
            job.origin_longitude,
            job.origin_country_code,
            job.origin_timezone,
        )
        destination = Location(
            job.destination,
            job.destination_latitude,
            job.destination_longitude,
            job.destination_country_code,
            job.destination_timezone,
        )

        routing_provider = get_routing_provider()
        weather_provider = get_weather_provider()

        # Phase 2: Route Acquisition
        logger.info(f"Fetching routes for job {job_id}...")
        routes = routing_provider.get_routes(
            origin, destination, job.load_weight
        )

        # Phase 3: Weather Analysis — compute in memory; persist later.
        route_plans = []
        all_route_risks = []

        for route in routes:
            route_id = route.route_id
            logger.info(f"Calculating risk for route {route_id}...")

            points = decode_polyline(route.polyline)
            grid = weather_provider.build_grid(
                points,
                job.departure_time,
                job.departure_time + timedelta(seconds=route.total_time),
            )
            sampled = sample_route(
                route,
                job.departure_time,
                grid,
                job.load_weight,
            )
            total_risk_score = sampled['total_risk_score']

            route_plans.append({
                'route_id': route_id,
                'label': route.label,
                'polyline': route.polyline,
                'total_distance': route.total_distance,
                'total_time': route.total_time,
                'risk_miles': sampled['risk_miles'],
                'total_risk_score': total_risk_score,
                'checkpoints': sampled['checkpoints'],
            })

            all_route_risks.append({
                'route_id': route_id,
                'miles': sampled['risk_miles'],
                'avg_risk': (
                    total_risk_score / route.total_distance
                    if route.total_distance
                    else 0.0
                ),
                'time': route.total_time,
            })

        # Phase 4: Recommendation (in-memory)
        logger.info(f"Recommending best route for job {job_id}...")
        best_route_data = engine.recommend_best_route(all_route_risks)

        # Phase 5: Persist route options + checkpoints, then finalize — atomically.
        with transaction.atomic():
            all_checkpoint_objs = []
            for plan in route_plans:
                route_option = RouteOption.objects.create(
                    job=job,
                    route_id=plan['route_id'],
                    label=plan['label'],
                    polyline=plan['polyline'],
                    total_distance=plan['total_distance'],
                    total_time=plan['total_time'],
                    risk_miles=plan['risk_miles'],
                    total_risk_score=plan['total_risk_score'],
                )
                for cp in plan['checkpoints']:
                    all_checkpoint_objs.append(RouteCheckpoint(
                        job=job,
                        route=route_option,
                        latitude=cp['latitude'],
                        longitude=cp['longitude'],
                        estimated_arrival=cp['estimated_arrival'],
                        weather_data=cp['weather_data'],
                        risk_level=cp['risk_level'],
                        mile_marker=cp['mile_marker'],
                    ))

            RouteCheckpoint.objects.bulk_create(all_checkpoint_objs)

            job = RouteJob.objects.select_for_update().get(id=job_id)
            job.status = 'COMPLETED'
            job.recommended_route_id = best_route_data['route_id']
            job.save()

        logger.info(
            f"Successfully completed job {job_id}. Recommended route: {job.recommended_route_id}"
        )

    except ProviderError as exc:
        logger.error(f'Provider failure for job {job_id}: {exc}')
        try:
            RouteJob.objects.filter(id=job_id).update(
                status='FAILED', error_message=str(exc)
            )
        except Exception as db_err:
            logger.critical(
                f"Critical DB failure while updating job {job_id} to FAILED: {db_err}"
            )
        raise

    except Exception as e:
        logger.error(f"Error processing job {job_id}: {str(e)}")
        try:
            RouteJob.objects.filter(id=job_id).update(
                status='FAILED', error_message=str(e)
            )
        except Exception as db_err:
            logger.critical(f"Critical DB failure while updating job {job_id} to FAILED: {str(db_err)}")
        raise e
