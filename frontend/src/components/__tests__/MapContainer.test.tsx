import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { MapContainer } from '../MapContainer';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div data-testid="map">{children}</div>
  ),
  TileLayer: () => null,
  Polyline: () => null,
  CircleMarker: () => null,
  Tooltip: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Popup: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  useMap: () => ({ fitBounds: vi.fn(), invalidateSize: vi.fn() }),
}));

describe('MapContainer', () => {
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
});
