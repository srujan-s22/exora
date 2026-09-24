'use client';

import * as React from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, AlertCircle, Layers } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle?: string;
  status?: string;
  category?: string;
  onClick?: () => void;
}

export interface ExoraMapProps {
  markers?: MapMarker[];
  center?: [number, number]; // [lng, lat]
  zoom?: number;
  className?: string;
  interactive?: boolean;
  onMarkerClick?: (marker: MapMarker) => void;
}

export function ExoraMap({
  markers = [],
  center,
  zoom = 12,
  className = 'w-full h-80 rounded-xl overflow-hidden',
  interactive = true,
  onMarkerClick,
}: ExoraMapProps) {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<mapboxgl.Map | null>(null);
  const markersRef = React.useRef<mapboxgl.Marker[]>([]);
  const [isMapLoaded, setIsMapLoaded] = React.useState(false);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Filter out any markers without valid geographic coordinates
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

  // Initialize Mapbox map
  React.useEffect(() => {
    if (!token || !mapContainerRef.current) return;

    mapboxgl.accessToken = token;

    // Default center: first valid marker, provided center, or national default (New Delhi [77.2090, 28.6139])
    const initialCenter: [number, number] =
      center ||
      (validMarkers.length > 0
        ? [validMarkers[0].longitude, validMarkers[0].latitude]
        : [77.209, 28.6139]);

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: initialCenter,
      zoom: validMarkers.length === 1 ? 14 : zoom,
      interactive,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');

    map.on('load', () => {
      setIsMapLoaded(true);
      map.resize();
    });

    mapRef.current = map;

    // Observe container resizes to maintain viewport layout
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [token]);

  // Update markers and bounds when validMarkers change
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (validMarkers.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();

    validMarkers.forEach((markerData) => {
      bounds.extend([markerData.longitude, markerData.latitude]);

      // Create custom DOM element for Exora marker
      const el = document.createElement('div');
      el.className = 'exora-map-marker group cursor-pointer';
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full bg-white border-2 border-indigo-600 flex items-center justify-center shadow-md hover:scale-110 hover:border-indigo-700 transition-transform">
            <svg class="w-4 h-4 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        </div>
      `;

      // Create popup
      const popupHtml = `
        <div class="p-2.5 bg-white text-slate-800 rounded-lg text-xs space-y-1 min-w-[160px] border border-slate-200 shadow-lg">
          <div class="font-semibold text-slate-900 text-sm leading-snug">${markerData.title}</div>
          ${markerData.subtitle ? `<div class="text-slate-500 text-[11px] leading-tight">${markerData.subtitle}</div>` : ''}
          ${
            markerData.category
              ? `<div class="inline-block mt-1 uppercase text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60">${markerData.category}</div>`
              : ''
          }
        </div>
      `;

      const popup = new mapboxgl.Popup({
        offset: 18,
        closeButton: false,
        className: 'exora-light-popup',
      }).setHTML(popupHtml);

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([markerData.longitude, markerData.latitude])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener('click', () => {
        if (markerData.onClick) markerData.onClick();
        if (onMarkerClick) onMarkerClick(markerData);
      });

      markersRef.current.push(marker);
    });

    // Fit map bounds
    if (validMarkers.length === 1) {
      map.flyTo({
        center: [validMarkers[0].longitude, validMarkers[0].latitude],
        zoom: 14,
        essential: true,
      });
    } else if (validMarkers.length > 1) {
      map.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 15,
        duration: 800,
      });
    }
  }, [validMarkers, isMapLoaded, onMarkerClick]);

  // Missing Mapbox public token state
  if (!token) {
    return (
      <div
        className={`${className} bg-slate-50 border border-slate-200 flex flex-col items-center justify-center p-6 text-center space-y-3 relative`}
      >
        <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
          <Layers size={18} />
        </div>
        <div className="space-y-1 max-w-sm">
          <p className="text-xs font-semibold text-slate-800">Map Visual Unavailable</p>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Map display requires a public Mapbox token. Configure <code className="text-indigo-600 font-mono text-[10px]">NEXT_PUBLIC_MAPBOX_TOKEN</code> in your environment.
          </p>
        </div>
      </div>
    );
  }

  // Zero valid coordinates state
  if (markers.length > 0 && validMarkers.length === 0) {
    return (
      <div
        className={`${className} bg-slate-50 border border-slate-200 flex flex-col items-center justify-center p-6 text-center space-y-2 relative`}
      >
        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
          <MapPin size={16} />
        </div>
        <p className="text-xs font-medium text-slate-500">No geographic coordinates available for this location.</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
      {!isMapLoaded && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center backdrop-blur-xs">
          <Spinner size="md" className="text-indigo-600" />
        </div>
      )}
    </div>
  );
}
