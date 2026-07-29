'use client';

import * as React from 'react';
import { Scale, RefreshCw, Download, AlertTriangle, CheckCircle, TrendingUp, Smartphone, Banknote, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/providers/toast-provider';
import { StatCardSkeletonGrid, TableSkeleton } from '@/components/shared/skeletons';

export default function ReconciliationPage() {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [reconciliationRows, setReconciliationRows] = React.useState<any[]>([]);

  const fetchReconciliationData = React.useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch('/api/fraud/reconciliation');
      const body = await res.json();
      if (res.ok && body.success) {
        setReconciliationRows(body.data || []);
      } else {
        addToast({
          type: 'error',
          title: 'Reconciliation Failed',
          message: body.error?.message || 'Failed to match sales vs scanning databases.',
        });
      }
    } catch (e) {
      console.error(e);
      addToast({
        type: 'error',
        title: 'Connection Timeout',
        message: 'Could not connect to the reconciliation audit endpoint.',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [addToast]);

  React.useEffect(() => {
    fetchReconciliationData();
  }, [fetchReconciliationData]);

  const handleExportCSV = () => {
    if (reconciliationRows.length === 0) return;
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Exhibition ID,Exhibition Name,Status,Tickets Sold,Gate Scans,Mismatch Count,Expected Revenue (INR),Collected Revenue (INR),Revenue Mismatch (INR)\n';

    reconciliationRows.forEach((row: any) => {
      csvContent += `"${row.exhibitionId}","${row.exhibitionName}","${row.status}",${row.ticketsSold},${row.ticketsScanned},${row.mismatchCount},${row.expectedRevenue / 100},${row.collectedRevenue / 100},${row.revenueMismatch / 100}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `reconciliation_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({
      type: 'success',
      title: 'Spreadsheet Exported',
      message: 'Financial reconciliation metrics downloaded successfully.',
    });
  };

  if (isLoading) {
    return (
      <ContentWrapper>
        <PageHeader title="Sales & Gate Entry Matching" description="Compares ticket sales against gate entries to detect any cash or attendance differences." showDivider />
        <StatCardSkeletonGrid columns={4} />
        <TableSkeleton rows={6} columns={6} />
      </ContentWrapper>
    );
  }

  // Calculate Aggregates
  const totalTicketsIssued = reconciliationRows.reduce((sum, r) => sum + r.ticketsSold, 0);
  const totalGateScans = reconciliationRows.reduce((sum, r) => sum + r.ticketsScanned, 0);
  const totalCollectedRev = reconciliationRows.reduce((sum, r) => sum + r.collectedRevenue, 0);
  const totalExpectedRev = reconciliationRows.reduce((sum, r) => sum + r.expectedRevenue, 0);
  const totalRevMismatch = totalCollectedRev - totalExpectedRev;
  const totalBypassCounts = reconciliationRows.reduce((sum, r) => sum + (r.mismatchCount > 0 ? r.mismatchCount : 0), 0);

  return (
    <ContentWrapper>
      {/* Page Header */}
      <PageHeader
        title="Sales & Gate Entry Matching"
        description="Compares ticket sales against gate entries to detect any cash or attendance differences."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchReconciliationData(true)}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw size={14} />}
            >
              Recalculate
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportCSV}
              leftIcon={<Download size={14} />}
            >
              Export CSV Report
            </Button>
          </div>
        }
        showDivider
      />

      {/* Aggregate Cards */}
      <div className="grid gap-5 sm:grid-cols-3 mb-8">
        <Card className="border border-gray-800 bg-gray-900 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Total Revenue Match</span>
              <div className="flex h-9 w-9 items-center justify-center rounded bg-gray-850 text-accent-300">
                <Scale size={18} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-100">
              ₹{(totalCollectedRev / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </h3>
            <div className="flex items-center gap-1.5 mt-2.5 text-xs">
              {totalRevMismatch === 0 ? (
                <span className="inline-flex items-center gap-0.5 rounded px-2 py-0.5 font-bold bg-emerald-500/10 text-emerald-600">
                  <CheckCircle size={10} /> Balanced
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 rounded px-2 py-0.5 font-bold bg-amber-500/10 text-amber-600">
                  <AlertTriangle size={10} /> Discrepancy: ₹{totalRevMismatch / 100}
                </span>
              )}
              <span className="text-gray-500">Collected Cash vs Sales</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-800 bg-gray-900 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Issued Passes vs Checked Scans</span>
              <div className="flex h-9 w-9 items-center justify-center rounded bg-gray-850 text-accent-300">
                <Smartphone size={18} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-100">
              {totalGateScans} / {totalTicketsIssued}
            </h3>
            <div className="flex items-center gap-1.5 mt-2.5 text-xs text-gray-500">
              <span className="font-bold text-gray-300">{Math.round((totalGateScans / (totalTicketsIssued || 1)) * 100)}%</span>
              <span>Overall admission rate</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-800 bg-gray-900 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Unmatched Gate Entry Alerts</span>
              <div className="flex h-9 w-9 items-center justify-center rounded bg-gray-850 text-red-600">
                <ShieldAlert size={18} />
              </div>
            </div>
            <h3 className={`text-2xl font-black ${totalBypassCounts > 0 ? 'text-red-600' : 'text-gray-100'}`}>
              {totalBypassCounts}
            </h3>
            <div className="flex items-center gap-1.5 mt-2.5 text-xs text-gray-500">
              <span>Gate entries exceeding ticket sales</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Reconciliation Ledger */}
      <Card className="border border-gray-800 bg-gray-900 shadow-lg">
        <CardHeader className="py-4 border-b border-gray-850 flex flex-row items-center justify-between">
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400">Detailed Sales & Entry Comparison</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-gray-850 text-xs font-bold uppercase text-gray-400 border-b border-gray-800">
              <tr>
                <th className="px-6 py-4.5">Exhibition Name</th>
                <th className="px-6 py-4.5 text-center">Tickets Sold</th>
                <th className="px-6 py-4.5 text-center">Gate Scans</th>
                <th className="px-6 py-4.5 text-center">Extra Scans</th>
                <th className="px-6 py-4.5 text-right">Expected Revenue</th>
                <th className="px-6 py-4.5 text-right">Collected Revenue</th>
                <th className="px-6 py-4.5 text-right">Revenue Difference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-850 text-xs">
              {reconciliationRows.map((row: any) => (
                <tr key={row.exhibitionId} className="hover:bg-gray-850/10">
                  <td className="px-6 py-4 font-bold text-gray-150 text-sm">{row.exhibitionName}</td>
                  <td className="px-6 py-4 text-center font-mono">{row.ticketsSold}</td>
                  <td className="px-6 py-4 text-center font-mono">{row.ticketsScanned}</td>
                  <td className="px-6 py-4 text-center font-mono">
                    {row.mismatchCount > 0 ? (
                      <span className="text-red-600 bg-red-500/5 px-2 py-0.5 rounded font-bold uppercase">+{row.mismatchCount} Extra Scans</span>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-mono font-semibold">₹{row.expectedRevenue / 100}</td>
                  <td className="px-6 py-4 text-right font-mono font-semibold text-gray-100">₹{row.collectedRevenue / 100}</td>
                  <td className="px-6 py-4 text-right font-mono">
                    {row.revenueMismatch < 0 ? (
                      <span className="text-red-600 font-extrabold">-₹{Math.abs(row.revenueMismatch) / 100}</span>
                    ) : row.revenueMismatch > 0 ? (
                      <span className="text-emerald-600 font-extrabold">+₹{row.revenueMismatch / 100}</span>
                    ) : (
                      <span className="text-emerald-500 font-semibold">Balanced</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </ContentWrapper>
  );
}
