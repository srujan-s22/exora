'use client';

import * as React from 'react';
import { Download, Filter, CalendarDays, RefreshCw, Banknote, Ticket, ScanLine, AlertTriangle, ShieldCheck, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { StatCard } from '@/components/shared/stat-card';
import { ExhibitionCard } from '@/components/shared/exhibition-card';
import { ActivityFeed, type ActivityItem } from '@/components/shared/activity-feed';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/providers/toast-provider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

export default function AdminDashboardPage() {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [dashboardData, setDashboardData] = React.useState<any>(null);

  // Filters State
  const [selectedExhibitionId, setSelectedExhibitionId] = React.useState('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = React.useState('all');

  const fetchDashboardData = React.useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch('/api/dashboard/admin');
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setDashboardData(body.data);
        }
      } else {
        addToast({
          type: 'error',
          title: 'Retrieval Failed',
          message: 'Could not fetch administrative analytics from server.',
        });
      }
    } catch (err) {
      console.error('Error fetching admin dashboard:', err);
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'A network timeout occurred while querying operations database.',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [addToast]);

  React.useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Derived filtered metrics
  const getFilteredMetrics = () => {
    if (!dashboardData) return null;

    const { stats, paymentBreakdown, exhibitionBreakdown, recentSales, recentScans } = dashboardData;

    // Default aggregate values
    let totalRevenue = stats.totalRevenue;
    let ticketsSold = stats.ticketsSold;
    let validEntries = stats.validEntries;
    let invalidScans = stats.invalidScans;
    let duplicateBlocks = stats.duplicateBlocks;
    let wrongExhibitions = stats.wrongExhibitions;
    let forgedAttempts = stats.forgedAttempts;

    let todayRevenue = stats.todayRevenue;
    let todayTickets = stats.todayTickets;
    let yesterdayRevenue = stats.yesterdayRevenue;
    
    let cashRevenue = paymentBreakdown.cashRevenue;
    let upiRevenue = paymentBreakdown.upiRevenue;
    let cashTickets = paymentBreakdown.cashTickets;
    let upiTickets = paymentBreakdown.upiTickets;

    // Filtered by specific exhibition
    if (selectedExhibitionId !== 'all') {
      const targetedExh = exhibitionBreakdown.find((e: any) => e.id === selectedExhibitionId);
      if (targetedExh) {
        totalRevenue = targetedExh.revenue;
        ticketsSold = targetedExh.ticketsSold;
        validEntries = targetedExh.admitted;
        
        // Filter scans & sales calculations for this specific exhibition
        const exhSales = recentSales.filter((s: any) => s.exhibitionId?.id === selectedExhibitionId || s.exhibitionId === selectedExhibitionId);
        const exhScans = recentScans.filter((sc: any) => sc.exhibitionId?.id === selectedExhibitionId || sc.exhibitionId === selectedExhibitionId);

        invalidScans = exhScans.filter((sc: any) => sc.result !== 'admitted').length;
        duplicateBlocks = exhScans.filter((sc: any) => sc.result === 'rejected_used').length;
        wrongExhibitions = exhScans.filter((sc: any) => sc.result === 'rejected_wrong_exhibition').length;
        forgedAttempts = exhScans.filter((sc: any) => sc.result === 'rejected_unknown').length;

        // Cash/UPI splits for this exhibition
        cashRevenue = exhSales.filter((s: any) => s.paymentMethod === 'cash').reduce((acc: number, curr: any) => acc + curr.totalAmount, 0);
        upiRevenue = exhSales.filter((s: any) => s.paymentMethod === 'upi').reduce((acc: number, curr: any) => acc + curr.totalAmount, 0);
        cashTickets = exhSales.filter((s: any) => s.paymentMethod === 'cash').reduce((acc: number, curr: any) => acc + curr.ticketCount, 0);
        upiTickets = exhSales.filter((s: any) => s.paymentMethod === 'upi').reduce((acc: number, curr: any) => acc + curr.ticketCount, 0);

        // Adjust today vs yesterday for individual context where possible (fallback to aggregate index ratios)
        const scaleFactor = stats.totalRevenue > 0 ? totalRevenue / stats.totalRevenue : 0;
        todayRevenue = Math.round(todayRevenue * scaleFactor);
        yesterdayRevenue = Math.round(yesterdayRevenue * scaleFactor);
        todayTickets = Math.round(todayTickets * scaleFactor);
      }
    }

    // Filtered by specific payment method
    if (selectedPaymentMethod !== 'all') {
      if (selectedPaymentMethod === 'cash') {
        totalRevenue = cashRevenue;
        ticketsSold = cashTickets;
        todayRevenue = Math.round(todayRevenue * (cashRevenue / (totalRevenue || 1)));
      } else if (selectedPaymentMethod === 'upi') {
        totalRevenue = upiRevenue;
        ticketsSold = upiTickets;
        todayRevenue = Math.round(todayRevenue * (upiRevenue / (totalRevenue || 1)));
      }
    }

    // Calculate revenue percentage changes
    let revenueChange = 0;
    if (yesterdayRevenue > 0) {
      revenueChange = Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 1000) / 10;
    } else if (todayRevenue > 0) {
      revenueChange = 100;
    }

    return {
      totalRevenue,
      ticketsSold,
      validEntries,
      invalidScans,
      duplicateBlocks,
      wrongExhibitions,
      forgedAttempts,
      revenueChange,
      todayRevenue,
      todayTickets,
      cashRevenue,
      upiRevenue,
      cashTickets,
      upiTickets
    };
  };

  const metrics = getFilteredMetrics();

  // Combine Sales & Scans into unified audit feed
  const getUnifiedFeed = (): ActivityItem[] => {
    if (!dashboardData) return [];
    const { recentSales, recentScans } = dashboardData;

    const saleLogs: ActivityItem[] = (recentSales || []).map((sale: any) => ({
      id: sale.id || sale._id,
      action: 'sale.create',
      performedByName: sale.soldBy?.name || 'Counter Operator',
      performedByRole: 'counter',
      details: `issued ${sale.ticketCount} ticket(s) (₹${sale.totalAmount / 100} via ${sale.paymentMethod.toUpperCase()})`,
      timestamp: new Date(sale.soldAt),
    }));

    const scanLogs: ActivityItem[] = (recentScans || []).map((scan: any) => {
      const outcomeText = scan.result === 'admitted'
        ? 'admitted visitor entry pass'
        : `blocked invalid entry (${scan.result.replace('rejected_', '').replace('_', ' ')})`;
      return {
        id: scan.id || scan._id,
        action: scan.result === 'admitted' ? 'ticket.scan' : 'ticket.scan_rejected',
        performedByName: scan.scannedBy?.name || 'Gate Agent',
        performedByRole: 'gate',
        details: `${outcomeText} [Ticket Ref: ${scan.ticketId?.ticketNumber || 'UNKNOWN'}]`,
        timestamp: new Date(scan.scannedAt),
      };
    });

    return [...saleLogs, ...scanLogs]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 8);
  };

  const handleExportCSV = () => {
    if (!dashboardData) return;
    const { exhibitionBreakdown } = dashboardData;
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Exhibition ID,Exhibition Name,Status,Tickets Sold,Revenue (INR),Admitted Footfall,Capacity,Utilization (%)\n';
    
    exhibitionBreakdown.forEach((e: any) => {
      csvContent += `"${e.id}","${e.name}","${e.status}",${e.ticketsSold},${e.revenue / 100},${e.admitted},${e.capacity},${e.utilization}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `exhibitions_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({
      type: 'success',
      title: 'Report Downloaded',
      message: 'Exhibition metrics exported to CSV successfully.',
    });
  };

  if (isLoading) {
    return (
      <ContentWrapper>
        <div className="flex min-h-[60dvh] items-center justify-center">
          <Spinner size="lg" className="text-accent-300" />
        </div>
      </ContentWrapper>
    );
  }

  const feedItems = getUnifiedFeed();

  // Graph plotting coordinates helper
  const svgWidth = 500;
  const svgHeight = 160;
  const padding = 20;

  // Render inline custom premium charts
  const upiPercent = metrics ? (metrics.upiRevenue / ((metrics.upiRevenue + metrics.cashRevenue) || 1)) * 100 : 50;

  return (
    <ContentWrapper>
      {/* Page Header */}
      <PageHeader
        title="Administrative Command Center"
        description="Real-time aggregation of multi-exhibition metrics, gate operations, and staff audits."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchDashboardData(true)}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw size={14} />}
            >
              Refresh Feed
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportCSV}
              leftIcon={<Download size={14} />}
            >
              Export Metrics CSV
            </Button>
          </div>
        }
        showDivider
      />

      {/* Advanced Filter Toolbar */}
      <div className="mb-6 grid gap-4 p-4 rounded-xl border border-gray-800 bg-gray-900 shadow-sm sm:grid-cols-2 lg:grid-cols-3 xl:max-w-4xl">
        <div>
          <Select
            label="Supervised Exhibition Scope"
            value={selectedExhibitionId}
            onChange={(e) => setSelectedExhibitionId(e.target.value)}
            options={[
              { label: 'All Supervised Exhibitions', value: 'all' },
              ...(dashboardData?.exhibitionBreakdown?.map((e: any) => ({
                label: e.name,
                value: e.id,
              })) || []),
            ]}
          />
        </div>
        <div>
          <Select
            label="Filter Payment Methods"
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
            options={[
              { label: 'All Transactions', value: 'all' },
              { label: 'UPI Sales Only', value: 'upi' },
              { label: 'Cash Sales Only', value: 'cash' },
            ]}
          />
        </div>
        <div className="flex items-end justify-start sm:justify-end">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 bg-gray-850 px-3.5 py-2.5 rounded-lg border border-gray-800 w-full justify-between">
            <span className="flex items-center gap-1.5"><CalendarDays size={14} className="text-accent-300" /> Operational Shifts:</span>
            <span className="text-gray-200 font-mono">Active Terminals ({dashboardData?.stats?.staffCount || 0})</span>
          </div>
        </div>
      </div>

      {/* Stats Cards Section */}
      {metrics && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            title="Aggregated Gross Revenue"
            value={`₹${(metrics.totalRevenue / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            icon="Banknote"
            change={metrics.revenueChange}
            changeLabel="vs yesterday"
            isLoading={isRefreshing}
          />
          <StatCard
            title="Total Admission Tickets"
            value={metrics.ticketsSold}
            icon="Ticket"
            change={metrics.todayTickets > 0 ? 100 : undefined}
            changeLabel={`${metrics.todayTickets} sold today`}
            isLoading={isRefreshing}
          />
          <StatCard
            title="Valid Admissions"
            value={metrics.validEntries}
            icon="ScanLine"
            change={undefined}
            isLoading={isRefreshing}
          />
          <StatCard
            title="Gate Security Events"
            value={metrics.invalidScans}
            icon="ShieldCheck"
            change={metrics.invalidScans > 0 ? Math.round((metrics.duplicateBlocks / metrics.invalidScans) * 100) : 0}
            changeLabel="duplicate rejections"
            isLoading={isRefreshing}
          />
        </div>
      )}

      {/* Main Grid Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Exhibition list & Analytics Graphs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 select-none">
              Exhibitions Under Supervision ({dashboardData?.exhibitionBreakdown?.length || 0})
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {dashboardData?.exhibitionBreakdown?.map((exh: any) => (
              <ExhibitionCard
                key={exh.id}
                id={exh.id}
                name={exh.name}
                venue={exh.venue || 'Exhibition Venue'}
                startDate={exh.startDate || new Date()}
                endDate={exh.endDate || new Date()}
                status={exh.status}
                ticketTypes={[]}
                ticketCount={exh.ticketsSold}
                revenue={exh.revenue}
              />
            ))}
          </div>

          {/* Premium Analytics Charts Container */}
          <div className="grid gap-5 sm:grid-cols-2">
            
            {/* Payment Method Split Chart */}
            <Card className="border border-gray-800 bg-gray-900 shadow-sm">
              <CardHeader className="py-4 border-b border-gray-800/40">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Payment Channels Split
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {metrics && (
                  <div className="space-y-6">
                    <div className="flex justify-between text-xs font-semibold text-gray-400">
                      <span>UPI Sales Volume ({Math.round(upiPercent)}%)</span>
                      <span>Cash Sales Volume ({Math.round(100 - upiPercent)}%)</span>
                    </div>

                    {/* Horizontal Pill Bar Comparison */}
                    <div className="h-4.5 w-full rounded-full bg-gray-800 overflow-hidden flex border border-gray-700/50">
                      <div 
                        style={{ width: `${upiPercent}%` }} 
                        className="bg-gradient-to-r from-accent-400 to-accent-300 h-full transition-all duration-500" 
                      />
                      <div 
                        style={{ width: `${100 - upiPercent}%` }} 
                        className="bg-emerald-500 h-full transition-all duration-500" 
                      />
                    </div>

                    {/* Legends */}
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-gray-850 rounded-lg border border-gray-800">
                        <span className="block text-gray-400 mb-1">UPI Revenue</span>
                        <span className="text-base font-bold text-gray-200">
                          ₹{(metrics.upiRevenue / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="block text-[10px] text-gray-500">{metrics.upiTickets} tickets</span>
                      </div>
                      <div className="p-3 bg-gray-850 rounded-lg border border-gray-800">
                        <span className="block text-gray-400 mb-1">Cash Revenue</span>
                        <span className="text-base font-bold text-gray-200">
                          ₹{(metrics.cashRevenue / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="block text-[10px] text-gray-500">{metrics.cashTickets} tickets</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gate Scanning Outcome Chart */}
            <Card className="border border-gray-800 bg-gray-900 shadow-sm">
              <CardHeader className="py-4 border-b border-gray-800/40">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Gate Security Audit (Scans Outcome)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {metrics && (
                  <div className="space-y-4.5">
                    {/* Progress Bar Rows */}
                    <div className="space-y-3.5">
                      {/* Admitted Entries */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-gray-300">Valid Entries Admitted</span>
                          <span className="font-mono text-emerald-600 font-bold">{metrics.validEntries}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-850 rounded-full overflow-hidden border border-gray-800">
                          <div 
                            style={{ 
                              width: `${metrics.validEntries + metrics.invalidScans > 0 
                                ? (metrics.validEntries / (metrics.validEntries + metrics.invalidScans)) * 100 
                                : 100}%` 
                            }} 
                            className="bg-emerald-500 h-full rounded-full"
                          />
                        </div>
                      </div>

                      {/* Duplicate Passes */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-gray-300">Duplicate Scan Blocks</span>
                          <span className="font-mono text-amber-600 font-bold">{metrics.duplicateBlocks}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-850 rounded-full overflow-hidden border border-gray-800">
                          <div 
                            style={{ 
                              width: `${metrics.validEntries + metrics.invalidScans > 0 
                                ? (metrics.duplicateBlocks / (metrics.validEntries + metrics.invalidScans)) * 100 
                                : 0}%` 
                            }} 
                            className="bg-amber-500 h-full rounded-full"
                          />
                        </div>
                      </div>

                      {/* Forged/Invalid */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-gray-300">Suspicious/Forged Passes</span>
                          <span className="font-mono text-rose-600 font-bold">{metrics.forgedAttempts}</span>
                        </div>
                        <div className="h-2 w-full bg-gray-850 rounded-full overflow-hidden border border-gray-800">
                          <div 
                            style={{ 
                              width: `${metrics.validEntries + metrics.invalidScans > 0 
                                ? (metrics.forgedAttempts / (metrics.validEntries + metrics.invalidScans)) * 100 
                                : 0}%` 
                            }} 
                            className="bg-rose-500 h-full rounded-full"
                          />
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>

        {/* Right side activity feed */}
        <div className="space-y-5 lg:col-span-1">
          <ActivityFeed items={feedItems} title="Live Terminal activity feed" />
        </div>
      </div>
    </ContentWrapper>
  );
}
