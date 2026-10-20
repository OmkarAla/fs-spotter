from datetime import datetime, timedelta, timezone

from . import engine
from .geometry import decode_polyline, point_at_distance

BASE_INTERVAL_MILES = 50.0
INTERVAL_BY_RISK = {
    "Low": 50.0,
    "Moderate": 25.0,
    "High": 10.0,
    "Severe": 10.0,
    "No Travel": 10.0,
}
RISK_WEIGHTS = {"Low": 0, "Moderate": 1, "High": 2, "Severe": 3, "No Travel": 4}
RISK_SEVERITY = {level: index for index, level in enumerate(RISK_WEIGHTS)}
DISTANCE_EPSILON = 0.001
MAX_REFINEMENT_PASSES = 8


def sample_route(route, departure_time, weather_client, load_weight):
    total_distance = float(route.get("total_distance") or 0.0)
    total_time = float(route.get("total_time") or 0.0)
    points = decode_polyline(route.get("polyline", ""))

    if total_distance <= 0 or len(points) < 2:
        return {"checkpoints": [], "risk_miles": {}, "total_risk_score": 0.0}

    departure = _ensure_aware(departure_time)
    weather_cache = {}

    def checkpoint_at(distance):
        distance = round(min(max(distance, 0.0), total_distance), 6)
        cached = weather_cache.get(distance)
        if cached is not None:
            return cached

        latitude, longitude = point_at_distance(points, distance)
        arrival = departure + timedelta(
            seconds=total_time * (distance / total_distance)
        )
        weather = weather_client.get_weather(latitude, longitude, arrival.isoformat())
        risk_level = engine.calculate_checkpoint_risk(weather, load_weight)
        checkpoint = {
            "latitude": latitude,
            "longitude": longitude,
            "estimated_arrival": arrival,
            "weather_data": weather,
            "risk_level": risk_level,
            "mile_marker": distance,
        }
        weather_cache[distance] = checkpoint
        return checkpoint

    distances = _initial_distances(total_distance)
    for _ in range(MAX_REFINEMENT_PASSES):
        checkpoints = [checkpoint_at(distance) for distance in distances]
        additions = set()

        for start, end in zip(checkpoints, checkpoints[1:]):
            gap = end["mile_marker"] - start["mile_marker"]
            target_interval = min(
                INTERVAL_BY_RISK[start["risk_level"]],
                INTERVAL_BY_RISK[end["risk_level"]],
            )
            if gap <= target_interval + DISTANCE_EPSILON:
                continue

            cursor = start["mile_marker"] + target_interval
            while cursor < end["mile_marker"] - DISTANCE_EPSILON:
                additions.add(round(cursor, 6))
                cursor += target_interval

        if not additions:
            break

        distances = sorted(set(distances) | additions)

    checkpoints = [checkpoint_at(distance) for distance in distances]
    risk_miles = {}
    for start, end in zip(checkpoints, checkpoints[1:]):
        risk_level = max(
            (start["risk_level"], end["risk_level"]),
            key=lambda level: RISK_SEVERITY[level],
        )
        segment_miles = end["mile_marker"] - start["mile_marker"]
        risk_miles[risk_level] = risk_miles.get(risk_level, 0.0) + segment_miles

    risk_miles = {
        level: round(miles, 6) for level, miles in risk_miles.items()
    }
    total_risk_score = sum(
        miles * RISK_WEIGHTS[level] for level, miles in risk_miles.items()
    )

    return {
        "checkpoints": checkpoints,
        "risk_miles": risk_miles,
        "total_risk_score": round(total_risk_score, 6),
    }


def _initial_distances(total_distance):
    distances = []
    cursor = 0.0
    while cursor < total_distance - DISTANCE_EPSILON:
        distances.append(round(cursor, 6))
        cursor += BASE_INTERVAL_MILES

    distances.append(round(total_distance, 6))
    return distances


def _ensure_aware(value):
    if isinstance(value, str):
        value = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if value.tzinfo is None or value.utcoffset() is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)
