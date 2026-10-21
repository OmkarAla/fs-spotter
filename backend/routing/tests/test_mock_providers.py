from django.test import SimpleTestCase

from routing.providers.mock import MockRoutingProvider, MockWeatherProvider
from routing.providers.types import Location


class MockProviderTests(SimpleTestCase):
    def test_mock_routing_returns_three_ordered_routes(self):
        routes = MockRoutingProvider().get_routes(
            Location('A', 40.0, -75.0, 'USA', 'America/New_York'),
            Location('B', 34.0, -118.0, 'USA', 'America/Los_Angeles'),
            42000,
        )

        self.assertEqual(
            [route.route_id for route in routes],
            ['fastest', 'shortest', 'avoid-highways'],
        )
        self.assertTrue(all(route.polyline for route in routes))

    def test_mock_weather_is_deterministic(self):
        provider = MockWeatherProvider()
        first = provider.get_weather(40.0, -75.0, '2026-10-21T12:00:00Z')
        second = provider.get_weather(40.0, -75.0, '2026-10-21T12:00:00Z')

        self.assertEqual(first, second)
