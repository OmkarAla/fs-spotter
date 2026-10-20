from django.test import SimpleTestCase

from routing.geometry import decode_polyline, encode_polyline


class PolylineGeometryTests(SimpleTestCase):
    def test_encodes_the_reference_google_polyline(self):
        points = [(38.5, -120.2), (40.7, -120.95), (43.252, -126.453)]

        self.assertEqual(encode_polyline(points), "_p~iF~ps|U_ulLnnqC_mqNvxq`@")

    def test_round_trips_coordinates_at_five_decimal_places(self):
        points = [(40.7128, -74.0060), (39.9526, -75.1652), (34.0522, -118.2437)]

        decoded = decode_polyline(encode_polyline(points))

        for (expected_lat, expected_lon), (actual_lat, actual_lon) in zip(points, decoded):
            self.assertAlmostEqual(actual_lat, expected_lat, places=5)
            self.assertAlmostEqual(actual_lon, expected_lon, places=5)
