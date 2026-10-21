import uuid
from django.db import models


class RouteJob(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]
    UNIT_CHOICES = [
        ('imperial', 'Imperial'),
        ('metric', 'Metric'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    origin = models.CharField(max_length=512)
    destination = models.CharField(max_length=512)
    origin_latitude = models.FloatField(null=True, blank=True)
    origin_longitude = models.FloatField(null=True, blank=True)
    origin_country_code = models.CharField(max_length=3, blank=True, default='')
    origin_timezone = models.CharField(max_length=64, blank=True, default='UTC')
    destination_latitude = models.FloatField(null=True, blank=True)
    destination_longitude = models.FloatField(null=True, blank=True)
    destination_country_code = models.CharField(max_length=3, blank=True, default='')
    destination_timezone = models.CharField(max_length=64, blank=True, default='UTC')
    departure_time = models.DateTimeField()
    load_weight = models.FloatField()
    unit_system = models.CharField(max_length=10, choices=UNIT_CHOICES, default='imperial')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    error_message = models.TextField(blank=True, default='')
    recommended_route_id = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def origin_location(self):
        return {
            'label': self.origin,
            'latitude': self.origin_latitude,
            'longitude': self.origin_longitude,
            'country_code': self.origin_country_code,
            'timezone': self.origin_timezone,
        }

    @property
    def destination_location(self):
        return {
            'label': self.destination,
            'latitude': self.destination_latitude,
            'longitude': self.destination_longitude,
            'country_code': self.destination_country_code,
            'timezone': self.destination_timezone,
        }

    def __str__(self):
        return f"RouteJob {self.id} - {self.origin} to {self.destination}"


class RouteOption(models.Model):
    job = models.ForeignKey(RouteJob, on_delete=models.CASCADE, related_name='route_options')
    route_id = models.CharField(max_length=255)
    label = models.CharField(max_length=100, blank=True, default='')
    polyline = models.TextField(blank=True, default='')
    total_distance = models.FloatField(default=0.0)
    total_time = models.FloatField(default=0.0)
    risk_miles = models.JSONField(default=dict)
    total_risk_score = models.FloatField(default=0.0)

    class Meta:
        unique_together = ('job', 'route_id')

    def __str__(self):
        return f"RouteOption {self.route_id} for job {self.job_id}"


class RouteCheckpoint(models.Model):
    RISK_CHOICES = [
        ('Low', 'Low'),
        ('Moderate', 'Moderate'),
        ('High', 'High'),
        ('Severe', 'Severe'),
        ('No Travel', 'No Travel'),
    ]

    job = models.ForeignKey(RouteJob, on_delete=models.CASCADE, related_name='checkpoints')
    route = models.ForeignKey(
        RouteOption,
        on_delete=models.CASCADE,
        related_name='checkpoints',
        null=True,
        blank=True,
    )
    latitude = models.FloatField()
    longitude = models.FloatField()
    estimated_arrival = models.DateTimeField()
    weather_data = models.JSONField()
    risk_level = models.CharField(max_length=20, choices=RISK_CHOICES)
    mile_marker = models.FloatField()

    class Meta:
        ordering = ['mile_marker']

    def __str__(self):
        return f"Checkpoint for {self.job.id} at mile {self.mile_marker}"
