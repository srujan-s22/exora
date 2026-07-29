'use client';

import * as React from 'react';
import Link from 'next/link';
import { Search, Plus, Filter, Gamepad2, Settings, Play, Square, IndianRupee, QrCode, ShieldAlert, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/providers/toast-provider';
import { PageHeaderSkeleton, CardGridSkeleton, TableSkeleton } from '@/components/shared/skeletons';
import type { Ride } from '@/types/ride.types';
import type { Exhibition } from '@/types/exhibition.types';

export default function AdminRidesPage() {
  const { addToast } = useToast();
  const [exhibitions, setExhibitions] = React.useState<Exhibition[]>([]);
  const [selectedExhibitionId, setSelectedExhibitionId] = React.useState('');
  const [rides, setRides] = React.useState<Ride[]>([]);
  const [stats, setStats] = React.useState<Record<string, any>[]>([]);
  const [isLoadingExhibitions, setIsLoadingExhibitions] = React.useState(true);
  const [isLoadingRides, setIsLoadingRides] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  // 1. Fetch exhibitions dropdown in background
  React.useEffect(() => {
    async function loadExhibitions() {
      try {
        const res = await fetch('/api/exhibitions?limit=100&includeArchived=false');
        if (!res.ok) throw new Error('Failed to fetch exhibitions');
        const body = await res.json();
        if (body.success) {
          const exhs = body.data.data || body.data || [];
          setExhibitions(exhs);
          if (exhs.length > 0 && !selectedExhibitionId) {
            setSelectedExhibitionId(exhs[0].id);
          }
        }
      } catch (err: any) {
        addToast({
          type: 'error',
          title: 'Error loading exhibitions',
          message: err.message,
        });
      } finally {
        setIsLoadingExhibitions(false);
      }
    }
    loadExhibitions();
  }, [addToast]);

  // 2. Fetch rides and stats in parallel (concurrently)
  const fetchRidesAndStats = React.useCallback(async () => {
    setIsLoadingRides(true);
    try {
      let ridesUrl = '/api/rides';
      let statsUrl = '/api/dashboard/ride-stats';
      if (selectedExhibitionId) {
        ridesUrl += `?exhibitionId=${selectedExhibitionId}`;
        statsUrl += `?exhibitionId=${selectedExhibitionId}`;
        if (startDate) statsUrl += `&startDate=${encodeURIComponent(startDate)}`;
        if (endDate) statsUrl += `&endDate=${encodeURIComponent(endDate)}`;
      }

      // Concurrently execute network calls
      const [ridesRes, statsRes] = await Promise.all([
        fetch(ridesUrl),
        selectedExhibitionId ? fetch(statsUrl) : Promise.resolve(null),
      ]);

      if (ridesRes && !ridesRes.ok) throw new Error('Failed to fetch rides');
      const ridesBody = ridesRes ? await ridesRes.json() : { success: true, data: [] };
      const statsBody = statsRes && statsRes.ok ? await statsRes.json() : { success: true, data: [] };

      if (ridesBody.success) setRides(ridesBody.data || []);
      if (statsBody.success) setStats(statsBody.data || []);
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error loading rides data',
        message: err.message,
      });
    } finally {
      setIsLoadingRides(false);
    }
  }, [selectedExhibitionId, startDate, endDate, addToast]);

  React.useEffect(() => {
    fetchRidesAndStats();
  }, [fetchRidesAndStats]);

  // Toggle status of a ride
  const handleToggleStatus = async (rideId: string, currentStatus: 'open' | 'closed') => {
    try {
      const nextStatus = currentStatus === 'open' ? 'closed' : 'open';
      const res = await fetch(`/api/rides/${rideId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        addToast({
          type: 'success',
          title: 'Status Updated',
          message: `Ride has been marked ${nextStatus}.`,
        });
        fetchRidesAndStats();
      } else {
        throw new Error(body.error?.message || 'Failed to update status');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error updating status',
        message: err.message,
      });
    }
  };

  // Toggle active flag
  const handleDeactivate = async (rideId: string) => {
    if (!confirm('Are you sure you want to deactivate this ride/game? It will be hidden from operations.')) return;
    try {
      const res = await fetch(`/api/rides/${rideId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      });
      const body = await res.json();
      if (res.ok && body.success) {
        addToast({
          type: 'success',
          title: 'Ride Deactivated',
          message: 'Ride has been successfully deactivated.',
        });
        fetchRidesAndStats();
      } else {
        throw new Error(body.error?.message || 'Failed to deactivate ride');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error deactivating ride',
        message: err.message,
      });
    }
  };

  // Calculations for total exhibition summary cards
  const totalRidesCount = rides.length;
  const totalRevenue = stats.reduce((acc, curr) => acc + (curr.totalRevenue || 0), 0);
  const totalTicketsSold = stats.reduce((acc, curr) => acc + (curr.ticketsSold || 0), 0);
  const totalScans = stats.reduce((acc, curr) => acc + (curr.totalScans || 0), 0);

  const filteredRides = rides.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  const exhOptions = exhibitions.map(e => ({ label: e.name, value: e.id }));

  return (
    <div className="space-y-6 flex flex-col flex-1">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-50 flex items-center gap-2">
            <Gamepad2 className="text-accent-400" />
            <span>Rides & Games Admin Console</span>
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Configure rides, adjust prices, scope staff assignments, and track real-time analytics.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/rides/new" passHref>
            <Button className="shrink-0 flex items-center gap-1.5 font-semibold">
              <Plus size={16} />
              <span>Configure New Ride</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Exhibition Scope & Date Filters */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/40 p-4 md:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider select-none">
            <Filter size={14} className="text-accent-400" />
            <span>Exhibition Scope & Date Filters</span>
          </div>
          {(startDate || endDate || search) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setStartDate(''); setEndDate(''); setSearch(''); }}
              className="h-7 px-2.5 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200"
            >
              <span>Clear Filters</span>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <Select
              value={selectedExhibitionId}
              onChange={(e) => setSelectedExhibitionId(e.target.value)}
              options={exhOptions}
              className="w-full h-10"
            />
          </div>

          <div>
            <Input
              placeholder="Search rides by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={16} />}
              className="w-full h-10"
            />
          </div>

          <div>
            <Input
              type="date"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-10 text-xs"
            />
          </div>

          <div>
            <Input
              type="date"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full h-10 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Revenue & Ticket Stats Summary Grid */}
      {selectedExhibitionId && !isLoadingRides && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-accent-500/10 rounded-lg text-accent-400 border border-accent-500/20">
                <Gamepad2 size={24} />
              </div>
              <div>
                <span className="text-xs text-gray-400 font-medium">Configured Rides</span>
                <h3 className="text-2xl font-bold text-gray-150 mt-1">{totalRidesCount}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-lg text-success border border-success/20">
                <IndianRupee size={24} />
              </div>
              <div>
                <span className="text-xs text-gray-400 font-medium">Total Ride Revenue</span>
                <h3 className="text-2xl font-bold text-gray-150 mt-1">
                  ₹{(totalRevenue / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-warning/10 rounded-lg text-warning border border-warning/20">
                <QrCode size={24} />
              </div>
              <div>
                <span className="text-xs text-gray-400 font-medium">Ride Tickets Sold</span>
                <h3 className="text-2xl font-bold text-gray-150 mt-1">{totalTicketsSold}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 bg-info/10 rounded-lg text-blue-400 border border-blue-500/20">
                <BarChart3 size={24} />
              </div>
              <div>
                <span className="text-xs text-gray-400 font-medium">Valid Entry Scans</span>
                <h3 className="text-2xl font-bold text-gray-150 mt-1">{totalScans}</h3>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Rides Listing */}
      {isLoadingRides ? (
        <TableSkeleton rows={6} columns={6} />
      ) : filteredRides.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-800 rounded-xl bg-gray-900/10 p-8 text-center">
          <Gamepad2 size={40} className="text-gray-600 mb-3 animate-pulse" />
          <h3 className="text-base font-bold text-gray-300">No Rides Found</h3>
          <p className="mt-1 text-sm text-gray-400 max-w-sm">
            Configure individual rides/games for this exhibition to enable pay-per-ride check-ins.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950 text-xs font-semibold text-gray-400 uppercase">
                  <th className="py-4 px-5">Ride / Game</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Price</th>
                  <th className="py-4 px-5">Staff Assigned</th>
                  <th className="py-4 px-5 text-center">Tickets Sold</th>
                  <th className="py-4 px-5 text-center">Revenue</th>
                  <th className="py-4 px-5 text-center">Valid entries</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-sm text-gray-300">
                {filteredRides.map((ride) => {
                  const rideStats = stats.find(s => s.rideId === ride.id) || {
                    ticketsSold: 0,
                    totalRevenue: 0,
                    admittedCount: 0,
                  };

                  return (
                    <tr key={ride.id} className="hover:bg-gray-850/40 transition-colors">
                      <td className="py-4.5 px-5">
                        <div className="font-semibold text-gray-150">{ride.name}</div>
                        {ride.description && (
                          <div className="text-xs text-gray-400 mt-1 max-w-xs truncate">{ride.description}</div>
                        )}
                      </td>
                      <td className="py-4.5 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border
                          ${
                            ride.status === 'open'
                              ? 'bg-success/15 border-success/30 text-success'
                              : 'bg-error/15 border-error/30 text-error'
                          }
                        `}>
                          <span className={`h-1.5 w-1.5 rounded-full ${ride.status === 'open' ? 'bg-success' : 'bg-error'}`} />
                          <span className="capitalize">{ride.status}</span>
                        </span>
                      </td>
                      <td className="py-4.5 px-5 text-right font-mono font-bold text-gray-200">
                        ₹{(ride.price / 100).toFixed(2)}
                      </td>
                      <td className="py-4.5 px-5">
                        {ride.assignedStaff && ride.assignedStaff.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {ride.assignedStaff.map((staff: any) => (
                              <Badge key={staff.id} variant="default" className="text-xs py-0.5">
                                {staff.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-warning-400 font-semibold flex items-center gap-1">
                            <ShieldAlert size={14} />
                            No staff assigned
                          </span>
                        )}
                      </td>
                      <td className="py-4.5 px-5 text-center font-mono font-semibold text-gray-250">
                        {rideStats.ticketsSold}
                      </td>
                      <td className="py-4.5 px-5 text-center font-mono font-bold text-success">
                        ₹{(rideStats.totalRevenue / 100).toFixed(2)}
                      </td>
                      <td className="py-4.5 px-5 text-center font-mono text-gray-300">
                        {rideStats.admittedCount}
                      </td>
                      <td className="py-4.5 px-5 text-right space-x-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleToggleStatus(ride.id, ride.status)}
                          className="font-semibold text-xs py-1 px-2.5 h-auto inline-flex items-center gap-1"
                          leftIcon={ride.status === 'open' ? <Square size={12} className="text-error" /> : <Play size={12} className="text-success" />}
                        >
                          <span>{ride.status === 'open' ? 'Close' : 'Open'}</span>
                        </Button>
                        <Link href={`/admin/rides/${ride.id}/edit`} passHref className="inline-block">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="font-semibold text-xs py-1 px-2.5 h-auto inline-flex items-center gap-1"
                            leftIcon={<Settings size={12} />}
                          >
                            <span>Edit</span>
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeactivate(ride.id)}
                          className="font-semibold text-xs text-error hover:bg-error/10 py-1 px-2 h-auto"
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
