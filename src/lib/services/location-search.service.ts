import { logger } from '@/lib/utils/logger';
import type { ExhibitionLocation } from '@/types/exhibition.types';

export interface LocationSearchResult {
  providerId: string;
  displayName: string;
  venueName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude: number;
  longitude: number;
  type?: string;
  category?: string;
}

export interface GeocodeLocationInput {
  venueName?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  placeId?: string;
}

export interface LocationSearchOptions {
  limit?: number;
  latitude?: number;
  longitude?: number;
  signal?: AbortSignal;
}

// Bounded in-memory cache for search and reverse geocode queries
const searchCache = new Map<string, { data: LocationSearchResult[]; timestamp: number }>();
const reverseCache = new Map<string, { data: LocationSearchResult; timestamp: number }>();
const MAX_CACHE_SIZE = 500;
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

// Geographic center of India for default location bias
const DEFAULT_INDIA_LAT = 20.5937;
const DEFAULT_INDIA_LON = 78.9629;

function cleanString(str?: string | null): string {
  return (str || '').trim().replace(/\s+/g, ' ');
}

export interface PhotonProperties {
  name?: string;
  street?: string;
  housenumber?: string;
  locality?: string;
  district?: string;
  suburb?: string;
  city?: string;
  town?: string;
  county?: string;
  state?: string;
  country?: string;
  postcode?: string;
  osm_type?: string;
  osm_id?: number | string;
  osm_key?: string;
  osm_value?: string;
  type?: string;
}

export interface PhotonFeature {
  type?: string;
  properties?: PhotonProperties;
  geometry?: {
    type?: string;
    coordinates?: [number, number] | number[];
  };
}

/**
 * Normalizes a Photon GeoJSON feature into a provider-independent LocationSearchResult.
 */
export function normalizePhotonFeature(feature: PhotonFeature): LocationSearchResult | null {
  if (!feature || !feature.properties || !feature.geometry || !Array.isArray(feature.geometry.coordinates)) {
    return null;
  }

  const [lon, lat] = feature.geometry.coordinates;
  if (
    typeof lat !== 'number' ||
    typeof lon !== 'number' ||
    isNaN(lat) ||
    isNaN(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return null;
  }

  const props = feature.properties;
  const name = cleanString(props.name);
  const street = cleanString([props.housenumber, props.street].filter(Boolean).join(' '));
  const locality = cleanString(props.locality || props.district || props.suburb);
  const city = cleanString(props.city || props.town || props.county);
  const state = cleanString(props.state);
  const country = cleanString(props.country);
  const postalCode = cleanString(props.postcode);

  // Construct structured address parts
  const addressParts: string[] = [];
  if (street) addressParts.push(street);
  if (locality && locality !== city) addressParts.push(locality);
  if (city) addressParts.push(city);
  if (state) addressParts.push(state);
  if (country) addressParts.push(country);
  if (postalCode) addressParts.push(postalCode);

  const address = addressParts.join(', ') || name;
  const venueName = name || street || city || 'Exhibition Venue';

  // Construct human-readable displayName
  const displayParts: string[] = [];
  if (name) displayParts.push(name);
  if (street && street !== name) displayParts.push(street);
  if (locality && locality !== name && locality !== city) displayParts.push(locality);
  if (city && city !== name) displayParts.push(city);
  if (state && state !== name) displayParts.push(state);
  if (country && country !== name) displayParts.push(country);

  const displayName = displayParts.length > 0 ? displayParts.join(', ') : address;
  const providerId = `photon:${props.osm_type || 'N'}:${props.osm_id || `${lat.toFixed(6)},${lon.toFixed(6)}`}`;

  const type = props.type || props.osm_value || props.osm_key || 'venue';
  const category = (props.osm_value ? props.osm_value.replace(/_/g, ' ') : props.osm_key) || type;

  return {
    providerId,
    displayName,
    venueName,
    address,
    city: city || locality || state || '',
    state,
    country: country || 'India',
    postalCode,
    latitude: Math.round(lat * 1e6) / 1e6,
    longitude: Math.round(lon * 1e6) / 1e6,
    type,
    category,
  };
}

/**
 * Deduplicates search results that share virtually identical coordinates or identical display names.
 */
function deduplicateResults(results: LocationSearchResult[]): LocationSearchResult[] {
  const seenCoords = new Set<string>();
  const seenNames = new Set<string>();
  const filtered: LocationSearchResult[] = [];

  for (const item of results) {
    // Coordinate key with 4 decimal places (~11 meters precision)
    const coordKey = `${item.latitude.toFixed(4)},${item.longitude.toFixed(4)}`;
    const nameKey = cleanString(item.displayName).toLowerCase();

    if (seenCoords.has(coordKey) || seenNames.has(nameKey)) {
      continue;
    }

    seenCoords.add(coordKey);
    seenNames.add(nameKey);
    filtered.push(item);
  }

  return filtered;
}

/**
 * Provider-independent Location Search Service backed by Photon / OpenStreetMap.
 */
export const LocationSearchService = {
  /**
   * Retrieves the configured Photon API base URL.
   */
  getBaseUrl(): string {
    return process.env.PHOTON_API_BASE_URL || 'https://photon.komoot.io';
  },

  /**
   * Performs forward address and venue search using Photon.
   * Debouncing and request cancellation are handled upstream; this service enforces query limits,
   * in-memory caching, deduplication, and normalized output.
   */
  async search(query: string, options: LocationSearchOptions = {}): Promise<LocationSearchResult[]> {
    const cleanQuery = cleanString(query);

    // Rule: Minimum query length 3 characters
    if (!cleanQuery || cleanQuery.length < 3) {
      return [];
    }

    // Rule: Cap query length to prevent abusive requests
    const boundedQuery = cleanQuery.slice(0, 100);
    const limit = Math.min(Math.max(options.limit || 6, 1), 10);
    const biasLat = options.latitude ?? DEFAULT_INDIA_LAT;
    const biasLon = options.longitude ?? DEFAULT_INDIA_LON;

    const cacheKey = `search:${boundedQuery.toLowerCase()}:${biasLat.toFixed(2)},${biasLon.toFixed(2)}:${limit}`;

    // Check in-memory cache
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const baseUrl = this.getBaseUrl();
      const params = new URLSearchParams({
        q: boundedQuery,
        limit: String(limit),
        lang: 'en',
      });

      if (biasLat != null && biasLon != null) {
        params.set('lat', String(biasLat));
        params.set('lon', String(biasLon));
      }

      const endpoint = `${baseUrl}/api/?${params.toString()}`;

      // Combine caller abort signal with a strict 6000ms timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const signal = options.signal
        ? AbortSignal.any([options.signal, controller.signal])
        : controller.signal;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.warn(`LocationSearchService: Photon API returned HTTP status ${response.status}`);
        return [];
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.features)) {
        return [];
      }

      const normalized: LocationSearchResult[] = [];
      for (const feature of data.features) {
        const item = normalizePhotonFeature(feature);
        if (item) {
          normalized.push(item);
        }
      }

      const deduplicated = deduplicateResults(normalized);

      // Store in LRU cache
      if (searchCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = searchCache.keys().next().value;
        if (oldestKey) searchCache.delete(oldestKey);
      }
      searchCache.set(cacheKey, { data: deduplicated, timestamp: Date.now() });

      return deduplicated;
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        logger.warn('LocationSearchService: Search request timed out or was aborted.');
      } else {
        logger.warn(`LocationSearchService: Network error (${error.message || 'unknown error'})`);
      }
      return [];
    }
  },

  /**
   * Reverse geocodes coordinates to a normalized location result.
   */
  async reverseGeocode(
    latitude: number,
    longitude: number,
    options: { signal?: AbortSignal } = {}
  ): Promise<LocationSearchResult | null> {
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
      return null;
    }

    const cacheKey = `reverse:${latitude.toFixed(5)},${longitude.toFixed(5)}`;
    const cached = reverseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    try {
      const baseUrl = this.getBaseUrl();
      const endpoint = `${baseUrl}/reverse?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&lang=en`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const signal = options.signal
        ? AbortSignal.any([options.signal, controller.signal])
        : controller.signal;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.warn(`LocationSearchService: Photon reverse returned status ${response.status}`);
        return null;
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.features) || data.features.length === 0) {
        return null;
      }

      const result = normalizePhotonFeature(data.features[0]);
      if (result) {
        if (reverseCache.size >= MAX_CACHE_SIZE) {
          const oldest = reverseCache.keys().next().value;
          if (oldest) reverseCache.delete(oldest);
        }
        reverseCache.set(cacheKey, { data: result, timestamp: Date.now() });
      }

      return result;
    } catch (err: unknown) {
      const error = err as Error;
      logger.warn(`LocationSearchService: Reverse geocode failed (${error.message || 'unknown'})`);
      return null;
    }
  },

  /**
   * Geocodes a structured address input (used during exhibition creation/updates if coordinates need resolution).
   */
  async geocode(location: GeocodeLocationInput): Promise<LocationSearchResult | null> {
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

    if (!primaryQuery || primaryQuery.length < 3) {
      return null;
    }

    const results = await this.search(primaryQuery, { limit: 1 });
    if (results.length > 0) {
      return results[0];
    }

    // Fallback: If venue name is specific/internal, try address + city query
    if (location.venueName && location.address) {
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

      if (fallbackQuery && fallbackQuery !== primaryQuery && fallbackQuery.length >= 3) {
        const fallbackResults = await this.search(fallbackQuery, { limit: 1 });
        if (fallbackResults.length > 0) {
          return fallbackResults[0];
        }
      }
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

    if (prev.placeId && next.placeId) {
      return prev.placeId.trim() !== next.placeId.trim();
    }
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
