import hashlib
from functools import lru_cache

from django.conf import settings
from django.core.cache import cache
from timezonefinder import TimezoneFinder

from .errors import ProviderError, ProviderNotConfigured, ProviderRateLimited


@lru_cache(maxsize=1)
def _timezone_finder():
    return TimezoneFinder()


def timezone_for(latitude, longitude):
    return _timezone_finder().timezone_at(
        lng=longitude, lat=latitude
    ) or 'UTC'


class OrsGeocodingProvider:
    def __init__(self, api_key=None, base_url=None, timeout=None, session=None):
        self.api_key = (api_key if api_key is not None else settings.ORS_API_KEY).strip()
        self.base_url = (base_url or settings.ORS_BASE_URL).rstrip('/')
        self.timeout = timeout or settings.PROVIDER_HTTP_TIMEOUT
        if session is None:
            import requests
            session = requests.Session()
        self.session = session

    def search(self, query, limit=6):
        query = query.strip()
        if not query:
            return []
        if not self.api_key:
            raise ProviderNotConfigured('ORS_API_KEY is not configured.')

        cache_key = 'geocode:' + hashlib.sha256(
            f'{query.lower()}|{limit}'.encode('utf-8')
        ).hexdigest()
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        try:
            response = self.session.get(
                f'{self.base_url}/geocode/autocomplete',
                params={'text': query, 'size': limit},
                headers={'Authorization': self.api_key},
                timeout=self.timeout,
            )
        except Exception as exc:
            raise ProviderError('Geocoding service is unavailable.') from exc

        if response.status_code in (401, 403):
            raise ProviderNotConfigured('ORS rejected the geocoding key.')
        if response.status_code == 429:
            raise ProviderRateLimited('Geocoding rate limit reached.')
        if response.status_code >= 400:
            raise ProviderError('Geocoding service returned an error.')

        payload = response.json()
        results = [
            normalized
            for feature in payload.get('features', [])
            for normalized in [self._normalize(feature)]
            if normalized is not None
        ]
        cache.set(cache_key, results, 86400)
        return results

    @staticmethod
    def _normalize(feature):
        properties = feature.get('properties') or {}
        coordinates = (feature.get('geometry') or {}).get('coordinates') or []
        if len(coordinates) < 2:
            return None
        longitude, latitude = float(coordinates[0]), float(coordinates[1])
        label = properties.get('label') or properties.get('name') or ''
        if not label:
            return None
        return {
            'label': label,
            'name': properties.get('name') or label,
            'latitude': latitude,
            'longitude': longitude,
            'country_code': properties.get('country_a') or '',
            'timezone': timezone_for(latitude, longitude),
        }
