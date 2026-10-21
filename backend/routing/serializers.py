from datetime import datetime, timedelta, timezone as datetime_timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.utils import timezone as django_timezone
from rest_framework import serializers

from .models import RouteCheckpoint, RouteJob, RouteOption


class RouteLocationSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=512)
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    country_code = serializers.CharField(max_length=3, allow_blank=True)
    timezone = serializers.CharField(max_length=64)


class CheckpointDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = RouteCheckpoint
        fields = [
            'latitude', 'longitude', 'estimated_arrival', 'weather_data',
            'risk_level', 'mile_marker',
        ]


class RouteDetailSerializer(serializers.ModelSerializer):
    checkpoints = CheckpointDetailSerializer(many=True, read_only=True)

    class Meta:
        model = RouteOption
        fields = [
            'route_id', 'label', 'polyline', 'total_distance', 'total_time',
            'risk_miles', 'total_risk_score', 'checkpoints',
        ]


class RouteResultSerializer(serializers.Serializer):
    job_id = serializers.UUIDField()
    recommended_route_id = serializers.CharField(allow_null=True)
    origin = serializers.DictField()
    destination = serializers.DictField()
    departure_time = serializers.DateTimeField()
    unit_system = serializers.CharField()
    routes = RouteDetailSerializer(many=True)


class RouteJobSerializer(serializers.ModelSerializer):
    origin = serializers.SerializerMethodField()
    destination = serializers.SerializerMethodField()

    class Meta:
        model = RouteJob
        fields = [
            'id', 'status', 'created_at', 'error_message', 'origin',
            'destination', 'departure_time', 'unit_system',
        ]

    def get_origin(self, job):
        return job.origin_location

    def get_destination(self, job):
        return job.destination_location


class RouteRequestSerializer(serializers.Serializer):
    origin = RouteLocationSerializer()
    destination = RouteLocationSerializer()
    departure_date = serializers.DateField()
    departure_time = serializers.TimeField()
    load_weight = serializers.FloatField(min_value=0.1)
    load_weight_unit = serializers.ChoiceField(choices=['lb', 'kg'])
    unit_system = serializers.ChoiceField(choices=['imperial', 'metric'])

    def validate(self, attrs):
        try:
            timezone = ZoneInfo(attrs['origin']['timezone'])
        except (ZoneInfoNotFoundError, ValueError):
            raise serializers.ValidationError({
                'origin': {'timezone': 'Unknown IANA timezone.'}
            })

        departure = datetime.combine(
            attrs['departure_date'],
            attrs['departure_time'],
            tzinfo=timezone,
        ).astimezone(datetime_timezone.utc)
        now = django_timezone.now()

        if departure < now - timedelta(minutes=15):
            raise serializers.ValidationError({
                'departure_date': 'Departure cannot be in the past.'
            })
        if departure > now + timedelta(days=14):
            raise serializers.ValidationError({
                'departure_date': 'Departure must be within 14 days.'
            })

        attrs['departure_datetime'] = departure
        return attrs

    def create(self, validated_data):
        origin = validated_data.pop('origin')
        destination = validated_data.pop('destination')
        validated_data.pop('departure_date')
        validated_data.pop('departure_time')
        departure = validated_data.pop('departure_datetime')
        load_weight = validated_data.pop('load_weight')
        unit = validated_data.pop('load_weight_unit')
        unit_system = validated_data['unit_system']
        load_weight_lb = (
            load_weight * 2.2046226218 if unit == 'kg' else load_weight
        )

        return RouteJob.objects.create(
            origin=origin['label'],
            origin_latitude=origin['latitude'],
            origin_longitude=origin['longitude'],
            origin_country_code=origin['country_code'].upper(),
            origin_timezone=origin['timezone'],
            destination=destination['label'],
            destination_latitude=destination['latitude'],
            destination_longitude=destination['longitude'],
            destination_country_code=destination['country_code'].upper(),
            destination_timezone=destination['timezone'],
            departure_time=departure,
            load_weight=load_weight_lb,
            unit_system=unit_system,
        )


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
