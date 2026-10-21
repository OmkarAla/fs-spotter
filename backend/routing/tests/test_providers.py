from django.test import SimpleTestCase, override_settings

from routing.providers import get_routing_provider, get_weather_provider
from routing.providers.mock import MockRoutingProvider, MockWeatherProvider


@override_settings(ROUTING_PROVIDER='mock', WEATHER_PROVIDER='mock')
class ProviderFactoryTests(SimpleTestCase):
    def test_mock_factories_are_selectable(self):
        self.assertIsInstance(get_routing_provider(), MockRoutingProvider)
        self.assertIsInstance(get_weather_provider(), MockWeatherProvider)
