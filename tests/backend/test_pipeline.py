from django.test import TestCase
from django.utils import timezone
from unittest.mock import patch, MagicMock
from routing.models import RouteJob, RouteCheckpoint
from routing.tasks import process_route_job
from routing.engine import calculate_checkpoint_risk

class PipelineIntegrationTest(TestCase):
    def setUp(self):
        self.job = RouteJob.objects.create(
            origin="Chicago",
            destination="Los Angeles",
            departure_time=timezone.now(),
            load_weight=45000,
            status='PENDING'
        )

    @patch('routing.tasks.RoutingClient')
    @patch('routing.tasks.WeatherClient')
    def test_end_to_end_routing_flow(self, MockWeatherClient, MockRoutingClient):
        # Setup Mock RoutingClient
        mock_routing = MockRoutingClient.return_value
        mock_routes = [
            {
                "route_id": "route-1",
                "checkpoints": [
                    {"lat": 10.0, "lon": 20.0, "estimated_arrival_time": "2026-10-19T10:00:00Z"},
                    {"lat": 11.0, "lon": 21.0, "estimated_arrival_time": "2026-10-19T12:00:00Z"},
                ]
            },
            {
                "route_id": "route-2",
                "checkpoints": [
                    {"lat": 30.0, "lon": 40.0, "estimated_arrival_time": "2026-10-19T10:00:00Z"},
                    {"lat": 31.0, "lon": 41.0, "estimated_arrival_time": "2026-10-19T12:00:00Z"},
                ]
            },
            {
                "route_id": "route-3",
                "checkpoints": [
                    {"lat": 50.0, "lon": 60.0, "estimated_arrival_time": "2026-10-19T10:00:00Z"},
                    {"lat": 51.0, "lon": 61.0, "estimated_arrival_time": "2026-10-19T12:00:00Z"},
                ]
            }
        ]
        mock_routing.get_routes.return_value = mock_routes

        # Setup Mock WeatherClient
        # Route 1: High risk (Wind 60 -> Severe)
        # Route 2: Moderate risk (Wind 30 -> Moderate)
        # Route 3: Low risk (Wind 10 -> Low)
        mock_weather = MockWeatherClient.return_value
        
        def weather_side_effect(lat, lon, time):
            if lat < 20: return {"wind": 10, "rain": 0, "snow": 0}
            if lat < 40: return {"wind": 30, "rain": 0, "snow": 0}
            return {"wind": 60, "rain": 0, "snow": 0}

        mock_weather.get_weather.side_effect = weather_side_effect

        # Execute pipeline
        process_route_job(self.job.id)

        # 1. Verify job status
        self.job.refresh_from_db()
        self.assertEqual(self.job.status, 'COMPLETED')

        # 2. Verify Checkpoints created
        checkpoints = RouteCheckpoint.objects.filter(job=self.job)
        self.assertEqual(checkpoints.count(), 6) # 3 routes * 2 checkpoints

        # 3. Verify Recommended Route
        self.assertEqual(self.job.recommended_route_id, "route-1")

        # 4. Verify the recommended route is indeed the lowest risk using the engine logic
        # Route 1 checkpoints should be 'Low'
        route1_cps = checkpoints.filter(
            latitude__lt=20.0
        )
        for cp in route1_cps:
            self.assertEqual(cp.risk_level, 'Low')
