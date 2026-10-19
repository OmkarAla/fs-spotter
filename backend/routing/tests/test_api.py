from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from routing.models import RouteJob
from django.utils import timezone
import uuid

class RouteApiTests(APITestCase):
    def setUp(self):
        self.trigger_url = reverse('route-trigger')
        self.valid_payload = {
            "origin": "New York",
            "destination": "Los Angeles",
            "departure_time": timezone.now().isoformat(),
            "load_weight": 1500.0
        }

    def test_route_trigger_valid(self):
        response = self.client.post(self.trigger_url, self.valid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(RouteJob.objects.count(), 1)
        self.assertEqual(RouteJob.objects.first().origin, "New York")

    def test_route_trigger_invalid(self):
        invalid_payload = {"origin": "New York"} # Missing fields
        response = self.client.post(self.trigger_url, invalid_payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_route_status_existing(self):
        job = RouteJob.objects.create(
            origin="New York",
            destination="Los Angeles",
            departure_time=timezone.now(),
            load_weight=1000.0,
            status='PENDING'
        )
        url = reverse('route-status', kwargs={'id': job.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'PENDING')

    def test_route_status_not_found(self):
        url = reverse('route-status', kwargs={'id': uuid.uuid4()})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_route_status_completed(self):
        job = RouteJob.objects.create(
            origin="New York",
            destination="Los Angeles",
            departure_time=timezone.now(),
            load_weight=1000.0,
            status='COMPLETED'
        )
        url = reverse('route-status', kwargs={'id': job.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('result', response.data)
        self.assertEqual(response.data['status'], 'COMPLETED')
