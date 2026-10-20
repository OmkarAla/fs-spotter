import { useEffect } from 'react';
import { apiClient } from '../api/client';
import { useRouteStore } from '../store/routeStore';

const FORECAST_DEBOUNCE_MS = 250;

export const useForecast = (jobId: string | null) => {
  const jobStatus = useRouteStore((state) => state.jobStatus);
  const forecastTime = useRouteStore((state) => state.forecastTime);
  const forecast = useRouteStore((state) => state.forecast);
  const setForecast = useRouteStore((state) => state.setForecast);
  const setForecastLoading = useRouteStore((state) => state.setForecastLoading);
  const setForecastError = useRouteStore((state) => state.setForecastError);

  useEffect(() => {
    if (!jobId || jobStatus !== 'COMPLETED') {
      return;
    }

    if (
      forecast?.job_id === jobId &&
      forecast.forecast_hour === forecastTime
    ) {
      return;
    }

    let active = true;
    const controller = new AbortController();
    setForecastLoading(true);

    const timer = setTimeout(async () => {
      try {
        const nextForecast = await apiClient.getForecast(
          jobId,
          forecastTime,
          controller.signal,
        );
        if (!active) return;
        setForecast(nextForecast);
        setForecastError(null);
      } catch {
        if (!active || controller.signal.aborted) return;
        setForecastError('Forecast unavailable — showing route-time risk.');
      } finally {
        if (active) {
          setForecastLoading(false);
        }
      }
    }, FORECAST_DEBOUNCE_MS);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [
    jobId,
    jobStatus,
    forecastTime,
    forecast?.job_id,
    forecast?.forecast_hour,
    setForecast,
    setForecastLoading,
    setForecastError,
  ]);
};
