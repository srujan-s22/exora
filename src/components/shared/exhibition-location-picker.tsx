'use client';

import * as React from 'react';
import { MapPin, Search, CheckCircle2, RotateCcw, X, AlertCircle, Loader2, Edit3, Globe, Navigation } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExoraMap } from '@/components/shared/exora-map';
import type { LocationSearchResult } from '@/lib/services/location-search.service';
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
  const [predictions, setPredictions] = React.useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState<number>(-1);
  const [typedWithoutSelectionNotice, setTypedWithoutSelectionNotice] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [hasNoResults, setHasNoResults] = React.useState(false);

  // Store the canonical value when entering "change" mode to power "Keep current"
  const [savedLocation, setSavedLocation] = React.useState<SelectedExhibitionLocation | null>(null);
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPredictions([]);
        setSelectedIndex(-1);
        setHasNoResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  // Fetch predictions with 350ms debounce and AbortController
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    setTypedWithoutSelectionNotice(false);
    setSearchError(null);
    setHasNoResults(false);
    setSelectedIndex(-1);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setPredictions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const res = await fetch(`/api/location/search?q=${encodeURIComponent(trimmed)}&limit=6`, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });

        if (!res.ok) {
          if (res.status === 403) {
            setSearchError('Access denied: Administrator privileges required to search locations.');
          } else if (res.status === 429) {
            setSearchError('Search rate limit reached. Please wait a moment before searching again.');
          } else {
            setSearchError('Location search is temporarily unavailable. Please try again.');
          }
          setPredictions([]);
          setIsSearching(false);
          return;
        }

        const body = await res.json();
        if (body.success && Array.isArray(body.data)) {
          setPredictions(body.data);
          setHasNoResults(body.data.length === 0);
          setSearchError(null);
        } else {
          setPredictions([]);
          setHasNoResults(true);
        }
      } catch (err: unknown) {
        const error = err as Error;
        if (error.name === 'AbortError') {
          // Stale request aborted; do not treat as error
          return;
        }
        logger.warn('Location Picker: search fetch error', { error: error.message || String(err) });
        setSearchError('Unable to reach location search. Check your connection and try again.');
        setPredictions([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  // User selects an authoritative suggestion
  const handleSelectPrediction = (result: LocationSearchResult) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const selectedLocation: SelectedExhibitionLocation = {
      venueName: result.venueName || result.displayName.split(',')[0]?.trim() || 'Exhibition Venue',
      address: result.address || result.displayName,
      city: result.city || '',
      state: result.state || '',
      country: result.country || 'India',
      postalCode: result.postalCode || '',
      latitude: result.latitude,
      longitude: result.longitude,
      placeId: result.providerId,
    };

    onChange(selectedLocation);
    setIsChanging(false);
    setSearchQuery('');
    setPredictions([]);
    setTypedWithoutSelectionNotice(false);
    setSearchError(null);
    setHasNoResults(false);
  };

  // Keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (predictions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (searchQuery.trim().length >= 3) {
          setTypedWithoutSelectionNotice(true);
        }
      }
      return;
    }

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

  const handleStartChange = () => {
    setSavedLocation(value || null);
    setIsChanging(true);
    setSearchQuery('');
    setPredictions([]);
    setTypedWithoutSelectionNotice(false);
    setSearchError(null);
    setHasNoResults(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleKeepCurrent = () => {
    setIsChanging(false);
    setSearchQuery('');
    setPredictions([]);
    setTypedWithoutSelectionNotice(false);
    setSearchError(null);
    setHasNoResults(false);
    if (savedLocation) {
      onChange(savedLocation);
    }
  };

  const handleCancelChange = () => {
    setIsChanging(false);
    setSearchQuery('');
    setPredictions([]);
    setTypedWithoutSelectionNotice(false);
    setSearchError(null);
    setHasNoResults(false);
  };

  const handleClear = () => {
    onChange(null);
    setSearchQuery('');
    setPredictions([]);
    setIsChanging(true);
    setTypedWithoutSelectionNotice(false);
    setSearchError(null);
    setHasNoResults(false);
    setTimeout(() => inputRef.current?.focus(), 50);
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

  // ── RENDER CASE 1: CONFIRMED / SELECTED LOCATION DISPLAY ──
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

          {/* Leaflet Map Preview */}
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

        {savedLocation && isChanging ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleKeepCurrent}
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
        <div className="relative">
          {/* Search Input */}
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-gray-400 pointer-events-none">
              {isSearching ? (
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
              disabled={disabled}
              placeholder="Search venue, exhibition centre, or address (min 3 chars)…"
              className={`w-full h-11 pl-10 pr-10 text-sm rounded-xl border bg-gray-950 text-gray-100 placeholder:text-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1557FF]/40 ${
                error ? 'border-rose-500 focus:border-rose-500' : 'border-gray-800 focus:border-[#1557FF]'
              }`}
              aria-autocomplete="list"
              aria-controls="photon-prediction-list"
              aria-expanded={predictions.length > 0}
              aria-label="Search venue or address"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setPredictions([]);
                  setTypedWithoutSelectionNotice(false);
                  setHasNoResults(false);
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
              id="photon-prediction-list"
              role="listbox"
              className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden divide-y divide-gray-850 animate-in fade-in-50 duration-150"
            >
              <div className="max-h-72 overflow-y-auto">
                {predictions.map((p, index) => {
                  const isHighlighted = selectedIndex === index;
                  return (
                    <button
                      key={p.providerId || `${p.latitude},${p.longitude}`}
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
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-gray-100 truncate">
                            {p.venueName || p.displayName.split(',')[0]}
                          </span>
                          {p.category && (
                            <span className="text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 shrink-0">
                              {p.category}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 truncate mt-0.5">
                          {p.address}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* OpenStreetMap / Photon Attribution Footer */}
              <div className="px-3 py-1.5 bg-gray-950/90 text-[10px] text-gray-500 text-right flex items-center justify-between border-t border-gray-850">
                <span className="flex items-center gap-1 text-gray-500">
                  <Navigation size={10} />
                  <span>Select result to attach coordinates</span>
                </span>
                <span>
                  Data &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:underline">OpenStreetMap</a> contributors
                </span>
              </div>
            </div>
          )}

          {/* No Results Notice */}
          {hasNoResults && !isSearching && searchQuery.trim().length >= 3 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-gray-900 border border-gray-800 rounded-xl shadow-lg p-4 text-center text-xs text-gray-400">
              No matching locations found. Try checking the spelling or searching for the city name.
            </div>
          )}
        </div>

        {/* Search Error State */}
        {searchError && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-400" />
            <div className="space-y-0.5">
              <span className="font-semibold block">Location search unavailable</span>
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
            <span>Please select a location from the search results to confirm coordinates.</span>
          </p>
        )}

        {/* Helper Instructions */}
        {!value && (
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Start typing the name of an exhibition centre, convention hall, or city address (minimum 3 characters). Select a result from the suggestions to automatically attach verified coordinates.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
