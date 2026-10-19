from rest_framework import serializers

class CheckpointDetailSerializer(serializers.Serializer):
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    estimated_arrival = serializers.DateTimeField()
    weather_data = serializers.JSONField()
    risk_level = serializers.CharField()
    mile_marker = serializers.FloatField()

class RouteDetailSerializer(serializers.Serializer):
    route_id = serializers.UUIDField()
    checkpoints = CheckpointDetailSerializer(many=True)
    
    def get_polyline(self, obj):
        return ""
    
    def get_total_risk_score(self, obj):
        return 0

    polyline = serializers.SerializerMethodField()
    total_risk_score = serializers.SerializerMethodField()

class RouteResultSerializer(serializers.Serializer):
    job_id = serializers.UUIDField()
    routes = RouteDetailSerializer(many=True)
    recommended_route_id = serializers.UUIDField()

class RouteJobSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    status = serializers.CharField()
    created_at = serializers.DateTimeField()

class RouteRequestSerializer(serializers.Serializer):
    origin = serializers.CharField()
    destination = serializers.CharField()
    departure_time = serializers.DateTimeField()
    load_weight = serializers.FloatField()
