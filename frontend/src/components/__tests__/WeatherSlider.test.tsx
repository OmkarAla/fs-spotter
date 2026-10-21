import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { WeatherSlider } from '../WeatherSlider';
import { useRouteStore } from '../../store/routeStore';
import type { RouteForecast, RouteResult } from '../../types/api';

const result: RouteResult = {
  job_id: 'job-1',
  recommended_route_id: null,
  origin: {
    label: 'Berlin, Germany',
    name: 'Berlin',
    latitude: 52.517,
    longitude: 13.388,
    country_code: 'DEU',
    timezone: 'Europe/Berlin',
  },
  destination: {
    label: 'Munich, Germany',
    name: 'Munich',
    latitude: 48.137,
    longitude: 11.575,
    country_code: 'DEU',
    timezone: 'Europe/Berlin',
  },
  departure_time: '2026-10-21T08:00:00Z',
  unit_system: 'imperial',
  routes: [],
};

const forecast: RouteForecast = {
  job_id: 'job-1',
  forecast_hour: 12,
  forecast_time: '2026-10-20T20:00:00Z',
  routes: [],
};

describe('WeatherSlider', () => {
  beforeEach(() => {
    useRouteStore.setState({
      forecastTime: 0,
      forecast: null,
      forecastError: null,
      result: null,
    });
  });

  it('updates the forecast horizon in the route store', () => {
    render(<WeatherSlider />);

    fireEvent.change(screen.getByLabelText(/forecast horizon/i), {
      target: { value: '24' },
    });

    expect(useRouteStore.getState().forecastTime).toBe(24);
    expect(screen.getAllByText('+24h').length).toBeGreaterThan(0);
  });

  it('formats the forecast time in the origin timezone', () => {
    useRouteStore.setState({ forecast, result });

    render(<WeatherSlider />);

    expect(
      screen.getByText(/Corridor valid Oct 20, 10:00 PM/),
    ).toBeInTheDocument();
  });
});
