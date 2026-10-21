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

    def test_request_hourly_batches_large_coordinate_sets(self):
        self.provider.session = Mock()
        self.provider.session.get.side_effect = [
            Mock(status_code=200, json=Mock(return_value=[{'hourly': {}}] * 100)),
            Mock(status_code=200, json=Mock(return_value=[{'hourly': {}}] * 100)),
            Mock(status_code=200, json=Mock(return_value=[{'hourly': {}}] * 50)),
        ]
        coordinates = [(40.0 + index * 0.001, -74.0) for index in range(250)]

        payload = self.provider._request_hourly(
            coordinates, datetime(2026, 10, 21, tzinfo=timezone.utc).date(),
            datetime(2026, 10, 21, tzinfo=timezone.utc).date(),
        )

        self.assertEqual(len(payload), 250)
        self.assertEqual(self.provider.session.get.call_count, 3)
        for call in self.provider.session.get.call_args_list:
            self.assertLessEqual(
                len(call.kwargs['params']['latitude'].split(',')), 100
            )

    def test_weather_grid_clamps_end_date_to_provider_horizon(self):
        from datetime import date, timedelta

        response = Mock(status_code=200)
        response.json.return_value = _payload(
            ['2026-10-21T00:00'], [10.0], [0.0], [0.0]
        )
        self.provider.session = Mock()
        self.provider.session.get.return_value = response
        departure = datetime.now(timezone.utc) + timedelta(days=13)
        arrival = departure + timedelta(days=5)

        self.provider.build_grid(
            [(40.0, -74.0), (40.0, -74.0)], departure, arrival
        )

        params = self.provider.session.get.call_args.kwargs['params']
        self.assertLessEqual(
            date.fromisoformat(params['end_date']),
            date.today() + timedelta(days=14),
        )
