import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DeparturePicker } from '../DeparturePicker';
import { timeZoneLabel } from '../../utils/datetime';

describe('DeparturePicker', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T10:07:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is disabled until an origin timezone exists', () => {
    render(
      <DeparturePicker
        timeZone={null}
        date=""
        time=""
        onChange={onChange}
      />,
    );

    expect(screen.getByText('Select an origin first.')).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Choose departure date'),
    ).not.toBeInTheDocument();
  });

  it('initializes to the next quarter hour in the origin timezone', () => {
    render(
      <DeparturePicker
        timeZone="America/New_York"
        date=""
        time=""
        onChange={onChange}
      />,
    );

    expect(onChange).toHaveBeenCalledWith('2026-10-21', '06:15');
  });

  it('emits the selected calendar day', () => {
    render(
      <DeparturePicker
        timeZone="America/New_York"
        date="2026-10-21"
        time="10:00"
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByLabelText('Choose departure date'));
    fireEvent.click(screen.getByRole('button', { name: '2026-10-22' }));

    expect(onChange).toHaveBeenCalledWith('2026-10-22', '10:00');
  });

  it('disables dates before today and beyond the forecast horizon', () => {
    render(
      <DeparturePicker
        timeZone="America/New_York"
        date="2026-10-21"
        time="10:00"
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByLabelText('Choose departure date'));

    expect(screen.getByRole('button', { name: '2026-10-20' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '2026-10-21' })).toBeEnabled();

    fireEvent.click(screen.getByLabelText('Next month'));

    expect(screen.getByRole('button', { name: '2026-11-04' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '2026-11-05' })).toBeDisabled();
  });

  it('emits hour and minute changes', () => {
    render(
      <DeparturePicker
        timeZone="America/New_York"
        date="2026-10-21"
        time="10:00"
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByLabelText('Departure hour'), {
      target: { value: '14' },
    });
    expect(onChange).toHaveBeenCalledWith('2026-10-21', '14:00');

    fireEvent.change(screen.getByLabelText('Departure minute'), {
      target: { value: '45' },
    });
    expect(onChange).toHaveBeenCalledWith('2026-10-21', '10:45');
  });

  it('shows the origin timezone label', () => {
    render(
      <DeparturePicker
        timeZone="America/New_York"
        date="2026-10-21"
        time="10:00"
        onChange={onChange}
      />,
    );

    expect(
      screen.getByText(timeZoneLabel('America/New_York')),
    ).toBeInTheDocument();
  });
});
