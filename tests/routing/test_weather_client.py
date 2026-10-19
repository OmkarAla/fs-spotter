import unittest
from backend.routing.clients import WeatherClient

class TestWeatherClient(unittest.TestCase):
    def test_get_weather_returns_expected_structure(self):
        client = WeatherClient()
        weather = client.get_weather(40.7128, -74.0060, "2026-10-19T12:00:00")
        
        self.assertIsInstance(weather, dict)
        self.assertIn('wind', weather)
        self.assertIn('rain', weather)
        self.assertIn('snow', weather)
        self.assertTrue(all(isinstance(v, (int, float)) for v in weather.values()))

if __name__ == '__main__':
    unittest.main()
