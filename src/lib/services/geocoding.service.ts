import { logger } from '@/lib/utils/logger';
import type { ExhibitionLocation } from '@/types/exhibition.types';

export interface GeocodeLocationInput {
  venueName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName?: string;
  confidence?: string;
  relevance?: number;
}

/**
 * In-memory LRU-style cache for normalized geocoding queries.
 * Prevents redundant external Mapbox API requests for identical addresses.
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
 * Interfaces with the Mapbox Geocoding API to resolve coordinates from structured addresses.
 */
export const GeocodingService = {
  /**
   * Retrieves the configured Mapbox access token.
   * Strictly server-side MAPBOX_ACCESS_TOKEN only.
   * Never falls back to browser-scoped public tokens.
   */
  getToken(): string | undefined {
    return process.env.MAPBOX_ACCESS_TOKEN;
  },

  /**
   * Geocodes a structured exhibition location into latitude and longitude.
   * Returns null if geocoding fails, coordinates are out of bounds, or token is missing.
   */
  async geocode(location: GeocodeLocationInput): Promise<GeocodeResult | null> {
    const token = this.getToken();
    if (!token) {
      logger.warn('Geocoding: MAPBOX_ACCESS_TOKEN is not configured in environment. Skipping coordinate lookup.');
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
    let result = await this.queryMapbox(primaryQuery, token);

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
        result = await this.queryMapbox(fallbackQuery, token);
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
   * Internal query runner against Mapbox Geocoding API v6 (forward geocoding).
   */
  async queryMapbox(query: string, token: string): Promise<GeocodeResult | null> {
    try {
      const endpoint = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&access_token=${encodeURIComponent(token)}&limit=1`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(6000),
      });

      if (!response.ok) {
        if (response.status === 429) {
          logger.warn('Geocoding: Mapbox rate limit reached (HTTP 429).');
        } else if (response.status === 401 || response.status === 403) {
          logger.warn(`Geocoding: Mapbox authentication failed (HTTP ${response.status}). Verify MAPBOX_ACCESS_TOKEN.`);
        } else {
          logger.warn(`Geocoding: Provider returned HTTP status ${response.status}`);
        }
        return null;
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.features) || data.features.length === 0) {
        return null;
      }

      const feature = data.features[0];
      if (!feature) {
        return null;
      }

      // In Mapbox Geocoding v6, coordinates are primarily located at feature.geometry.coordinates ([longitude, latitude])
      // or optionally feature.properties.coordinates ({ longitude, latitude })
      let longitude: number | undefined;
      let latitude: number | undefined;

      if (Array.isArray(feature.geometry?.coordinates) && feature.geometry.coordinates.length >= 2) {
        longitude = feature.geometry.coordinates[0];
        latitude = feature.geometry.coordinates[1];
      } else if (
        feature.properties?.coordinates &&
        typeof feature.properties.coordinates.latitude === 'number' &&
        typeof feature.properties.coordinates.longitude === 'number'
      ) {
        longitude = feature.properties.coordinates.longitude;
        latitude = feature.properties.coordinates.latitude;
      }

      if (longitude == null || latitude == null) {
        return null;
      }

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

      // Check match confidence if provided by v6 match_code
      const confidence = feature.properties?.match_code?.confidence;
      if (confidence === 'low') {
        logger.warn('Geocoding: Match confidence is low. Rejecting match as unreliable.');
        return null;
      }

      // Extract display name from v6 properties
      const displayName =
        feature.properties?.full_address ||
        (feature.properties?.name && feature.properties?.place_formatted
          ? `${feature.properties.name}, ${feature.properties.place_formatted}`
          : feature.properties?.place_formatted || feature.properties?.name);

      return {
        latitude: Math.round(latitude * 1e6) / 1e6,
        longitude: Math.round(longitude * 1e6) / 1e6,
        displayName,
        confidence,
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
   * Compares two location objects to detect whether meaningful address fields have changed.
   */
  hasLocationChanged(
    prev?: ExhibitionLocation | GeocodeLocationInput | null,
    next?: ExhibitionLocation | GeocodeLocationInput | null
  ): boolean {
    if (!prev && !next) return false;
    if (!prev || !next) return true;

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
