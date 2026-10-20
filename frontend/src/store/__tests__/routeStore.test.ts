import { beforeEach, describe, expect, it } from 'vitest';
import { useRouteStore } from '../routeStore';

const forecast = {
  job_id: 'job-1',
  forecast_hour: 12,
  forecast_time: '2026-10-20T20:00:00Z',
  routes: [],
};

describe('routeStore forecast state', () => {
  beforeEach(() => {
    useRouteStore.setState({
      currentJobId: 'job-1',
      jobStatus: 'COMPLETED',
      result: null,
      forecastTime: 12,
      forecast,
      forecastLoading: false,
      forecastError: null,
    });
  });

  it('stores forecast data and loading/error state', () => {
    useRouteStore.getState().setForecast(forecast);
    useRouteStore.getState().setForecastLoading(true);
    useRouteStore.getState().setForecastError('offline');

    expect(useRouteStore.getState().forecast).toEqual(forecast);
    expect(useRouteStore.getState().forecastLoading).toBe(true);
    expect(useRouteStore.getState().forecastError).toBe('offline');
  });

  it('clears forecast data when a new job starts', () => {
    useRouteStore.getState().setJob('job-2');

    expect(useRouteStore.getState().currentJobId).toBe('job-2');
    expect(useRouteStore.getState().forecast).toBeNull();
    expect(useRouteStore.getState().forecastError).toBeNull();
    expect(useRouteStore.getState().forecastLoading).toBe(false);
  });
});
