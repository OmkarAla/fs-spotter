import {
  GeocodeResult,
  RouteForecast,
  RouteRequest,
  RouteJob,
} from '../types/api';

const configuredBaseUrl = (import.meta.env.VITE_API_URL ?? '').trim();
const API_BASE_URL = configuredBaseUrl
  ? `${configuredBaseUrl.startsWith('http') ? '' : 'https://'}${configuredBaseUrl}`.replace(/\/+$/, '')
  : '';

const apiUrl = (path: string): string => `${API_BASE_URL}${path}`;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

const responseError = async (response: Response): Promise<ApiError> => {
  let message = `API Error: ${response.status} ${response.statusText}`;
  try {
    const body = await response.json();
    message = body.error ?? body.detail ?? message;
  } catch {
    // Keep the status text fallback.
  }
  return new ApiError(response.status, message);
};

export const apiClient = {
  async triggerRoute(data: RouteRequest): Promise<RouteJob> {
    const response = await fetch(apiUrl('/api/v1/routes/'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw await responseError(response);
    }

    return response.json();
  },

  async getForecast(
    id: string,
    hour: number,
    signal?: AbortSignal,
  ): Promise<RouteForecast> {
    const response = await fetch(
      apiUrl(`/api/v1/routes/${encodeURIComponent(id)}/forecast/?hour=${hour}`),
      { method: 'GET', signal },
    );

    if (!response.ok) {
      throw await responseError(response);
    }

    return response.json();
  },

  async getRouteStatus(id: string): Promise<RouteJob> {
    const response = await fetch(apiUrl(`/api/v1/routes/${id}/`), {
      method: 'GET',
    });

    if (!response.ok) {
      throw await responseError(response);
    }

    return response.json();
  },

  async searchLocations(
    query: string,
    signal?: AbortSignal,
  ): Promise<GeocodeResult[]> {
    const response = await fetch(
      apiUrl(`/api/v1/geocode/?q=${encodeURIComponent(query)}`),
      { signal },
    );

    if (!response.ok) {
      throw await responseError(response);
    }

    const body = await response.json();
    return body.results ?? [];
  },
};
