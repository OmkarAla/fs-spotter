from dataclasses import dataclass


@dataclass(frozen=True)
class Location:
    label: str
    latitude: float
    longitude: float
    country_code: str
    timezone: str


@dataclass(frozen=True)
class RoutePlan:
    route_id: str
    label: str
    polyline: str
    total_distance: float
    total_time: float
