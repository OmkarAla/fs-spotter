import uuid
import random
from datetime import datetime, timedelta, timezone

class RoutingClient:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RoutingClient, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.mock_mode = True
        self._initialized = True

    def get_routes(self, origin, destination):
        if self.mock_mode:
            return self._get_mock_routes(origin, destination)
        
        # Real implementation would use requests here
        raise NotImplementedError("Real API integration not configured")

    def _get_mock_routes(self, origin, destination):
        routes = []
        for i in range(3):
            distance = random.uniform(500, 3000)
            time_hours = distance / random.uniform(50, 70)
            
            checkpoints = []
            num_checkpoints = int(distance // 25)
            start_time = datetime.now(timezone.utc)
            
            for cp_idx in range(num_checkpoints):
                checkpoints.append({
                    "lat": random.uniform(-90, 90),
                    "lon": random.uniform(-180, 180),
                    "estimated_arrival_time": (start_time + timedelta(hours=time_hours * (cp_idx / num_checkpoints))).isoformat()
                })

            routes.append({
                "route_id": str(uuid.uuid4()),
                "polyline": f"mock_polyline_{i}",
                "total_distance": distance,
                "total_time": time_hours * 3600,
                "checkpoints": checkpoints
            })
        return routes

class WeatherClient:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(WeatherClient, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.mock_mode = True
        self._initialized = True

    def get_weather(self, lat, lon, time):
        if self.mock_mode:
            return self._get_mock_weather(lat, lon)
        
        # Real implementation would use requests here
        raise NotImplementedError("Real API integration not configured")

    def _get_mock_weather(self, lat, lon):
        return {
            "wind": random.uniform(0, 50) + (abs(lat) / 10),
            "rain": random.uniform(0, 10),
            "snow": random.uniform(0, 5)
        }
