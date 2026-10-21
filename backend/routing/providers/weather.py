from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from django.conf import settings

from routing.geometry import point_at_distance, polyline_length_miles

from .errors import ProviderError, ProviderRateLimited

GRID_INTERVAL_MILES = 10.0
MAX_COORDINATES_PER_REQUEST = 100
FORECAST_HORIZON_DAYS = 14


def _as_utc(value):
    if isinstance(value, str):
        value = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if value.tzinfo is None or value.utcoffset() is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _as_float(value):
    return float(value) if value is not None else 0.0


@dataclass
class WeatherGrid:
    points: list
    times: list
    wind: list
    rain: list
    snow: list

    def get(self, latitude, longitude, when):
        point_index = min(
            range(len(self.points)),
            key=lambda index: (
                (self.points[index][0] - latitude) ** 2
                + (self.points[index][1] - longitude) ** 2
            ),
        )
        target = _as_utc(when)
        time_index = min(
            range(len(self.times)),
            key=lambda index: abs((self.times[index] - target).total_seconds()),
        )
        return {
            'wind': _as_float(self.wind[point_index][time_index]),
            'rain': _as_float(self.rain[point_index][time_index]),
            'snow': _as_float(self.snow[point_index][time_index]),
        }


class OpenMeteoProvider:
    def __init__(self, base_url=None, timeout=None, session=None):
        self.base_url = (base_url or settings.OPEN_METEO_BASE_URL).rstrip('/')
        self.timeout = timeout or settings.PROVIDER_HTTP_TIMEOUT
        if session is None:
            import requests
            session = requests.Session()
        self.session = session

    def _request_hourly(self, coordinates, start_date, end_date):
        if not coordinates:
            return []

        max_date = (
            datetime.now(timezone.utc).date()
            + timedelta(days=FORECAST_HORIZON_DAYS)
        )
        if start_date > max_date:
            raise ProviderError(
                'Weather forecast is unavailable for this departure date.'
            )
        end_date = max(start_date, min(end_date, max_date))

        payload = []
        for offset in range(0, len(coordinates), MAX_COORDINATES_PER_REQUEST):
            chunk = coordinates[offset:offset + MAX_COORDINATES_PER_REQUEST]
            params = {
                'latitude': ','.join(f'{lat:.5f}' for lat, lon in chunk),
                'longitude': ','.join(f'{lon:.5f}' for lat, lon in chunk),
                'hourly': 'wind_speed_10m,rain,snowfall',
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'wind_speed_unit': 'mph',
                'precipitation_unit': 'inch',
                'timezone': 'UTC',
            }

            try:
                response = self.session.get(
                    f'{self.base_url}/v1/forecast',
                    params=params,
                    timeout=self.timeout,
                )
            except Exception as exc:
                raise ProviderError('Weather service is unavailable.') from exc

            if response.status_code == 429:
                raise ProviderRateLimited('Weather rate limit reached.')
            if response.status_code >= 400:
                raise ProviderError('Weather service returned an error.')

            chunk_payload = response.json()
            if isinstance(chunk_payload, dict):
                chunk_payload = [chunk_payload]
            if len(chunk_payload) != len(chunk):
                raise ProviderError(
                    'Weather service returned an unexpected payload.'
                )
            payload.extend(chunk_payload)

        return payload

    def get_weather_many(self, coordinates, when):
        target = _as_utc(when)
        payload = self._request_hourly(
            coordinates, target.date(), target.date()
        )
        results = []

        for item in payload:
            hourly = item['hourly']
            times = [
                datetime.fromisoformat(value).replace(tzinfo=timezone.utc)
                for value in hourly['time']
            ]
            index = min(
                range(len(times)),
                key=lambda i: abs((times[i] - target).total_seconds()),
            )
            results.append({
                'wind': _as_float(hourly['wind_speed_10m'][index]),
                'rain': _as_float(hourly['rain'][index]),
                'snow': _as_float(hourly['snowfall'][index]),
            })

        return results

    def build_grid(self, polyline_points, departure, arrival):
        if not polyline_points:
            return WeatherGrid([], [], [], [], [])

        departure = _as_utc(departure)
        arrival = _as_utc(arrival)
        total_distance = polyline_length_miles(polyline_points)
        coordinates = []
        cursor = 0.0

        while cursor < total_distance:
            coordinates.append(point_at_distance(polyline_points, cursor))
            cursor += GRID_INTERVAL_MILES
        coordinates.append(polyline_points[-1])

        end = min(
            departure + timedelta(days=16),
            max(arrival + timedelta(days=2), departure + timedelta(days=2)),
        )
        payload = self._request_hourly(coordinates, departure.date(), end.date())

        times = [
            datetime.fromisoformat(value).replace(tzinfo=timezone.utc)
            for value in payload[0]['hourly']['time']
        ]
        return WeatherGrid(
            points=coordinates,
            times=times,
            wind=[item['hourly']['wind_speed_10m'] for item in payload],
            rain=[item['hourly']['rain'] for item in payload],
            snow=[item['hourly']['snowfall'] for item in payload],
        )
