import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { useRouteStore } from '../store/routeStore';
import type { RouteResult } from '../types/api';

vi.mock('../components/MapContainer', () => ({
  MapContainer: ({
    selectedRouteId,
  }: {
    selectedRouteId: string | null;
  }) => <div data-testid="route-map" data-selected-route={selectedRouteId} />,
}));

const result: RouteResult = {
  job_id: 'job-1',
  recommended_route_id: 'route-2',
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
  routes: [
    {
      route_id: 'route-1',
      label: 'Fastest',
      polyline: 'poly-1',
      total_distance: 1200,
      total_time: 72000,
      risk_miles: { Low: 900, High: 300 },
      total_risk_score: 600,
      checkpoints: [],
    },
    {
      route_id: 'route-2',
      label: 'Balanced',
      polyline: 'poly-2',
      total_distance: 1100,
      total_time: 68400,
      risk_miles: { Low: 1000, High: 100 },
      total_risk_score: 200,
      checkpoints: [],
    },
  ],
};

describe('App results workspace', () => {
  beforeEach(() => {
    useRouteStore.setState({
      currentJobId: 'job-1',
      jobStatus: 'COMPLETED',
      result,
      forecastTime: 12,
      unitSystem: 'imperial',
      jobError: null,
    });
  });

  it('shows the forecast slider, comparison cards, and map after completion', () => {
    render(<App />);

    expect(screen.getByLabelText(/forecast horizon/i)).toBeInTheDocument();
    expect(screen.getByText('Fastest')).toBeInTheDocument();
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(screen.getByTestId('route-map')).toHaveAttribute(
      'data-selected-route',
      'route-2',
    );
  });

  it('updates the map when another route is selected', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /select route 1/i }));

    expect(screen.getByTestId('route-map')).toHaveAttribute(
      'data-selected-route',
      'route-1',
    );
  });

  it('resets to the recommendation when a new job completes', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /select route 1/i }));
    expect(screen.getByTestId('route-map')).toHaveAttribute(
      'data-selected-route',
      'route-1',
    );

    act(() => {
      useRouteStore.setState({
        currentJobId: 'job-2',
        jobStatus: 'PENDING',
        result: null,
      });
    });
    act(() => {
      useRouteStore.setState({
        jobStatus: 'COMPLETED',
        result: { ...result, job_id: 'job-2' },
      });
    });

    expect(screen.getByTestId('route-map')).toHaveAttribute(
      'data-selected-route',
      'route-2',
    );
  });
});
