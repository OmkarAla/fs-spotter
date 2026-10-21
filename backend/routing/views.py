from django.core.cache import cache
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
from .providers import get_geocoding_provider
from .providers.errors import (
    ProviderError,
    ProviderNotConfigured,
    ProviderRateLimited,
)

class HealthView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        return Response({'status': 'ok'})


class GeocodeView(APIView):
    throttle_scope = 'geocode'
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        query = (request.query_params.get('q') or '').strip()
        if len(query) < 2:
            return Response({'results': []})
        if len(query) > 200:
            return Response(
                {'error': 'Search text must be 200 characters or fewer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            results = get_geocoding_provider().search(query)
        except ProviderNotConfigured:
            return Response(
                {'error': 'Location search is not configured.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except ProviderRateLimited:
            return Response(
                {'error': 'Location search is temporarily rate limited.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        except ProviderError:
            return Response(
                {'error': 'Location search is temporarily unavailable.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({'results': results})


class RouteTriggerView(APIView):
    throttle_scope = 'route-trigger'

    def post(self, request):
        serializer = RouteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        job = serializer.save()
        try:
            process_route_job.delay(job.id)
        except ProviderError:
            job.refresh_from_db()
        return Response(
            RouteJobSerializer(job).data,
            status=status.HTTP_201_CREATED,
        )


class RouteStatusView(APIView):
    def get(self, request, id):
        job = get_object_or_404(RouteJob, pk=id)
        data = RouteJobSerializer(job).data

        if job.status == 'COMPLETED':
            routes = job.route_options.prefetch_related('checkpoints').all()
            data['result'] = RouteResultSerializer({
                'job_id': job.id,
                'recommended_route_id': job.recommended_route_id,
                'origin': job.origin_location,
                'destination': job.destination_location,
                'departure_time': job.departure_time,
                'unit_system': job.unit_system,
                'routes': routes,
            }).data

        return Response(data)


class RouteForecastView(APIView):
    throttle_scope = 'forecast'

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

        cache_key = f'route-forecast:{job.id}:{forecast_hour}'
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        try:
            forecast = build_forecast(job, forecast_hour)
        except ProviderRateLimited:
            return Response(
                {'error': 'Weather service is temporarily rate limited.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        except ProviderError as exc:
            return Response(
                {'error': str(exc) or 'Weather service is temporarily unavailable.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        data = RouteForecastSerializer(forecast).data
        cache.set(cache_key, data, timeout=600)
        return Response(data)
