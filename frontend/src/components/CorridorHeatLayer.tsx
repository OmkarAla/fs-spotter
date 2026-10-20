import L from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { HeatPoint } from '../utils/geo';

// leaflet.heat is a legacy plugin that reads Leaflet from the global scope.
(globalThis as typeof globalThis & { L?: typeof L }).L = L;

const HEAT_GRADIENT = {
  0.0: '#10B981',
  0.35: '#F59E0B',
  0.6: '#EF4444',
  0.82: '#B91C1C',
  1.0: '#7F1D1D',
};

interface CorridorHeatLayerProps {
  points: HeatPoint[];
}

export const CorridorHeatLayer = ({ points }: CorridorHeatLayerProps) => {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;

    let active = true;
    let layer: L.HeatLayer | null = null;

    import('leaflet.heat').then(() => {
      if (!active) return;
      layer = L.heatLayer(points, {
        radius: 34,
        blur: 28,
        maxZoom: 9,
        minOpacity: 0.18,
        gradient: HEAT_GRADIENT,
      });
      layer.addTo(map);
    });

    return () => {
      active = false;
      if (layer) {
        map.removeLayer(layer);
      }
    };
  }, [map, points]);

  return null;
};
