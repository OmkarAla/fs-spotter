from unittest.mock import Mock, patch

from django.core.cache import cache
from django.test import SimpleTestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from routing.providers.errors import ProviderNotConfigured
from routing.providers.geocoding import OrsGeocodingProvider


class OrsGeocodingTests(SimpleTestCase):
    def setUp(self):
        cache.clear()
        self.provider = OrsGeocodingProvider(api_key='test-key')
        self.provider.session = Mock()

    def test_normalizes_a_pelias_feature(self):
        response = Mock(status_code=200)
        response.json.return_value = {
            'features': [{
                'geometry': {'coordinates': [13.388, 52.517]},
                'properties': {
                    'label': 'Berlin, Germany',
                    'name': 'Berlin',
                    'country_a': 'DEU',
                },
            }]
        }
        self.provider.session.get.return_value = response

        results = self.provider.search('Berlin')

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['label'], 'Berlin, Germany')
        self.assertEqual(results[0]['country_code'], 'DEU')
        self.assertEqual(results[0]['latitude'], 52.517)
        self.assertEqual(results[0]['longitude'], 13.388)
        self.assertTrue(results[0]['timezone'])

    def test_requires_an_api_key(self):
        provider = OrsGeocodingProvider(api_key='')

        with self.assertRaises(ProviderNotConfigured):
            provider.search('Berlin')


class GeocodeApiTests(APITestCase):
    @patch('routing.views.get_geocoding_provider')
    def test_returns_results(self, factory):
        factory.return_value.search.return_value = [{
            'label': 'Berlin, Germany',
            'name': 'Berlin',
            'latitude': 52.517,
            'longitude': 13.388,
            'country_code': 'DEU',
            'timezone': 'Europe/Berlin',
        }]

        response = self.client.get(reverse('geocode'), {'q': 'Berlin'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['results'][0]['label'], 'Berlin, Germany')

    def test_short_query_returns_empty_results_without_provider_call(self):
        response = self.client.get(reverse('geocode'), {'q': 'B'})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {'results': []})
