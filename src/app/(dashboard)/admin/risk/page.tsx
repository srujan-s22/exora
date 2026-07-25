'use client';

import * as React from 'react';
import { ShieldAlert, RefreshCw, Filter, ShieldCheck, Scale, AlertTriangle, Eye, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { ContentWrapper } from '@/components/layout/content-wrapper';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/providers/toast-provider';
import Link from 'next/link';

export default function RiskProfilesPage() {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  
  const [staffProfiles, setStaffProfiles] = React.useState<any[]>([]);
  const [exhProfiles, setExhProfiles] = React.useState<any[]>([]);
  const [filterSeverity, setFilterSeverity] = React.useState('all');

  const fetchRiskData = React.useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      // Fetch staff risk levels
      const resStaff = await fetch('/api/fraud/staff');
      const bodyStaff = await resStaff.json();
      if (resStaff.ok && bodyStaff.success) {
        setStaffProfiles(bodyStaff.data || []);
      }

      // Fetch exhibitions risk profiles
      // We will match locally from the reconciliation route and compute risk levels
      const resRecon = await fetch('/api/fraud/reconciliation');
      const bodyRecon = await resRecon.json();
      if (resRecon.ok && bodyRecon.success) {
        const calculatedExhs = bodyRecon.data.map((r: any) => {
          let riskScore = 15;
          let reason = 'Low risk: Scans and sales counts match.';
          let riskLevel = 'low';

          if (r.mismatchCount > 0) {
            riskScore = 98;
            riskLevel = 'critical';
            reason = `Critical mismatch: Admitted entries exceed sales by ${r.mismatchCount}.`;
          } else if (r.revenueMismatch < 0) {
            riskScore = 75;
            riskLevel = 'high';
            reason = `High mismatch: Sales values are short by ₹${Math.abs(r.revenueMismatch) / 100}.`;
          }

          return {
            exhibitionId: r.exhibitionId,
            name: r.exhibitionName,
            status: r.status,
            ticketsIssued: r.ticketsSold,
            validEntries: r.ticketsScanned,
            riskScore,
            riskLevel,
            reason,
          };
        });
        setExhProfiles(calculatedExhs);
      }
    } catch (e) {
      console.error(e);
      addToast({
        type: 'error',
        title: 'Query Failed',
        message: 'Could not fetch risk statistics from the scoring server.',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [addToast]);

  React.useEffect(() => {
    fetchRiskData();
  }, [fetchRiskData]);

  if (isLoading) {
    return (
      <ContentWrapper>
        <div className="flex min-h-[60dvh] items-center justify-center">
          <Spinner size="lg" className="text-accent-300" />
        </div>
      </ContentWrapper>
    );
  }

  // Filter lists
  const filterList = (list: any[]) => {
    if (filterSeverity === 'all') return list;
    return list.filter((item) => item.riskLevel === filterSeverity);
  };

  const filteredStaff = filterList(staffProfiles);
  const filteredExhibitions = filterList(exhProfiles);

  return (
    <ContentWrapper>
      {/* Page Header */}
      <PageHeader
        title="Staff & Event Risk Overview"
        description="Monitors risk levels for staff counters and events based on scan and sales patterns."
        actions={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchRiskData(true)}
            isLoading={isRefreshing}
            leftIcon={<RefreshCw size={14} />}
          >
            Re-evaluate
          </Button>
        }
        showDivider
      />

      {/* Filter Severity Panel */}
      <div className="mb-6 grid gap-4 p-4 rounded-xl border border-gray-800 bg-gray-900 shadow-sm sm:grid-cols-2 max-w-2xl">
        <Select
          label="Filter by Risk Severity"
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          options={[
            { label: 'Display All Severity Levels', value: 'all' },
            { label: 'Critical Risk Only', value: 'critical' },
            { label: 'High Risk Only', value: 'high' },
            { label: 'Medium Risk Only', value: 'medium' },
            { label: 'Low Risk Only', value: 'low' },
          ]}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Staff Risk Assessments */}
        <Card className="border border-gray-800 bg-gray-900 shadow-lg">
          <CardHeader className="py-4 border-b border-gray-850">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-amber-500" />
              <span>Staff Risk Assessments ({filteredStaff.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredStaff.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">No staff matches the selected risk filter.</div>
            ) : (
              <div className="divide-y divide-gray-850">
                {filteredStaff.map((s) => (
                  <div key={s.staffId} className="p-5 flex gap-4 hover:bg-gray-850/5 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/fraud/staff/${s.staffId}`} className="font-extrabold text-sm text-gray-150 hover:underline">
                          {s.name}
                        </Link>
                        <span className="text-[10px] text-gray-500 uppercase font-mono">({s.role})</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 select-none font-mono">Staff ID: {s.staffId}</p>
                      <p className="text-[11px] text-gray-500 italic mt-2 bg-gray-850/40 p-2 rounded border border-gray-800">
                        Audit Note: {s.reason}
                      </p>
                    </div>

                    <div className="flex flex-col items-end justify-between shrink-0">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider
                        ${s.riskLevel === 'critical' ? 'bg-red-500/10 text-red-600' : ''}
                        ${s.riskLevel === 'high' ? 'bg-amber-500/10 text-amber-600' : ''}
                        ${s.riskLevel === 'medium' ? 'bg-blue-500/10 text-blue-600' : ''}
                        ${s.riskLevel === 'low' ? 'bg-emerald-500/10 text-emerald-600' : ''}
                      `}>
                        {s.riskLevel}
                      </span>
                      <span className="text-xs font-mono font-bold text-gray-400 mt-2 block">Score: {s.riskScore}/100</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exhibition Risk Profiles */}
        <Card className="border border-gray-800 bg-gray-900 shadow-lg">
          <CardHeader className="py-4 border-b border-gray-850">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Scale size={14} className="text-accent-300" />
              <span>Event Risk Assessments ({filteredExhibitions.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredExhibitions.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">No exhibitions match the selected risk filter.</div>
            ) : (
              <div className="divide-y divide-gray-850">
                {filteredExhibitions.map((e) => (
                  <div key={e.exhibitionId} className="p-5 flex gap-4 hover:bg-gray-850/5 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-gray-150">
                          {e.name}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase font-mono">({e.status})</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1 select-none font-mono">Exh ID: {e.exhibitionId}</p>
                      <p className="text-[11px] text-gray-500 italic mt-2 bg-gray-850/40 p-2 rounded border border-gray-800">
                        Analysis: {e.reason}
                      </p>
                    </div>

                    <div className="flex flex-col items-end justify-between shrink-0">
                      <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider
                        ${e.riskLevel === 'critical' ? 'bg-red-500/10 text-red-600' : ''}
                        ${e.riskLevel === 'high' ? 'bg-amber-500/10 text-amber-600' : ''}
                        ${e.riskLevel === 'medium' ? 'bg-blue-500/10 text-blue-600' : ''}
                        ${e.riskLevel === 'low' ? 'bg-emerald-500/10 text-emerald-600' : ''}
                      `}>
                        {e.riskLevel}
                      </span>
                      <span className="text-xs font-mono font-bold text-gray-400 mt-2 block">Score: {e.riskScore}/100</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ContentWrapper>
  );
}
