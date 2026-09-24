'use client';

import * as React from 'react';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { MapPin, Layers } from 'lucide-react';
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

let isGoogleMapsConfigured = false;
function configureGoogleMaps(apiKey: string, mapId?: string) {
  if (!isGoogleMapsConfigured) {
    setOptions({
      key: apiKey,
      v: 'weekly',
      ...(mapId ? { mapIds: [mapId] } : {}),
    });
    isGoogleMapsConfigured = true;
  }
}

function createPinElement(): HTMLElement {
  const pinElement = document.createElement('div');
  pinElement.className = 'exora-google-marker group cursor-pointer';
  pinElement.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center;">
      <div style="width: 32px; height: 32px; border-radius: 9999px; background: #ffffff; border: 2.5px solid #4f46e5; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1); cursor: pointer; transition: transform 0.15s ease-out;">
        <svg style="width: 16px; height: 16px; color: #4f46e5;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
    </div>
  `;
  return pinElement;
}

function getPopupHtml(markerData: MapMarker): string {
  return `
    <div style="font-family: Inter, ui-sans-serif, system-ui, sans-serif; padding: 4px; min-width: 170px;">
      <div style="font-weight: 600; font-size: 13px; color: #0f172a; line-height: 1.3; margin-bottom: 2px;">${markerData.title}</div>
      ${markerData.subtitle || markerData.venueName ? `<div style="font-size: 11px; color: #64748b; line-height: 1.3;">${markerData.subtitle || markerData.venueName}</div>` : ''}
      ${
        markerData.category
          ? `<div style="display: inline-block; margin-top: 6px; text-transform: uppercase; font-size: 9px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe;">${markerData.category}</div>`
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
  const mapRef = React.useRef<google.maps.Map | null>(null);
  const markersRef = React.useRef<any[]>([]);
  const markerMapRef = React.useRef<Map<string, { marker: any; data: MapMarker }>>(new Map());
  const infoWindowRef = React.useRef<google.maps.InfoWindow | null>(null);
  const [isMapLoaded, setIsMapLoaded] = React.useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;

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

  // Initialize Google Maps instance
  React.useEffect(() => {
    if (!apiKey || !mapContainerRef.current) return;

    let isMounted = true;
    configureGoogleMaps(apiKey, mapId);

    const initMap = async () => {
      try {
        const { Map } = await importLibrary('maps');
        if (!isMounted || !mapContainerRef.current) return;

        // Default center: provided center, first valid marker, or national default (New Delhi [28.6139, 77.2090])
        const initialCenter: google.maps.LatLngLiteral = center
          ? { lng: center[0], lat: center[1] }
          : validMarkers.length > 0
          ? { lat: validMarkers[0].latitude, lng: validMarkers[0].longitude }
          : { lat: 28.6139, lng: 77.209 };

        const mapOptions: google.maps.MapOptions = {
          center: initialCenter,
          zoom: validMarkers.length === 1 ? 14 : zoom,
          disableDefaultUI: true,
          zoomControl: interactive,
          gestureHandling: interactive ? 'auto' : 'none',
        };

        // When a production Map ID is configured, attach it to enable AdvancedMarkerElement
        if (mapId) {
          mapOptions.mapId = mapId;
        }

        const mapInstance = new Map(mapContainerRef.current, mapOptions);

        mapRef.current = mapInstance;
        setIsMapLoaded(true);
      } catch (err: any) {
        logger.warn(`Google Maps: Initialization failed (${err?.message || 'unknown error'})`);
      }
    };

    initMap();

    // Observe container size changes to resize the viewport properly
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        google.maps.event.trigger(mapRef.current, 'resize');
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      isMounted = false;
      resizeObserver.disconnect();
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
      markersRef.current.forEach((m) => {
        if ('map' in m) m.map = null;
        else if (typeof (m as any).setMap === 'function') (m as any).setMap(null);
      });
      markersRef.current = [];
      markerMapRef.current.clear();
      mapRef.current = null;
      setIsMapLoaded(false);
    };
  }, [apiKey, mapId]);

  // Update markers and bounds when validMarkers or map state changes
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded || !apiKey) return;

    let isMounted = true;

    // Clear existing markers and active InfoWindow
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
    markersRef.current.forEach((m) => {
      if ('map' in m) m.map = null;
      else if (typeof (m as any).setMap === 'function') (m as any).setMap(null);
    });
    markersRef.current = [];
    markerMapRef.current.clear();

    if (validMarkers.length === 0) return;

    const renderMarkers = async () => {
      const bounds = new google.maps.LatLngBounds();
      const infoWindow = new google.maps.InfoWindow();
      infoWindowRef.current = infoWindow;

      if (mapId) {
        // ── PRODUCTION PATH ──
        // Strictly use Google AdvancedMarkerElement with the configured Map ID.
        // Does not rely on deprecated legacy Marker APIs.
        const { AdvancedMarkerElement } = await importLibrary('marker');
        if (!isMounted || !mapRef.current) return;

        validMarkers.forEach((markerData) => {
          const position = { lat: markerData.latitude, lng: markerData.longitude };
          bounds.extend(position);

          const onAction = () => {
            infoWindow.setContent(getPopupHtml(markerData));
            if (markerInstance) {
              infoWindow.open({
                anchor: markerInstance,
                map,
              });
            }
            if (markerData.onClick) markerData.onClick();
            if (onMarkerClick) onMarkerClick(markerData);
          };

          const pinElement = createPinElement();

          const markerInstance = new AdvancedMarkerElement({
            map,
            position,
            content: pinElement,
            title: markerData.title,
          });

          markerInstance.addListener('gmp-click', onAction);
          markersRef.current.push(markerInstance);
          markerMapRef.current.set(markerData.id, { marker: markerInstance, data: markerData });
        });
      } else {
        // ── DEVELOPMENT / TEST FALLBACK ──
        // When NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID is not configured, warn operators and use fallback marker
        // to prevent application crashes during local development and testing.
        logger.warn(
          'Google Maps: NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID is not configured. Google Advanced Markers require a Map ID in production. Using development fallback marker.'
        );

        validMarkers.forEach((markerData) => {
          const position = { lat: markerData.latitude, lng: markerData.longitude };
          bounds.extend(position);

          const onAction = () => {
            infoWindow.setContent(getPopupHtml(markerData));
            if (markerInstance) {
              infoWindow.open({
                anchor: markerInstance,
                map,
              });
            }
            if (markerData.onClick) markerData.onClick();
            if (onMarkerClick) onMarkerClick(markerData);
          };

          const svgPin = {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
                <circle cx="17" cy="17" r="14" fill="#ffffff" stroke="#4f46e5" stroke-width="2.5"/>
                <path d="M21 14c0 3.5-4 7-4 7s-4-3.5-4-7a4 4 0 0 1 8 0Z" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="17" cy="14" r="1.5" fill="#4f46e5"/>
              </svg>
            `)}`,
            scaledSize: new google.maps.Size(34, 34),
            anchor: new google.maps.Point(17, 17),
          };

          const markerInstance = new google.maps.Marker({
            map,
            position,
            icon: svgPin,
            title: markerData.title,
          });

          markerInstance.addListener('click', onAction);
          markersRef.current.push(markerInstance);
          markerMapRef.current.set(markerData.id, { marker: markerInstance, data: markerData });
        });
      }

      // Initial fit map bounds if not focusing on a specific selected marker
      if (!selectedMarkerId || selectedMarkerId === 'all') {
        if (validMarkers.length === 1) {
          map.setCenter({ lat: validMarkers[0].latitude, lng: validMarkers[0].longitude });
          map.setZoom(14);
        } else if (validMarkers.length > 1) {
          map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
        }
      }
    };

    renderMarkers();

    return () => {
      isMounted = false;
    };
  }, [validMarkers, isMapLoaded, apiKey, mapId, onMarkerClick, selectedMarkerId]);

  // Synchronize map focus and InfoWindow when selectedMarkerId changes
  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapLoaded) return;

    if (!selectedMarkerId || selectedMarkerId === 'all') {
      // If no specific marker is selected, fit bounds to show all markers
      if (validMarkers.length > 1) {
        const bounds = new google.maps.LatLngBounds();
        validMarkers.forEach((m) => bounds.extend({ lat: m.latitude, lng: m.longitude }));
        map.fitBounds(bounds, { top: 40, bottom: 40, left: 40, right: 40 });
      } else if (validMarkers.length === 1) {
        map.setCenter({ lat: validMarkers[0].latitude, lng: validMarkers[0].longitude });
        map.setZoom(14);
      }
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
      return;
    }

    const item = markerMapRef.current.get(selectedMarkerId);
    if (item && item.marker) {
      const { marker, data } = item;
      map.panTo({ lat: data.latitude, lng: data.longitude });
      map.setZoom(15);

      if (infoWindowRef.current) {
        infoWindowRef.current.setContent(getPopupHtml(data));
        infoWindowRef.current.open({
          anchor: marker,
          map,
        });
      }
    }
  }, [selectedMarkerId, isMapLoaded, validMarkers]);

  // Missing Google Maps public API key state
  if (!apiKey) {
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
            Map display requires a public Google Maps API key. Configure <code className="text-indigo-600 font-mono text-[10px]">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in your environment.
          </p>
        </div>
      </div>
    );
  }

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
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center backdrop-blur-xs">
          <Spinner size="md" className="text-indigo-600" />
        </div>
      )}
    </div>
  );
}
