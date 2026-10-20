from datetime import timedelta

from . import engine
from .clients import WeatherClient
from .sampling import summarize_checkpoint_risks


def build_forecast(job, forecast_hour, weather_client=None):
    weather_client = weather_client or WeatherClient()
    forecast_time = job.departure_time + timedelta(hours=forecast_hour)
    routes = []

    for route in job.route_options.prefetch_related("checkpoints").all():
        checkpoints = []
        for checkpoint in route.checkpoints.all():
            weather = weather_client.get_weather(
                checkpoint.latitude,
                checkpoint.longitude,
                forecast_time.isoformat(),
            )
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
        routes.append({
            "route_id": route.route_id,
            "risk_miles": summary["risk_miles"],
            "total_risk_score": summary["total_risk_score"],
            "checkpoints": checkpoints,
        })

    return {
        "job_id": job.id,
        "forecast_hour": forecast_hour,
        "forecast_time": forecast_time,
        "routes": routes,
    }
