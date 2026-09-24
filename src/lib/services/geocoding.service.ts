/**
 * Backward-compatible GeocodingService facade.
 * Backed by the provider-independent LocationSearchService (Photon / OpenStreetMap).
 * Completely eliminates all Google Geocoding API and Google Maps dependencies.
 */
import { LocationSearchService, type GeocodeLocationInput } from '@/lib/services/location-search.service';
import type { ExhibitionLocation } from '@/types/exhibition.types';

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

export const GeocodingService = {
  /**
   * Geocodes a structured exhibition location into latitude and longitude.
   */
  async geocode(location: GeocodeLocationInput): Promise<GeocodeResult | null> {
    const result = await LocationSearchService.geocode(location);
    if (!result) return null;

    return {
      latitude: result.latitude,
      longitude: result.longitude,
      displayName: result.displayName,
      locationType: result.type,
      placeId: result.providerId,
      venueName: result.venueName,
      address: result.address,
      city: result.city,
      state: result.state,
      country: result.country,
      postalCode: result.postalCode,
    };
  },

  /**
   * Resolves a provider/place ID into coordinates and normalized details.
   */
  async resolvePlaceId(placeId: string): Promise<GeocodeResult | null> {
    if (!placeId || typeof placeId !== 'string') return null;

    // If format is photon:osm_type:osm_id or lat,lon
    const parts = placeId.split(':');
    if (parts.length === 3 && parts[0] === 'photon') {
      const coordParts = parts[2].split(',');
      if (coordParts.length === 2) {
        const lat = parseFloat(coordParts[0]);
        const lon = parseFloat(coordParts[1]);
        if (!isNaN(lat) && !isNaN(lon)) {
          const rev = await LocationSearchService.reverseGeocode(lat, lon);
          if (rev) {
            return {
              latitude: rev.latitude,
              longitude: rev.longitude,
              displayName: rev.displayName,
              placeId,
              venueName: rev.venueName,
              address: rev.address,
              city: rev.city,
              state: rev.state,
              country: rev.country,
              postalCode: rev.postalCode,
            };
          }
        }
      }
    }

    return null;
  },

  /**
   * Compares two locations to check if address fields changed.
   */
  hasLocationChanged(
    prev?: ExhibitionLocation | GeocodeLocationInput | null,
    next?: ExhibitionLocation | GeocodeLocationInput | null
  ): boolean {
    return LocationSearchService.hasLocationChanged(prev, next);
  },
};
