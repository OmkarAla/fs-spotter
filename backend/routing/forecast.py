from datetime import timedelta

from . import engine
from .providers import get_weather_provider
from .sampling import summarize_checkpoint_risks


def build_forecast(job, forecast_hour, weather_provider=None):
    provider = weather_provider or get_weather_provider()
    forecast_time = job.departure_time + timedelta(hours=forecast_hour)

    routes = list(job.route_options.prefetch_related('checkpoints').all())
    coordinates = []
    seen = set()
    for route in routes:
        for checkpoint in route.checkpoints.all():
            coordinate = (checkpoint.latitude, checkpoint.longitude)
            if coordinate not in seen:
                seen.add(coordinate)
                coordinates.append(coordinate)

    weather_values = provider.get_weather_many(coordinates, forecast_time)
    weather_by_coordinate = dict(zip(coordinates, weather_values))

    serialized_routes = []
    for route in routes:
        checkpoints = []
        for checkpoint in route.checkpoints.all():
            weather = weather_by_coordinate[
                (checkpoint.latitude, checkpoint.longitude)
            ]
            checkpoints.append({
                "latitude": checkpoint.latitude,
                "longitude": checkpoint.longitude,
                "mile_marker": checkpoint.mile_marker,
                "weather_data": weather,
                "risk_level": engine.calculate_checkpoint_risk(
                    weather, job.load_weight
                ),
            })

        summary = summarize_checkpoint_risks(checkpoints)
        serialized_routes.append({
            "route_id": route.route_id,
            "risk_miles": summary["risk_miles"],
            "total_risk_score": summary["total_risk_score"],
            "checkpoints": checkpoints,
        })

    return {
        "job_id": job.id,
        "forecast_hour": forecast_hour,
        "forecast_time": forecast_time,
        "routes": serialized_routes,
    }
