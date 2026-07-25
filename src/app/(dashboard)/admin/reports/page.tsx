'use client';

import * as React from 'react';
import { Download, Calendar, BarChart3, TrendingUp, ShieldAlert, Users, Ticket, RefreshCw, Filter } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/providers/toast-provider';

type TabType = 'sales' | 'exhibitions' | 'staff' | 'security';

export default function ReportsPage() {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = React.useState<TabType>('sales');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [data, setData] = React.useState<any>(null);

  // Filters
  const [selectedExhibitionId, setSelectedExhibitionId] = React.useState('all');

  const fetchReportsData = React.useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch('/api/dashboard/admin');
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setData(body.data);
        }
      } else {
        addToast({
          type: 'error',
          title: 'Failed to load reports',
          message: 'Error fetching analytical data from backend.',
        });
      }
    } catch (e) {
      console.error(e);
      addToast({
        type: 'error',
        title: 'Connection Error',
        message: 'Could not connect to the database to compile reports.',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [addToast]);

  React.useEffect(() => {
    fetchReportsData();
  }, [fetchReportsData]);

  // Aggregate staff activity dynamically
  const getStaffSummary = () => {
    if (!data) return [];
    const { recentSales, recentScans } = data;

    const staffMap: Record<string, { name: string; role: string; salesCount: number; salesRevenue: number; scansCount: number; validScans: number }> = {};

    recentSales.forEach((s: any) => {
      const staffId = s.soldBy?.staffId || s.soldBy?._id || 'unknown-staff';
      const staffName = s.soldBy?.name || 'Counter Operator';
      if (!staffMap[staffId]) {
        staffMap[staffId] = { name: staffName, role: 'Counter Staff', salesCount: 0, salesRevenue: 0, scansCount: 0, validScans: 0 };
      }
      staffMap[staffId].salesCount += s.ticketCount || 0;
      staffMap[staffId].salesRevenue += s.totalAmount || 0;
    });

    recentScans.forEach((sc: any) => {
      const staffId = sc.scannedBy?.staffId || sc.scannedBy?._id || 'unknown-staff';
      const staffName = sc.scannedBy?.name || 'Gate Operator';
      if (!staffMap[staffId]) {
        staffMap[staffId] = { name: staffName, role: 'Gate Staff', salesCount: 0, salesRevenue: 0, scansCount: 0, validScans: 0 };
      }
      staffMap[staffId].scansCount += 1;
      if (sc.result === 'admitted') {
        staffMap[staffId].validScans += 1;
      }
    });

    return Object.entries(staffMap).map(([id, stats]) => ({
      staffId: id,
      ...stats,
    }));
  };

  const handleExportCSV = () => {
    if (!data) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    let fileName = `report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;

    if (activeTab === 'sales') {
      csvContent += 'Metric,Value\n';
      csvContent += `Total Revenue (INR),${data.stats.totalRevenue / 100}\n`;
      csvContent += `Tickets Issued,${data.stats.ticketsSold}\n`;
      csvContent += `UPI Sales Share (INR),${data.paymentBreakdown.upiRevenue / 100}\n`;
      csvContent += `Cash Sales Share (INR),${data.paymentBreakdown.cashRevenue / 100}\n`;
      csvContent += `UPI Tickets Quantity,${data.paymentBreakdown.upiTickets}\n`;
      csvContent += `Cash Tickets Quantity,${data.paymentBreakdown.cashTickets}\n`;
      csvContent += `Avg. Revenue Per Ticket (INR),${data.stats.ticketsSold > 0 ? (data.stats.totalRevenue / data.stats.ticketsSold) / 100 : 0}\n`;
    } else if (activeTab === 'exhibitions') {
      csvContent += 'Exhibition ID,Exhibition Name,Status,Tickets Sold,Revenue (INR),Entries Admitted,Capacity,Utilization (%)\n';
      data.exhibitionBreakdown.forEach((e: any) => {
        csvContent += `"${e.id}","${e.name}","${e.status}",${e.ticketsSold},${e.revenue / 100},${e.admitted},${e.capacity},${e.utilization}\n`;
      });
    } else if (activeTab === 'staff') {
      csvContent += 'Staff ID,Staff Name,Primary Role,Tickets Sold,Revenue Share (INR),Scans Processed,Valid Admissions\n';
      const staffList = getStaffSummary();
      staffList.forEach((s: any) => {
        csvContent += `"${s.staffId}","${s.name}","${s.role}",${s.salesCount},${s.salesRevenue / 100},${s.scansCount},${s.validScans}\n`;
      });
    } else if (activeTab === 'security') {
      csvContent += 'Security Indicator,Volume Count\n';
      csvContent += `Valid Entry Admissions,${data.stats.validEntries}\n`;
      csvContent += `Total Rejected Scans,${data.stats.invalidScans}\n`;
      csvContent += `Duplicate Scan Attempts,${data.stats.duplicateBlocks}\n`;
      csvContent += `Wrong Exhibition Scans,${data.stats.wrongExhibitions}\n`;
      csvContent += `Forged / Unknown Signatures,${data.stats.forgedAttempts}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({
      type: 'success',
      title: 'CSV Report Downloaded',
      message: `${activeTab.toUpperCase()} report successfully compiled and saved.`,
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

  const staffSummaryData = getStaffSummary();

  // Apply scope filtering on data
  const getFilteredExhibitions = () => {
    if (!data) return [];
    if (selectedExhibitionId === 'all') return data.exhibitionBreakdown || [];
    return (data.exhibitionBreakdown || []).filter((e: any) => e.id === selectedExhibitionId);
  };

  const filteredExhibitions = getFilteredExhibitions();

  return (
    <ContentWrapper>
      {/* Page Header */}
      <PageHeader
        title="Sales & Analytics Reports"
        description="View and download sales summaries, gate entries, and counter revenue reports."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchReportsData(true)}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw size={14} />}
            >
              Refresh Data
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportCSV}
              leftIcon={<Download size={14} />}
            >
              Export Tab CSV
            </Button>
          </div>
        }
        showDivider
      />

      {/* Scope Filtering Section */}
      <div className="mb-6 grid gap-4 p-4 rounded-xl border border-gray-800 bg-gray-900 shadow-sm sm:grid-cols-2 max-w-2xl">
        <Select
          label="Filter Report Exhibition Scope"
          value={selectedExhibitionId}
          onChange={(e) => setSelectedExhibitionId(e.target.value)}
          options={[
            { label: 'All Exhibitions Combined', value: 'all' },
            ...(data?.exhibitionBreakdown?.map((e: any) => ({
              label: e.name,
              value: e.id,
            })) || []),
          ]}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-800 mb-6 gap-2.5 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('sales')}
          className={`flex items-center gap-2 px-4.5 py-3 text-sm font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap select-none
            ${activeTab === 'sales'
              ? 'border-accent-300 text-accent-300 bg-accent-500/5'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-850'
            }
          `}
        >
          <TrendingUp size={16} />
          <span>Sales & Revenue Summary</span>
        </button>

        <button
          onClick={() => setActiveTab('exhibitions')}
          className={`flex items-center gap-2 px-4.5 py-3 text-sm font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap select-none
            ${activeTab === 'exhibitions'
              ? 'border-accent-300 text-accent-300 bg-accent-500/5'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-850'
            }
          `}
        >
          <BarChart3 size={16} />
          <span>Exhibition Utilization</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-4.5 py-3 text-sm font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap select-none
            ${activeTab === 'staff'
              ? 'border-accent-300 text-accent-300 bg-accent-500/5'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-850'
            }
          `}
        >
          <Users size={16} />
          <span>Staff Shift Audit</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4.5 py-3 text-sm font-semibold rounded-t-lg transition-all border-b-2 cursor-pointer whitespace-nowrap select-none
            ${activeTab === 'security'
              ? 'border-accent-300 text-accent-300 bg-accent-500/5'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-850'
            }
          `}
        >
          <ShieldAlert size={16} />
          <span>Gate Scanning & Fraud</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">

        {/* Tab 1: Sales & Revenue */}
        {activeTab === 'sales' && data && (
          <div className="grid gap-6">
            <div className="grid gap-4.5 sm:grid-cols-4">
              <Card className="bg-gray-900 border border-gray-800">
                <CardHeader className="py-3 border-b border-gray-850">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400">Gross Ticket Value</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <h3 className="text-2xl font-black text-gray-100">
                    ₹{((data.stats.grossRevenue || data.stats.totalRevenue) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-1">Total revenue generated before voids/cancellations</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border border-gray-800">
                <CardHeader className="py-3 border-b border-gray-850">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-accent-300">Net Active Sales</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <h3 className="text-2xl font-black text-accent-300">
                    ₹{(data.stats.totalRevenue / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-1">Realizable ticketing income (excluding voided sales)</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border border-gray-800">
                <CardHeader className="py-3 border-b border-gray-850">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-error">Voided / Cancelled Value</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <h3 className="text-2xl font-black text-error">
                    ₹{((data.stats.cancelledRevenue || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-1">Voided from {data.stats.cancelledTickets || 0} tickets within time window</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border border-gray-800">
                <CardHeader className="py-3 border-b border-gray-850">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400">UPI Share (Active)</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <h3 className="text-2xl font-black text-gray-105">
                    ₹{(data.paymentBreakdown.upiRevenue / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </h3>
                  <p className="text-[10px] text-gray-500 mt-1">Active digital checkout from {data.paymentBreakdown.upiTickets} tickets</p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Sales Breakdown Table */}
            <Card className="border border-gray-800 bg-gray-900">
              <CardHeader className="py-4 border-b border-gray-850">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400">Sales Accounting Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-gray-850 text-xs font-bold uppercase text-gray-400 border-b border-gray-800">
                    <tr>
                      <th className="px-6 py-4">Transaction Channels</th>
                      <th className="px-6 py-4 text-center">Tickets Sold</th>
                      <th className="px-6 py-4 text-right">Revenue (INR)</th>
                      <th className="px-6 py-4 text-right">Avg Spending / Ticket</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-850">
                    <tr className="hover:bg-gray-850/10">
                      <td className="px-6 py-4 font-semibold text-gray-100">UPI Online Channel (Active)</td>
                      <td className="px-6 py-4 text-center font-mono">{data.paymentBreakdown.upiTickets}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold">₹{data.paymentBreakdown.upiRevenue / 100}</td>
                      <td className="px-6 py-4 text-right font-mono">₹{data.paymentBreakdown.upiTickets > 0 ? (data.paymentBreakdown.upiRevenue / data.paymentBreakdown.upiTickets / 100).toFixed(0) : 0}</td>
                    </tr>
                    <tr className="hover:bg-gray-850/10">
                      <td className="px-6 py-4 font-semibold text-gray-100">Cash Counter Desk (Active)</td>
                      <td className="px-6 py-4 text-center font-mono">{data.paymentBreakdown.cashTickets}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold">₹{data.paymentBreakdown.cashRevenue / 100}</td>
                      <td className="px-6 py-4 text-right font-mono">₹{data.paymentBreakdown.cashTickets > 0 ? (data.paymentBreakdown.cashRevenue / data.paymentBreakdown.cashTickets / 100).toFixed(0) : 0}</td>
                    </tr>
                    <tr className="hover:bg-gray-850/10 text-error bg-error/5">
                      <td className="px-6 py-4 font-semibold">Voided / Cancelled Sales</td>
                      <td className="px-6 py-4 text-center font-mono">{data.stats.cancelledTickets || 0}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold">₹{(data.stats.cancelledRevenue || 0) / 100}</td>
                      <td className="px-6 py-4 text-right font-mono">₹{data.stats.cancelledTickets > 0 ? ((data.stats.cancelledRevenue || 0) / data.stats.cancelledTickets / 100).toFixed(0) : 0}</td>
                    </tr>
                    <tr className="hover:bg-gray-850/10 bg-gray-850/20 font-bold border-t border-gray-800">
                      <td className="px-6 py-4 text-gray-100">Net Active Totals</td>
                      <td className="px-6 py-4 text-center font-mono">{data.stats.ticketsSold}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-accent-300">₹{data.stats.totalRevenue / 100}</td>
                      <td className="px-6 py-4 text-right font-mono">₹{data.stats.ticketsSold > 0 ? (data.stats.totalRevenue / data.stats.ticketsSold / 100).toFixed(0) : 0}</td>
                    </tr>
                    <tr className="bg-gray-850/40 font-bold border-t border-gray-700">
                      <td className="px-6 py-4 text-gray-150">Gross Ticketing Volume (Incl. Cancelled)</td>
                      <td className="px-6 py-4 text-center font-mono text-gray-150">{data.stats.grossTickets || data.stats.ticketsSold}</td>
                      <td className="px-6 py-4 text-right font-mono text-accent-400">₹{(data.stats.grossRevenue || data.stats.totalRevenue) / 100}</td>
                      <td className="px-6 py-4 text-right font-mono text-gray-150">₹{(data.stats.grossTickets || data.stats.ticketsSold) > 0 ? ((data.stats.grossRevenue || data.stats.totalRevenue) / (data.stats.grossTickets || data.stats.ticketsSold) / 100).toFixed(0) : 0}</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tab 2: Exhibitions */}
        {activeTab === 'exhibitions' && (
          <Card className="border border-gray-800 bg-gray-900">
            <CardHeader className="py-4 border-b border-gray-850">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400">Exhibition Revenue & Space Utilization</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-850 text-xs font-bold uppercase text-gray-400 border-b border-gray-800">
                  <tr>
                    <th className="px-6 py-4">Exhibition Event</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-center">Passes Sold</th>
                    <th className="px-6 py-4 text-right">Revenue (INR)</th>
                    <th className="px-6 py-4 text-center">Entries Checked</th>
                    <th className="px-6 py-4 text-center">Capacity</th>
                    <th className="px-6 py-4 text-right">Utilization %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850">
                  {filteredExhibitions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No exhibitions found within selection.</td>
                    </tr>
                  ) : (
                    filteredExhibitions.map((e: any) => (
                      <tr key={e.id} className="hover:bg-gray-850/10">
                        <td className="px-6 py-4 font-semibold text-gray-100">{e.name}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider
                            ${e.status === 'active' ? 'bg-success/10 text-success' : 'bg-gray-800 text-gray-400'}
                          `}>
                            {e.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-mono">{e.ticketsSold}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold">₹{e.revenue / 100}</td>
                        <td className="px-6 py-4 text-center font-mono">{e.admitted}</td>
                        <td className="px-6 py-4 text-center font-mono">{e.capacity || 'Unlimited'}</td>
                        <td className="px-6 py-4 text-right font-mono">
                          <span className={`font-bold ${e.utilization > 80 ? 'text-amber-500' : 'text-accent-300'}`}>
                            {e.utilization}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Tab 3: Staff Shifts */}
        {activeTab === 'staff' && (
          <Card className="border border-gray-800 bg-gray-900">
            <CardHeader className="py-4 border-b border-gray-850">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400">Staff Shift Output Audit</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-850 text-xs font-bold uppercase text-gray-400 border-b border-gray-800">
                  <tr>
                    <th className="px-6 py-4">Staff Identifier</th>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Context Role</th>
                    <th className="px-6 py-4 text-center">Tickets Sold</th>
                    <th className="px-6 py-4 text-right">Cash/UPI Volume</th>
                    <th className="px-6 py-4 text-center">Scans Checked</th>
                    <th className="px-6 py-4 text-center">Valid entries</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850">
                  {staffSummaryData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-gray-500">No operations recorded by staff members today.</td>
                    </tr>
                  ) : (
                    staffSummaryData.map((s: any) => (
                      <tr key={s.staffId} className="hover:bg-gray-850/10">
                        <td className="px-6 py-4 font-mono font-semibold text-accent-300">{s.staffId}</td>
                        <td className="px-6 py-4 font-semibold text-gray-150">{s.name}</td>
                        <td className="px-6 py-4 text-xs font-bold uppercase text-gray-400">{s.role}</td>
                        <td className="px-6 py-4 text-center font-mono">{s.salesCount || '-'}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold">{s.salesRevenue > 0 ? `₹${s.salesRevenue / 100}` : '-'}</td>
                        <td className="px-6 py-4 text-center font-mono">{s.scansCount || '-'}</td>
                        <td className="px-6 py-4 text-center font-mono text-emerald-500 font-bold">{s.validScans || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Tab 4: Gate Security & Fraud */}
        {activeTab === 'security' && data && (
          <div className="grid gap-6">
            <div className="grid gap-4.5 sm:grid-cols-4">
              <Card className="bg-gray-900 border border-gray-800">
                <CardHeader className="py-3 border-b border-gray-850">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Valid Entry checks</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <h3 className="text-2xl font-black text-emerald-500">{data.stats.validEntries}</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Visitors cleared inside venue</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border border-gray-800">
                <CardHeader className="py-3 border-b border-gray-850">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400">Duplicate passes blocked</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <h3 className="text-2xl font-black text-amber-500">{data.stats.duplicateBlocks}</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Double entry scan events stopped</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border border-gray-800">
                <CardHeader className="py-3 border-b border-gray-850">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400">Wrong Gate scans</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <h3 className="text-2xl font-black text-rose-500">{data.stats.wrongExhibitions}</h3>
                  <p className="text-[10px] text-gray-500 mt-1">Tickets scanned at incorrect exhibitions</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-900 border border-gray-800">
                <CardHeader className="py-3 border-b border-gray-850">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400">Forged passes detected</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <h3 className="text-2xl font-black text-red-600">{data.stats.forgedAttempts}</h3>
                  <p className="text-[10px] text-gray-500 mt-1">QR tokens with invalid signatures</p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Security Log Summary */}
            <Card className="border border-gray-800 bg-gray-900">
              <CardHeader className="py-4 border-b border-gray-850">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400">Security Checkpoints telemetry</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-gray-850 text-xs font-bold uppercase text-gray-400 border-b border-gray-800">
                    <tr>
                      <th className="px-6 py-4">Scanner Audit Outcome</th>
                      <th className="px-6 py-4 text-center">Logs Captured</th>
                      <th className="px-6 py-4">Risk Level</th>
                      <th className="px-6 py-4">Platform Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-850 text-xs">
                    <tr className="hover:bg-gray-850/10">
                      <td className="px-6 py-4 font-semibold text-gray-100 text-sm">Admitted check-in (Valid ticket)</td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-sm text-emerald-500">{data.stats.validEntries}</td>
                      <td className="px-6 py-4"><span className="text-emerald-600 bg-emerald-500/5 px-2 py-0.5 rounded font-bold uppercase">Clear</span></td>
                      <td className="px-6 py-4 text-gray-400">Ticket status set to 'used' and visitor admitted.</td>
                    </tr>
                    <tr className="hover:bg-gray-850/10">
                      <td className="px-6 py-4 font-semibold text-gray-100 text-sm">Rejected scan (Duplicate ticket)</td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-sm text-amber-500">{data.stats.duplicateBlocks}</td>
                      <td className="px-6 py-4"><span className="text-amber-600 bg-amber-500/5 px-2 py-0.5 rounded font-bold uppercase">Medium</span></td>
                      <td className="px-6 py-4 text-gray-400">Blocked entry. Scanner shows original validation details.</td>
                    </tr>
                    <tr className="hover:bg-gray-850/10">
                      <td className="px-6 py-4 font-semibold text-gray-100 text-sm">Rejected scan (Wrong Gate/Event)</td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-sm text-rose-500">{data.stats.wrongExhibitions}</td>
                      <td className="px-6 py-4"><span className="text-rose-600 bg-rose-500/5 px-2 py-0.5 rounded font-bold uppercase">Low</span></td>
                      <td className="px-6 py-4 text-gray-400">Blocked entry. Directed to correct exhibition hall.</td>
                    </tr>
                    <tr className="hover:bg-gray-850/10">
                      <td className="px-6 py-4 font-semibold text-gray-100 text-sm">Rejected scan (Forged QR/Invalid signature)</td>
                      <td className="px-6 py-4 text-center font-mono font-bold text-sm text-red-600">{data.stats.forgedAttempts}</td>
                      <td className="px-6 py-4"><span className="text-red-600 bg-red-500/5 px-2 py-0.5 rounded font-bold uppercase">Critical</span></td>
                      <td className="px-6 py-4 text-gray-400">Blocked entry. Generated security alert in administrative audit logs.</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </ContentWrapper>
  );
}
