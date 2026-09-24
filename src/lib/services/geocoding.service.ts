import { logger } from '@/lib/utils/logger';
import type { ExhibitionLocation } from '@/types/exhibition.types';

export interface GeocodeLocationInput {
  venueName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  placeId?: string;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName?: string;
  locationType?: string;
  placeId?: string;
  venueName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

/**
 * In-memory LRU-style cache for normalized geocoding queries.
 * Prevents redundant external Google Geocoding API requests for identical addresses.
 */
const geocodeCache = new Map<string, GeocodeResult>();
const MAX_CACHE_SIZE = 500;

function getNormalizedKey(loc: GeocodeLocationInput): string {
  return [
    loc.venueName,
    loc.address,
    loc.city,
    loc.state,
    loc.country,
    loc.postalCode,
  ]
    .filter(Boolean)
    .map((s) => s!.toLowerCase().trim().replace(/\s+/g, ' '))
    .join('|');
}

/**
 * Server-side Geocoding Service.
 * Interfaces with the Google Maps Platform Geocoding API to resolve coordinates from structured addresses.
 */
export const GeocodingService = {
  /**
   * Retrieves the configured server-side Google Maps API key.
   * Strictly GOOGLE_MAPS_SERVER_API_KEY only.
   * Never falls back to browser-scoped public tokens.
   */
  getApiKey(): string | undefined {
    return process.env.GOOGLE_MAPS_SERVER_API_KEY;
  },

  /**
   * Geocodes a structured exhibition location into latitude and longitude.
   * Returns null if geocoding fails, coordinates are out of bounds, or API key is missing.
   */
  async geocode(location: GeocodeLocationInput): Promise<GeocodeResult | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      logger.warn('Geocoding: GOOGLE_MAPS_SERVER_API_KEY is not configured in environment. Skipping coordinate lookup.');
      return null;
    }

    const cacheKey = getNormalizedKey(location);
    if (!cacheKey) {
      return null;
    }

    // Check in-memory cache
    if (geocodeCache.has(cacheKey)) {
      return geocodeCache.get(cacheKey)!;
    }

    // Construct primary query: Venue Name, Address, City, State, Country, Postal Code
    const primaryQuery = [
      location.venueName,
      location.address,
      location.city,
      location.state,
      location.country,
      location.postalCode,
    ]
      .filter((val): val is string => Boolean(val && val.trim()))
      .map((s) => s.trim().replace(/\s+/g, ' '))
      .join(', ');

    if (!primaryQuery) {
      return null;
    }

    // Attempt primary lookup
    let result = await this.queryGoogle(primaryQuery, apiKey);

    // If venue name is specific/internal (e.g. "Hall A") and yields no result, fallback to street + city query
    if (!result && location.venueName && location.address) {
      const fallbackQuery = [
        location.address,
        location.city,
        location.state,
        location.country,
        location.postalCode,
      ]
        .filter((val): val is string => Boolean(val && val.trim()))
        .map((s) => s.trim().replace(/\s+/g, ' '))
        .join(', ');

      if (fallbackQuery && fallbackQuery !== primaryQuery) {
        result = await this.queryGoogle(fallbackQuery, apiKey);
      }
    }

    if (result) {
      // Store in memory cache
      if (geocodeCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = geocodeCache.keys().next().value;
        if (oldestKey) geocodeCache.delete(oldestKey);
      }
      geocodeCache.set(cacheKey, result);
    }

    return result;
  },

  /**
   * Internal query runner against Google Maps Platform Geocoding API.
   */
  async queryGoogle(query: string, apiKey: string): Promise<GeocodeResult | null> {
    try {
      const endpoint = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${encodeURIComponent(apiKey)}`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        logger.warn(`Geocoding: Provider returned HTTP status ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (!data) {
        return null;
      }

      // Handle Google Geocoding API statuses
      if (data.status === 'ZERO_RESULTS') {
        return null;
      }

      if (data.status === 'OVER_QUERY_LIMIT') {
        logger.warn('Geocoding: Google rate limit reached (OVER_QUERY_LIMIT).');
        return null;
      }

      if (data.status === 'REQUEST_DENIED') {
        logger.warn('Geocoding: Google API request denied. Verify GOOGLE_MAPS_SERVER_API_KEY and Geocoding API enablement.');
        return null;
      }

      if (data.status === 'INVALID_REQUEST') {
        logger.warn('Geocoding: Invalid geocoding request to Google.');
        return null;
      }

      if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
        logger.warn(`Geocoding: Google Geocoding API returned status ${data.status || 'UNKNOWN'}`);
        return null;
      }

      const first = data.results[0];
      const location = first?.geometry?.location;
      if (!location) {
        return null;
      }

      const latitude = location.lat;
      const longitude = location.lng;

      // Validate coordinate bounds
      if (
        typeof latitude !== 'number' ||
        typeof longitude !== 'number' ||
        isNaN(latitude) ||
        isNaN(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
      ) {
        logger.warn('Geocoding: Provider returned coordinates outside valid geographic range.');
        return null;
      }

      return {
        latitude: Math.round(latitude * 1e6) / 1e6,
        longitude: Math.round(longitude * 1e6) / 1e6,
        displayName: first.formatted_address,
        locationType: first.geometry?.location_type,
      };
    } catch (err: any) {
      if (err.name === 'TimeoutError' || err.name === 'AbortError') {
        logger.warn('Geocoding: Request timed out after 6000ms.');
      } else {
        logger.warn(`Geocoding: Network request failed (${err.message || 'unknown error'})`);
      }
      return null;
    }
  },

  /**
   * Resolves a Google Place ID into authoritative coordinates and details.
   * Leverages server-side Geocoding API by place_id (with Place Details fallback).
   */
  async resolvePlaceId(placeId: string): Promise<GeocodeResult | null> {
    if (!placeId || typeof placeId !== 'string' || !placeId.trim()) {
      return null;
    }

    const cleanPlaceId = placeId.trim();
    const cacheKey = `place:${cleanPlaceId}`;

    if (geocodeCache.has(cacheKey)) {
      return geocodeCache.get(cacheKey)!;
    }

    const apiKey = this.getApiKey();
    if (!apiKey) {
      logger.warn('Geocoding: GOOGLE_MAPS_SERVER_API_KEY is not configured in environment. Skipping server place resolution.');
      return null;
    }

    // 1. Try Geocoding API by place_id (standard Geocoding API capability)
    try {
      const endpoint = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(cleanPlaceId)}&key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
          const first = data.results[0];
          const location = first?.geometry?.location;
          if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
            const latitude = Math.round(location.lat * 1e6) / 1e6;
            const longitude = Math.round(location.lng * 1e6) / 1e6;

            if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
              const result: GeocodeResult = {
                latitude,
                longitude,
                displayName: first.formatted_address,
                locationType: first.geometry?.location_type,
                placeId: cleanPlaceId,
              };

              if (geocodeCache.size >= MAX_CACHE_SIZE) {
                const oldest = geocodeCache.keys().next().value;
                if (oldest) geocodeCache.delete(oldest);
              }
              geocodeCache.set(cacheKey, result);
              return result;
            }
          }
        }
      }
    } catch (err: any) {
      logger.warn(`Geocoding: Place lookup via geocode endpoint failed: ${err.message}`);
    }

    // 2. Try Place Details API fallback
    try {
      const detailsEndpoint = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(cleanPlaceId)}&fields=place_id,name,formatted_address,geometry&key=${encodeURIComponent(apiKey)}`;
      const detailsRes = await fetch(detailsEndpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });

      if (detailsRes.ok) {
        const data = await detailsRes.json();
        if (data.status === 'OK' && data.result?.geometry?.location) {
          const loc = data.result.geometry.location;
          const latitude = Math.round(loc.lat * 1e6) / 1e6;
          const longitude = Math.round(loc.lng * 1e6) / 1e6;

          if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
            const result: GeocodeResult = {
              latitude,
              longitude,
              displayName: data.result.formatted_address,
              venueName: data.result.name,
              placeId: cleanPlaceId,
            };

            if (geocodeCache.size >= MAX_CACHE_SIZE) {
              const oldest = geocodeCache.keys().next().value;
              if (oldest) geocodeCache.delete(oldest);
            }
            geocodeCache.set(cacheKey, result);
            return result;
          }
        }
      }
    } catch (err: any) {
      logger.warn(`Geocoding: Place lookup via Place Details failed: ${err.message}`);
    }

    return null;
  },

  /**
   * Compares two location objects to detect whether meaningful address fields have changed.
   */
  hasLocationChanged(
    prev?: ExhibitionLocation | GeocodeLocationInput | null,
    next?: ExhibitionLocation | GeocodeLocationInput | null
  ): boolean {
    if (!prev && !next) return false;
    if (!prev || !next) return true;

    // If both specify a placeId, compare placeIds
    if (prev.placeId && next.placeId) {
      return prev.placeId.trim() !== next.placeId.trim();
    }
    // If one specifies placeId and the other does not, location changed
    if ((prev.placeId && !next.placeId) || (!prev.placeId && next.placeId)) {
      return true;
    }

    const normalize = (val?: string | null) => (val || '').trim().toLowerCase().replace(/\s+/g, ' ');

    return (
      normalize(prev.venueName) !== normalize(next.venueName) ||
      normalize(prev.address) !== normalize(next.address) ||
      normalize(prev.city) !== normalize(next.city) ||
      normalize(prev.state) !== normalize(next.state) ||
      normalize(prev.country) !== normalize(next.country) ||
      normalize(prev.postalCode) !== normalize(next.postalCode)
    );
  },
};
