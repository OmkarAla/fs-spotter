import unittest
from backend.routing.clients import RoutingClient

class TestRoutingClient(unittest.TestCase):
    def test_get_routes_returns_expected_structure(self):
        client = RoutingClient()
        routes = client.get_routes("New York", "Los Angeles")
        
        self.assertEqual(len(routes), 3)
        for route in routes:
            self.assertIn('route_id', route)
            self.assertIn('polyline', route)
            self.assertIn('total_distance', route)
            self.assertIn('total_time', route)
            self.assertIn('checkpoints', route)
            
            self.assertTrue(len(route['checkpoints']) > 0)
            first_cp = route['checkpoints'][0]
            self.assertIn('lat', first_cp)
            self.assertIn('lon', first_cp)
            self.assertIn('estimated_arrival_time', first_cp)

if __name__ == '__main__':
    unittest.main()
