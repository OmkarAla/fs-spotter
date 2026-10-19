import uuid
from django.db import models

class RouteJob(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    origin = models.CharField(max_length=255)
    destination = models.CharField(max_length=255)
    departure_time = models.DateTimeField()
    load_weight = models.FloatField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    recommended_route_id = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"RouteJob {self.id} - {self.origin} to {self.destination}"

class RouteCheckpoint(models.Model):
    RISK_CHOICES = [
        ('Low', 'Low'),
        ('Moderate', 'Moderate'),
        ('High', 'High'),
        ('Severe', 'Severe'),
        ('No Travel', 'No Travel'),
    ]

    job = models.ForeignKey(RouteJob, on_delete=models.CASCADE, related_name='checkpoints')
    latitude = models.FloatField()
    longitude = models.FloatField()
    estimated_arrival = models.DateTimeField()
    weather_data = models.JSONField()
    risk_level = models.CharField(max_length=20, choices=RISK_CHOICES)
    mile_marker = models.FloatField()

    def __str__(self):
        return f"Checkpoint for {self.job.id} at mile {self.mile_marker}"
