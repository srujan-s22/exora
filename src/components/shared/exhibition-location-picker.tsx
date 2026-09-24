'use client';

import * as React from 'react';
import { MapPin, Search, CheckCircle2, RotateCcw, X, AlertCircle, Loader2, Edit3, Globe } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExoraMap } from '@/components/shared/exora-map';
import { loadPlacesLibrary } from '@/lib/utils/google-maps-loader';
import { logger } from '@/lib/utils/logger';

export interface SelectedExhibitionLocation {
  venueName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  latitude?: number | null;
  longitude?: number | null;
  placeId?: string;
}

export interface ExhibitionLocationPickerProps {
  value?: SelectedExhibitionLocation | null;
  onChange: (location: SelectedExhibitionLocation | null) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
}

interface PlacePredictionItem {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
  rawSuggestion?: Record<string, unknown>;
}

interface AddressComponentLike {
  types?: string[];
  longText?: string;
  long_name?: string;
}

/**
 * Extracts address components from Google Places API New or Legacy PlaceResult
 */
function parseAddressComponents(components: AddressComponentLike[] = []) {
  let city = '';
  let state = '';
  let country = '';
  let postalCode = '';

  for (const c of components) {
    const types: string[] = c.types || [];
    const longText = c.longText || c.long_name || '';

    if (types.includes('locality')) {
      city = longText;
    } else if (!city && (types.includes('sublocality_level_1') || types.includes('sublocality') || types.includes('administrative_area_level_2'))) {
      city = longText;
    }

    if (types.includes('administrative_area_level_1')) {
      state = longText;
    }

    if (types.includes('country')) {
      country = longText;
    }

    if (types.includes('postal_code')) {
      postalCode = longText;
    }
  }

  return { city, state, country, postalCode };
}

export function ExhibitionLocationPicker({
  value,
  onChange,
  error,
  disabled = false,
  required = true,
  label = 'Venue & Location',
}: ExhibitionLocationPickerProps) {
  const [isChanging, setIsChanging] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [predictions, setPredictions] = React.useState<PlacePredictionItem[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isResolving, setIsResolving] = React.useState(false);
  const [apiUnavailable, setApiUnavailable] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(-1);
  const [typedWithoutSelectionNotice, setTypedWithoutSelectionNotice] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);

  const sessionTokenRef = React.useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const placesLibRef = React.useRef<typeof google.maps.places | null>(null);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Initialize Google Places Library and initial session token
  React.useEffect(() => {
    let isMounted = true;

    async function initPlaces() {
      try {
        const placesLib = await loadPlacesLibrary();
        if (!isMounted) return;

        if (placesLib) {
          placesLibRef.current = placesLib;
          if (placesLib.AutocompleteSessionToken) {
            sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
          }
        } else {
          setApiUnavailable(true);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.warn('Google Places: Failed to load places library', { error: errorMsg });
        if (isMounted) setApiUnavailable(true);
      }
    }

    initPlaces();

    return () => {
      isMounted = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPredictions([]);
        setSelectedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch predictions as the user types
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setTypedWithoutSelectionNotice(false);
    setSearchError(null);
    setSelectedIndex(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!query.trim()) {
      setPredictions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const placesLib = placesLibRef.current;
        if (!placesLib) {
          setIsSearching(false);
          return;
        }

        let newApiError: string | null = null;

        // 1. Modern Places API (New): AutocompleteSuggestion
        if (placesLib.AutocompleteSuggestion && typeof placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions === 'function') {
          try {
            const req: google.maps.places.AutocompleteRequest = {
              input: query,
            };
            if (sessionTokenRef.current) {
              req.sessionToken = sessionTokenRef.current;
            }

            const response = await placesLib.AutocompleteSuggestion.fetchAutocompleteSuggestions(req);
            const rawSuggestions = (response?.suggestions || []) as unknown as Array<{
              placePrediction?: {
                placeId: string;
                mainText?: { text?: string; toString?: () => string };
                secondaryText?: { text?: string; toString?: () => string };
                text?: { text?: string; toString?: () => string };
                toPlace?: () => {
                  fetchFields: (opts: { fields: string[] }) => Promise<void>;
                  id?: string;
                  displayName?: string;
                  formattedAddress?: string;
                  location?: { lat: () => number; lng: () => number };
                  addressComponents?: AddressComponentLike[];
                };
              };
            }>;

            const mapped: PlacePredictionItem[] = [];
            for (const s of rawSuggestions) {
              const p = s.placePrediction;
              if (p?.placeId) {
                mapped.push({
                  placeId: p.placeId,
                  mainText: p.mainText?.text || (typeof p.mainText?.toString === 'function' ? p.mainText.toString() : '') || p.text?.text || '',
                  secondaryText: p.secondaryText?.text || (typeof p.secondaryText?.toString === 'function' ? p.secondaryText.toString() : '') || '',
                  fullText: p.text?.text || (typeof p.text?.toString === 'function' ? p.text.toString() : '') || '',
                  rawSuggestion: s as Record<string, unknown>,
                });
              }
            }

            setPredictions(mapped);
            setSearchError(null);
            setIsSearching(false);
            return;
          } catch (err: unknown) {
            newApiError = err instanceof Error ? err.message : String(err);
            logger.warn('Google Places (New) fetchAutocompleteSuggestions failed; falling back to AutocompleteService', { error: newApiError });
          }
        }

        // 2. Fallback: AutocompleteService
        if (placesLib.AutocompleteService) {
          try {
            const service = new placesLib.AutocompleteService();
            const req: google.maps.places.AutocompletionRequest = { input: query };
            if (sessionTokenRef.current) req.sessionToken = sessionTokenRef.current;

            service.getPlacePredictions(req, (results, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && results) {
                const mapped: PlacePredictionItem[] = results.map((r) => ({
                  placeId: r.place_id,
                  mainText: r.structured_formatting?.main_text || r.description,
                  secondaryText: r.structured_formatting?.secondary_text || '',
                  fullText: r.description,
                }));
                setPredictions(mapped);
                setSearchError(null);
              } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
                setPredictions([]);
                setSearchError(null);
              } else {
                setPredictions([]);
                const errorDetail = newApiError ? ` (${newApiError})` : '';
                setSearchError(`Google Places is unavailable${errorDetail}. Check that Places API (New) is enabled and that this browser API key is authorized for Places API.`);
              }
              setIsSearching(false);
            });
            return;
          } catch (legacyErr: unknown) {
            const legacyErrorMsg = legacyErr instanceof Error ? legacyErr.message : String(legacyErr);
            logger.warn('Google Places: AutocompleteService failed', { error: legacyErrorMsg });
          }
        }

        setIsSearching(false);
        setPredictions([]);
        if (newApiError) {
          setSearchError(`Google Places is unavailable: ${newApiError}. Check that Places API (New) is enabled and that this browser API key is authorized for Places API.`);
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        logger.warn('Google Places: Autocomplete lookup error', { error: errorMsg });
        setIsSearching(false);
        setPredictions([]);
        setSearchError(`Google Places is unavailable: ${errorMsg}. Check that Places API (New) is enabled and that this browser API key is authorized for Places API.`);
      }
    }, 250);
  };

  // User selects an actual Google Place prediction
  const handleSelectPrediction = async (prediction: PlacePredictionItem) => {
    setIsResolving(true);
    setPredictions([]);
    setTypedWithoutSelectionNotice(false);

    try {
      const placesLib = placesLibRef.current;
      let selectedLocation: SelectedExhibitionLocation | null = null;

      // Modern Places API (New): prediction.toPlace() & fetchFields()
      const rawPrediction = (prediction.rawSuggestion as {
        placePrediction?: {
          toPlace?: () => {
            fetchFields: (opts: { fields: string[] }) => Promise<void>;
            id?: string;
            displayName?: string;
            formattedAddress?: string;
            location?: { lat: () => number; lng: () => number };
            addressComponents?: AddressComponentLike[];
          };
        };
      } | undefined)?.placePrediction;
      if (rawPrediction && typeof rawPrediction.toPlace === 'function') {
        const place = rawPrediction.toPlace();
        await place.fetchFields({
          fields: ['id', 'displayName', 'formattedAddress', 'location', 'addressComponents'],
        });

        const lat = typeof place.location?.lat === 'function' ? place.location.lat() : place.location?.lat;
        const lng = typeof place.location?.lng === 'function' ? place.location.lng() : place.location?.lng;

        const parsed = parseAddressComponents(place.addressComponents);

        selectedLocation = {
          venueName: place.displayName || prediction.mainText || 'Exhibition Venue',
          address: place.formattedAddress || prediction.fullText,
          city: parsed.city || prediction.secondaryText.split(',')[0]?.trim() || '',
          state: parsed.state || '',
          country: parsed.country || 'India',
          postalCode: parsed.postalCode || '',
          latitude: typeof lat === 'number' ? Math.round(lat * 1e6) / 1e6 : null,
          longitude: typeof lng === 'number' ? Math.round(lng * 1e6) / 1e6 : null,
          placeId: place.id || prediction.placeId,
        };
      } else if (placesLib?.PlacesService) {
        // Fallback: PlacesService getDetails
        const dummyNode = document.createElement('div');
        const service = new placesLib.PlacesService(dummyNode);

        const details: google.maps.places.PlaceResult | null = await new Promise((resolve) => {
          service.getDetails(
            {
              placeId: prediction.placeId,
              fields: ['place_id', 'name', 'formatted_address', 'geometry', 'address_components'],
              sessionToken: sessionTokenRef.current || undefined,
            },
            (result, status) => {
              if (status === google.maps.places.PlacesServiceStatus.OK && result) resolve(result);
              else resolve(null);
            }
          );
        });

        if (details) {
          const lat = details.geometry?.location?.lat();
          const lng = details.geometry?.location?.lng();
          const parsed = parseAddressComponents(details.address_components as AddressComponentLike[]);

          selectedLocation = {
            venueName: details.name || prediction.mainText,
            address: details.formatted_address || prediction.fullText,
            city: parsed.city || prediction.secondaryText.split(',')[0]?.trim() || '',
            state: parsed.state || '',
            country: parsed.country || 'India',
            postalCode: parsed.postalCode || '',
            latitude: typeof lat === 'number' ? Math.round(lat * 1e6) / 1e6 : null,
            longitude: typeof lng === 'number' ? Math.round(lng * 1e6) / 1e6 : null,
            placeId: details.place_id || prediction.placeId,
          };
        }
      }

      if (selectedLocation) {
        onChange(selectedLocation);
        setIsChanging(false);
        setSearchQuery('');

        // Refresh session token for subsequent searches
        if (placesLib?.AutocompleteSessionToken) {
          sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
        }
      } else {
        setTypedWithoutSelectionNotice(true);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.warn('Google Places: Failed to resolve place details', { error: errorMsg });
      setTypedWithoutSelectionNotice(true);
    } finally {
      setIsResolving(false);
    }
  };

  // Keyboard navigation for predictions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (predictions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : predictions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < predictions.length) {
        handleSelectPrediction(predictions[selectedIndex]);
      } else if (predictions.length > 0) {
        handleSelectPrediction(predictions[0]);
      }
    } else if (e.key === 'Escape') {
      setPredictions([]);
      setSelectedIndex(-1);
    }
  };

  const handleClear = () => {
    onChange(null);
    setSearchQuery('');
    setPredictions([]);
    setIsChanging(true);
    setTypedWithoutSelectionNotice(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleStartChange = () => {
    setIsChanging(true);
    setSearchQuery('');
    setPredictions([]);
    setTypedWithoutSelectionNotice(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCancelChange = () => {
    setIsChanging(false);
    setSearchQuery('');
    setPredictions([]);
    setTypedWithoutSelectionNotice(false);
  };

  const hasValidCoordinates =
    value?.latitude != null &&
    value?.longitude != null &&
    !isNaN(value.latitude) &&
    !isNaN(value.longitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    value.longitude >= -180 &&
    value.longitude <= 180;

  // ── RENDER CASE 1: CONFIRMED / EXISTING LOCATION DISPLAY ──
  if (value && !isChanging) {
    return (
      <Card className="border border-gray-800 bg-gray-900 shadow-sm overflow-hidden">
        <CardHeader className="py-4 border-b border-gray-800/60 bg-gray-850/30 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-100 flex items-center gap-2">
              <MapPin size={16} className="text-[#1557FF]" />
              <span>{label}</span>
            </CardTitle>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/50">
              <CheckCircle2 size={11} />
              <span>Location selected</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleStartChange}
              disabled={disabled}
              leftIcon={<Edit3 size={13} />}
            >
              Change location
            </Button>
            {!required && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                disabled={disabled}
                leftIcon={<X size={13} />}
                className="text-gray-400 hover:text-rose-400"
              >
                Clear
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1">
              <h4 className="text-base font-bold text-gray-100">
                {value.venueName || 'Venue Unassigned'}
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed max-w-xl">
                {value.address}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-gray-500">
                {value.city && <span className="bg-gray-850 px-2 py-0.5 rounded border border-gray-800">{value.city}</span>}
                {value.state && <span className="bg-gray-850 px-2 py-0.5 rounded border border-gray-800">{value.state}</span>}
                {value.country && <span className="bg-gray-850 px-2 py-0.5 rounded border border-gray-800">{value.country}</span>}
                {value.postalCode && <span className="bg-gray-850 px-2 py-0.5 rounded border border-gray-800">{value.postalCode}</span>}
                {value.placeId && (
                  <span className="text-[10px] text-gray-400 font-mono" title={`Google Place ID: ${value.placeId}`}>
                    ID: {value.placeId.slice(0, 14)}…
                  </span>
                )}
              </div>
            </div>

            {hasValidCoordinates && (
              <div className="shrink-0 text-right sm:border-l sm:border-gray-800/60 sm:pl-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 block mb-0.5">
                  Coordinates
                </span>
                <span className="text-xs font-mono text-gray-300 block">
                  {value.latitude?.toFixed(4)}°, {value.longitude?.toFixed(4)}°
                </span>
              </div>
            )}
          </div>

          {/* Map Preview */}
          <div className="pt-2">
            {hasValidCoordinates ? (
              <div className="rounded-xl overflow-hidden border border-gray-800 shadow-xs">
                <ExoraMap
                  markers={[
                    {
                      id: value.placeId || 'selected-venue-pin',
                      latitude: value.latitude!,
                      longitude: value.longitude!,
                      title: value.venueName,
                      subtitle: value.address,
                    },
                  ]}
                  zoom={15}
                  className="w-full h-44"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-gray-800 bg-gray-850/40 p-4 text-center space-y-1">
                <p className="text-xs font-medium text-gray-300">Map preview unavailable</p>
                <p className="text-[11px] text-gray-500">
                  Geographic coordinates have not been verified yet for this address.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── RENDER CASE 2: UNCONFIGURED (LEGACY / OPTIONAL EXHIBITION) ──
  if (!value && !required && !isChanging) {
    return (
      <Card className={`border ${error ? 'border-rose-500/50' : 'border-gray-800'} bg-gray-900 shadow-sm overflow-hidden`}>
        <CardHeader className="py-4 border-b border-gray-800/60 bg-gray-850/30 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-100 flex items-center gap-2">
              <MapPin size={16} className="text-gray-400" />
              <span>{label}</span>
            </CardTitle>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-800/40">
              Location not configured
            </span>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleStartChange}
            disabled={disabled}
            leftIcon={<MapPin size={13} className="text-[#1557FF]" />}
          >
            Add location
          </Button>
        </CardHeader>

        <CardContent className="p-6 text-center space-y-3">
          <div className="mx-auto w-10 h-10 rounded-full bg-gray-800/80 flex items-center justify-center text-gray-400">
            <Globe size={18} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-gray-200">No Location Configured</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              This legacy exhibition does not have geographic coordinates attached. Add a location to enable dashboard map display and venue directions.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleStartChange}
            disabled={disabled}
            className="mt-1"
          >
            + Add location
          </Button>
          {error && (
            <p className="text-xs text-rose-500 flex items-center justify-center gap-1.5 pt-1">
              <AlertCircle size={13} />
              <span>{error}</span>
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── RENDER CASE 3: SEARCH / AUTOCOMPLETE INPUT ──
  return (
    <Card className={`border ${error ? 'border-rose-500/50' : 'border-gray-800'} bg-gray-900 shadow-sm overflow-visible`}>
      <CardHeader className="py-4 border-b border-gray-800/60 bg-gray-850/30 flex flex-row items-center justify-between">
        <div className="space-y-0.5">
          <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-100 flex items-center gap-2">
            <MapPin size={16} className="text-[#1557FF]" />
            <span>{label}</span>
            {required && <span className="text-rose-500">*</span>}
          </CardTitle>
          <p className="text-xs text-gray-400">
            Search for a venue, exhibition centre, or geographical address
          </p>
        </div>

        {value && isChanging ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancelChange}
            disabled={disabled}
            leftIcon={<RotateCcw size={13} />}
          >
            Keep current
          </Button>
        ) : !required && isChanging ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCancelChange}
            disabled={disabled}
            leftIcon={<X size={13} />}
            className="text-gray-400 hover:text-gray-200"
          >
            Cancel
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="p-5 space-y-3 relative" ref={containerRef}>
        {apiUnavailable ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-300 text-xs space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle size={15} />
              <span>Location search is temporarily unavailable</span>
            </div>
            <p className="text-[11px] text-amber-200/80 leading-relaxed">
              Google Places API is initializing or requires authorization. Please verify <code className="font-mono text-white">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> has Places API (New) enabled.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Search Input */}
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-gray-400 pointer-events-none">
                {isSearching || isResolving ? (
                  <Loader2 size={16} className="animate-spin text-[#1557FF]" />
                ) : (
                  <Search size={16} />
                )}
              </div>
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                value={searchQuery}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={disabled || isResolving}
                placeholder="Search venue, exhibition centre, or address…"
                className={`w-full h-11 pl-10 pr-10 text-sm rounded-xl border bg-gray-950 text-gray-100 placeholder:text-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1557FF]/40 ${
                  error ? 'border-rose-500 focus:border-rose-500' : 'border-gray-800 focus:border-[#1557FF]'
                }`}
                aria-autocomplete="list"
                aria-controls="places-prediction-list"
                aria-expanded={predictions.length > 0}
                aria-label="Search venue or address"
              />
              {searchQuery && !isResolving && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setPredictions([]);
                    setTypedWithoutSelectionNotice(false);
                    inputRef.current?.focus();
                  }}
                  className="absolute right-3 p-1 rounded-md text-gray-400 hover:text-gray-200 transition-colors"
                  title="Clear input"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {predictions.length > 0 && (
              <div
                id="places-prediction-list"
                role="listbox"
                className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden divide-y divide-gray-850 animate-in fade-in-50 duration-150"
              >
                <div className="max-h-64 overflow-y-auto">
                  {predictions.map((p, index) => {
                    const isHighlighted = selectedIndex === index;
                    return (
                      <button
                        key={p.placeId || index}
                        type="button"
                        role="option"
                        aria-selected={isHighlighted}
                        onClick={() => handleSelectPrediction(p)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={`w-full px-4 py-3 text-left flex items-start gap-3 transition-colors cursor-pointer ${
                          isHighlighted ? 'bg-gray-850' : 'hover:bg-gray-850/60'
                        }`}
                      >
                        <div className="p-1.5 rounded-lg bg-gray-800 text-[#1557FF] shrink-0 mt-0.5">
                          <MapPin size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-gray-100 truncate">
                            {p.mainText}
                          </div>
                          {p.secondaryText && (
                            <div className="text-[11px] text-gray-400 truncate mt-0.5">
                              {p.secondaryText}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Google Attribution */}
                <div className="px-3 py-1.5 bg-gray-950/80 text-[10px] text-gray-500 text-right flex items-center justify-end gap-1.5">
                  <span>Powered by</span>
                  <span className="font-semibold text-gray-400">Google</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Explicit Google Places Search Error */}
        {searchError && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-400" />
            <div className="space-y-0.5">
              <span className="font-semibold block">Google Places lookup issue</span>
              <span className="text-[11px] text-amber-200/90 leading-relaxed block">{searchError}</span>
            </div>
          </div>
        )}

        {/* Validation Error */}
        {error && (
          <p className="text-xs text-rose-500 flex items-center gap-1.5 pt-0.5">
            <AlertCircle size={13} />
            <span>{error}</span>
          </p>
        )}

        {/* Notice if user typed without selecting a suggestion */}
        {typedWithoutSelectionNotice && (
          <p className="text-xs text-amber-400 flex items-center gap-1.5 pt-0.5">
            <AlertCircle size={13} />
            <span>Please select a location from the suggestions to confirm coordinates.</span>
          </p>
        )}

        {/* Helper Instructions */}
        {!value && (
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Start typing the name of an exhibition centre, convention hall, or city address. Select a result to automatically capture verified coordinates and address telemetry.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
