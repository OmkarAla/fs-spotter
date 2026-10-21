import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RouteControls } from '../RouteControls';
import { apiClient } from '../../api/client';
import { useRouteStore } from '../../store/routeStore';

const { BERLIN, MUNICH, NEW_YORK } = vi.hoisted(() => ({
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
  NEW_YORK: {
    label: 'New York, NY, USA',
    name: 'New York',
    latitude: 40.7128,
    longitude: -74.006,
    country_code: 'USA',
    timezone: 'America/New_York',
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
    onChange: (value: typeof BERLIN | typeof NEW_YORK | null) => void;
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
      {id === 'origin' && (
        <button type="button" onClick={() => onChange(NEW_YORK)}>
          Pick USA Origin
        </button>
      )}
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

const fillRoute = (weight = '20000') => {
  fireEvent.click(screen.getByRole('button', { name: 'Pick Origin' }));
  fireEvent.click(screen.getByRole('button', { name: 'Pick Destination' }));
  fireEvent.click(screen.getByRole('button', { name: 'Set departure' }));
  fireEvent.change(screen.getByLabelText(/load weight/i), {
    target: { value: weight },
  });
};

const weightInput = () =>
  screen.getByLabelText(/load weight/i) as HTMLInputElement;

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

  it('defaults a German origin to metric and sends the global contract', async () => {
    vi.mocked(apiClient.triggerRoute).mockResolvedValue({
      id: 'job-123',
      status: 'PENDING',
      created_at: '2026-10-20T10:00:00Z',
    });

    render(<RouteControls />);
    fillRoute();

    expect(screen.getByLabelText(/load weight \(kg\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /find safest route/i }));

    await waitFor(() => {
      expect(apiClient.triggerRoute).toHaveBeenCalledWith({
        origin: BERLIN,
        destination: MUNICH,
        departure_date: '2026-10-21',
        departure_time: '10:00',
        load_weight: 20000,
        load_weight_unit: 'kg',
        unit_system: 'metric',
      });
      expect(useRouteStore.getState().currentJobId).toBe('job-123');
      expect(useRouteStore.getState().unitSystem).toBe('metric');
    });
  });

  it('defaults a US origin to imperial', () => {
    render(<RouteControls />);

    fireEvent.click(screen.getByRole('button', { name: 'Pick USA Origin' }));

    expect(screen.getByLabelText(/load weight \(lb\)/i)).toBeInTheDocument();
    expect(useRouteStore.getState().unitSystem).toBe('imperial');
  });

  it('reveals the origin timezone once an origin is selected', () => {
    render(<RouteControls />);

    expect(screen.getByText('tz:none')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pick Origin' }));

    expect(screen.getByText('tz:Europe/Berlin')).toBeInTheDocument();
  });

  it('converts the entered weight when the unit toggle changes', () => {
    render(<RouteControls />);

    fireEvent.change(weightInput(), { target: { value: '10000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Metric (km/kg)' }));

    expect(weightInput().value).toBe('4535.92');
    expect(screen.getByLabelText(/load weight \(kg\)/i)).toBeInTheDocument();
  });

  it('swaps the origin and destination', () => {
    render(<RouteControls />);
    fireEvent.click(screen.getByRole('button', { name: 'Pick Origin' }));
    fireEvent.click(screen.getByRole('button', { name: 'Pick Destination' }));

    fireEvent.click(
      screen.getByRole('button', { name: 'Swap origin and destination' }),
    );

    expect(screen.getByText('Origin: Munich')).toBeInTheDocument();
    expect(screen.getByText('Destination: Berlin')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /find safest route/i }),
    ).toBeDisabled();
  });

  it('disables submit until the route inputs are complete', () => {
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
