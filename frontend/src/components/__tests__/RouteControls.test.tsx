import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteControls } from '../RouteControls';
import { apiClient } from '../../api/client';
import { useRouteStore } from '../../store/routeStore';

const { BERLIN, MUNICH } = vi.hoisted(() => ({
  BERLIN: {
    label: 'Berlin, Germany',
    name: 'Berlin',
    latitude: 52.517,
    longitude: 13.388,
    country_code: 'DEU',
    timezone: 'Europe/Berlin',
  },
  MUNICH: {
    label: 'Munich, Germany',
    name: 'Munich',
    latitude: 48.137,
    longitude: 11.575,
    country_code: 'DEU',
    timezone: 'Europe/Berlin',
  },
}));

vi.mock('../../api/client', () => ({
  apiClient: {
    triggerRoute: vi.fn(),
    getRouteStatus: vi.fn(),
    searchLocations: vi.fn(),
  },
}));

vi.mock('../LocationCombobox', () => ({
  LocationCombobox: ({
    id,
    label,
    value,
    onChange,
  }: {
    id: string;
    label: string;
    value: { name: string } | null;
    onChange: (value: typeof BERLIN | null) => void;
  }) => (
    <div>
      <span>
        {label}: {value?.name ?? 'none'}
      </span>
      <button
        type="button"
        onClick={() => onChange(id === 'origin' ? BERLIN : MUNICH)}
      >
        Pick {label}
      </button>
    </div>
  ),
}));

vi.mock('../DeparturePicker', () => ({
  DeparturePicker: ({
    timeZone,
    onChange,
  }: {
    timeZone: string | null;
    onChange: (date: string, time: string) => void;
  }) => (
    <div>
      <span>tz:{timeZone ?? 'none'}</span>
      <button
        type="button"
        onClick={() => onChange('2026-10-21', '10:00')}
      >
        Set departure
      </button>
    </div>
  ),
}));

const fillRoute = (weight = '45000') => {
  fireEvent.click(screen.getByRole('button', { name: 'Pick Origin' }));
  fireEvent.click(screen.getByRole('button', { name: 'Pick Destination' }));
  fireEvent.click(screen.getByRole('button', { name: 'Set departure' }));
  fireEvent.change(screen.getByLabelText(/load weight/i), {
    target: { value: weight },
  });
};

describe('RouteControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRouteStore.setState({
      currentJobId: null,
      jobStatus: null,
      jobError: null,
      unitSystem: 'imperial',
      result: null,
    });
  });

  it('sends the global routing contract and stores the job id', async () => {
    vi.mocked(apiClient.triggerRoute).mockResolvedValue({
      id: 'job-123',
      status: 'PENDING',
      created_at: '2026-10-20T10:00:00Z',
    });

    render(<RouteControls />);
    fillRoute();

    fireEvent.click(screen.getByRole('button', { name: /find safest route/i }));

    await waitFor(() => {
      expect(apiClient.triggerRoute).toHaveBeenCalledWith({
        origin: BERLIN,
        destination: MUNICH,
        departure_date: '2026-10-21',
        departure_time: '10:00',
        load_weight: 45000,
        load_weight_unit: 'lb',
        unit_system: 'imperial',
      });
      expect(useRouteStore.getState().currentJobId).toBe('job-123');
    });
  });

  it('reveals the origin timezone once an origin is selected', () => {
    render(<RouteControls />);

    expect(screen.getByText('tz:none')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pick Origin' }));

    expect(screen.getByText('tz:Europe/Berlin')).toBeInTheDocument();
  });

  it('switches the weight unit and request when metric is selected', async () => {
    vi.mocked(apiClient.triggerRoute).mockResolvedValue({
      id: 'job-metric',
      status: 'PENDING',
      created_at: '2026-10-20T10:00:00Z',
    });

    render(<RouteControls />);
    fireEvent.click(screen.getByRole('button', { name: /metric/i }));

    expect(screen.getByLabelText(/load weight \(kg\)/i)).toBeInTheDocument();

    fillRoute('20000');
    fireEvent.click(screen.getByRole('button', { name: /find safest route/i }));

    await waitFor(() => {
      expect(apiClient.triggerRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          load_weight: 20000,
          load_weight_unit: 'kg',
          unit_system: 'metric',
        }),
      );
    });
  });

  it('disables submit until origin and destination are chosen', () => {
    render(<RouteControls />);

    expect(
      screen.getByRole('button', { name: /find safest route/i }),
    ).toBeDisabled();
  });

  it('surfaces the backend error when routing cannot start', async () => {
    vi.mocked(apiClient.triggerRoute).mockRejectedValue(
      new Error('No truck route found between these locations.'),
    );

    render(<RouteControls />);
    fillRoute();
    fireEvent.click(screen.getByRole('button', { name: /find safest route/i }));

    await waitFor(() => {
      expect(
        screen.getByText('No truck route found between these locations.'),
      ).toBeInTheDocument();
    });
    expect(useRouteStore.getState().currentJobId).toBeNull();
  });
});
