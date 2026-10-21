import hashlib
import random

from routing.geometry import (
    encode_polyline,
    polyline_length_miles,
)

from .types import RoutePlan


def _bent_line(start, end, bend):
    points = []
    for index in range(65):
        progress = index / 64
        lat = start[0] + (end[0] - start[0]) * progress
        lon = start[1] + (end[1] - start[1]) * progress
        offset = bend * 4 * progress * (1 - progress)
        points.append((lat - offset, lon + offset))
    return points


class MockRoutingProvider:
    def get_routes(self, origin, destination, load_weight_lb):
        start = (origin.latitude, origin.longitude)
        end = (destination.latitude, destination.longitude)
        variants = [
            ('fastest', 'Fastest', 0.0),
            ('shortest', 'Shortest', 0.03),
            ('avoid-highways', 'Avoids highways', -0.03),
        ]
        routes = []

        for route_id, label, bend in variants:
            points = _bent_line(start, end, bend)
            distance = polyline_length_miles(points)
            routes.append(RoutePlan(
                route_id=route_id,
                label=label,
                polyline=encode_polyline(points),
                total_distance=round(distance, 3),
                total_time=round(distance / 55.0 * 3600.0, 3),
            ))
        return routes


class MockWeatherProvider:
    def get_weather(self, latitude, longitude, when):
        key = f'{latitude:.3f}|{longitude:.3f}|{when}'
        seed = int.from_bytes(
            hashlib.sha256(key.encode('utf-8')).digest()[:8], 'big'
        )
        rng = random.Random(seed)
        return {
            'wind': rng.uniform(5.0, 55.0),
            'rain': rng.uniform(0.0, 0.8),
            'snow': rng.uniform(0.0, 2.0),
        }

    def get_weather_many(self, coordinates, when):
        return [
            self.get_weather(latitude, longitude, when)
            for latitude, longitude in coordinates
        ]

    def build_grid(self, polyline_points, departure, arrival):
        return self

    def get(self, latitude, longitude, when):
        return self.get_weather(latitude, longitude, when)
