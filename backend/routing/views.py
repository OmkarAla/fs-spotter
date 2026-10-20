from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import RouteJob
from .forecast import build_forecast
from .serializers import (
    RouteForecastSerializer,
    RouteJobSerializer,
    RouteRequestSerializer,
    RouteResultSerializer,
)
from .tasks import process_route_job

class RouteTriggerView(APIView):
    def post(self, request):
        serializer = RouteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        job = RouteJob.objects.create(**serializer.validated_data)
        
        # Trigger Celery task
        process_route_job.delay(job.id)
        
        return Response(RouteJobSerializer(job).data, status=status.HTTP_201_CREATED)
    
    def _trigger_routing_task(self, job):
        pass

class RouteStatusView(APIView):
    def get(self, request, id):
        job = get_object_or_404(RouteJob, pk=id)
        data = RouteJobSerializer(job).data

        if job.status == 'COMPLETED':
            routes = job.route_options.prefetch_related('checkpoints').all()
            data['result'] = RouteResultSerializer({
                'job_id': job.id,
                'recommended_route_id': job.recommended_route_id,
                'routes': routes,
            }).data

        return Response(data)


class RouteForecastView(APIView):
    def get(self, request, id):
        job = get_object_or_404(RouteJob, pk=id)
        raw_hour = request.query_params.get('hour', '0')

        try:
            forecast_hour = int(raw_hour)
        except (TypeError, ValueError):
            return Response(
                {'error': 'hour must be an integer between 0 and 48'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not 0 <= forecast_hour <= 48:
            return Response(
                {'error': 'hour must be an integer between 0 and 48'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if job.status != 'COMPLETED':
            return Response(
                {'error': 'forecast is available only after the job completes'},
                status=status.HTTP_409_CONFLICT,
            )

        forecast = build_forecast(job, forecast_hour)
        return Response(RouteForecastSerializer(forecast).data)
