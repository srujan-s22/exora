'use client';

import * as React from 'react';
import {
  LineChart as LineChartIcon,
  Filter,
  RefreshCw,
  IndianRupee,
  Ticket,
  Users,
  ShieldCheck,
  Building2,
  Calendar,
  Layers,
  BarChart3,
  Flame,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

import { PageHeader } from '@/components/layout/page-header';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/providers/toast-provider';
import { StatCardSkeletonGrid, ChartSkeletonFrame, TableSkeleton } from '@/components/shared/skeletons';
import { useAuth } from '@/components/providers/auth-provider';
import type { Exhibition } from '@/types/exhibition.types';

export default function AnalyticsDashboardPage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [exhibitions, setExhibitions] = React.useState<Exhibition[]>([]);
  const [selectedExhibitionId, setSelectedExhibitionId] = React.useState('');
  const [dateRange, setDateRange] = React.useState<'today' | '7d' | '30d' | '90d' | 'custom'>('7d');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');

  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [analyticsData, setAnalyticsData] = React.useState<any>(null);

  // 1. Fetch Exhibition list for filter dropdown
  React.useEffect(() => {
    async function loadExhibitions() {
      try {
        const res = await fetch('/api/exhibitions?limit=100&includeArchived=false');
        if (!res.ok) return;
        const body = await res.json();
        if (body.success) {
          setExhibitions(body.data.data || body.data || []);
        }
      } catch (err) {
        console.error('Failed to load exhibitions list:', err);
      }
    }
    loadExhibitions();
  }, []);

  // 2. Fetch Analytics Data
  const fetchAnalytics = React.useCallback(
    async (silent = false) => {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);

      try {
        const queryParams = new URLSearchParams({
          dateRange,
        });

        if (selectedExhibitionId) queryParams.append('exhibitionId', selectedExhibitionId);
        if (dateRange === 'custom' && startDate) queryParams.append('startDate', startDate);
        if (dateRange === 'custom' && endDate) queryParams.append('endDate', endDate);

        const res = await fetch(`/api/admin/analytics?${queryParams.toString()}`);
        const body = await res.json();

        if (res.ok && body.success) {
          setAnalyticsData(body.data);
        } else {
          throw new Error(body.error?.message || 'Failed to fetch analytics data');
        }
      } catch (err: any) {
        console.error(err);
        addToast({
          type: 'error',
          title: 'Analytics Fetch Failed',
          message: err.message || 'Could not load analytics metrics from server.',
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedExhibitionId, dateRange, startDate, endDate, addToast]
  );

  React.useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Restrict access to Admin and Super Admin
  if (user && user.role !== 'admin' && user.role !== 'super_admin') {
    return (
      <ContentWrapper>
        <div className="flex min-h-[60dvh] flex-col items-center justify-center p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 mb-4">
            <LineChartIcon size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-150">Unauthorized Access</h2>
          <p className="mt-2 text-sm text-gray-400 max-w-md">
            The Analytics Console is restricted to Administrators and Super Administrators.
          </p>
        </div>
      </ContentWrapper>
    );
  }

  const exhibitionOptions = [
    { label: 'All Exhibitions Scope', value: '' },
    ...exhibitions.map((e) => ({ label: e.name, value: e.id })),
  ];

  const kpis = analyticsData?.kpis || {
    totalRevenue: 0,
    ticketsSold: 0,
    visitorsEntered: 0,
    activeCounters: 0,
    todaySales: 0,
    todayVisitors: 0,
  };

  const timeTrends = analyticsData?.timeTrends || [];
  const salesByCounter = analyticsData?.salesByCounter || [];
  const gateLoad = analyticsData?.gateLoad || [];
  const hourlyHeatmap = analyticsData?.hourlyHeatmap || [];
  const exhibitionComparison = analyticsData?.exhibitionComparison || [];

  // Helper for heatmap cell color intensity
  const maxHeatmapSales = React.useMemo(() => {
    let max = 0;
    hourlyHeatmap.forEach((d: any) => {
      d.hours?.forEach((h: any) => {
        if (h.revenue > max) max = h.revenue;
      });
    });
    return max || 1;
  }, [hourlyHeatmap]);

  const getHeatmapColor = (revenue: number) => {
    if (revenue === 0) return 'bg-gray-850/60 text-gray-600';
    const ratio = revenue / maxHeatmapSales;
    if (ratio < 0.25) return 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40';
    if (ratio < 0.5) return 'bg-emerald-800/80 text-emerald-200 border border-emerald-600/50';
    if (ratio < 0.75) return 'bg-emerald-600 text-white font-bold shadow-sm';
    return 'bg-accent-400 text-gray-950 font-extrabold shadow-md';
  };

  return (
    <ContentWrapper>
      {/* Top Header */}
      <PageHeader
        title="Analytics Console"
        description="Real-time multi-dimensional sales, ticket volume, gate traffic loads, and exhibition performance metrics."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchAnalytics(true)}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw size={14} />}
          >
            Refresh Analytics
          </Button>
        }
        showDivider
      />

      {/* Global Filter Bar */}
      <div className="mb-8 rounded-xl border border-gray-800 bg-gray-900/50 p-4 md:p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider select-none">
          <Filter size={14} className="text-accent-400" />
          <span>Global Filter Controls</span>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            {/* Exhibition Scope Selector */}
            <div className="w-full sm:w-72">
              <Select
                value={selectedExhibitionId}
                onChange={(e) => setSelectedExhibitionId(e.target.value)}
                options={exhibitionOptions}
                className="w-full h-10"
              />
            </div>

            {/* Date Range Quick Selector Buttons */}
            <div className="flex flex-wrap items-center bg-gray-850 p-1 rounded-lg border border-gray-800 text-xs">
              {(['today', '7d', '30d', '90d', 'custom'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-all capitalize select-none ${
                    dateRange === r
                      ? 'bg-accent-500 text-gray-950 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  }`}
                >
                  {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === '90d' ? '90 Days' : r}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Pickers */}
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 text-xs w-36"
              />
              <span className="text-gray-500 text-xs">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 text-xs w-36"
              />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          <StatCardSkeletonGrid columns={4} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeletonFrame title="Revenue & Ticket Trends" />
            <ChartSkeletonFrame title="Gate Traffic & Entry Load" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TableSkeleton rows={5} columns={4} />
            <TableSkeleton rows={5} columns={4} />
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <Card className="bg-gray-900 border-gray-800 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-accent-500/10 rounded-lg text-accent-400 border border-accent-500/20 shrink-0">
                  <IndianRupee size={20} />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-gray-400 font-medium block truncate">Total Revenue</span>
                  <h3 className="text-xl font-black text-gray-100 truncate mt-0.5">
                    ₹{kpis.totalRevenue.toLocaleString('en-IN')}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20 shrink-0">
                  <Ticket size={20} />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-gray-400 font-medium block truncate">Tickets Sold</span>
                  <h3 className="text-xl font-black text-gray-100 truncate mt-0.5">
                    {kpis.ticketsSold.toLocaleString('en-IN')}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20 shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-gray-400 font-medium block truncate">Visitors Entered</span>
                  <h3 className="text-xl font-black text-gray-100 truncate mt-0.5">
                    {kpis.visitorsEntered.toLocaleString('en-IN')}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20 shrink-0">
                  <Users size={20} />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-gray-400 font-medium block truncate">Active Counters</span>
                  <h3 className="text-xl font-black text-gray-100 truncate mt-0.5">
                    {kpis.activeCounters}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20 shrink-0">
                  <IndianRupee size={20} />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-gray-400 font-medium block truncate">Today's Sales</span>
                  <h3 className="text-xl font-black text-gray-100 truncate mt-0.5">
                    ₹{kpis.todaySales.toLocaleString('en-IN')}
                  </h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-teal-500/10 rounded-lg text-teal-400 border border-teal-500/20 shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-gray-400 font-medium block truncate">Today's Visitors</span>
                  <h3 className="text-xl font-black text-gray-100 truncate mt-0.5">
                    {kpis.todayVisitors.toLocaleString('en-IN')}
                  </h3>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1: Sales Revenue Trend & Tickets Volume Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Sales / Revenue Trend */}
            <Card className="bg-gray-900 border-gray-800 shadow-lg">
              <CardHeader className="py-4 border-b border-gray-850 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <IndianRupee size={16} className="text-emerald-400" />
                  <span>1. Sales / Revenue Trend (₹)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeTrends} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis dataKey="label" stroke="#737373" fontSize={11} tickLine={false} />
                      <YAxis stroke="#737373" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', borderRadius: '8px', color: '#f5f5f5', fontSize: '12px' }}
                        formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Line type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 2. Tickets Sold Trend */}
            <Card className="bg-gray-900 border-gray-800 shadow-lg">
              <CardHeader className="py-4 border-b border-gray-850 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <Ticket size={16} className="text-amber-400" />
                  <span>2. Tickets Sold Volume Trend</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeTrends} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis dataKey="label" stroke="#737373" fontSize={11} tickLine={false} />
                      <YAxis stroke="#737373" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', borderRadius: '8px', color: '#f5f5f5', fontSize: '12px' }}
                        formatter={(val: any) => [`${val} Tickets`, 'Tickets Sold']}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Line type="monotone" dataKey="ticketsSold" name="Tickets Sold" stroke="#f59e0b" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 2: Visitor Entry Flow & Sales by Counter */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 3. Visitor Entry Trend */}
            <Card className="bg-gray-900 border-gray-800 shadow-lg">
              <CardHeader className="py-4 border-b border-gray-850 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-blue-400" />
                  <span>3. Visitor Gate Entry Flow</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={timeTrends} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis dataKey="label" stroke="#737373" fontSize={11} tickLine={false} />
                      <YAxis stroke="#737373" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', borderRadius: '8px', color: '#f5f5f5', fontSize: '12px' }}
                        formatter={(val: any) => [`${val} Visitors`, 'Admitted Scans']}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Line type="monotone" dataKey="entries" name="Gate Admissions" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 4. Sales by Counter */}
            <Card className="bg-gray-900 border-gray-800 shadow-lg">
              <CardHeader className="py-4 border-b border-gray-850 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <Users size={16} className="text-purple-400" />
                  <span>4. Sales Performance by Counter</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                {salesByCounter.length === 0 ? (
                  <div className="flex h-72 items-center justify-center text-xs text-gray-500">
                    No counter sales data found for the selected scope.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={salesByCounter} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                        <XAxis dataKey="counterName" stroke="#737373" fontSize={11} tickLine={false} interval={0} angle={-15} textAnchor="end" />
                        <YAxis stroke="#737373" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', borderRadius: '8px', color: '#f5f5f5', fontSize: '12px' }}
                          formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="revenue" name="Revenue (₹)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 3: Gate Load & Hourly Sales Heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 5. Gate Load */}
            <Card className="bg-gray-900 border-gray-800 shadow-lg">
              <CardHeader className="py-4 border-b border-gray-850 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <Layers size={16} className="text-teal-400" />
                  <span>5. Gate Load & Verification Scans</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                {gateLoad.length === 0 ? (
                  <div className="flex h-72 items-center justify-center text-xs text-gray-500">
                    No gate check data found for the selected scope.
                  </div>
                ) : (
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gateLoad} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                        <XAxis dataKey="gateName" stroke="#737373" fontSize={11} tickLine={false} />
                        <YAxis stroke="#737373" fontSize={11} tickLine={false} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', borderRadius: '8px', color: '#f5f5f5', fontSize: '12px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar dataKey="admittedScans" name="Admitted Entries" fill="#14b8a6" stackId="a" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="rejectedScans" name="Rejected / Warnings" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 6. Hourly Sales Heatmap */}
            <Card className="bg-gray-900 border-gray-800 shadow-lg">
              <CardHeader className="py-4 border-b border-gray-850 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <Flame size={16} className="text-rose-500" />
                  <span>6. Hourly Sales Heatmap (Peak Operating Hours)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-2 overflow-x-auto">
                  <div className="min-w-[600px]">
                    {/* Hour Labels Header */}
                    <div className="flex text-[10px] text-gray-500 font-mono mb-1.5">
                      <div className="w-12 shrink-0 font-bold uppercase text-gray-400">Day</div>
                      <div className="flex-1 grid grid-cols-24 gap-0.5 text-center">
                        {Array.from({ length: 24 }).map((_, h) => (
                          <div key={h} className="truncate">
                            {h % 3 === 0 ? String(h).padStart(2, '0') : ''}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Matrix Rows */}
                    <div className="space-y-1">
                      {hourlyHeatmap.map((row: any) => (
                        <div key={row.day} className="flex items-center text-xs">
                          <div className="w-12 shrink-0 font-bold text-gray-400 text-[11px]">{row.day}</div>
                          <div className="flex-1 grid grid-cols-24 gap-0.5">
                            {row.hours?.map((cell: any) => (
                              <div
                                key={cell.hour}
                                title={`${row.day} at ${cell.hourLabel}: ₹${cell.revenue.toLocaleString()} (${cell.tickets} tickets)`}
                                className={`h-6 rounded-sm flex items-center justify-center text-[9px] transition-all hover:scale-110 cursor-pointer ${getHeatmapColor(cell.revenue)}`}
                              >
                                {cell.revenue > 0 ? '' : ''}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Heatmap Legend */}
                    <div className="flex items-center justify-end gap-2 text-[10px] text-gray-400 mt-3 pt-2 border-t border-gray-850">
                      <span>Low</span>
                      <div className="flex gap-1">
                        <div className="h-3 w-3 bg-gray-850 rounded-sm" />
                        <div className="h-3 w-3 bg-emerald-950 rounded-sm" />
                        <div className="h-3 w-3 bg-emerald-800 rounded-sm" />
                        <div className="h-3 w-3 bg-emerald-600 rounded-sm" />
                        <div className="h-3 w-3 bg-accent-400 rounded-sm" />
                      </div>
                      <span>Peak</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 4: Exhibition Comparison */}
          <Card className="bg-gray-900 border-gray-800 shadow-lg">
            <CardHeader className="py-4 border-b border-gray-850 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Building2 size={16} className="text-accent-400" />
                <span>7. Exhibition Comparison</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {selectedExhibitionId && selectedExhibitionId !== 'all' ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-xs text-gray-400 space-y-2">
                  <div className="p-3 bg-gray-850 rounded-xl text-accent-400">
                    <Info size={20} />
                  </div>
                  <p className="font-semibold text-gray-200">Exhibition Comparison Inactive</p>
                  <p className="text-gray-500 max-w-md">
                    Exhibition comparison is available when <strong>"All Exhibitions Scope"</strong> is selected in the global filters at the top.
                  </p>
                </div>
              ) : exhibitionComparison.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-xs text-gray-500">
                  No multi-exhibition comparative data available for the selected period.
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={exhibitionComparison} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis dataKey="exhibitionName" stroke="#737373" fontSize={11} tickLine={false} />
                      <YAxis stroke="#737373" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#171717', borderColor: '#404040', borderRadius: '8px', color: '#f5f5f5', fontSize: '12px' }}
                        formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Revenue']}
                      />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="revenue" name="Revenue (₹)" fill="#eab308" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </ContentWrapper>
  );
}
