from datetime import datetime, timezone

from django.test import SimpleTestCase

from routing.clients import WeatherClient


class WeatherClientTests(SimpleTestCase):
    def test_mock_weather_is_deterministic_for_the_same_inputs(self):
        client = WeatherClient()
        arrival = datetime(2026, 10, 21, 14, tzinfo=timezone.utc).isoformat()

        first = client.get_weather(39.7392, -104.9903, arrival)
        second = client.get_weather(39.7392, -104.9903, arrival)

        self.assertEqual(first, second)

    def test_mock_weather_changes_with_forecast_time(self):
        client = WeatherClient()
        first = client.get_weather(
            39.7392,
            -104.9903,
            datetime(2026, 10, 21, 8, tzinfo=timezone.utc).isoformat(),
        )
        second = client.get_weather(
            39.7392,
            -104.9903,
            datetime(2026, 10, 21, 20, tzinfo=timezone.utc).isoformat(),
        )

        self.assertNotEqual(first, second)

    def test_mock_weather_values_are_within_plausible_bounds(self):
        client = WeatherClient()
        arrival = datetime(2026, 10, 21, 14, tzinfo=timezone.utc).isoformat()

        weather = client.get_weather(39.7392, -104.9903, arrival)

        self.assertGreaterEqual(weather["wind"], 0)
        self.assertLessEqual(weather["wind"], 80)
        self.assertGreaterEqual(weather["rain"], 0)
        self.assertLessEqual(weather["rain"], 1.25)
        self.assertGreaterEqual(weather["snow"], 0)
        self.assertLessEqual(weather["snow"], 4.0)
