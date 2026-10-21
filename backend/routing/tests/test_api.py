import random
import uuid
from datetime import timedelta
from unittest.mock import patch

from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from routing.models import RouteCheckpoint, RouteJob, RouteOption
from routing.providers.errors import ProviderError
from routing.tasks import process_route_job


ORIGIN = {
    'label': 'New York, USA',
    'latitude': 40.7128,
    'longitude': -74.006,
    'country_code': 'USA',
    'timezone': 'America/New_York',
}
DESTINATION = {
    'label': 'Los Angeles, USA',
    'latitude': 34.0522,
    'longitude': -118.2437,
    'country_code': 'USA',
    'timezone': 'America/Los_Angeles',
}


def job_kwargs(**overrides):
    values = {
        'origin': ORIGIN['label'],
        'destination': DESTINATION['label'],
        'origin_latitude': ORIGIN['latitude'],
        'origin_longitude': ORIGIN['longitude'],
        'origin_country_code': ORIGIN['country_code'],
        'origin_timezone': ORIGIN['timezone'],
        'destination_latitude': DESTINATION['latitude'],
        'destination_longitude': DESTINATION['longitude'],
        'destination_country_code': DESTINATION['country_code'],
        'destination_timezone': DESTINATION['timezone'],
        'departure_time': timezone.now() + timedelta(days=1),
        'load_weight': 1000.0,
        'status': 'PENDING',
    }
    values.update(overrides)
    return values


@override_settings(ROUTING_PROVIDER='mock', WEATHER_PROVIDER='mock')
class RouteApiTests(APITestCase):
    def setUp(self):
        self.trigger_url = reverse('route-trigger')
        departure = timezone.now() + timedelta(days=1)
        self.valid_payload = {
            'origin': ORIGIN,
            'destination': DESTINATION,
            'departure_date': departure.date().isoformat(),
            'departure_time': departure.strftime('%H:%M'),
            'load_weight': 42000.0,
            'load_weight_unit': 'lb',
            'unit_system': 'imperial',
        }

    def test_route_trigger_valid(self):
        response = self.client.post(self.trigger_url, self.valid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(RouteJob.objects.count(), 1)
        job = RouteJob.objects.first()
        self.assertEqual(job.origin, 'New York, USA')
        self.assertEqual(job.origin_latitude, ORIGIN['latitude'])
        self.assertEqual(job.origin_timezone, 'America/New_York')
        self.assertEqual(job.unit_system, 'imperial')

    def test_route_trigger_converts_kilograms_to_pounds(self):
        payload = dict(self.valid_payload)
        payload['load_weight'] = 1000.0
        payload['load_weight_unit'] = 'kg'

        response = self.client.post(self.trigger_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertAlmostEqual(
            RouteJob.objects.first().load_weight, 2204.6226218, places=4
        )

    @patch(
        'routing.tasks.get_routing_provider',
        side_effect=ProviderError('Routing service is unavailable.'),
    )
    def test_route_trigger_surfaces_provider_failure_as_failed_job(self, _factory):
        response = self.client.post(self.trigger_url, self.valid_payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['status'], 'FAILED')
        self.assertEqual(
            response.data['error_message'], 'Routing service is unavailable.'
        )

    def test_route_trigger_invalid(self):
        invalid_payload = {'origin': 'New York'}  # Missing fields
        response = self.client.post(self.trigger_url, invalid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_route_trigger_rejects_past_departure(self):
        payload = dict(self.valid_payload)
        past = timezone.now() - timedelta(days=2)
        payload['departure_date'] = past.date().isoformat()
        payload['departure_time'] = past.strftime('%H:%M')

        response = self.client.post(self.trigger_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_route_trigger_rejects_departure_beyond_horizon(self):
        payload = dict(self.valid_payload)
        future = timezone.now() + timedelta(days=20)
        payload['departure_date'] = future.date().isoformat()
        payload['departure_time'] = future.strftime('%H:%M')

        response = self.client.post(self.trigger_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_route_status_existing(self):
        job = RouteJob.objects.create(**job_kwargs())
        url = reverse('route-status', kwargs={'id': job.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'PENDING')
        self.assertEqual(response.data['origin']['label'], ORIGIN['label'])

    def test_route_status_not_found(self):
        url = reverse('route-status', kwargs={'id': uuid.uuid4()})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_route_status_completed(self):
        job = RouteJob.objects.create(**job_kwargs(status='COMPLETED'))
        url = reverse('route-status', kwargs={'id': job.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('result', response.data)
        self.assertEqual(response.data['status'], 'COMPLETED')

    def test_route_status_completed_returns_structured_routes(self):
        job = RouteJob.objects.create(
            **job_kwargs(status='COMPLETED', recommended_route_id='route-1')
        )
        route = RouteOption.objects.create(
            job=job,
            route_id='route-1',
            label='Fastest',
            polyline='mock_polyline_0',
            total_distance=1000.0,
            total_time=36000.0,
            risk_miles={"Low": 5, "High": 2},
            total_risk_score=2.0,
        )
        RouteCheckpoint.objects.create(
            job=job,
            route=route,
            latitude=40.7,
            longitude=-74.0,
            estimated_arrival=timezone.now(),
            weather_data={"wind": 10, "rain": 0.1, "snow": 0},
            risk_level='High',
            mile_marker=12.5,
        )

        url = reverse('route-status', kwargs={'id': job.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        result = response.data['result']
        self.assertEqual(result['job_id'], str(job.id))
        self.assertEqual(result['recommended_route_id'], 'route-1')
        self.assertEqual(result['origin']['label'], ORIGIN['label'])
        self.assertEqual(result['destination']['label'], DESTINATION['label'])
        self.assertEqual(result['unit_system'], 'imperial')
        self.assertEqual(len(result['routes']), 1)

        serialized_route = result['routes'][0]
        self.assertEqual(serialized_route['route_id'], 'route-1')
        self.assertEqual(serialized_route['label'], 'Fastest')
        self.assertEqual(serialized_route['polyline'], 'mock_polyline_0')
        self.assertEqual(serialized_route['total_distance'], 1000.0)
        self.assertEqual(serialized_route['risk_miles'], {"Low": 5, "High": 2})
        self.assertEqual(len(serialized_route['checkpoints']), 1)

        cp = serialized_route['checkpoints'][0]
        self.assertEqual(cp['latitude'], 40.7)
        self.assertEqual(cp['longitude'], -74.0)
        self.assertEqual(cp['risk_level'], 'High')
        self.assertEqual(cp['mile_marker'], 12.5)

    def test_route_status_not_completed_omits_result(self):
        job = RouteJob.objects.create(**job_kwargs(status='PROCESSING'))
        url = reverse('route-status', kwargs={'id': job.id})
        response = self.client.get(url)
        self.assertNotIn('result', response.data)


@override_settings(ROUTING_PROVIDER='mock', WEATHER_PROVIDER='mock')
class ProcessRouteJobTests(APITestCase):
    def test_pipeline_persists_routes_and_links_checkpoints(self):
        job = RouteJob.objects.create(**job_kwargs())

        # Run the pipeline synchronously (mock providers, no broker).
        process_route_job(job.id)
        job.refresh_from_db()

        self.assertEqual(job.status, 'COMPLETED')
        self.assertEqual(job.error_message, '')

        route_options = list(job.route_options.all())
        self.assertEqual(len(route_options), 3)
        self.assertEqual(
            sorted(route.label for route in route_options),
            ['Avoids highways', 'Fastest', 'Shortest'],
        )

        # Every route has a polyline, a distance, and linked checkpoints.
        for route in route_options:
            self.assertTrue(route.polyline)
            self.assertGreater(route.total_distance, 0)
            self.assertGreater(route.checkpoints.count(), 0)

        # Every checkpoint is linked to one of the job's routes.
        self.assertEqual(
            job.checkpoints.exclude(route__isnull=True).count(),
            job.checkpoints.count(),
        )

        # Mile markers actually progress along the route (not all zero).
        first_route = route_options[0]
        markers = list(
            first_route.checkpoints.values_list('mile_marker', flat=True)
        )
        self.assertGreater(len(markers), 1)
        self.assertNotEqual(markers, [0.0] * len(markers))

        # The recommended route points at a persisted route option.
        persisted_ids = {r.route_id for r in route_options}
        self.assertIn(job.recommended_route_id, persisted_ids)

    def test_pipeline_supplies_average_risk_to_recommendation(self):
        job = RouteJob.objects.create(
            **job_kwargs(origin='Chicago', destination='Denver')
        )

        with patch(
            'routing.tasks.engine.recommend_best_route',
            side_effect=lambda candidates: candidates[0],
        ) as recommend:
            process_route_job(job.id)

        candidates = recommend.call_args.args[0]
        self.assertEqual(len(candidates), 3)
        for candidate in candidates:
            persisted = RouteOption.objects.get(
                job=job, route_id=candidate['route_id']
            )
            self.assertAlmostEqual(
                candidate['avg_risk'],
                persisted.total_risk_score / persisted.total_distance,
                places=12,
            )

    def test_pipeline_uses_departure_time_for_first_checkpoint(self):
        departure = timezone.now() - timezone.timedelta(days=3)
        job = RouteJob.objects.create(
            **job_kwargs(
                origin='Chicago',
                destination='Denver',
                departure_time=departure,
            )
        )

        process_route_job(job.id)

        first_checkpoint = job.checkpoints.order_by('mile_marker').first()
        self.assertLess(
            abs((first_checkpoint.estimated_arrival - departure).total_seconds()),
            1,
        )

    def test_pipeline_is_idempotent_across_reruns(self):
        job = RouteJob.objects.create(
            **job_kwargs(origin='Chicago', destination='Denver')
        )

        random.seed(1234)
        process_route_job(job.id)
        job.refresh_from_db()
        first_routes = job.route_options.count()
        first_checkpoints = job.checkpoints.count()
        self.assertEqual(first_routes, 3)
        self.assertGreater(first_checkpoints, 0)

        # Re-running must clear and recreate — never duplicate or trip unique_together.
        job.status = 'PENDING'
        job.save()
        random.seed(1234)
        process_route_job(job.id)
        job.refresh_from_db()

        self.assertEqual(job.status, 'COMPLETED')
        self.assertEqual(job.route_options.count(), first_routes)
        self.assertEqual(job.checkpoints.count(), first_checkpoints)

    def test_risk_miles_sum_to_total_distance(self):
        job = RouteJob.objects.create(
            **job_kwargs(origin='Boston', destination='Miami')
        )
        process_route_job(job.id)

        for route in job.route_options.all():
            self.assertAlmostEqual(
                sum(route.risk_miles.values()),
                route.total_distance,
                places=3,
            )

    def test_checkpoints_ordered_by_mile_marker(self):
        job = RouteJob.objects.create(
            **job_kwargs(origin='Seattle', destination='Austin')
        )
        process_route_job(job.id)

        route = job.route_options.first()
        markers = list(route.checkpoints.values_list('mile_marker', flat=True))
        self.assertEqual(markers, sorted(markers))

    def test_provider_failure_marks_job_failed_with_message(self):
        job = RouteJob.objects.create(**job_kwargs())

        with patch(
            'routing.tasks.get_routing_provider',
            side_effect=ProviderError('Routing service is unavailable.'),
        ):
            with self.assertRaises(ProviderError):
                process_route_job(job.id)

        job.refresh_from_db()
        self.assertEqual(job.status, 'FAILED')
        self.assertEqual(job.error_message, 'Routing service is unavailable.')


class HealthCheckTests(APITestCase):
    def test_health_check_reports_ok(self):
        response = self.client.get(reverse('health'))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {'status': 'ok'})
