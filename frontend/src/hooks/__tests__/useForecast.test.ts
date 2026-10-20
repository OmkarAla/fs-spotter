import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useForecast } from '../useForecast';
import { useRouteStore } from '../../store/routeStore';
import { apiClient } from '../../api/client';
import type { RouteForecast, RouteResult } from '../../types/api';

vi.mock('../../api/client', () => ({
  apiClient: {
    triggerRoute: vi.fn(),
    getRouteStatus: vi.fn(),
    getForecast: vi.fn(),
  },
}));

const result: RouteResult = {
  job_id: 'job-1',
  recommended_route_id: 'route-1',
  routes: [],
};

const forecast: RouteForecast = {
  job_id: 'job-1',
  forecast_hour: 12,
  forecast_time: '2026-10-20T20:00:00Z',
  routes: [],
};

const flush = () => act(async () => {});

describe('useForecast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    useRouteStore.setState({
      currentJobId: 'job-1',
      jobStatus: 'COMPLETED',
      result,
      forecastTime: 12,
      forecast: null,
      forecastLoading: false,
      forecastError: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces the request and stores forecast data', async () => {
    vi.mocked(apiClient.getForecast).mockResolvedValue(forecast);

    renderHook(() => useForecast('job-1'));
    await flush();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(249);
    });
    expect(apiClient.getForecast).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(apiClient.getForecast).toHaveBeenCalledWith(
      'job-1',
      12,
      expect.any(AbortSignal),
    );
    expect(useRouteStore.getState().forecast).toEqual(forecast);
    expect(useRouteStore.getState().forecastLoading).toBe(false);
  });

  it('refetches when the forecast hour changes', async () => {
    vi.mocked(apiClient.getForecast).mockResolvedValue(forecast);

    renderHook(() => useForecast('job-1'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    act(() => {
      useRouteStore.getState().setForecastTime(24);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    expect(apiClient.getForecast).toHaveBeenLastCalledWith(
      'job-1',
      24,
      expect.any(AbortSignal),
    );
  });

  it('does not fetch until the job is complete', async () => {
    useRouteStore.setState({ jobStatus: 'PROCESSING' });

    renderHook(() => useForecast('job-1'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(apiClient.getForecast).not.toHaveBeenCalled();
  });

  it('records forecast errors without dropping the results workspace', async () => {
    vi.mocked(apiClient.getForecast).mockRejectedValue(new Error('network'));

    renderHook(() => useForecast('job-1'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    expect(useRouteStore.getState().forecastError).toBe(
      'Forecast unavailable — showing route-time risk.',
    );
    expect(useRouteStore.getState().result).toBe(result);
  });
});
