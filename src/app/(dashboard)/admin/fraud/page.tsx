'use client';

import * as React from 'react';
import { ShieldAlert, AlertTriangle, ShieldCheck, UserX, Landmark, RefreshCw, Key, Ticket, ScanLine, ArrowRight, Eye, ShieldAlert as AlertIcon, Download } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/providers/toast-provider';
import { StatCardSkeletonGrid, TableSkeleton } from '@/components/shared/skeletons';
import Link from 'next/link';

export default function FraudDashboardPage() {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [overviewData, setOverviewData] = React.useState<any>(null);
  const [staffProfiles, setStaffProfiles] = React.useState<any[]>([]);
  const [exhProfiles, setExhProfiles] = React.useState<any[]>([]);

  const fetchFraudData = React.useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // Fetch overview stats
      const resStats = await fetch('/api/fraud/stats');
      const bodyStats = await resStats.json();
      if (resStats.ok && bodyStats.success) {
        setOverviewData(bodyStats.data);
      }

      // Fetch staff risk profiles
      const resStaff = await fetch('/api/fraud/staff');
      const bodyStaff = await resStaff.json();
      if (resStaff.ok && bodyStaff.success) {
        setStaffProfiles(bodyStaff.data || []);
      }

      // Fetch exhibition risk profiles
      const resExh = await fetch('/api/exhibitions');
      const bodyExh = await resExh.json();
      if (resExh.ok && bodyExh.success) {
        // Compute risk profiles locally or fetch from a dedicated route.
        // Let's call the reconciliation route which has bypass flags
        const resRecon = await fetch('/api/fraud/reconciliation');
        const bodyRecon = await resRecon.json();
        if (resRecon.ok && bodyRecon.success) {
          setExhProfiles(bodyRecon.data || []);
        }
      }
    } catch (e) {
      console.error(e);
      addToast({
        type: 'error',
        title: 'Query Failed',
        message: 'Could not connect to the security analysis API.',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [addToast]);

  React.useEffect(() => {
    fetchFraudData();
  }, [fetchFraudData]);

  const handleExportCSV = () => {
    if (!overviewData?.suspiciousIncidents) return;
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Incident ID,Ticket Number,Exhibition,Gate,Operator,Timestamp,Outcome,Reason\n';

    overviewData.suspiciousIncidents.forEach((inc: any) => {
      csvContent += `"${inc.id}","${inc.ticketNumber}","${inc.exhibitionName}","${inc.gateId || 'Main'}","${inc.scannedBy?.name || 'Staff'}",${inc.scannedAt},"${inc.result}","${inc.reason}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `suspicious_incidents_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({
      type: 'success',
      title: 'CSV Exported',
      message: 'Suspicious logs downloaded successfully.',
    });
  };

  if (isLoading) {
    return (
      <ContentWrapper>
        <PageHeader title="Security & Fraud Alerts" description="Real-time gate security updates, duplicate ticket warnings, and suspicious activity alerts." showDivider />
        <StatCardSkeletonGrid columns={4} />
        <TableSkeleton rows={6} columns={5} />
      </ContentWrapper>
    );
  }

  // Identify Critical alerts
  const highRiskStaff = staffProfiles.filter((s: any) => s.riskLevel === 'critical' || s.riskLevel === 'high');
  const highRiskExhibitions = exhProfiles.filter((e: any) => e.mismatchCount > 0 || e.revenueMismatch < 0);

  return (
    <ContentWrapper>
      {/* Page Header */}
      <PageHeader
        title="Security & Fraud Alerts"
        description="Real-time gate security updates, duplicate ticket warnings, and suspicious activity alerts."
        actions={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchFraudData(true)}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw size={14} />}
            >
              Refresh Audit
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleExportCSV}
              leftIcon={<Download size={14} />}
            >
              Export CSV
            </Button>
          </div>
        }
        showDivider
      />

      {(highRiskExhibitions.length > 0 || overviewData?.forgedAttempts > 0 || overviewData?.securityViolationsCount > 0) && (
        <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 flex flex-col gap-2 shadow-sm animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-600 shrink-0" size={18} />
            <span className="font-extrabold text-sm uppercase tracking-wide">Critical Security Alerts Flagged</span>
          </div>
          <ul className="list-disc list-inside text-xs pl-1.5 space-y-1 text-red-700">
            {overviewData?.securityViolationsCount > 0 && (
              <li>Detected <strong>{overviewData.securityViolationsCount}</strong> unauthorized password reset attempt(s) on Super Admin accounts.</li>
            )}
            {overviewData?.forgedAttempts > 0 && (
              <li>Detected <strong>{overviewData.forgedAttempts}</strong> ticket QR codes with invalid security signatures (fake tickets blocked).</li>
            )}
            {highRiskExhibitions.map((e: any) => (
              <li key={e.exhibitionId}>
                Exhibition <strong>{e.exhibitionName}</strong> has mismatch: Gate scans exceed tickets sold by {e.mismatchCount} (extra gate entry detected).
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fraud Stats Grid */}
      {overviewData && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="border border-gray-800 bg-gray-900 shadow-sm hover:border-gray-700 transition-all">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <ShieldCheck size={22} />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Valid Gate entries</span>
                <h3 className="text-2xl font-black text-gray-100">{overviewData.validScans}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-800 bg-gray-900 shadow-sm hover:border-gray-700 transition-all">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <AlertTriangle size={22} />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Duplicate Passes</span>
                <h3 className="text-2xl font-black text-gray-100">{overviewData.duplicateScans}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-800 bg-gray-900 shadow-sm hover:border-gray-700 transition-all">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 border border-rose-500/20">
                <ShieldAlert size={22} />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Wrong Hall Scans</span>
                <h3 className="text-2xl font-black text-gray-100">{overviewData.wrongExhibitionScans}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-800 bg-gray-900 shadow-sm hover:border-red-500/30 transition-all">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-500/10 text-red-600 border border-red-500/20">
                <UserX size={22} />
              </div>
              <div>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block">Fake Tickets Blocked</span>
                <h3 className="text-2xl font-black text-red-600">{overviewData.forgedAttempts}</h3>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Analysis Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Suspicious Events Feed */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 select-none flex items-center gap-1.5">
            <AlertIcon size={15} className="text-red-500" />
            <span>Suspicious Activity Incident Log ({overviewData?.suspiciousIncidents?.length || 0})</span>
          </h3>

          <Card className="border border-gray-800 bg-gray-900">
            <CardContent className="p-0">
              {overviewData?.suspiciousIncidents?.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">No anomalous check-in events recorded today.</div>
              ) : (
                <div className="divide-y divide-gray-850">
                  {overviewData?.suspiciousIncidents?.map((inc: any) => (
                    <div key={inc.id} className="p-4.5 flex gap-4 items-start hover:bg-gray-850/15 transition-colors">
                      <div className={`flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg border text-sm font-bold uppercase
                        ${inc.result === 'rejected_unknown' ? 'bg-red-500/10 text-red-600 border-red-500/20' : ''}
                        ${inc.result === 'rejected_used' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : ''}
                        ${inc.result === 'rejected_wrong_exhibition' ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' : ''}
                        ${inc.result === 'security_violation' ? 'bg-red-650/20 text-red-500 border-red-500/30' : ''}
                      `}>
                        {inc.result === 'rejected_unknown' ? 'F' : inc.result === 'rejected_used' ? 'D' : inc.result === 'security_violation' ? 'S' : 'W'}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-start">
                          <p className="text-xs font-semibold text-gray-250 leading-relaxed">
                            {inc.result === 'security_violation' ? (
                              <span className="font-extrabold text-red-500">{inc.ticketNumber}</span>
                            ) : (
                              <>
                                Ticket Ref:{' '}
                                <Link href={`/admin/fraud/tickets/${inc.ticketNumber}`} className="font-bold text-accent-300 hover:underline">{inc.ticketNumber}</Link>
                              </>
                            )}
                          </p>
                          <span className="text-[10px] font-mono text-gray-500">
                            {new Date(inc.scannedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">
                          {inc.result === 'security_violation' ? (
                            <>
                              Triggered by operator <Link href={`/admin/fraud/staff/${inc.scannedBy?.staffId}`} className="font-bold text-gray-250 hover:underline">{inc.scannedBy?.name || 'Operator'}</Link> on system settings
                            </>
                          ) : (
                            <>
                              Blocked by gate staff <Link href={`/admin/fraud/staff/${inc.scannedBy?.staffId}`} className="font-bold text-gray-250 hover:underline">{inc.scannedBy?.name || 'Gate Operator'}</Link> at event <strong>{inc.exhibitionName}</strong>
                            </>
                          )}
                        </p>
                        <p className="text-[11px] font-mono text-red-650 bg-red-500/5 px-2 py-1.5 rounded border border-red-550/10 mt-1.5 leading-snug">
                          Reason: {inc.reason}
                        </p>
                      </div>

                      <Link href={inc.result === 'security_violation' ? `/admin/fraud/staff/${inc.scannedBy?.staffId}` : `/admin/fraud/tickets/${inc.ticketNumber}`} className="flex h-7 w-7 items-center justify-center rounded bg-gray-850 hover:bg-gray-800 text-gray-400 hover:text-gray-200 self-center">
                        <Eye size={14} />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* High Risk Staff Profiles */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 select-none flex items-center gap-1.5">
            <UserX size={15} className="text-amber-500" />
            <span>Staff Risk Profiles</span>
          </h3>

          <Card className="border border-gray-800 bg-gray-900">
            <CardHeader className="py-3 border-b border-gray-850">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400">Alert Grading</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {staffProfiles.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">No staff members configured in database.</div>
              ) : (
                <div className="divide-y divide-gray-850">
                  {staffProfiles.map((s: any) => (
                    <div key={s.staffId} className="p-4 flex justify-between items-center hover:bg-gray-850/5">
                      <div className="min-w-0">
                        <Link href={`/admin/fraud/staff/${s.staffId}`} className="font-bold text-sm text-gray-150 block hover:underline hover:text-accent-300 truncate">
                          {s.name}
                        </Link>
                        <span className="text-[10px] text-gray-500 block uppercase font-mono mt-0.5">{s.role} | ID: {s.staffId}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide
                          ${s.riskLevel === 'critical' ? 'bg-red-500/15 text-red-600 border border-red-500/30' : ''}
                          ${s.riskLevel === 'high' ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30' : ''}
                          ${s.riskLevel === 'medium' ? 'bg-blue-500/15 text-blue-600 border border-blue-500/30' : ''}
                          ${s.riskLevel === 'low' ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30' : ''}
                        `}>
                          {s.riskLevel}
                        </span>
                        <Link href={`/admin/fraud/staff/${s.staffId}`} className="text-gray-500 hover:text-gray-300">
                          <ArrowRight size={14} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ContentWrapper>
  );
}
