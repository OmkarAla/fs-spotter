import { create } from 'zustand';
import type { RouteForecast, RouteResult } from '../types/api';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | null;

interface RouteState {
  currentJobId: string | null;
  jobStatus: JobStatus;
  result: RouteResult | null;
  forecastTime: number;
  forecast: RouteForecast | null;
  forecastLoading: boolean;
  forecastError: string | null;
  setJob: (id: string) => void;
  updateStatus: (status: JobStatus) => void;
  setResult: (result: RouteResult) => void;
  setForecastTime: (time: number) => void;
  setForecast: (forecast: RouteForecast | null) => void;
  setForecastLoading: (loading: boolean) => void;
  setForecastError: (error: string | null) => void;
}

export const useRouteStore = create<RouteState>((set) => ({
  currentJobId: null,
  jobStatus: null,
  result: null,
  forecastTime: 48,
  forecast: null,
  forecastLoading: false,
  forecastError: null,
  setJob: (id) =>
    set({
      currentJobId: id,
      jobStatus: 'PENDING',
      result: null,
      forecast: null,
      forecastLoading: false,
      forecastError: null,
    }),
  updateStatus: (status) => set({ jobStatus: status }),
  setResult: (result) => set({ result }),
  setForecastTime: (time) => set({ forecastTime: time }),
  setForecast: (forecast) => set({ forecast }),
  setForecastLoading: (forecastLoading) => set({ forecastLoading }),
  setForecastError: (forecastError) => set({ forecastError }),
}));
