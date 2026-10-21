from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from routing.engine import calculate_checkpoint_risk
from routing.forecast import build_forecast
from routing.models import RouteCheckpoint, RouteJob, RouteOption
from routing.providers.errors import ProviderError


@override_settings(WEATHER_PROVIDER='mock')
class RouteForecastTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.departure = datetime(2026, 10, 20, 8, tzinfo=timezone.utc)
        self.job = RouteJob.objects.create(
            origin="Chicago",
            destination="Denver",
            departure_time=self.departure,
            load_weight=45000,
            status="COMPLETED",
            recommended_route_id="route-1",
        )
        self.route = RouteOption.objects.create(
            job=self.job,
            route_id="route-1",
            polyline="mock",
            total_distance=200.0,
            total_time=12000.0,
            risk_miles={"Low": 200.0},
        )
        for latitude, mile_marker in ((41.0, 0.0), (40.0, 100.0), (39.0, 200.0)):
            RouteCheckpoint.objects.create(
                job=self.job,
                route=self.route,
                latitude=latitude,
                longitude=-100.0,
                estimated_arrival=self.departure + timedelta(hours=mile_marker / 60),
                weather_data={"wind": 10, "rain": 0, "snow": 0},
                risk_level="Low",
                mile_marker=mile_marker,
            )
        self.url = reverse("route-forecast", kwargs={"id": self.job.id})

    def get_forecast(self, hour):
        return self.client.get(self.url, {"hour": hour})

    def test_forecast_returns_each_route_and_checkpoint(self):
        response = self.get_forecast(12)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["forecast_hour"], 12)
        self.assertEqual(str(response.data["job_id"]), str(self.job.id))
        self.assertEqual(len(response.data["routes"]), 1)

        route = response.data["routes"][0]
        self.assertEqual(route["route_id"], "route-1")
        self.assertEqual(len(route["checkpoints"]), 3)

    def test_forecast_time_is_departure_plus_offset(self):
        response = self.get_forecast(24)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        forecast_time = datetime.fromisoformat(
            response.data["forecast_time"].replace("Z", "+00:00")
        )
        self.assertEqual(forecast_time, self.departure + timedelta(hours=24))

    def test_forecast_risk_uses_updated_weather_and_load(self):
        response = self.get_forecast(12)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        route = response.data["routes"][0]
        for checkpoint in route["checkpoints"]:
            self.assertEqual(
                checkpoint["risk_level"],
                calculate_checkpoint_risk(
                    checkpoint["weather_data"],
                    self.job.load_weight,
                ),
            )

    def test_forecast_risk_miles_cover_the_route(self):
        response = self.get_forecast(12)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        route = response.data["routes"][0]
        self.assertAlmostEqual(
            sum(route["risk_miles"].values()),
            self.route.total_distance,
            places=6,
        )

    def test_forecast_accepts_both_horizon_bounds(self):
        for hour in (0, 48):
            response = self.get_forecast(hour)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data["forecast_hour"], hour)

    def test_forecast_rejects_out_of_bounds_hours(self):
        for hour in (-1, 49):
            response = self.get_forecast(hour)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_forecast_rejects_non_integer_hours(self):
        response = self.get_forecast("soon")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_forecast_requires_a_completed_job(self):
        self.job.status = "PROCESSING"
        self.job.save(update_fields=["status"])

        response = self.get_forecast(12)

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_forecast_returns_not_found_for_unknown_job(self):
        url = reverse(
            "route-forecast",
            kwargs={"id": "00000000-0000-0000-0000-000000000000"},
        )
        response = self.client.get(url, {"hour": 12})

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch('routing.views.build_forecast', side_effect=ProviderError('Weather unavailable.'))
    def test_forecast_provider_failure_returns_502(self, _build):
        response = self.get_forecast(12)

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertIn('Weather', response.data['error'])

    @patch('routing.views.build_forecast', wraps=build_forecast)
    def test_forecast_is_cached_per_job_and_hour(self, mocked_build):
        first = self.get_forecast(12)
        second = self.get_forecast(12)

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(mocked_build.call_count, 1)
