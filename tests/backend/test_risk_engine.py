import pytest
from backend.routing.engine import calculate_checkpoint_risk, recommend_best_route

# Risk Levels
LOW = "Low"
MOD = "Moderate"
HIGH = "High"
SEVERE = "Severe"
NO_TRAVEL = "No Travel"

def test_wind_thresholds():
    # Low: < 25
    assert calculate_checkpoint_risk({"wind": 20, "rain": 0, "snow": 0}, 10000) == LOW
    # Mod: 25-34
    assert calculate_checkpoint_risk({"wind": 30, "rain": 0, "snow": 0}, 10000) == MOD
    # High: 35-44
    assert calculate_checkpoint_risk({"wind": 40, "rain": 0, "snow": 0}, 10000) == HIGH
    # Severe: 45-54
    assert calculate_checkpoint_risk({"wind": 50, "rain": 0, "snow": 0}, 10000) == SEVERE
    # No Travel: >= 55
    assert calculate_checkpoint_risk({"wind": 60, "rain": 0, "snow": 0}, 10000) == NO_TRAVEL

def test_rain_thresholds():
    # Low: < 0.10
    assert calculate_checkpoint_risk({"wind": 0, "rain": 0.05, "snow": 0}, 10000) == LOW
    # Mod: 0.10-0.25
    assert calculate_checkpoint_risk({"wind": 0, "rain": 0.20, "snow": 0}, 10000) == MOD
    # High: 0.25-0.50
    assert calculate_checkpoint_risk({"wind": 0, "rain": 0.40, "snow": 0}, 10000) == HIGH
    # Severe: 0.50-1.00
    assert calculate_checkpoint_risk({"wind": 0, "rain": 0.70, "snow": 0}, 10000) == SEVERE
    # No Travel: > 1.00
    assert calculate_checkpoint_risk({"wind": 0, "rain": 1.10, "snow": 0}, 10000) == NO_TRAVEL

def test_snow_thresholds():
    # Low: < 0.5
    assert calculate_checkpoint_risk({"wind": 0, "rain": 0, "snow": 0.1}, 10000) == LOW
    # Mod: 0.5-1.0
    assert calculate_checkpoint_risk({"wind": 0, "rain": 0, "snow": 0.7}, 10000) == MOD
    # High: 1.0-2.0
    assert calculate_checkpoint_risk({"wind": 0, "rain": 0, "snow": 1.5}, 10000) == HIGH
    # Severe: 2.0-3.0
    assert calculate_checkpoint_risk({"wind": 0, "rain": 0, "snow": 2.5}, 10000) == SEVERE
    # No Travel: > 3.0
    assert calculate_checkpoint_risk({"wind": 0, "rain": 0, "snow": 3.5}, 10000) == NO_TRAVEL

def test_load_overrides():
    # Wind >= 55 mph -> No Travel for any load
    assert calculate_checkpoint_risk({"wind": 55, "rain": 0, "snow": 0}, 10000) == NO_TRAVEL
    
    # Wind 45-54 mph AND load > 30,000 lb -> No Travel
    assert calculate_checkpoint_risk({"wind": 50, "rain": 0, "snow": 0}, 35000) == NO_TRAVEL
    assert calculate_checkpoint_risk({"wind": 50, "rain": 0, "snow": 0}, 25000) == SEVERE
    
    # Wind 35-44 mph AND load > 40,000 lb -> Severe
    assert calculate_checkpoint_risk({"wind": 40, "rain": 0, "snow": 0}, 45000) == SEVERE
    assert calculate_checkpoint_risk({"wind": 40, "rain": 0, "snow": 0}, 35000) == HIGH

def test_highest_risk_selection():
    # Wind Mod, Rain High, Snow Low -> High
    assert calculate_checkpoint_risk({"wind": 30, "rain": 0.40, "snow": 0.1}, 10000) == HIGH

def test_recommend_best_route():
    routes = [
        {
            "id": "R1", 
            "miles": {"Severe": 10, "High": 0, "Moderate": 0, "Low": 0, "No Travel": 0},
            "avg_risk": 3, "time": 100
        },
        {
            "id": "R2", 
            "miles": {"Severe": 0, "High": 10, "Moderate": 0, "Low": 0, "No Travel": 0},
            "avg_risk": 2, "time": 110
        },
        {
            "id": "R3", 
            "miles": {"Severe": 0, "High": 5, "Moderate": 0, "Low": 0, "No Travel": 0},
            "avg_risk": 2, "time": 120
        },
        {
            "id": "R4", 
            "miles": {"Severe": 0, "High": 5, "Moderate": 0, "Low": 0, "No Travel": 0},
            "avg_risk": 1, "time": 130
        },
        {
            "id": "R5", 
            "miles": {"Severe": 0, "High": 5, "Moderate": 0, "Low": 0, "No Travel": 0},
            "avg_risk": 1, "time": 110
        },
    ]
    # Priority 1: Fewest Severe (R2, R3, R4, R5)
    # Priority 2: Fewest High (R3, R4, R5 - all have 5)
    # Priority 3: Lowest Avg Risk (R4, R5 - both have 1)
    # Priority 4: Shortest Time (R5 - 110)
    assert recommend_best_route(routes)["id"] == "R5"
