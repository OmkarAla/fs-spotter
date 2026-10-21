import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocationCombobox } from '../LocationCombobox';
import { apiClient } from '../../api/client';
import type { GeocodeResult } from '../../types/api';

vi.mock('../../api/client', () => ({
  apiClient: {
    searchLocations: vi.fn(),
  },
}));

const BERLIN: GeocodeResult = {
  label: 'Berlin, Germany',
  name: 'Berlin',
  latitude: 52.517,
  longitude: 13.388,
  country_code: 'DEU',
  timezone: 'Europe/Berlin',
};

const MUNICH: GeocodeResult = {
  label: 'Munich, Germany',
  name: 'Munich',
  latitude: 48.137,
  longitude: 11.575,
  country_code: 'DEU',
  timezone: 'Europe/Berlin',
};

const typeQuery = (value: string) => {
  fireEvent.change(screen.getByLabelText('Origin'), {
    target: { value },
  });
};

const advanceDebounce = async () => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(250);
  });
};

describe('LocationCombobox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('searches after the debounce once two characters are typed', async () => {
    vi.mocked(apiClient.searchLocations).mockResolvedValue([BERLIN]);
    render(
      <LocationCombobox
        id="origin"
        label="Origin"
        value={null}
        onChange={vi.fn()}
      />,
    );

    typeQuery('Be');
    await advanceDebounce();

    expect(apiClient.searchLocations).toHaveBeenCalledWith(
      'Be',
      expect.any(AbortSignal),
    );
    expect(screen.getByText('Berlin, Germany')).toBeInTheDocument();
  });

  it('calls onChange with the full result when an option is selected', async () => {
    vi.mocked(apiClient.searchLocations).mockResolvedValue([BERLIN]);
    const onChange = vi.fn();
    render(
      <LocationCombobox
        id="origin"
        label="Origin"
        value={null}
        onChange={onChange}
      />,
    );

    typeQuery('Berlin');
    await advanceDebounce();
    fireEvent.click(screen.getByRole('option'));

    expect(onChange).toHaveBeenCalledWith(BERLIN);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('clears the selected value when the text is edited', () => {
    const onChange = vi.fn();
    render(
      <LocationCombobox
        id="origin"
        label="Origin"
        value={BERLIN}
        onChange={onChange}
      />,
    );

    typeQuery('Ber');

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('supports arrow and enter keyboard selection', async () => {
    vi.mocked(apiClient.searchLocations).mockResolvedValue([BERLIN, MUNICH]);
    const onChange = vi.fn();
    render(
      <LocationCombobox
        id="origin"
        label="Origin"
        value={null}
        onChange={onChange}
      />,
    );

    typeQuery('Mun');
    await advanceDebounce();

    const input = screen.getByLabelText('Origin');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(MUNICH);
  });

  it('shows an error when location search fails', async () => {
    vi.mocked(apiClient.searchLocations).mockRejectedValue(new Error('offline'));
    render(
      <LocationCombobox
        id="origin"
        label="Origin"
        value={null}
        onChange={vi.fn()}
      />,
    );

    typeQuery('Berlin');
    await advanceDebounce();

    expect(
      screen.getByText('Location search is unavailable.'),
    ).toBeInTheDocument();
  });
});
