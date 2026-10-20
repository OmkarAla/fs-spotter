import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../client';

const forecast = {
  job_id: 'job-1',
  forecast_hour: 12,
  forecast_time: '2026-10-20T20:00:00Z',
  routes: [],
};

describe('apiClient.getForecast', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
});
