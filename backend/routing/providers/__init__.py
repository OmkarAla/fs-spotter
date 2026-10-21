from django.conf import settings

from .geocoding import OrsGeocodingProvider
from .mock import MockRoutingProvider, MockWeatherProvider
from .routing import OrsRoutingProvider
from .weather import OpenMeteoProvider


def get_geocoding_provider():
    return OrsGeocodingProvider()


def get_routing_provider():
    if settings.ROUTING_PROVIDER == 'mock':
        return MockRoutingProvider()
    return OrsRoutingProvider()


def get_weather_provider():
    if settings.WEATHER_PROVIDER == 'mock':
        return MockWeatherProvider()
    return OpenMeteoProvider()
