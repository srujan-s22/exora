'use client';

import * as React from 'react';
import { ArrowLeft, Clock, RefreshCw, Key, Ticket, ScanLine, AlertTriangle, ShieldCheck, FileText, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/providers/toast-provider';
import Link from 'next/link';

export default function StaffTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = React.use(params);
  const staffId = decodeURIComponent(rawId);

  const { addToast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [timeline, setTimeline] = React.useState<any[]>([]);
  const [staffInfo, setStaffInfo] = React.useState<any>(null);

  const fetchStaffTimeline = React.useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch(`/api/fraud/staff/${staffId}`);
      const body = await res.json();
      if (res.ok && body.success) {
        setTimeline(body.data || []);
      } else {
        addToast({
          type: 'error',
          title: 'Timeline Query Failed',
          message: body.error?.message || 'Could not fetch activity timeline.',
        });
      }

      // Fetch basic staff profile parameters from the staff list endpoint
      const resStaffList = await fetch('/api/fraud/staff');
      const bodyStaffList = await resStaffList.json();
      if (resStaffList.ok && bodyStaffList.success) {
        const info = bodyStaffList.data.find((s: any) => s.staffId === staffId || s.id === staffId);
        if (info) setStaffInfo(info);
      }
    } catch (e) {
      console.error(e);
      addToast({
        type: 'error',
        title: 'Connection Failure',
        message: 'Could not connect to timeline server API.',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [staffId, addToast]);

  React.useEffect(() => {
    fetchStaffTimeline();
  }, [fetchStaffTimeline]);

  if (isLoading) {
    return (
      <ContentWrapper>
        <div className="flex min-h-[60dvh] items-center justify-center">
          <Spinner size="lg" className="text-accent-300" />
        </div>
      </ContentWrapper>
    );
  }

  return (
    <ContentWrapper>
      {/* Back button */}
      <div className="mb-4">
        <Link href="/admin/fraud" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 font-semibold select-none">
          <ArrowLeft size={12} /> Back to Fraud Alerts
        </Link>
      </div>

      {/* Page Header */}
      <PageHeader
        title={`Staff Audit Log: ${staffInfo?.name || 'Operator'}`}
        description={`Investigate timeline audits, shift transactions, and scanned passes scopes for staff ID ${staffId}.`}
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchStaffTimeline(true)}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw size={14} />}
          >
            Refresh Timeline
          </Button>
        }
        showDivider
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Staff Profile Indicators (Left) */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border border-gray-800 bg-gray-900 shadow-sm">
            <CardHeader className="py-4 border-b border-gray-850">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400">Profile Risk Parameters</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3.5 text-xs">
              <div className="flex justify-between border-b border-gray-850 pb-2">
                <span className="text-gray-500">Full Name</span>
                <span className="font-bold text-gray-150">{staffInfo?.name || 'Staff Member'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-850 pb-2">
                <span className="text-gray-500">Operator Role</span>
                <span className="font-bold text-gray-250 uppercase">{staffInfo?.role || 'operator'}</span>
              </div>
              <div className="flex justify-between border-b border-gray-850 pb-2">
                <span className="text-gray-500">Risk Assessment</span>
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-extrabold uppercase
                  ${staffInfo?.riskLevel === 'critical' ? 'bg-red-500/10 text-red-600' : ''}
                  ${staffInfo?.riskLevel === 'high' ? 'bg-amber-500/10 text-amber-600' : ''}
                  ${staffInfo?.riskLevel === 'medium' ? 'bg-blue-500/10 text-blue-600' : ''}
                  ${staffInfo?.riskLevel === 'low' ? 'bg-emerald-500/10 text-emerald-600' : ''}
                `}>
                  {staffInfo?.riskLevel || 'low'}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-850 pb-2">
                <span className="text-gray-500">Risk Score</span>
                <span className="font-mono font-bold text-gray-200">{staffInfo?.riskScore || 10}/100</span>
              </div>
              {staffInfo?.role === 'counter' ? (
                <div className="flex justify-between border-b border-gray-850 pb-2">
                  <span className="text-gray-500">Outstanding Invoices</span>
                  <span className="font-bold text-gray-200">{staffInfo?.mismatchCount || 0} pending</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between border-b border-gray-850 pb-2">
                    <span className="text-gray-500">Duplicate Blocks</span>
                    <span className="font-bold text-gray-250">{staffInfo?.duplicateCount || 0} scans</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-850 pb-2">
                    <span className="text-gray-500">Forgery rejections</span>
                    <span className="font-bold text-red-600">{staffInfo?.forgeryCount || 0} scans</span>
                  </div>
                </>
              )}
              <div className="flex justify-between pb-1">
                <span className="text-gray-500">Audit Alert Note</span>
                <span className="text-gray-400 text-right max-w-[150px] leading-relaxed block">{staffInfo?.reason || 'Clear'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline list (Right) */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 select-none flex items-center gap-1.5">
            <Clock size={15} className="text-gray-500" />
            <span>Staff Activity Timeline logs ({timeline.length})</span>
          </h3>

          <Card className="border border-gray-800 bg-gray-900 shadow-lg">
            <CardContent className="p-6">
              {timeline.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500 select-none">No transactions or entry scans logged by this staff member today.</div>
              ) : (
                <div className="relative pl-6 border-l border-gray-800 space-y-6">
                  {timeline.map((item, index) => {
                    const isScan = item.type === 'scan';
                    const isSystem = item.type === 'system';
                    const isAlert = item.severity === 'high' || item.severity === 'critical';
                    
                    return (
                      <div key={item.id} className="relative">
                        {/* Dot indicator */}
                        <div className={`absolute -left-[31px] top-1.5 h-2.5 w-2.5 rounded-full border-2 bg-gray-900
                          ${isAlert ? 'border-red-500' : isSystem ? 'border-blue-500' : isScan ? 'border-emerald-500' : 'border-accent-300'}
                        `} />
                        
                        <div className="space-y-1.5 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-extrabold text-sm text-gray-150">{item.title}</span>
                            <span className="font-mono text-gray-500">
                              {new Date(item.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}{' '}
                              ({new Date(item.timestamp).toLocaleDateString('en-IN')})
                            </span>
                          </div>
                          
                          <p className="text-gray-300 leading-relaxed">{item.description}</p>
                          
                          <div className="flex justify-between items-center bg-gray-850/40 p-2 rounded border border-gray-800 font-mono text-[10px]">
                            <span className="text-gray-400">Output: <strong className="text-gray-200">{item.value}</strong></span>
                            
                            {/* Link lookup if ticket referenced */}
                            {item.meta?.ticketNumber && (
                              <Link href={`/admin/fraud/tickets/${item.meta.ticketNumber}`} className="flex items-center gap-0.5 text-accent-300 hover:underline">
                                <span>Forensics Lookup</span>
                                <ChevronRight size={10} />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ContentWrapper>
  );
}
