from rest_framework import serializers

from .models import RouteCheckpoint, RouteOption


class CheckpointDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = RouteCheckpoint
        fields = [
            'latitude',
            'longitude',
            'estimated_arrival',
            'weather_data',
            'risk_level',
            'mile_marker',
        ]


class RouteDetailSerializer(serializers.ModelSerializer):
    checkpoints = CheckpointDetailSerializer(many=True, read_only=True)

    class Meta:
        model = RouteOption
        fields = [
            'route_id',
            'polyline',
            'total_distance',
            'total_time',
            'risk_miles',
            'total_risk_score',
            'checkpoints',
        ]


class RouteResultSerializer(serializers.Serializer):
    job_id = serializers.UUIDField()
    recommended_route_id = serializers.CharField(allow_null=True)
    routes = RouteDetailSerializer(many=True)


class RouteJobSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    status = serializers.CharField()
    created_at = serializers.DateTimeField()


class RouteRequestSerializer(serializers.Serializer):
    origin = serializers.CharField()
    destination = serializers.CharField()
    departure_time = serializers.DateTimeField()
    load_weight = serializers.FloatField()


class ForecastCheckpointSerializer(serializers.Serializer):
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    mile_marker = serializers.FloatField()
    weather_data = serializers.JSONField()
    risk_level = serializers.CharField()


class ForecastRouteSerializer(serializers.Serializer):
    route_id = serializers.CharField()
    risk_miles = serializers.JSONField()
    total_risk_score = serializers.FloatField()
    checkpoints = ForecastCheckpointSerializer(many=True)


class RouteForecastSerializer(serializers.Serializer):
    job_id = serializers.UUIDField()
    forecast_hour = serializers.IntegerField()
    forecast_time = serializers.DateTimeField()
    routes = ForecastRouteSerializer(many=True)
