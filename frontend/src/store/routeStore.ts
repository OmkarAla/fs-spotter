import { create } from 'zustand';
import type { RouteResult } from '../types/api';

export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | null;

interface RouteState {
  currentJobId: string | null;
  jobStatus: JobStatus;
  result: RouteResult | null;
  forecastTime: number;
  setJob: (id: string) => void;
  updateStatus: (status: JobStatus) => void;
  setResult: (result: RouteResult) => void;
  setForecastTime: (time: number) => void;
}

export const useRouteStore = create<RouteState>((set) => ({
  currentJobId: null,
  jobStatus: null,
  result: null,
  forecastTime: 48,
  setJob: (id) => set({ currentJobId: id, jobStatus: 'PENDING', result: null }),
  updateStatus: (status) => set({ jobStatus: status }),
  setResult: (result) => set({ result }),
  setForecastTime: (time) => set({ forecastTime: time }),
}));
