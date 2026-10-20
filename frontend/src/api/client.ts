import { RouteForecast, RouteRequest, RouteJob } from '../types/api';

export const apiClient = {
  async triggerRoute(data: RouteRequest): Promise<RouteJob> {
    const response = await fetch('/api/v1/routes/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },

  async getForecast(
    id: string,
    hour: number,
    signal?: AbortSignal,
  ): Promise<RouteForecast> {
    const response = await fetch(
      `/api/v1/routes/${encodeURIComponent(id)}/forecast/?hour=${hour}`,
      { method: 'GET', signal },
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },

  async getRouteStatus(id: string): Promise<RouteJob> {
    const response = await fetch(`/api/v1/routes/${id}/`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },
};
