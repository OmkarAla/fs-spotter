import logging
from celery import shared_task
from django.db import transaction
from .models import RouteJob, RouteCheckpoint
from .clients import RoutingClient, WeatherClient
from . import engine

logger = logging.getLogger(__name__)

@shared_task
def process_route_job(job_id):
    logger.info(f"Starting processing for job {job_id}")
    
    try:
        # Phase 1: State Update
        job = RouteJob.objects.get(id=job_id)
        job.status = 'PROCESSING'
        job.save()
        
        routing_client = RoutingClient()
        weather_client = WeatherClient()
        
        # Phase 2: Route Acquisition
        logger.info(f"Fetching routes for job {job_id}...")
        routes = routing_client.get_routes(job.origin, job.destination)
        
        all_route_risks = []
        
        # Phase 3: Weather Analysis
        for route in routes:
            route_id = route['route_id']
            logger.info(f"Calculating risk for route {route_id}...")
            
            route_risk_summary = {"route_id": route_id, "miles": {}}
            
            for cp in route['checkpoints']:
                weather = weather_client.get_weather(
                    cp['lat'], 
                    cp['lon'], 
                    cp['estimated_arrival_time']
                )
                
                risk_level = engine.calculate_checkpoint_risk(weather, job.load_weight)
                
                # Save checkpoint to DB
                RouteCheckpoint.objects.create(
                    job=job,
                    latitude=cp['lat'],
                    longitude=cp['lon'],
                    estimated_arrival=cp['estimated_arrival_time'],
                    weather_data=weather,
                    risk_level=risk_level,
                    mile_marker=0.0 # In a real scenario, this would come from the route data
                )
                
                # Track risk for recommendation engine
                route_risk_summary["miles"][risk_level] = route_risk_summary["miles"].get(risk_level, 0) + 1
            
            all_route_risks.append(route_risk_summary)
        
        # Phase 4: Recommendation
        logger.info(f"Recommending best route for job {job_id}...")
        best_route_data = engine.recommend_best_route(all_route_risks)
        
        # Phase 5: Finalize
        job.status = 'COMPLETED'
        job.recommended_route_id = best_route_data['route_id']
        job.save()
        
        logger.info(f"Successfully completed job {job_id}. Recommended route: {job.recommended_route_id}")
        
    except Exception as e:
        logger.error(f"Error processing job {job_id}: {str(e)}")
        try:
            RouteJob.objects.filter(id=job_id).update(status='FAILED')
        except:
            pass
        raise e
