from django.conf import settings

from routing.geometry import encode_polyline, simplify_polyline

from .errors import (
    NoRouteFound,
    ProviderError,
    ProviderNotConfigured,
    ProviderRateLimited,
)
from .types import RoutePlan

STRATEGIES = [
    {'id': 'fastest', 'label': 'Fastest', 'preference': 'fastest', 'avoid': []},
    {'id': 'shortest', 'label': 'Shortest', 'preference': 'shortest', 'avoid': []},
    {'id': 'avoid-highways', 'label': 'Avoids highways', 'preference': 'fastest', 'avoid': ['highways']},
    {'id': 'avoid-tolls', 'label': 'Avoids tolls', 'preference': 'fastest', 'avoid': ['tollways']},
    {'id': 'avoid-ferries', 'label': 'Avoids ferries', 'preference': 'fastest', 'avoid': ['ferries']},
]
LBS_PER_METRIC_TON = 2204.6226218


class OrsRoutingProvider:
    def __init__(self, api_key=None, base_url=None, timeout=None, session=None):
        self.api_key = (api_key if api_key is not None else settings.ORS_API_KEY).strip()
        self.base_url = (base_url or settings.ORS_BASE_URL).rstrip('/')
        self.timeout = timeout or settings.PROVIDER_HTTP_TIMEOUT
        if session is None:
            import requests
            session = requests.Session()
        self.session = session

    def get_routes(self, origin, destination, load_weight_lb):
        if not self.api_key:
            raise ProviderNotConfigured('ORS_API_KEY is not configured.')

        routes = []
        seen_polylines = set()

        for strategy in STRATEGIES:
            try:
                route = self._request_strategy(
                    origin, destination, load_weight_lb, strategy
                )
            except NoRouteFound:
                continue

            if route.polyline in seen_polylines:
                continue
            seen_polylines.add(route.polyline)
            routes.append(route)

            if len(routes) == 3:
                break

        if not routes:
            raise NoRouteFound('No truck route found between these locations.')
        return routes

    def _request_strategy(self, origin, destination, load_weight_lb, strategy):
        weight_tons = round(max(float(load_weight_lb), 1.0) / LBS_PER_METRIC_TON, 3)
        options = {
            'vehicle_type': 'hgv',
            'profile_params': {'restrictions': {'weight': weight_tons}},
        }
        if strategy['avoid']:
            options['avoid_features'] = strategy['avoid']

        payload = {
            'coordinates': [
                [origin.longitude, origin.latitude],
                [destination.longitude, destination.latitude],
            ],
            'geometry_simplify': True,
            'instructions': False,
            'preference': strategy['preference'],
            'options': options,
        }

        try:
            response = self.session.post(
                f'{self.base_url}/openrouteservice/v2/directions/driving-hgv/geojson',
                json=payload,
                headers={
                    'Authorization': self.api_key,
                    'Content-Type': 'application/json',
                },
                timeout=self.timeout,
            )
        except Exception as exc:
            raise ProviderError('Routing service is unavailable.') from exc

        if response.status_code in (401, 403):
            raise ProviderNotConfigured('ORS rejected the routing key.')
        if response.status_code == 429:
            raise ProviderRateLimited('Routing rate limit reached.')
        if response.status_code in (400, 404):
            raise NoRouteFound('No truck route found for this strategy.')
        if response.status_code >= 400:
            raise ProviderError('Routing service returned an error.')

        features = (response.json() or {}).get('features') or []
        if not features:
            raise NoRouteFound('No truck route found for this strategy.')

        feature = features[0]
        coordinates = (feature.get('geometry') or {}).get('coordinates') or []
        if len(coordinates) < 2:
            raise NoRouteFound('Routing service returned empty geometry.')

        points = [(float(lat), float(lon)) for lon, lat in coordinates]
        points = simplify_polyline(points, tolerance=0.0002)
        summary = feature['properties']['summary']

        return RoutePlan(
            route_id=strategy['id'],
            label=strategy['label'],
            polyline=encode_polyline(points),
            total_distance=float(summary['distance']) / 1609.344,
            total_time=float(summary['duration']),
        )
