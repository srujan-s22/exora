'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Ticket,
  Users,
  Edit3,
  Pause,
  Play,
  Trash,
  AlertTriangle,
  BarChart3,
  Globe,
  Plus,
  Info,
  StopCircle,
  Clock,
  CalendarPlus,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusIndicator } from '@/components/shared/status-indicator';
import { Tabs } from '@/components/ui/tabs';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/providers/toast-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { StatCard } from '@/components/shared/stat-card';
import { hasAdminPermission } from '@/lib/utils/permission-helpers';
import type { Exhibition } from '@/types/exhibition.types';

interface ExhibitionStats {
  ticketsSold: number;
  totalRevenue: number;
  totalScans: number;
  admittedCount: number;
  utilization: number;
}

export default function ExhibitionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { addToast } = useToast();
  const { user } = useAuth();
  const id = params.id as string;

  // State managers
  const [exhibition, setExhibition] = React.useState<Exhibition | null>(null);
  const [stats, setStats] = React.useState<ExhibitionStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isStatsLoading, setIsStatsLoading] = React.useState(true);
  const [isActionLoading, setIsActionLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('overview');

  // Modal display toggles
  const [showArchiveModal, setShowArchiveModal] = React.useState(false);
  const [showPauseModal, setShowPauseModal] = React.useState(false);
  const [showEndModal, setShowEndModal] = React.useState(false);
  const [showExtendModal, setShowExtendModal] = React.useState(false);

  // Form states for lifecycle modals
  const [pauseReason, setPauseReason] = React.useState('');
  const [endReason, setEndReason] = React.useState('');
  const [extendReason, setExtendReason] = React.useState('');
  const [extendNewDate, setExtendNewDate] = React.useState('');

  const canManageLifecycle = hasAdminPermission(user, 'canManageExhibitions');

  const fetchExhibitionDetails = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/exhibitions/${id}`);
      if (!res.ok) throw new Error('Failed to load exhibition details');
      
      const body = await res.json();
      if (body.success) {
        setExhibition(body.data);
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error loading details',
        message: err.message || 'Check your network connection.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, addToast]);

  const fetchStats = React.useCallback(async () => {
    setIsStatsLoading(true);
    try {
      const res = await fetch(`/api/exhibitions/${id}/stats`);
      if (!res.ok) throw new Error('Failed to load exhibition metrics');
      
      const body = await res.json();
      if (body.success) {
        setStats(body.data);
      }
    } catch (err) {
      console.error('Stats load failure:', err);
    } finally {
      setIsStatsLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    if (id) {
      fetchExhibitionDetails();
      fetchStats();
    }
  }, [id, fetchExhibitionDetails, fetchStats]);

  const handlePause = async () => {
    if (!pauseReason.trim()) {
      addToast({ type: 'error', title: 'Reason required', message: 'Please enter a reason for pausing the exhibition.' });
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/exhibitions/${id}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: pauseReason }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Failed to pause exhibition');
      setExhibition(body.data?.exhibition || body.data);
      addToast({ type: 'success', title: 'Exhibition Paused', message: `Exhibition '${exhibition?.name}' is now paused.` });
      setShowPauseModal(false);
      setPauseReason('');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Action failed', message: err.message || 'Could not pause exhibition.' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResume = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/exhibitions/${id}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Failed to resume exhibition');
      setExhibition(body.data?.exhibition || body.data);
      addToast({ type: 'success', title: 'Exhibition Resumed', message: `Exhibition '${exhibition?.name}' is now operational.` });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Action failed', message: err.message || 'Could not resume exhibition.' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleEndNow = async () => {
    if (!endReason.trim()) {
      addToast({ type: 'error', title: 'Reason required', message: 'Please enter a reason for ending the exhibition.' });
      return;
    }
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/exhibitions/${id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: endReason }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Failed to end exhibition');
      setExhibition(body.data?.exhibition || body.data);
      addToast({ type: 'info', title: 'Exhibition Completed', message: `Exhibition '${exhibition?.name}' has been marked as completed.` });
      setShowEndModal(false);
      setEndReason('');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Action failed', message: err.message || 'Could not end exhibition.' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleExtend = async () => {
    if (!extendNewDate) {
      addToast({ type: 'error', title: 'Date required', message: 'Please select a new end date & time.' });
      return;
    }
    if (!extendReason.trim()) {
      addToast({ type: 'error', title: 'Reason required', message: 'Please enter a reason for extending the exhibition.' });
      return;
    }
    setIsActionLoading(true);
    try {
      const newIsoDate = new Date(extendNewDate).toISOString();
      const res = await fetch(`/api/exhibitions/${id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEndDate: newIsoDate, reason: extendReason }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Failed to extend exhibition');
      setExhibition(body.data?.exhibition || body.data);
      addToast({ type: 'success', title: 'Exhibition Extended', message: `Exhibition end date updated.` });
      setShowExtendModal(false);
      setExtendReason('');
      setExtendNewDate('');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Action failed', message: err.message || 'Could not extend exhibition.' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleArchive = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/exhibitions/${id}`, {
        method: 'DELETE',
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Failed to archive exhibition');

      addToast({
        type: 'info',
        title: 'Exhibition archived',
        message: 'Exhibition successfully soft-deleted from active records.',
      });
      router.push('/admin/exhibitions');
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Archive failed',
        message: err.message || 'Please try again later.',
      });
    } finally {
      setIsActionLoading(false);
      setShowArchiveModal(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Spinner size="lg" className="text-accent-500" />
      </div>
    );
  }

  if (!exhibition) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-warning mb-4" />
        <h3 className="text-base font-bold text-gray-200">Exhibition Not Found</h3>
        <p className="mt-1 text-sm text-gray-400 max-w-sm">
          The requested exhibition document could not be found or has been completely removed.
        </p>
        <Link href="/admin/exhibitions" passHref>
          <Button variant="secondary" className="mt-4 text-xs font-semibold">
            Return to List
          </Button>
        </Link>
      </div>
    );
  }

  // Format Date timeframe
  const formattedDates = () => {
    const s = new Date(exhibition.startDate);
    const e = new Date(exhibition.endDate);
    const format = { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' } as const;
    return `${s.toLocaleDateString('en-IN', format)} - ${e.toLocaleDateString('en-IN', { ...format, year: 'numeric' })}`;
  };

  const formattedRevenue = stats
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
      }).format(stats.totalRevenue / 100)
    : '₹0';

  // Roster details
  const staffRoster: any[] = (exhibition as any).assignedStaffIds || [];
  const counterStaff = staffRoster.filter((st) => st.role === 'counter');
  const gateStaff = staffRoster.filter((st) => st.role === 'gate');

  const tabOptions = [
    { id: 'overview', label: 'General Overview' },
    { id: 'tickets', label: `Ticket Classes (${exhibition.ticketTypes.length})` },
    { id: 'roster', label: `Assigned Roster (${staffRoster.length})` },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto flex flex-col flex-1">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-800 pb-5">
        <div className="space-y-2">
          <Link href="/admin/exhibitions" passHref>
            <Button variant="secondary" className="h-8 px-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200">
              <ArrowLeft size={13} />
              <span>Back to Workspace</span>
            </Button>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-50">{exhibition.name}</h1>
            <StatusIndicator status={exhibition.status} />
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-gray-400 select-none">
            <Globe size={12} className="text-accent-400" />
            <span className="uppercase">{exhibition.category} category</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {exhibition.status !== 'archived' && canManageLifecycle && (
            <>
              <Link href={`/admin/exhibitions/${id}/edit`} passHref>
                <Button variant="secondary" className="text-xs font-semibold flex items-center gap-1.5 h-9">
                  <Edit3 size={13} />
                  <span>Edit Setup</span>
                </Button>
              </Link>

              {exhibition.status === 'paused' ? (
                <Button
                  variant="secondary"
                  onClick={handleResume}
                  isLoading={isActionLoading}
                  className="text-xs font-semibold flex items-center gap-1.5 h-9 text-success-400 hover:text-success-300"
                >
                  <Play size={13} />
                  <span>Resume Event</span>
                </Button>
              ) : exhibition.status !== 'completed' && exhibition.status !== 'closed' ? (
                <Button
                  variant="secondary"
                  onClick={() => setShowPauseModal(true)}
                  isLoading={isActionLoading}
                  className="text-xs font-semibold flex items-center gap-1.5 h-9 text-warning-400 hover:text-warning-300"
                >
                  <Pause size={13} />
                  <span>Pause Event</span>
                </Button>
              ) : null}

              {exhibition.status !== 'completed' && exhibition.status !== 'closed' && (
                <Button
                  variant="secondary"
                  onClick={() => setShowEndModal(true)}
                  isLoading={isActionLoading}
                  className="text-xs font-semibold flex items-center gap-1.5 h-9 text-error hover:text-error/80"
                >
                  <StopCircle size={13} />
                  <span>End Event</span>
                </Button>
              )}

              <Button
                variant="secondary"
                onClick={() => setShowExtendModal(true)}
                isLoading={isActionLoading}
                className="text-xs font-semibold flex items-center gap-1.5 h-9 text-accent-300 hover:text-accent-200"
              >
                <CalendarPlus size={13} />
                <span>Extend End Date</span>
              </Button>

              <Button
                variant="danger"
                onClick={() => setShowArchiveModal(true)}
                className="text-xs font-semibold flex items-center gap-1.5 h-9 cursor-pointer"
                disabled={isActionLoading}
              >
                <Trash size={13} />
                <span>Archive</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Aggregate Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="TICKETS SOLD"
          value={stats?.ticketsSold ?? 0}
          icon="Ticket"
          isLoading={isStatsLoading}
        />
        <StatCard
          title="GROSS REVENUE"
          value={formattedRevenue}
          icon="BarChart3"
          isLoading={isStatsLoading}
        />
        <StatCard
          title="VALIDATION SCANS"
          value={stats?.totalScans ?? 0}
          icon="Activity"
          isLoading={isStatsLoading}
        />
        <StatCard
          title="ADMITTED CAPACITY"
          value={stats ? `${stats.admittedCount} / ${exhibition.capacity || '∞'}` : '0 / 0'}
          icon="Users"
          isLoading={isStatsLoading}
        />
      </div>

      {/* Detail Workspace Tabs */}
      <div className="flex flex-col flex-1 space-y-4">
        <Tabs tabs={tabOptions} activeTab={activeTab} onChange={setActiveTab} />

        <div className="flex-1">
          {/* Tab 1: Overview Details */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Rules & Info */}
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-gray-300 uppercase tracking-wider">Venue Description & Rules</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-gray-300">
                    <div>
                      <span className="font-semibold text-gray-400 block mb-1">Overview Description</span>
                      <p className="leading-relaxed bg-gray-950/40 p-3 rounded-lg border border-gray-850">
                        {exhibition.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <span className="font-semibold text-gray-400 block mb-1">Time Schedule</span>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-200">
                          <Calendar size={13} className="text-accent-400" />
                          <span>{formattedDates()}</span>
                        </div>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-400 block mb-1">Venue Hall & Address</span>
                        <div className="flex items-start gap-1.5 text-xs font-medium text-gray-200">
                          <MapPin size={13} className="text-accent-400 shrink-0 mt-0.5" />
                          <div>
                            {exhibition.location ? (
                              <>
                                <span className="font-semibold text-gray-100 block">{exhibition.location.venueName}</span>
                                <span className="block text-gray-400 text-[11px] mt-0.5">
                                  {[
                                    exhibition.location.address,
                                    exhibition.location.city,
                                    exhibition.location.state,
                                    exhibition.location.country,
                                    exhibition.location.postalCode,
                                  ].filter(Boolean).join(', ')}
                                </span>
                              </>
                            ) : (
                              <span>{exhibition.venue} {exhibition.address ? `(${exhibition.address})` : ''}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {exhibition.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-bold text-gray-300 uppercase tracking-wider">Internal Operating Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-400 leading-relaxed italic bg-gray-950/40 p-3 rounded-lg border border-gray-850">
                        "{exhibition.notes}"
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column: Settings & Lifecycle configuration summaries */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-gray-300 uppercase tracking-wider">Operating Rules</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center text-sm border-b border-gray-850 pb-2">
                      <span className="text-gray-400">Multi-Entry Tickets</span>
                      <span className={`font-semibold ${exhibition.settings.allowMultiEntry ? 'text-success' : 'text-gray-500'}`}>
                        {exhibition.settings.allowMultiEntry ? 'Allowed' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-gray-850 pb-2">
                      <span className="text-gray-400">Scans Limit Per Ticket</span>
                      <span className="font-semibold text-gray-200">
                        {exhibition.settings.maxScansPerTicket} scan(s) max
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-gray-850 pb-2">
                      <span className="text-gray-400">Primary Ticket Price</span>
                      <span className="font-bold text-accent-300">
                        ₹{exhibition.entryFee / 100}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Attendee Cap</span>
                      <span className="font-semibold text-gray-200">
                        {exhibition.capacity ? `${exhibition.capacity} visitors` : 'Unlimited'}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Lifecycle Status & Reason card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-bold text-gray-300 uppercase tracking-wider">Lifecycle Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs text-gray-400">
                    <div className="flex items-center justify-between">
                      <span>Status:</span>
                      <StatusIndicator status={exhibition.status} />
                    </div>
                    {(exhibition as any).manualPauseReason && (
                      <div className="bg-warning/10 border border-warning/20 p-2.5 rounded text-warning">
                        <span className="font-bold block mb-0.5">Pause Reason:</span>
                        {(exhibition as any).manualPauseReason}
                      </div>
                    )}
                    {(exhibition as any).manualEndReason && (
                      <div className="bg-gray-900 border border-gray-800 p-2.5 rounded text-gray-300">
                        <span className="font-bold block mb-0.5">Completion Reason:</span>
                        {(exhibition as any).manualEndReason}
                      </div>
                    )}
                    {(exhibition as any).manualExtendReason && (
                      <div className="bg-accent-500/10 border border-accent-500/20 p-2.5 rounded text-accent-300">
                        <span className="font-bold block mb-0.5">Last Extension Reason:</span>
                        {(exhibition as any).manualExtendReason}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Tab 2: Ticket Classes */}
          {activeTab === 'tickets' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold text-gray-300 uppercase tracking-wider">Configured Ticket Classes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 bg-gray-900/40 text-[10px] font-bold text-gray-400 uppercase tracking-wider select-none">
                        <th className="p-4 pl-6">Class Name</th>
                        <th className="p-4">Ticket Price (₹)</th>
                        <th className="p-4 pr-6">Capacity Cap</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-y-gray-850">
                      {exhibition.ticketTypes.map((t, idx) => (
                        <tr key={idx} className="hover:bg-gray-900/10">
                          <td className="p-4 pl-6 font-semibold text-gray-100">{t.name}</td>
                          <td className="p-4 font-semibold text-accent-300">₹{t.price / 100}</td>
                          <td className="p-4 pr-6 text-gray-400">{t.maxQuantity ? `${t.maxQuantity} tickets` : 'No Limit'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab 3: Assigned Staff Roster */}
          {activeTab === 'roster' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Counter Staff Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Counter Staff Assigned</span>
                    <span className="text-[10px] text-gray-500 font-semibold px-2 py-0.5 rounded-full bg-gray-950 border border-gray-850">{counterStaff.length}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {counterStaff.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No counter staff assigned to this exhibition.</p>
                  ) : (
                    <div className="divide-y divide-gray-850">
                      {counterStaff.map((st) => (
                        <div key={st.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                          <div>
                            <span className="text-sm font-semibold text-gray-200 block">{st.name}</span>
                            <span className="text-xs text-gray-500">ID: {st.staffId}</span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-850 border border-gray-800 rounded px-2 py-0.5 uppercase select-none">Counter</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Gate Staff Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center justify-between">
                    <span>Gate Scanning Staff Assigned</span>
                    <span className="text-[10px] text-gray-500 font-semibold px-2 py-0.5 rounded-full bg-gray-950 border border-gray-850">{gateStaff.length}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {gateStaff.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No gate validation staff assigned to this exhibition.</p>
                  ) : (
                    <div className="divide-y divide-gray-850">
                      {gateStaff.map((st) => (
                        <div key={st.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                          <div>
                            <span className="text-sm font-semibold text-gray-200 block">{st.name}</span>
                            <span className="text-xs text-gray-500">ID: {st.staffId}</span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-850 border border-gray-800 rounded px-2 py-0.5 uppercase select-none">Gate Scan</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Pause Modal */}
      <Modal open={showPauseModal} onClose={() => setShowPauseModal(false)} title="Pause Exhibition">
        <div className="space-y-4">
          <p className="text-xs text-gray-400">
            Pausing this exhibition will temporarily suspend all ticket sales and gate/ride scans.
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Reason for Pausing *</label>
            <textarea
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder="e.g. Temporary power outage / emergency maintenance"
              className="w-full h-20 bg-gray-900 border border-gray-800 rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-accent-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
            <Button variant="secondary" onClick={() => setShowPauseModal(false)} disabled={isActionLoading}>Cancel</Button>
            <Button variant="secondary" className="bg-warning text-black hover:bg-warning/90 font-semibold" onClick={handlePause} isLoading={isActionLoading}>Confirm Pause</Button>
          </div>
        </div>
      </Modal>

      {/* End Modal */}
      <Modal open={showEndModal} onClose={() => setShowEndModal(false)} title="End Exhibition Now">
        <div className="space-y-4">
          <p className="text-xs text-gray-400">
            Ending this exhibition will transition its status to COMPLETED and stop all ticketing operations permanently.
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Reason for Ending *</label>
            <textarea
              value={endReason}
              onChange={(e) => setEndReason(e.target.value)}
              placeholder="e.g. Exhibition concluded early as per management directive"
              className="w-full h-20 bg-gray-900 border border-gray-800 rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-accent-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
            <Button variant="secondary" onClick={() => setShowEndModal(false)} disabled={isActionLoading}>Cancel</Button>
            <Button variant="danger" onClick={handleEndNow} isLoading={isActionLoading}>Confirm End Event</Button>
          </div>
        </div>
      </Modal>

      {/* Extend Modal */}
      <Modal open={showExtendModal} onClose={() => setShowExtendModal(false)} title="Extend Exhibition Time">
        <div className="space-y-4">
          <p className="text-xs text-gray-400">
            Extend the end date and time of this exhibition to allow ongoing sales and gate validation scans.
          </p>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">New End Date & Time *</label>
            <input
              type="datetime-local"
              value={extendNewDate}
              onChange={(e) => setExtendNewDate(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-accent-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Reason for Extension *</label>
            <textarea
              value={extendReason}
              onChange={(e) => setExtendReason(e.target.value)}
              placeholder="e.g. Extended by 2 hours due to high visitor demand"
              className="w-full h-20 bg-gray-900 border border-gray-800 rounded p-2 text-xs text-gray-200 focus:outline-none focus:border-accent-500"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
            <Button variant="secondary" onClick={() => setShowExtendModal(false)} disabled={isActionLoading}>Cancel</Button>
            <Button variant="primary" onClick={handleExtend} isLoading={isActionLoading}>Confirm Extension</Button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Archive Modal */}
      <Modal
        open={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        title="Archive Exhibition"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-error/5 border border-error/20 p-3 rounded-lg text-sm text-error">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <p>
              <strong>Warning:</strong> Archiving this exhibition will deactivate it. Assigned staff will lose access to work under its scope, and it will be excluded from all ticketing operations. Historical metrics will be preserved.
            </p>
          </div>
          <p className="text-sm text-gray-300">
            Are you sure you want to archive <strong>{exhibition.name}</strong>?
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-800/40">
            <Button
              variant="secondary"
              onClick={() => setShowArchiveModal(false)}
              disabled={isActionLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleArchive}
              isLoading={isActionLoading}
              className="font-semibold cursor-pointer"
            >
              Confirm Archive
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
