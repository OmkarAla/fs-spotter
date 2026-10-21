from datetime import datetime, timedelta, timezone

from django.test import SimpleTestCase

from routing.geometry import decode_polyline, encode_polyline, polyline_length_miles
from routing.sampling import sample_route


DEPARTURE = datetime(2026, 10, 20, 8, tzinfo=timezone.utc)


class FakeWeatherGrid:
    def __init__(self, wind_for_latitude):
        self.wind_for_latitude = wind_for_latitude
        self.calls = []

    def get(self, latitude, longitude, when):
        self.calls.append((latitude, longitude, when))
        return {
            "wind": self.wind_for_latitude(latitude),
            "rain": 0,
            "snow": 0,
        }


def make_route(total_miles=210.0, segment_count=40):
    start_latitude = 35.0
    latitude_span = total_miles / 69.0
    points = [
        (
            start_latitude + latitude_span * index / segment_count,
            -100.0,
        )
        for index in range(segment_count + 1)
    ]
    encoded = encode_polyline(points)
    actual_distance = polyline_length_miles(decode_polyline(encoded))
    average_speed = 60.0
    return {
        "route_id": "test-route",
        "polyline": encoded,
        "total_distance": actual_distance,
        "total_time": actual_distance / average_speed * 3600,
    }


def gaps(checkpoints):
    return [
        later["mile_marker"] - earlier["mile_marker"]
        for earlier, later in zip(checkpoints, checkpoints[1:])
    ]


class AdaptiveSamplingTests(SimpleTestCase):
    def sample(self, wind):
        route = make_route()
        weather = FakeWeatherGrid(lambda latitude: wind)
        result = sample_route(
            route,
            DEPARTURE,
            weather,
            load_weight=10000,
        )
        return route, weather, result

    def test_low_risk_uses_fifty_mile_sampling(self):
        route, _, result = self.sample(10)

        self.assertTrue(gaps(result["checkpoints"]))
        self.assertLessEqual(max(gaps(result["checkpoints"])), 50.1)
        self.assertLess(
            len(result["checkpoints"]),
            route["total_distance"] / 25,
        )

    def test_moderate_risk_refines_to_twenty_five_miles(self):
        _, _, result = self.sample(30)

        self.assertLessEqual(max(gaps(result["checkpoints"])), 25.1)
        self.assertGreater(
            len(result["checkpoints"]),
            make_route()["total_distance"] / 50,
        )

    def test_high_risk_refines_to_ten_miles(self):
        _, _, result = self.sample(40)

        self.assertLessEqual(max(gaps(result["checkpoints"])), 10.1)
        self.assertGreater(
            len(result["checkpoints"]),
            make_route()["total_distance"] / 25,
        )

    def test_refinement_stays_local_to_the_risky_section(self):
        route = make_route()
        boundary = 35.0 + (route["total_distance"] / 2) / 69.0
        weather = FakeWeatherGrid(
            lambda latitude: 40 if latitude >= boundary else 10
        )

        result = sample_route(
            route,
            DEPARTURE,
            weather,
            load_weight=10000,
        )
        checkpoints = result["checkpoints"]

        risky_gaps = [
            later["mile_marker"] - earlier["mile_marker"]
            for earlier, later in zip(checkpoints, checkpoints[1:])
            if "High" in (earlier["risk_level"], later["risk_level"])
        ]
        low_gaps = [
            later["mile_marker"] - earlier["mile_marker"]
            for earlier, later in zip(checkpoints, checkpoints[1:])
            if earlier["risk_level"] == later["risk_level"] == "Low"
        ]

        self.assertLessEqual(max(risky_gaps), 10.1)
        self.assertGreater(max(low_gaps), 25)
        self.assertGreater(result["risk_miles"]["High"], 0)

    def test_risk_miles_sum_to_total_distance(self):
        for wind in (10, 30, 40):
            route, _, result = self.sample(wind)

            self.assertAlmostEqual(
                sum(result["risk_miles"].values()),
                route["total_distance"],
                places=6,
            )

    def test_risk_miles_use_the_most_severe_endpoint_of_each_segment(self):
        _, _, result = self.sample(40)

        self.assertNotIn("Low", result["risk_miles"])
        self.assertAlmostEqual(
            result["risk_miles"]["High"],
            make_route()["total_distance"],
            places=6,
        )

    def test_arrival_times_follow_distance_along_the_route(self):
        route, _, result = self.sample(10)
        checkpoints = result["checkpoints"]

        self.assertEqual(checkpoints[0]["estimated_arrival"], DEPARTURE)
        self.assertLess(
            abs(
                (
                    checkpoints[-1]["estimated_arrival"]
                    - (DEPARTURE + timedelta(seconds=route["total_time"]))
                ).total_seconds()
            ),
            1,
        )
        arrivals = [checkpoint["estimated_arrival"] for checkpoint in checkpoints]
        self.assertEqual(arrivals, sorted(arrivals))

    def test_weather_reads_use_the_batched_grid(self):
        _, weather, result = self.sample(30)

        self.assertGreaterEqual(len(weather.calls), len(result["checkpoints"]))

    def test_samples_include_the_destination(self):
        route, _, result = self.sample(10)

        self.assertAlmostEqual(
            result["checkpoints"][-1]["mile_marker"],
            route["total_distance"],
            places=6,
        )
