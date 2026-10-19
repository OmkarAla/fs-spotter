from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import RouteJob
from .serializers import RouteRequestSerializer, RouteJobSerializer, RouteResultSerializer

class RouteTriggerView(APIView):
    def post(self, request):
        serializer = RouteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        job = RouteJob.objects.create(**serializer.validated_data)
        
        # Placeholder for Celery task trigger
        self._trigger_routing_task(job)
        
        return Response(RouteJobSerializer(job).data, status=status.HTTP_201_CREATED)

    def _trigger_routing_task(self, job):
        # This will be replaced by a Celery task in Phase 2
        pass

class RouteStatusView(APIView):
    def get(self, request, id):
        job = get_object_or_404(RouteJob, pk=id)
        data = RouteJobSerializer(job).data
        
        if job.status == 'COMPLETED':
            # In a real scenario, we would fetch the actual result associated with the job
            # For now, we return a placeholder result as the RouteResultSerializer requires a result object
            # This part will be integrated with the actual result storage in Phase 2/3
            data['result'] = "Route calculation completed. Results available in result store."
            
        return Response(data)
