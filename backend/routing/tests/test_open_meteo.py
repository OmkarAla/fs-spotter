from datetime import datetime, timezone
from unittest.mock import Mock

from django.test import SimpleTestCase

from routing.providers.weather import OpenMeteoProvider


def _payload(times, wind, rain, snow):
    return [{
        'hourly': {
            'time': times,
            'wind_speed_10m': wind,
            'rain': rain,
            'snowfall': snow,
        }
    }]


class OpenMeteoTests(SimpleTestCase):
    def setUp(self):
        self.provider = OpenMeteoProvider()

    def test_batches_coordinates_and_reads_the_nearest_hour(self):
        response = Mock(status_code=200)
        response.json.return_value = _payload(
            ['2026-10-21T00:00', '2026-10-21T01:00'],
            [10.0, 20.0],
            [0.0, 0.2],
            [0.0, 0.0],
        ) * 2
        self.provider.session = Mock()
        self.provider.session.get.return_value = response

        weather = self.provider.get_weather_many(
            [(40.7, -74.0), (34.0, -118.2)],
            datetime(2026, 10, 21, 1, 20, tzinfo=timezone.utc),
        )

        self.assertEqual(len(weather), 2)
        self.assertEqual(weather[0]['wind'], 20.0)
        self.assertEqual(weather[0]['rain'], 0.2)
        params = self.provider.session.get.call_args.kwargs['params']
        self.assertEqual(params['wind_speed_unit'], 'mph')
        self.assertEqual(params['precipitation_unit'], 'inch')
        self.assertIn(',', params['latitude'])
