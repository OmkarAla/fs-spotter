from .geocoding import OrsGeocodingProvider


def get_geocoding_provider():
    return OrsGeocodingProvider()
