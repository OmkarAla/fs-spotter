import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient, ApiError } from '../client';

const forecast = {
  job_id: 'job-1',
  forecast_hour: 12,
  forecast_time: '2026-10-20T20:00:00Z',
  routes: [],
};

describe('apiClient.getForecast', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('requests the forecast endpoint for the selected hour', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => forecast,
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiClient.getForecast('job-1', 12)).resolves.toEqual(forecast);

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/routes/job-1/forecast/?hour=12',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('uses VITE_API_URL when configured and adds https to a bare host', async () => {
    vi.stubEnv('VITE_API_URL', 'fs-spotter-api.onrender.com');
    vi.resetModules();
    const { apiClient: configuredClient } = await import('../client');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => forecast,
    });
    vi.stubGlobal('fetch', fetchMock);

    await configuredClient.getForecast('job-1', 12);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://fs-spotter-api.onrender.com/api/v1/routes/job-1/forecast/?hour=12',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('surfaces non-success responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        statusText: 'Conflict',
      }),
    );

    await expect(apiClient.getForecast('job-1', 12)).rejects.toThrow(
      '409 Conflict',
    );
  });

  it('uses the backend error message in ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({ error: 'Location search is not configured.' }),
      }),
    );

    const error = await apiClient.searchLocations('Berlin').catch((err) => err);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 503,
      message: 'Location search is not configured.',
    });
  });
});

describe('apiClient.searchLocations', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('encodes the query and returns locations', async () => {
    const results = [{
      label: 'New York, NY, USA',
      name: 'New York',
      latitude: 40.7128,
      longitude: -74.006,
      country_code: 'USA',
      timezone: 'America/New_York',
    }];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      apiClient.searchLocations('New York & Co'),
    ).resolves.toEqual(results);

    expect(fetchMock.mock.calls[0][0]).toBe(
      '/api/v1/geocode/?q=New%20York%20%26%20Co',
    );
  });
});
