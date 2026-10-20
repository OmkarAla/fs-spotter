import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MapContainer } from '../MapContainer';
import type { RouteResult } from '../../types/api';

const leafletMock = vi.hoisted(() => ({
  polylines: [] as any[],
  markers: [] as any[],
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  TileLayer: () => null,
  Polyline: (props: any) => {
    leafletMock.polylines.push(props);
    return (
      <button
        data-testid="polyline"
        data-color={props.pathOptions?.color}
        data-weight={props.pathOptions?.weight}
        data-opacity={props.pathOptions?.opacity}
        onClick={props.eventHandlers?.click}
      />
    );
  },
  CircleMarker: (props: any) => {
    leafletMock.markers.push(props);
    return (
      <div
        data-testid="checkpoint"
        data-color={props.pathOptions?.color}
        data-radius={props.radius}
      >
        {props.children}
      </div>
    );
  },
  Tooltip: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Popup: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  useMap: () => ({ fitBounds: vi.fn(), invalidateSize: vi.fn() }),
}));

const result: RouteResult = {
  job_id: 'job-1',
  recommended_route_id: 'route-1',
  routes: [
    {
      route_id: 'route-1',
      polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      total_distance: 200,
      total_time: 36000,
      risk_miles: { Low: 100, High: 100 },
      total_risk_score: 200,
      checkpoints: [
        {
          latitude: 38.5,
          longitude: -120.2,
          estimated_arrival: '2026-10-20T08:00:00Z',
          weather_data: { wind: 10, rain: 0, snow: 0 },
          risk_level: 'Low',
          mile_marker: 0,
        },
        {
          latitude: 40.7,
          longitude: -120.95,
          estimated_arrival: '2026-10-21T08:00:00Z',
          weather_data: { wind: 40, rain: 0, snow: 0 },
          risk_level: 'High',
          mile_marker: 100,
        },
        {
          latitude: 43.252,
          longitude: -126.453,
          estimated_arrival: '2026-10-22T08:00:00Z',
          weather_data: { wind: 50, rain: 0.6, snow: 0 },
          risk_level: 'Severe',
          mile_marker: 190,
        },
      ],
    },
    {
      route_id: 'route-2',
      polyline: '_p~iF~ps|U_ulLnnqC_mqNvxq`@',
      total_distance: 180,
      total_time: 32400,
      risk_miles: { Low: 180 },
      total_risk_score: 0,
      checkpoints: [],
    },
  ],
};

describe('MapContainer', () => {
  beforeEach(() => {
    leafletMock.polylines.length = 0;
    leafletMock.markers.length = 0;
  });

  it('shows an empty state before results exist', () => {
    render(
      <MapContainer
        result={null}
        selectedRouteId={null}
        onSelectRoute={() => {}}
      />,
    );

    expect(screen.getByText(/your route map will appear here/i)).toBeInTheDocument();
  });

  it('renders the selected route risk segments and checkpoints', () => {
    render(
      <MapContainer
        result={result}
        selectedRouteId="route-1"
        onSelectRoute={() => {}}
        forecastTime={0}
      />,
    );

    const baseRoutes = screen
      .getAllByTestId('polyline')
      .filter((line) => ['4', '9'].includes(line.dataset.weight ?? ''));
    expect(baseRoutes).toHaveLength(2);
    expect(baseRoutes[0]).toHaveAttribute('data-color', '#F59E0B');
    expect(baseRoutes[1]).toHaveAttribute('data-color', '#64748B');

    const riskSegments = screen
      .getAllByTestId('polyline')
      .filter((line) => line.dataset.weight === '6');
    expect(riskSegments.map((line) => line.dataset.color)).toEqual([
      '#10B981',
      '#EF4444',
      '#B91C1C',
    ]);
    expect(riskSegments.map((line) => Number(line.dataset.opacity))).toEqual([
      1, 0.25, 0.25,
    ]);

    const checkpoints = screen.getAllByTestId('checkpoint');
    expect(checkpoints).toHaveLength(3);
    expect(checkpoints.map((marker) => Number(marker.dataset.radius))).toEqual([
      4, 2.5, 2.5,
    ]);
  });

  it('restores opacity for checkpoints inside a wider forecast horizon', () => {
    const { rerender } = render(
      <MapContainer
        result={result}
        selectedRouteId="route-1"
        onSelectRoute={() => {}}
        forecastTime={0}
      />,
    );

    rerender(
      <MapContainer
        result={result}
        selectedRouteId="route-1"
        onSelectRoute={() => {}}
        forecastTime={48}
      />,
    );

    const riskSegments = screen
      .getAllByTestId('polyline')
      .filter((line) => line.dataset.weight === '6');
    expect(riskSegments.map((line) => Number(line.dataset.opacity))).toEqual([
      1, 1, 1,
    ]);
    expect(
      screen.getAllByTestId('checkpoint').map((marker) => marker.dataset.radius),
    ).toEqual(['4', '4', '4']);
  });

  it('selects a route when its map line is clicked', () => {
    const onSelectRoute = vi.fn();

    render(
      <MapContainer
        result={result}
        selectedRouteId="route-1"
        onSelectRoute={onSelectRoute}
        forecastTime={48}
      />,
    );

    fireEvent.click(
      screen
        .getAllByTestId('polyline')
        .find((line) => line.dataset.color === '#64748B')!,
    );

    expect(onSelectRoute).toHaveBeenCalledWith('route-2');
  });
});
