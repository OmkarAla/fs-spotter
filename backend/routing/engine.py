def calculate_checkpoint_risk(weather_data, load_weight):
    wind = weather_data.get("wind", 0)
    rain = weather_data.get("rain", 0)
    snow = weather_data.get("snow", 0)

    # Risk Level Mapping
    RISK_LEVELS = ["Low", "Moderate", "High", "Severe", "No Travel"]
    
    # Wind Base Risk
    if wind >= 55: wind_risk = 4
    elif wind >= 45: wind_risk = 3
    elif wind >= 35: wind_risk = 2
    elif wind >= 25: wind_risk = 1
    else: wind_risk = 0

    # Rain Base Risk
    if rain > 1.00: rain_risk = 4
    elif rain >= 0.50: rain_risk = 3
    elif rain >= 0.25: rain_risk = 2
    elif rain >= 0.10: rain_risk = 1
    else: rain_risk = 0

    # Snow Base Risk
    if snow > 3.0: snow_risk = 4
    elif snow >= 2.0: snow_risk = 3
    elif snow >= 1.0: snow_risk = 2
    elif snow >= 0.5: snow_risk = 1
    else: snow_risk = 0

    # Load Overrides
    final_wind_risk = wind_risk
    if wind >= 55:
        final_wind_risk = 4
    elif wind >= 45 and load_weight > 30000:
        final_wind_risk = 4
    elif wind >= 35 and load_weight > 40000:
        final_wind_risk = 3
    
    # Result is the maximum of all risks
    max_risk_idx = max(final_wind_risk, rain_risk, snow_risk)
    return RISK_LEVELS[max_risk_idx]

def recommend_best_route(routes_data):
    def route_sort_key(route):
        return (
            route["miles"].get("Severe", 0),
            route["miles"].get("High", 0),
            route.get("avg_risk", 0),
            route.get("time", float('inf'))
        )
    
    return min(routes_data, key=route_sort_key)
