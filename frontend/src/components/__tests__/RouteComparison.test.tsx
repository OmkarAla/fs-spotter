import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RouteComparison } from '../RouteComparison';
import type { RouteResult } from '../../types/api';

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
    {
      route_id: 'route-3',
      polyline: 'poly-3',
      total_distance: 1300,
      total_time: 79200,
      risk_miles: { Low: 700, Severe: 600 },
      total_risk_score: 1800,
      checkpoints: [],
    },
  ],
};

describe('RouteComparison', () => {
  it('shows all routes with distance, time, and high-risk miles', () => {
    render(
      <RouteComparison
        result={result}
        selectedRouteId="route-2"
        onSelectRoute={() => {}}
      />,
    );

    expect(screen.getByText('Route 1')).toBeInTheDocument();
    expect(screen.getByText('Route 2')).toBeInTheDocument();
    expect(screen.getByText('Route 3')).toBeInTheDocument();
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(screen.getAllByText(/1,100 mi/).length).toBeGreaterThan(0);
    expect(screen.getByText(/19h 0m/)).toBeInTheDocument();
    expect(screen.getByText(/600 high-risk mi/)).toBeInTheDocument();
  });

  it('selects a route when its card is clicked', () => {
    const onSelectRoute = vi.fn();

    render(
      <RouteComparison
        result={result}
        selectedRouteId="route-2"
        onSelectRoute={onSelectRoute}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /select route 1/i }));

    expect(onSelectRoute).toHaveBeenCalledWith('route-1');
  });

  it('supports keyboard selection without invalid button markup', () => {
    const onSelectRoute = vi.fn();

    render(
      <RouteComparison
        result={result}
        selectedRouteId="route-2"
        onSelectRoute={onSelectRoute}
      />,
    );

    const card = screen.getByRole('button', { name: /select route 1/i });
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });

    expect(card).toHaveAttribute('role', 'button');
    expect(card).not.toHaveAttribute('type');
    expect(onSelectRoute).toHaveBeenNthCalledWith(1, 'route-1');
    expect(onSelectRoute).toHaveBeenNthCalledWith(2, 'route-1');
  });
});
