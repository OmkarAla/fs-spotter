import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RouteControls } from '../RouteControls';
import { apiClient } from '../../api/client';
import { useRouteStore } from '../../store/routeStore';

vi.mock('../../api/client', () => ({
  apiClient: {
    triggerRoute: vi.fn(),
    getRouteStatus: vi.fn(),
  },
}));

describe('RouteControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRouteStore.setState({ currentJobId: null, jobStatus: null, result: null });
  });

  it('sends the backend contract and stores the returned job id', async () => {
    vi.mocked(apiClient.triggerRoute).mockResolvedValue({
      id: 'job-123',
      status: 'PENDING',
      created_at: '2026-10-20T10:00:00Z',
    });

    render(<RouteControls />);

    fireEvent.change(screen.getByLabelText(/origin/i), { target: { value: 'New York' } });
    fireEvent.change(screen.getByLabelText(/destination/i), { target: { value: 'Washington' } });
    fireEvent.change(screen.getByLabelText(/departure time/i), { target: { value: '2026-10-20T10:00' } });
    fireEvent.change(screen.getByLabelText(/load weight/i), { target: { value: '5000' } });

    fireEvent.click(screen.getByText(/find safest route/i));

    await waitFor(() => {
      expect(apiClient.triggerRoute).toHaveBeenCalledWith({
        origin: 'New York',
        destination: 'Washington',
        departure_time: expect.any(String),
        load_weight: 5000,
      });
      expect(useRouteStore.getState().currentJobId).toBe('job-123');
      expect(useRouteStore.getState().jobStatus).toBe('PENDING');
    });
  });

  it('labels load weight in pounds to match backend thresholds', () => {
    render(<RouteControls />);

    expect(screen.getByLabelText(/load weight \(lb\)/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/kg/i)).not.toBeInTheDocument();
  });

  it('surfaces an error when the API call fails', async () => {
    vi.mocked(apiClient.triggerRoute).mockRejectedValue(new Error('boom'));

    render(<RouteControls />);

    fireEvent.change(screen.getByLabelText(/origin/i), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText(/destination/i), { target: { value: 'B' } });
    fireEvent.change(screen.getByLabelText(/departure time/i), { target: { value: '2026-10-20T10:00' } });
    fireEvent.change(screen.getByLabelText(/load weight/i), { target: { value: '1' } });
    fireEvent.click(screen.getByText(/find safest route/i));

    await waitFor(() => {
      expect(screen.getByText(/could not start routing/i)).toBeInTheDocument();
    });
    expect(useRouteStore.getState().currentJobId).toBeNull();
  });
});
