import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { JobStatus } from '../JobStatus';
import { useRouteStore } from '../../store/routeStore';
import type { RouteResult } from '../../types/api';

const result: RouteResult = {
  job_id: 'job-1',
  recommended_route_id: 'route-3',
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
      total_distance: 930,
      total_time: 54000,
      risk_miles: { Low: 930 },
      total_risk_score: 0,
      checkpoints: [],
    },
    {
      route_id: 'route-3',
      label: 'Balanced',
      polyline: 'poly-3',
      total_distance: 1028,
      total_time: 63720,
      risk_miles: {
        Low: 628,
        High: 225,
        Severe: 125,
        'No Travel': 50,
      },
      total_risk_score: 950,
      checkpoints: [],
    },
  ],
};

describe('JobStatus', () => {
  beforeEach(() => {
    useRouteStore.setState({
      currentJobId: 'job-1',
      jobStatus: 'COMPLETED',
      result,
      forecastTime: 48,
      jobError: null,
      unitSystem: 'imperial',
    });
  });

  it('includes no-travel miles in the recommendation summary', () => {
    render(<JobStatus />);

    expect(screen.getByText(/400 mi high-risk/)).toBeInTheDocument();
  });

  it('converts the recommendation summary to metric distances', () => {
    useRouteStore.setState({ unitSystem: 'metric' });

    render(<JobStatus />);

    expect(screen.getByText(/644 km high-risk/)).toBeInTheDocument();
    expect(screen.getByText(/1,654 km/)).toBeInTheDocument();
  });

  it('shows the backend error when the job fails', () => {
    useRouteStore.setState({
      jobStatus: 'FAILED',
      result: null,
      jobError: 'No truck route found between these locations.',
    });

    render(<JobStatus />);

    expect(
      screen.getByText('No truck route found between these locations.'),
    ).toBeInTheDocument();
  });
});
