import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { WeatherSlider } from '../WeatherSlider';
import { useRouteStore } from '../../store/routeStore';

describe('WeatherSlider', () => {
  beforeEach(() => {
    useRouteStore.setState({ forecastTime: 0 });
  });

  it('updates the forecast horizon in the route store', () => {
    render(<WeatherSlider />);

    fireEvent.change(screen.getByLabelText(/forecast horizon/i), {
      target: { value: '24' },
    });

    expect(useRouteStore.getState().forecastTime).toBe(24);
    expect(screen.getAllByText('+24h').length).toBeGreaterThan(0);
  });
});
