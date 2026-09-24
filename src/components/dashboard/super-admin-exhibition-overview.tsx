'use client';

import * as React from 'react';
import { MapPin, Globe, RotateCcw, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { StatusIndicator } from '@/components/shared/status-indicator';
import { ExoraMap, type MapMarker } from '@/components/shared/exora-map';
import { logger } from '@/lib/utils/logger';

export interface ExhibitionOverviewItem {
  id: string;
  name: string;
  status: string;
  venue?: string;
  address?: string;
  category?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  location?: {
    venueName?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  ticketsSold?: number;
  revenue?: number;
  admitted?: number;
  capacity?: number;
  utilization?: number;
}

export interface SuperAdminExhibitionOverviewProps {
  exhibitions: ExhibitionOverviewItem[];
  selectedExhibitionId: string;
  onSelectExhibition: (id: string) => void;
  isLoading?: boolean;
}

/**
 * Robust Error Boundary to isolate Google Maps failures
 * and prevent dashboard crashes.
 */
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage?: string;
}

class MapErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.warn('Google Maps ErrorBoundary caught error', { error: error.message, componentStack: errorInfo.componentStack });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="h-full w-full rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
            <AlertTriangle size={18} />
          </div>
          <p className="text-xs font-semibold text-slate-800">Map Unavailable</p>
          <p className="text-[11px] text-slate-500 max-w-xs">
            The interactive map could not be initialized. Exhibition details and operational telemetry remain active.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Validates coordinate integrity.
 */
function isValidCoordinate(lat?: number | null, lng?: number | null): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Determines exhibition location configuration state per specification:
 * CASE A — Valid coordinates (Mapped)
 * CASE B — Location not configured
 * CASE C — Coordinates invalid/malformed (Map location unavailable)
 */
function getLocationState(exh: ExhibitionOverviewItem) {
  const loc = exh.location;
  const lat = loc?.latitude;
  const lng = loc?.longitude;
  const hasCoords = lat !== null && lat !== undefined && lng !== null && lng !== undefined;
  const valid = isValidCoordinate(lat, lng);

  if (valid) {
    return {
      type: 'mapped' as const,
      label: 'Mapped',
      badgeClass: 'text-emerald-700 bg-emerald-50 border-emerald-200/80',
    };
  }

  if (hasCoords && !valid) {
    return {
      type: 'malformed' as const,
      label: 'Map location unavailable',
      badgeClass: 'text-amber-700 bg-amber-50 border-amber-200/80',
    };
  }

  return {
    type: 'unconfigured' as const,
    label: 'Location not configured',
    badgeClass: 'text-slate-500 bg-slate-100 border-slate-200',
  };
}

export function SuperAdminExhibitionOverview({
  exhibitions = [],
  selectedExhibitionId,
  onSelectExhibition,
  isLoading = false,
}: SuperAdminExhibitionOverviewProps) {
  const cardRefs = React.useRef<Map<string, HTMLDivElement>>(new Map());

  // Filter valid geographic markers for ExoraMap
  const validMapMarkers = React.useMemo((): MapMarker[] => {
    return exhibitions
      .filter((exh) => isValidCoordinate(exh.location?.latitude, exh.location?.longitude))
      .map((exh) => {
        const cityState = [exh.location?.city, exh.location?.state].filter(Boolean).join(', ');
        const venue = exh.location?.venueName || exh.venue || 'Exhibition Venue';
        return {
          id: exh.id,
          title: exh.name,
          venueName: venue,
          subtitle: cityState ? `${venue} • ${cityState}` : venue,
          category: exh.category,
          status: exh.status,
          latitude: exh.location!.latitude!,
          longitude: exh.location!.longitude!,
        };
      });
  }, [exhibitions]);

  const mappedCount = validMapMarkers.length;
  const totalCount = exhibitions.length;

  // Selected exhibition data if one is targeted
  const selectedExhibition = React.useMemo(() => {
    if (!selectedExhibitionId || selectedExhibitionId === 'all') return null;
    return exhibitions.find((e) => e.id === selectedExhibitionId) || null;
  }, [exhibitions, selectedExhibitionId]);

  const selectedHasCoords = Boolean(
    selectedExhibition &&
      isValidCoordinate(selectedExhibition.location?.latitude, selectedExhibition.location?.longitude)
  );

  // Auto-scroll the list card into view when selected via map marker click
  React.useEffect(() => {
    if (selectedExhibitionId && selectedExhibitionId !== 'all') {
      const cardEl = cardRefs.current.get(selectedExhibitionId);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedExhibitionId]);

  // Loading skeleton treatment
  if (isLoading) {
    return (
      <div className="mb-8 grid grid-cols-1 lg:grid-cols-12 gap-5" aria-busy="true" aria-label="Loading exhibitions overview">
        {/* Left: Skeleton List */}
        <div className="lg:col-span-5 rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800/40">
            <div className="h-4 w-36 skeleton rounded" />
            <div className="h-4 w-16 skeleton rounded-full" />
          </div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-gray-800/80 bg-gray-850/40 space-y-2.5">
                <div className="flex justify-between items-center">
                  <div className="h-4 w-44 skeleton rounded" />
                  <div className="h-4 w-16 skeleton rounded-full" />
                </div>
                <div className="h-3 w-32 skeleton rounded" />
                <div className="flex gap-4 pt-1 border-t border-gray-800/50">
                  <div className="h-3 w-20 skeleton rounded" />
                  <div className="h-3 w-24 skeleton rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Skeleton Map */}
        <div className="lg:col-span-7 rounded-2xl border border-gray-800 bg-gray-900 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800/40 mb-4">
            <div className="h-4 w-28 skeleton rounded" />
            <div className="h-4 w-32 skeleton rounded-full" />
          </div>
          <div className="h-[440px] lg:h-[500px] w-full rounded-xl skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* ── LEFT PANEL: ALL EXHIBITIONS LIST (~40% desktop) ── */}
      <div className="lg:col-span-5 rounded-2xl border border-gray-800 bg-gray-900 shadow-xs overflow-hidden flex flex-col">
        {/* Panel Header */}
        <div className="p-4 border-b border-gray-800/60 bg-gray-850/40 flex items-center justify-between shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-100">
                All Exhibitions
              </span>
              <span className="text-[11px] font-semibold text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                {totalCount}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Multiple exhibitions. One control plane.
            </p>
          </div>

          {selectedExhibitionId !== 'all' && (
            <button
              type="button"
              onClick={() => onSelectExhibition('all')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1557FF] hover:text-[#1557FF]/80 bg-[#1557FF]/10 hover:bg-[#1557FF]/15 px-2.5 py-1 rounded-lg border border-[#1557FF]/25 transition-colors"
              title="Reset selection to all exhibitions"
            >
              <RotateCcw size={12} />
              <span>Show All</span>
            </button>
          )}
        </div>

        {/* Scrollable Exhibition Cards Container */}
        <div className="p-3.5 space-y-2.5 overflow-y-auto max-h-[500px] flex-1">
          {exhibitions.length === 0 ? (
            <div className="p-8 text-center space-y-2 my-auto">
              <div className="w-10 h-10 rounded-full bg-gray-850 text-gray-400 flex items-center justify-center mx-auto">
                <Globe size={18} />
              </div>
              <p className="text-xs font-semibold text-gray-200">No exhibitions available</p>
              <p className="text-[11px] text-gray-400 max-w-xs mx-auto">
                No exhibitions are currently assigned to your account.
              </p>
            </div>
          ) : (
            exhibitions.map((exh) => {
              const isSelected = selectedExhibitionId === exh.id;
              const locationState = getLocationState(exh);

              // Venue and City/Location text
              const venueText = exh.location?.venueName || exh.venue || 'Venue unassigned';
              const cityState = [exh.location?.city, exh.location?.state].filter(Boolean).join(', ');
              const locationSubtitle = cityState || exh.location?.address || exh.address || '';

              const formattedRevenue = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
              }).format((exh.revenue || 0) / 100);

              return (
                <div
                  key={exh.id}
                  ref={(el) => {
                    if (el) cardRefs.current.set(exh.id, el);
                    else cardRefs.current.delete(exh.id);
                  }}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  aria-label={`Exhibition ${exh.name}, status ${exh.status}`}
                  onClick={() => onSelectExhibition(isSelected ? 'all' : exh.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectExhibition(isSelected ? 'all' : exh.id);
                    }
                  }}
                  className={`relative p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-[#1557FF] ${
                    isSelected
                      ? 'border-[#1557FF] bg-[#1557FF]/5 shadow-xs ring-1 ring-[#1557FF]/30'
                      : 'border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-850/60'
                  }`}
                >
                  {/* Left accent bar on selection */}
                  {isSelected && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#1557FF] rounded-r" />
                  )}

                  {/* Top row: Title + Status */}
                  <div className="flex items-start justify-between gap-2.5 mb-1.5 pl-1">
                    <h4 className="text-xs font-bold text-gray-100 leading-snug line-clamp-1 hover:text-[#1557FF] transition-colors">
                      {exh.name}
                    </h4>
                    <StatusIndicator status={exh.status} className="shrink-0 select-none scale-90 origin-right" />
                  </div>

                  {/* Middle row: Venue / City & Location State Badge */}
                  <div className="flex items-center justify-between gap-2 text-[11px] text-gray-400 mb-2 pl-1">
                    <div className="flex items-center gap-1.5 truncate max-w-[210px]">
                      <MapPin size={12} className="text-gray-500 shrink-0" />
                      <span className="truncate">
                        {venueText}
                        {locationSubtitle ? ` • ${locationSubtitle}` : ''}
                      </span>
                    </div>

                    {/* Location State Indicator */}
                    {locationState.type === 'mapped' ? (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${locationState.badgeClass}`}>
                        <CheckCircle2 size={10} />
                        <span>Mapped</span>
                      </span>
                    ) : locationState.type === 'malformed' ? (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${locationState.badgeClass}`}>
                        <AlertCircle size={10} />
                        <span>Map unavailable</span>
                      </span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${locationState.badgeClass}`}>
                        <span>Location not configured</span>
                      </span>
                    )}
                  </div>

                  {/* Bottom row: Real Operational Metrics */}
                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-gray-800/60 pl-1">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400">
                        <span className="font-semibold text-gray-200">{exh.ticketsSold ?? 0}</span> tickets
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-400">
                        <span className="font-semibold text-[#1557FF]">{formattedRevenue}</span>
                      </span>
                    </div>

                    <span className="text-[10px] font-medium text-[#1557FF] hover:underline">
                      {isSelected ? 'Focused' : 'View'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: MAP VIEW (~60% desktop) ── */}
      <div className="lg:col-span-7 rounded-2xl border border-gray-800 bg-gray-900 shadow-xs overflow-hidden flex flex-col">
        {/* Panel Header */}
        <div className="p-4 border-b border-gray-800/60 bg-gray-850/40 flex items-center justify-between shrink-0">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-100">
                Map View
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                {mappedCount} of {totalCount} on map
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Interactive geographic distribution of authorized exhibition venues
            </p>
          </div>

          {selectedExhibitionId !== 'all' && (
            <button
              type="button"
              onClick={() => onSelectExhibition('all')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 hover:text-gray-100 bg-gray-850 hover:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-750 transition-colors shadow-2xs"
              title="Reset map bounds to fit all markers"
            >
              <RotateCcw size={12} />
              <span>Fit All</span>
            </button>
          )}
        </div>

        {/* Map Body Container */}
        <div className="relative flex-1 min-h-[380px] lg:min-h-[500px] p-2 bg-gray-950">
          {/* Floating alert when selected exhibition has no coordinates */}
          {selectedExhibition && !selectedHasCoords && (
            <div className="absolute top-4 left-4 z-10 bg-gray-900/95 border border-amber-500/30 text-amber-400 text-[11px] px-3 py-1.5 rounded-lg shadow-sm backdrop-blur-xs flex items-center gap-1.5 font-medium">
              <AlertCircle size={13} className="shrink-0 text-amber-400" />
              <span>
                {selectedExhibition.name}: Location not configured on map
              </span>
            </div>
          )}

          <MapErrorBoundary>
            {totalCount === 0 ? (
              <div className="h-full w-full rounded-xl border border-dashed border-gray-800 bg-gray-900 flex flex-col items-center justify-center p-8 text-center space-y-2.5">
                <div className="w-10 h-10 rounded-full bg-gray-850 text-gray-400 flex items-center justify-center">
                  <Globe size={18} />
                </div>
                <div className="space-y-1 max-w-sm">
                  <p className="text-xs font-semibold text-gray-200">No exhibitions available</p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    No exhibitions are currently assigned to your account.
                  </p>
                </div>
              </div>
            ) : mappedCount === 0 ? (
              <div className="h-full w-full rounded-xl border border-dashed border-gray-800 bg-gray-900 flex flex-col items-center justify-center p-8 text-center space-y-2.5">
                <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
                  <MapPin size={20} />
                </div>
                <div className="space-y-1 max-w-sm">
                  <p className="text-xs font-semibold text-gray-200">No exhibition locations configured yet</p>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    None of your authorized exhibitions have geographic coordinates. Configure location details in Exhibition Settings to place them on the map.
                  </p>
                </div>
              </div>
            ) : (
              <ExoraMap
                markers={validMapMarkers}
                selectedMarkerId={selectedExhibitionId !== 'all' ? selectedExhibitionId : null}
                onMarkerClick={(marker) => onSelectExhibition(marker.id)}
                className="w-full h-full rounded-xl overflow-hidden border border-gray-800"
              />
            )}
          </MapErrorBoundary>
        </div>
      </div>
    </div>
  );
}
