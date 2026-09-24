'use client';

import * as React from 'react';
import { MapPin } from 'lucide-react';
import type * as L from 'leaflet';
import { Spinner } from '@/components/ui/spinner';
import { logger } from '@/lib/utils/logger';

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle?: string;
  status?: string;
  category?: string;
  venueName?: string;
  onClick?: () => void;
}

export interface ExoraMapProps {
  markers?: MapMarker[];
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  className?: string;
  interactive?: boolean;
  onMarkerClick?: (marker: MapMarker) => void;
  selectedMarkerId?: string | null;
  emptyMessage?: string;
}

/**
 * Creates custom Exora styled marker icon using Leaflet DivIcon.
 * Bypasses default Leaflet image asset URLs which fail in bundled Next.js production builds.
 */
function createExoraDivIcon(leaflet: typeof L, isSelected: boolean = false): L.DivIcon {
  const borderColor = isSelected ? '#1557FF' : '#4f46e5';
  const size = isSelected ? 38 : 34;
  const anchor = size / 2;

  const html = `
    <div style="display: flex; align-items: center; justify-content: center; width: ${size}px; height: ${size}px; transform: translate(-${anchor}px, -${anchor}px);">
      <div style="width: ${size}px; height: ${size}px; border-radius: 9999px; background: #ffffff; border: ${isSelected ? '3px' : '2.5px'} solid ${borderColor}; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1); cursor: pointer; transition: transform 0.15s ease-out;">
        <svg style="width: ${size - 16}px; height: ${size - 16}px; color: ${borderColor};" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    </div>
  `;

  return leaflet.divIcon({
    className: 'exora-custom-pin',
    html,
    iconSize: [size, size],
    iconAnchor: [0, 0],
    popupAnchor: [0, -anchor - 4],
  });
}

function getPopupHtml(markerData: MapMarker): string {
  const title = (markerData.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const subtitle = (markerData.subtitle || markerData.venueName || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const category = (markerData.category || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `
    <div style="font-family: Inter, ui-sans-serif, system-ui, sans-serif; padding: 2px; min-width: 170px;">
      <div style="font-weight: 600; font-size: 13px; color: #0f172a; line-height: 1.3; margin-bottom: 2px;">${title}</div>
      ${subtitle ? `<div style="font-size: 11px; color: #64748b; line-height: 1.3;">${subtitle}</div>` : ''}
      ${
        category
          ? `<div style="display: inline-block; margin-top: 6px; text-transform: uppercase; font-size: 9px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe;">${category}</div>`
          : ''
      }
    </div>
  `;
}

export function ExoraMap({
  markers = [],
  center,
  zoom = 12,
  className = 'w-full h-80 rounded-xl overflow-hidden',
  interactive = true,
  onMarkerClick,
  selectedMarkerId,
  emptyMessage,
}: ExoraMapProps) {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapInstanceRef = React.useRef<L.Map | null>(null);
  const markersLayerRef = React.useRef<L.LayerGroup | null>(null);
  const markerMapRef = React.useRef<Map<string, { marker: L.Marker; data: MapMarker }>>(new Map());
  const leafletRef = React.useRef<typeof L | null>(null);
  const [isMapLoaded, setIsMapLoaded] = React.useState(false);

  // Filter valid geographic coordinates
  const validMarkers = React.useMemo(() => {
    return markers.filter(
      (m) =>
        typeof m.latitude === 'number' &&
        typeof m.longitude === 'number' &&
        !isNaN(m.latitude) &&
        !isNaN(m.longitude) &&
        m.latitude >= -90 &&
        m.latitude <= 90 &&
        m.longitude >= -180 &&
        m.longitude <= 180
    );
  }, [markers]);

  // Initialize Leaflet map instance
  React.useEffect(() => {
    if (!mapContainerRef.current) return;

    let isMounted = true;
    const container = mapContainerRef.current;
    const markerMap = markerMapRef.current;

    const initMap = async () => {
      try {
        const leaflet = (await import('leaflet')).default as unknown as typeof L;
        leafletRef.current = leaflet;

        if (!isMounted || !mapContainerRef.current) return;

        const containerEl = container as HTMLElement & { _leaflet_id?: number };
        if (containerEl._leaflet_id) {
          delete containerEl._leaflet_id;
        }

        const initialLat = center ? center[1] : 20.5937;
        const initialLng = center ? center[0] : 78.9629;

        const map = leaflet.map(container, {
          center: [initialLat, initialLng],
          zoom,
          zoomControl: interactive,
          dragging: interactive,
          touchZoom: interactive,
          scrollWheelZoom: interactive,
          doubleClickZoom: interactive,
          boxZoom: interactive,
          keyboard: interactive,
          attributionControl: true,
        });

        // Configurable OpenStreetMap tile layer with required attribution
        const tileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
        leaflet.tileLayer(tileUrl, {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        const markersLayer = leaflet.layerGroup().addTo(map);
        markersLayerRef.current = markersLayer;
        mapInstanceRef.current = map;

        if (isMounted) {
          setIsMapLoaded(true);
        }
      } catch (err: unknown) {
        const error = err as Error;
        logger.warn(`Leaflet: Initialization failed (${error?.message || 'unknown error'})`);
      }
    };

    initMap();

    // ResizeObserver to ensure map tiles redraw on responsive container resizing
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    resizeObserver.observe(container);

    return () => {
      isMounted = false;
      resizeObserver.disconnect();

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      const containerEl = container as HTMLElement & { _leaflet_id?: number };
      if (containerEl._leaflet_id) {
        delete containerEl._leaflet_id;
      }
      markersLayerRef.current = null;
      markerMap.clear();
      setIsMapLoaded(false);
    };
  }, [center, zoom, interactive]);

  // Update markers when validMarkers change
  React.useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    const leaflet = leafletRef.current;

    if (!map || !markersLayer || !leaflet || !isMapLoaded) return;

    markersLayer.clearLayers();
    markerMapRef.current.clear();

    if (validMarkers.length === 0) return;

    const latLngs: [number, number][] = [];

    validMarkers.forEach((markerData) => {
      const isSelected = selectedMarkerId === markerData.id;
      const icon = createExoraDivIcon(leaflet, isSelected);

      const marker = leaflet.marker([markerData.latitude, markerData.longitude], { icon });
      marker.bindPopup(getPopupHtml(markerData));

      marker.on('click', () => {
        marker.openPopup();
        if (markerData.onClick) markerData.onClick();
        if (onMarkerClick) onMarkerClick(markerData);
      });

      markersLayer.addLayer(marker);
      markerMapRef.current.set(markerData.id, { marker, data: markerData });
      latLngs.push([markerData.latitude, markerData.longitude]);
    });

    // Fit bounds or center map if not focusing on a specific marker
    if (!selectedMarkerId || selectedMarkerId === 'all') {
      if (validMarkers.length === 1) {
        map.setView([validMarkers[0].latitude, validMarkers[0].longitude], 14);
      } else if (validMarkers.length > 1) {
        const bounds = leaflet.latLngBounds(latLngs.map(([lat, lng]) => leaflet.latLng(lat, lng)));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    }
  }, [validMarkers, isMapLoaded, onMarkerClick, selectedMarkerId]);

  // Synchronize map focus and popup when selectedMarkerId changes
  React.useEffect(() => {
    const map = mapInstanceRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet || !isMapLoaded) return;

    if (!selectedMarkerId || selectedMarkerId === 'all') {
      map.closePopup();
      if (validMarkers.length > 1) {
        const bounds = leaflet.latLngBounds(validMarkers.map((m) => leaflet.latLng(m.latitude, m.longitude)));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      } else if (validMarkers.length === 1) {
        map.setView([validMarkers[0].latitude, validMarkers[0].longitude], 14);
      }
      return;
    }

    const item = markerMapRef.current.get(selectedMarkerId);
    if (item && item.marker) {
      const { marker, data } = item;
      map.panTo([data.latitude, data.longitude], { animate: true });
      marker.openPopup();
    }
  }, [selectedMarkerId, isMapLoaded, validMarkers]);

  // Zero valid coordinates or empty markers state
  if (validMarkers.length === 0) {
    return (
      <div
        className={`${className} bg-slate-50 border border-slate-200 flex flex-col items-center justify-center p-6 text-center space-y-2 relative`}
      >
        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
          <MapPin size={16} />
        </div>
        <p className="text-xs font-medium text-slate-500">
          {emptyMessage || (markers.length > 0 ? 'No exhibition locations configured yet.' : 'No exhibitions to display on map.')}
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
      {!isMapLoaded && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center backdrop-blur-xs z-20">
          <Spinner size="md" className="text-indigo-600" />
        </div>
      )}
    </div>
  );
}
