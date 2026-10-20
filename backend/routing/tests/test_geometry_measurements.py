from django.test import SimpleTestCase

from routing.geometry import (
    distance_miles,
    encode_polyline,
    decode_polyline,
    point_at_distance,
    polyline_length_miles,
)


class GeometryMeasurementTests(SimpleTestCase):
    def test_distance_miles_matches_one_degree_of_latitude(self):
        distance = distance_miles((35.0, -100.0), (36.0, -100.0))

        self.assertAlmostEqual(distance, 69.1, places=1)

    def test_polyline_length_sums_its_segments(self):
        points = [(35.0, -100.0), (35.0, -101.0), (36.0, -101.0)]

        expected = distance_miles(points[0], points[1]) + distance_miles(
            points[1], points[2]
        )

        self.assertAlmostEqual(polyline_length_miles(points), expected, places=6)

    def test_point_at_distance_interpolates_along_a_segment(self):
        points = [(35.0, -100.0), (35.0, -102.0)]
        halfway = polyline_length_miles(points) / 2

        latitude, longitude = point_at_distance(points, halfway)

        self.assertAlmostEqual(latitude, 35.0, places=5)
        self.assertAlmostEqual(longitude, -101.0, places=5)

    def test_point_at_distance_clamps_to_the_polyline_ends(self):
        points = decode_polyline(encode_polyline([(35.0, -100.0), (36.0, -99.0)]))

        self.assertEqual(point_at_distance(points, -10), points[0])
        self.assertEqual(point_at_distance(points, 1e9), points[-1])
