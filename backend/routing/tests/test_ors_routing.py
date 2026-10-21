from unittest.mock import Mock

from django.test import SimpleTestCase

from routing.providers.routing import OrsRoutingProvider
from routing.providers.types import Location

ORIGIN = Location('New York, USA', 40.7128, -74.006, 'USA', 'America/New_York')
DESTINATION = Location('Los Angeles, USA', 34.0522, -118.2437, 'USA', 'America/Los_Angeles')


def _response(offset=0.0):
    response = Mock(status_code=200)
    response.json.return_value = {
        'features': [{
            'geometry': {
                'coordinates': [
                    [-74.006, 40.7128],
                    [-100.0, 39.0 + offset],
                    [-118.2437, 34.0522],
                ],
            },
            'properties': {'summary': {'distance': 4500000.0, 'duration': 240000.0}},
        }],
    }
    return response


class OrsRoutingTests(SimpleTestCase):
    def setUp(self):
        self.provider = OrsRoutingProvider(api_key='test-key')
        self.provider.session = Mock()

    def test_uses_hgv_weight_in_metric_tons(self):
        self.provider.session.post.return_value = _response()

        self.provider.get_routes(ORIGIN, DESTINATION, load_weight_lb=42000)

        payload = self.provider.session.post.call_args.kwargs['json']
        self.assertEqual(payload['options']['vehicle_type'], 'hgv')
        self.assertAlmostEqual(
            payload['options']['profile_params']['restrictions']['weight'],
            19.05, places=2,
        )

    def test_returns_three_distinct_strategy_routes(self):
        self.provider.session.post.side_effect = [
            _response(0.0),
            _response(1.0),
            _response(-1.0),
        ]

        routes = self.provider.get_routes(ORIGIN, DESTINATION, load_weight_lb=42000)

        self.assertEqual(len(routes), 3)
        self.assertEqual([route.route_id for route in routes], [
            'fastest', 'shortest', 'avoid-highways',
        ])
        self.assertEqual(len({route.polyline for route in routes}), 3)

    def test_deduplicates_identical_geometry(self):
        self.provider.session.post.return_value = _response()

        routes = self.provider.get_routes(ORIGIN, DESTINATION, load_weight_lb=42000)

        self.assertEqual(len(routes), 1)
