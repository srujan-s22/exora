'use client';

import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

let isConfigured = false;

/**
 * Configures the Google Maps JS API loader once per application runtime.
 * Avoids duplicate script initialization.
 */
export function configureGoogleMaps(apiKey: string, mapId?: string) {
  if (typeof window === 'undefined') return;
  if (!isConfigured) {
    setOptions({
      key: apiKey,
      v: 'weekly',
      ...(mapId ? { mapIds: [mapId] } : {}),
    });
    isConfigured = true;
  }
}

/**
 * Loads the Google Maps 'maps' library.
 */
export async function loadMapsLibrary() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
  if (!apiKey) return null;
  configureGoogleMaps(apiKey, mapId);
  return importLibrary('maps');
}

/**
 * Loads the Google Maps 'places' library (Places API New).
 */
export async function loadPlacesLibrary() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID;
  if (!apiKey) return null;
  configureGoogleMaps(apiKey, mapId);
  return importLibrary('places');
}
