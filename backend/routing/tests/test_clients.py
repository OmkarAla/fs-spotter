from datetime import datetime, timezone

from django.test import SimpleTestCase

from routing.clients import RoutingClient
from routing.geometry import decode_polyline


class RoutingClientGeometryTests(SimpleTestCase):
    def setUp(self):
        self.departure = datetime(2026, 10, 20, 8, tzinfo=timezone.utc)
        self.routes = RoutingClient().get_routes(
            "New York", "Los Angeles", self.departure
        )

    def test_mock_routes_are_deterministic(self):
        repeated = RoutingClient().get_routes(
            "New York", "Los Angeles", self.departure
        )

        self.assertEqual(self.routes, repeated)

    def test_route_times_start_at_requested_departure(self):
        for route in self.routes:
            first_arrival = datetime.fromisoformat(
                route["checkpoints"][0]["estimated_arrival_time"]
            )
            self.assertEqual(first_arrival, self.departure)

    def test_each_route_has_a_distinct_decodable_polyline(self):
        polylines = set()

        for route in self.routes:
            points = decode_polyline(route["polyline"])
            self.assertGreater(len(points), 1)
            polylines.add(route["polyline"])

        self.assertEqual(len(polylines), 3)

    def test_polylines_start_and_end_at_known_city_coordinates(self):
        for route in self.routes:
            points = decode_polyline(route["polyline"])
            start_lat, start_lon = points[0]
            end_lat, end_lon = points[-1]

            self.assertAlmostEqual(start_lat, 40.7128, places=2)
            self.assertAlmostEqual(start_lon, -74.0060, places=2)
            self.assertAlmostEqual(end_lat, 34.0522, places=2)
            self.assertAlmostEqual(end_lon, -118.2437, places=2)

    def test_checkpoints_stay_inside_the_continental_united_states(self):
        for route in self.routes:
            self.assertGreater(len(route["checkpoints"]), 1)

            for checkpoint in route["checkpoints"]:
                self.assertGreaterEqual(checkpoint["lat"], 24.0)
                self.assertLessEqual(checkpoint["lat"], 50.0)
                self.assertGreaterEqual(checkpoint["lon"], -125.0)
                self.assertLessEqual(checkpoint["lon"], -67.0)

    def test_checkpoint_arrival_times_increase_along_each_route(self):
        for route in self.routes:
            arrivals = [
                datetime.fromisoformat(checkpoint["estimated_arrival_time"])
                for checkpoint in route["checkpoints"]
            ]
            self.assertEqual(arrivals, sorted(arrivals))

    def test_route_distances_are_plausible_for_new_york_to_los_angeles(self):
        distances = sorted(route["total_distance"] for route in self.routes)

        self.assertEqual(len(set(distances)), 3)
        self.assertGreater(distances[0], 2400)
        self.assertLess(distances[-1], 3200)
