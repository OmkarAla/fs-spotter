import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { JobStatus } from '../JobStatus';
import { useRouteStore } from '../../store/routeStore';
import type { RouteResult } from '../../types/api';

const result: RouteResult = {
  job_id: 'job-1',
  recommended_route_id: 'route-3',
  routes: [
    {
      route_id: 'route-1',
      polyline: 'poly-1',
      total_distance: 930,
      total_time: 54000,
      risk_miles: { Low: 930 },
      total_risk_score: 0,
      checkpoints: [],
    },
    {
      route_id: 'route-3',
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
    });
  });

  it('includes no-travel miles in the recommendation summary', () => {
    render(<JobStatus />);

    expect(screen.getByText(/400 high-risk mi/)).toBeInTheDocument();
  });
});
