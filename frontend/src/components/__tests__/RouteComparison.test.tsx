import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteComparison } from '../RouteComparison';
import { useRouteStore } from '../../store/routeStore';
import type { RouteResult } from '../../types/api';

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
    {
      route_id: 'route-3',
      label: 'Scenic',
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
  beforeEach(() => {
    useRouteStore.setState({ unitSystem: 'imperial' });
  });

  it('shows all routes with labels, distance, time, and high-risk distance', () => {
    render(
      <RouteComparison
        result={result}
        selectedRouteId="route-2"
        onSelectRoute={() => {}}
      />,
    );

    expect(screen.getByText('Fastest')).toBeInTheDocument();
    expect(screen.getByText('Balanced')).toBeInTheDocument();
    expect(screen.getByText('Scenic')).toBeInTheDocument();
    expect(screen.getByText('Recommended')).toBeInTheDocument();
    expect(screen.getAllByText(/1,100 mi/).length).toBeGreaterThan(0);
    expect(screen.getByText(/19h 0m/)).toBeInTheDocument();
    expect(screen.getByLabelText('Route comparison')).toHaveClass(
      'md:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]',
    );
  });

  it('formats distances in the selected unit system', () => {
    useRouteStore.setState({ unitSystem: 'metric' });

    render(
      <RouteComparison
        result={result}
        selectedRouteId="route-2"
        onSelectRoute={() => {}}
      />,
    );

    expect(screen.getAllByText(/1,931 km/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/483 km/).length).toBeGreaterThan(0);
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
