import { fireEvent, render, screen } from '@testing-library/react';
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
  routes: [
    {
      route_id: 'route-1',
      polyline: 'poly-1',
      total_distance: 1200,
      total_time: 72000,
      risk_miles: { Low: 900, High: 300 },
      total_risk_score: 600,
      checkpoints: [],
    },
    {
      route_id: 'route-2',
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
    });
  });

  it('shows the forecast slider, comparison cards, and map after completion', () => {
    render(<App />);

    expect(screen.getByLabelText(/forecast horizon/i)).toBeInTheDocument();
    expect(screen.getByText('Route 1')).toBeInTheDocument();
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
});
