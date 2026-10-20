import hashlib
import math
import random
from datetime import datetime, timedelta, timezone

from .geometry import encode_polyline


_CITY_COORDINATES = {
    "albuquerque": (35.0844, -106.6504),
    "atlanta": (33.7490, -84.3880),
    "austin": (30.2672, -97.7431),
    "baltimore": (39.2904, -76.6122),
    "boston": (42.3601, -71.0589),
    "charlotte": (35.2271, -80.8431),
    "chicago": (41.8781, -87.6298),
    "cincinnati": (39.1031, -84.5120),
    "cleveland": (41.4993, -81.6944),
    "columbus": (39.9612, -82.9988),
    "dallas": (32.7767, -96.7970),
    "denver": (39.7392, -104.9903),
    "detroit": (42.3314, -83.0458),
    "el paso": (31.7619, -106.4850),
    "houston": (29.7604, -95.3698),
    "indianapolis": (39.7684, -86.1581),
    "kansas city": (39.0997, -94.5786),
    "las vegas": (36.1699, -115.1398),
    "los angeles": (34.0522, -118.2437),
    "memphis": (35.1495, -90.0490),
    "miami": (25.7617, -80.1918),
    "minneapolis": (44.9778, -93.2650),
    "nashville": (36.1627, -86.7816),
    "new orleans": (29.9511, -90.0715),
    "new york": (40.7128, -74.0060),
    "oklahoma city": (35.4676, -97.5164),
    "omaha": (41.2565, -95.9345),
    "orlando": (28.5383, -81.3792),
    "philadelphia": (39.9526, -75.1652),
    "phoenix": (33.4484, -112.0740),
    "pittsburgh": (40.4406, -79.9959),
    "portland": (45.5152, -122.6784),
    "salt lake city": (40.7608, -111.8910),
    "san antonio": (29.4241, -98.4936),
    "san diego": (32.7157, -117.1611),
    "san francisco": (37.7749, -122.4194),
    "seattle": (47.6062, -122.3321),
    "st louis": (38.6270, -90.1994),
    "tucson": (32.2226, -110.9747),
    "washington": (38.9072, -77.0369),
}

_CURVATURES = (0.0, 0.06, -0.06)
_DISTANCE_FACTORS = (1.02, 1.06, 1.12)
_SAMPLE_INTERVAL_MILES = 25.0


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

    def get_routes(self, origin, destination, departure_time=None):
        if self.mock_mode:
            return self._get_mock_routes(origin, destination, departure_time)

        raise NotImplementedError("Real API integration not configured")

    def _get_mock_routes(self, origin, destination, departure_time=None):
        departure = _ensure_aware(departure_time)
        start = _coordinates_for(origin)
        end = _coordinates_for(destination)
        seed = _seed_for(origin, destination)
        rng = random.Random(seed)
        base_distance = max(_haversine_miles(start, end), 50.0)

        routes = []
        for index, (curvature, distance_factor) in enumerate(
            zip(_CURVATURES, _DISTANCE_FACTORS)
        ):
            distance = base_distance * distance_factor
            average_speed = rng.uniform(52.0, 64.0)
            time_hours = distance / average_speed
            polyline_points = _build_path(start, end, curvature)
            checkpoint_count = max(1, int(distance // _SAMPLE_INTERVAL_MILES))

            checkpoints = []
            for checkpoint_index in range(checkpoint_count):
                progress = checkpoint_index / checkpoint_count
                latitude, longitude = _point_on_path(start, end, curvature, progress)
                checkpoints.append({
                    "lat": round(latitude, 5),
                    "lon": round(longitude, 5),
                    "estimated_arrival_time": (
                        departure + timedelta(hours=time_hours * progress)
                    ).isoformat(),
                })

            routes.append({
                "route_id": f"mock-{seed[:10]}-{index + 1}",
                "polyline": encode_polyline(polyline_points),
                "total_distance": distance,
                "total_time": time_hours * 3600,
                "checkpoints": checkpoints,
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
            return self._get_mock_weather(lat, lon, time)

        raise NotImplementedError("Real API integration not configured")

    def _get_mock_weather(self, lat, lon, time):
        arrival = _as_utc(time)
        seed_key = f"{lat:.3f}|{lon:.3f}|{arrival.strftime('%Y%m%d%H')}"
        seed = int.from_bytes(
            hashlib.sha256(seed_key.encode("utf-8")).digest()[:8], "big"
        )
        rng = random.Random(seed)

        storm = rng.random()
        wind = rng.uniform(5.0, 24.0)
        rain = (rng.random() ** 2) * 0.35
        snow = 0.0

        if storm > 0.88:
            wind += rng.uniform(25.0, 38.0)
            rain += rng.uniform(0.2, 0.9)
        elif storm > 0.72:
            wind += rng.uniform(10.0, 20.0)
            rain += rng.uniform(0.05, 0.3)

        if arrival.month in (11, 12, 1, 2, 3) and abs(lat) >= 34:
            snow_chance = rng.random()
            if snow_chance > 0.80:
                snow = rng.uniform(1.0, 3.2)
            elif snow_chance > 0.62:
                snow = rng.uniform(0.3, 1.0)

        if snow > 0 and storm > 0.90:
            snow += rng.uniform(0.5, 1.5)

        return {
            "wind": min(wind, 80.0),
            "rain": min(rain, 1.25),
            "snow": min(snow, 4.0),
        }


def _ensure_aware(value):
    if value is None:
        return datetime.now(timezone.utc)
    if value.tzinfo is None or value.utcoffset() is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _as_utc(value):
    if isinstance(value, datetime):
        return _ensure_aware(value)
    if isinstance(value, str):
        try:
            return _ensure_aware(datetime.fromisoformat(value.replace("Z", "+00:00")))
        except ValueError:
            pass
    return datetime.now(timezone.utc)


def _normalized_location(value):
    return value.split(",")[0].strip().lower()


def _coordinates_for(location):
    normalized = _normalized_location(location)
    if normalized in _CITY_COORDINATES:
        return _CITY_COORDINATES[normalized]

    digest = hashlib.sha256(normalized.encode("utf-8")).digest()
    latitude = 25.0 + (int.from_bytes(digest[:4], "big") / 2**32) * 23.0
    longitude = -124.0 + (int.from_bytes(digest[4:8], "big") / 2**32) * 54.0
    return (latitude, longitude)


def _seed_for(origin, destination):
    key = f"{_normalized_location(origin)}|{_normalized_location(destination)}"
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def _haversine_miles(start, end):
    start_lat, start_lon = map(math.radians, start)
    end_lat, end_lon = map(math.radians, end)
    latitude_delta = end_lat - start_lat
    longitude_delta = end_lon - start_lon

    value = (
        math.sin(latitude_delta / 2) ** 2
        + math.cos(start_lat) * math.cos(end_lat) * math.sin(longitude_delta / 2) ** 2
    )
    return 3958.8 * 2 * math.asin(math.sqrt(value))


def _point_on_path(start, end, curvature, progress):
    start_lat, start_lon = start
    end_lat, end_lon = end
    latitude_delta = end_lat - start_lat
    longitude_delta = end_lon - start_lon
    bend = curvature * 4 * progress * (1 - progress)

    latitude = start_lat + latitude_delta * progress - longitude_delta * bend
    longitude = start_lon + longitude_delta * progress + latitude_delta * bend
    return latitude, longitude


def _build_path(start, end, curvature, segment_count=64):
    return [
        tuple(round(value, 5) for value in _point_on_path(
            start, end, curvature, index / segment_count
        ))
        for index in range(segment_count + 1)
    ]
