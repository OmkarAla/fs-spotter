from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from routing.models import RouteJob, RouteOption, RouteCheckpoint
from routing.tasks import process_route_job
from django.utils import timezone
import random
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

    def test_route_status_completed_returns_structured_routes(self):
        job = RouteJob.objects.create(
            origin="New York",
            destination="Los Angeles",
            departure_time=timezone.now(),
            load_weight=1000.0,
            status='COMPLETED',
            recommended_route_id='route-1',
        )
        route = RouteOption.objects.create(
            job=job,
            route_id='route-1',
            polyline='mock_polyline_0',
            total_distance=1000.0,
            total_time=36000.0,
            risk_miles={"Low": 5, "High": 2},
            total_risk_score=2.0,
        )
        RouteCheckpoint.objects.create(
            job=job,
            route=route,
            latitude=40.7,
            longitude=-74.0,
            estimated_arrival=timezone.now(),
            weather_data={"wind": 10, "rain": 0.1, "snow": 0},
            risk_level='High',
            mile_marker=12.5,
        )

        url = reverse('route-status', kwargs={'id': job.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        result = response.data['result']
        self.assertEqual(result['job_id'], str(job.id))
        self.assertEqual(result['recommended_route_id'], 'route-1')
        self.assertEqual(len(result['routes']), 1)

        serialized_route = result['routes'][0]
        self.assertEqual(serialized_route['route_id'], 'route-1')
        self.assertEqual(serialized_route['polyline'], 'mock_polyline_0')
        self.assertEqual(serialized_route['total_distance'], 1000.0)
        self.assertEqual(serialized_route['risk_miles'], {"Low": 5, "High": 2})
        self.assertEqual(len(serialized_route['checkpoints']), 1)

        cp = serialized_route['checkpoints'][0]
        self.assertEqual(cp['latitude'], 40.7)
        self.assertEqual(cp['longitude'], -74.0)
        self.assertEqual(cp['risk_level'], 'High')
        self.assertEqual(cp['mile_marker'], 12.5)

    def test_route_status_not_completed_omits_result(self):
        job = RouteJob.objects.create(
            origin="New York",
            destination="Los Angeles",
            departure_time=timezone.now(),
            load_weight=1000.0,
            status='PROCESSING'
        )
        url = reverse('route-status', kwargs={'id': job.id})
        response = self.client.get(url)
        self.assertNotIn('result', response.data)


class ProcessRouteJobTests(APITestCase):
    def test_pipeline_persists_routes_and_links_checkpoints(self):
        job = RouteJob.objects.create(
            origin="New York",
            destination="Los Angeles",
            departure_time=timezone.now(),
            load_weight=1000.0,
            status='PENDING',
        )

        # Run the pipeline synchronously (mock routing/weather clients, no broker).
        process_route_job(job.id)
        job.refresh_from_db()

        self.assertEqual(job.status, 'COMPLETED')

        route_options = list(job.route_options.all())
        self.assertEqual(len(route_options), 3)

        # Every route has a polyline, a distance, and linked checkpoints.
        for route in route_options:
            self.assertTrue(route.polyline)
            self.assertGreater(route.total_distance, 0)
            self.assertGreater(route.checkpoints.count(), 0)

        # Every checkpoint is linked to one of the job's routes.
        self.assertEqual(
            job.checkpoints.exclude(route__isnull=True).count(),
            job.checkpoints.count(),
        )

        # Mile markers actually progress along the route (not all zero).
        first_route = route_options[0]
        markers = list(
            first_route.checkpoints.values_list('mile_marker', flat=True)
        )
        self.assertGreater(len(markers), 1)
        self.assertNotEqual(markers, [0.0] * len(markers))

        # The recommended route points at a persisted route option.
        persisted_ids = {r.route_id for r in route_options}
        self.assertIn(job.recommended_route_id, persisted_ids)

    def test_pipeline_is_idempotent_across_reruns(self):
        job = RouteJob.objects.create(
            origin="Chicago",
            destination="Denver",
            departure_time=timezone.now(),
            load_weight=5000.0,
            status='PENDING',
        )

        # Deterministic mock routes: identical seed → both runs draw the same data,
        # so any difference in counts is real duplication (a failure), not randomness.
        random.seed(1234)
        process_route_job(job.id)
        job.refresh_from_db()
        first_routes = job.route_options.count()
        first_checkpoints = job.checkpoints.count()
        self.assertEqual(first_routes, 3)
        self.assertGreater(first_checkpoints, 0)

        # Re-running must clear and recreate — never duplicate or trip unique_together.
        job.status = 'PENDING'
        job.save()
        random.seed(1234)
        process_route_job(job.id)
        job.refresh_from_db()

        self.assertEqual(job.status, 'COMPLETED')
        self.assertEqual(job.route_options.count(), first_routes)
        self.assertEqual(job.checkpoints.count(), first_checkpoints)

    def test_risk_miles_sum_to_total_distance(self):
        job = RouteJob.objects.create(
            origin="Boston",
            destination="Miami",
            departure_time=timezone.now(),
            load_weight=20000.0,
            status='PENDING',
        )
        process_route_job(job.id)

        for route in job.route_options.all():
            self.assertAlmostEqual(
                sum(route.risk_miles.values()),
                route.total_distance,
                places=3,
            )

    def test_checkpoints_ordered_by_mile_marker(self):
        job = RouteJob.objects.create(
            origin="Seattle",
            destination="Austin",
            departure_time=timezone.now(),
            load_weight=8000.0,
            status='PENDING',
        )
        process_route_job(job.id)

        route = job.route_options.first()
        markers = list(route.checkpoints.values_list('mile_marker', flat=True))
        self.assertEqual(markers, sorted(markers))
