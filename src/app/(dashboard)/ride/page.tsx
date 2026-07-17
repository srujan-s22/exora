'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Gamepad2, Play, Square, QrCode, History, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/providers/auth-provider';
import { useToast } from '@/components/providers/toast-provider';
import { ContentWrapper } from '@/components/layout/content-wrapper';

export default function RideStaffDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { addToast } = useToast();
  const router = useRouter();

  const [isLoading, setIsLoading] = React.useState(true);
  const [dashboardData, setDashboardData] = React.useState<any>(null);
  const [isActionLoading, setIsActionLoading] = React.useState(false);

  // Auth gate check
  React.useEffect(() => {
    if (!authLoading && user && user.role !== 'ride' && user.role !== 'admin' && user.role !== 'super_admin') {
      router.push('/unauthorized');
    }
  }, [user, authLoading, router]);

  const loadDashboardData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/dashboard/ride-stats?staffDashboard=true');
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          setDashboardData(body.data);
        }
      } else {
        throw new Error('Failed to load dashboard.');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Error loading dashboard',
        message: err.message || 'Check your connection.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  React.useEffect(() => {
    if (user && (user.role === 'ride' || user.role === 'admin' || user.role === 'super_admin')) {
      loadDashboardData();
    }
  }, [user, loadDashboardData]);

  // Toggle status (open/closed)
  const handleToggleStatus = async () => {
    if (!dashboardData?.ride) return;
    const rideId = dashboardData.ride.id;
    const nextStatus = dashboardData.ride.status === 'open' ? 'closed' : 'open';

    setIsActionLoading(true);
    try {
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
          message: `Your ride status is now marked ${nextStatus}.`,
        });
        loadDashboardData();
      } else {
        throw new Error(body.error?.message || 'Failed to toggle status');
      }
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Update failed',
        message: err.message,
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <ContentWrapper>
        <div className="flex h-[60dvh] items-center justify-center">
          <Spinner size="lg" className="text-accent-500" />
        </div>
      </ContentWrapper>
    );
  }

  // If staff has no ride assigned
  if (!dashboardData || !dashboardData.assigned) {
    return (
      <ContentWrapper>
        <div className="mx-auto max-w-lg mt-12 p-8 text-center bg-gray-900 border border-gray-800 rounded-xl">
          <Gamepad2 size={48} className="text-warning-400 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-bold text-gray-50 mb-2">No Ride Assigned</h2>
          <p className="text-sm text-gray-400 mb-6">
            Your account is currently not assigned to scan tickets for any rides or games inside the exhibition. Please contact your system administrator.
          </p>
          <Button
            variant="secondary"
            onClick={loadDashboardData}
            leftIcon={<RefreshCw size={14} />}
            className="font-semibold text-xs mx-auto"
          >
            Check Again
          </Button>
        </div>
      </ContentWrapper>
    );
  }

  const { ride, todayTicketsCount, validCount, invalidCount, totalScansToday, recentScans } = dashboardData;

  return (
    <ContentWrapper>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <span className="text-[10px] font-bold text-accent-400 uppercase tracking-widest block mb-1">
            Ride Checkpoint Desk
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-gray-50 flex items-center gap-2">
            <Gamepad2 className="text-accent-400 shrink-0" />
            <span>Dashboard: {ride.name}</span>
          </h1>
          {ride.description && (
            <p className="mt-1 text-sm text-gray-400 max-w-2xl">{ride.description}</p>
          )}
        </div>

        <div className="flex gap-3 shrink-0">
          <Button
            variant="secondary"
            disabled={isActionLoading}
            onClick={handleToggleStatus}
            leftIcon={ride.status === 'open' ? <Square size={14} className="text-error" /> : <Play size={14} className="text-success" />}
            className="font-semibold text-xs"
          >
            {ride.status === 'open' ? 'Close Ride' : 'Open Ride'}
          </Button>
          <Link href="/ride/scan" passHref>
            <Button className="font-bold flex items-center gap-1.5" leftIcon={<QrCode size={15} />}>
              Launch Scanner
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Stats Column */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-base font-bold uppercase tracking-wider text-gray-400">Today's Checkpoint Statistics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-accent-500/10 rounded-lg text-accent-400 border border-accent-500/20">
                  <QrCode size={24} />
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-medium">Tickets Issued</span>
                  <h3 className="text-2xl font-bold text-gray-100 mt-0.5">{todayTicketsCount}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-success/10 rounded-lg text-success border border-success/20">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-medium">Admitted</span>
                  <h3 className="text-2xl font-bold text-success mt-0.5">{validCount}</h3>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="p-3 bg-error/10 rounded-lg text-error border border-error/20">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-medium">Failed Scans</span>
                  <h3 className="text-2xl font-bold text-error mt-0.5">{invalidCount}</h3>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Ride Info settings */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="py-4 border-b border-gray-850">
              <CardTitle className="text-sm font-bold text-gray-200 uppercase tracking-wider">Ride Operation Details</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4 text-sm">
              <div className="flex justify-between py-1 border-b border-gray-850">
                <span className="text-gray-400">Exhibition ID Reference</span>
                <span className="font-mono text-gray-250">{ride.exhibitionId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-850">
                <span className="text-gray-400">Price per ticket</span>
                <span className="font-bold text-gray-200">₹{(ride.price / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Operator Assigned Status</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold capitalize
                  ${ride.status === 'open' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}
                `}>
                  {ride.status}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Scan Log History Column */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <History size={16} />
              <span>Recent Scan Activities</span>
            </h2>
            <Link href="/ride/history" className="text-xs text-accent-400 hover:text-accent-300 font-bold uppercase tracking-wide">
              View History
            </Link>
          </div>

          <Card className="bg-gray-900 border-gray-800 flex-1 h-[320px] flex flex-col">
            <CardContent className="p-4 flex-1 overflow-y-auto space-y-3.5">
              {recentScans.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-12">No scans processed today.</div>
              ) : (
                recentScans.map((scan: any) => {
                  const isSuccess = scan.result === 'admitted';
                  const timestampStr = new Intl.DateTimeFormat('en-IN', { timeStyle: 'short' }).format(new Date(scan.scannedAt));

                  return (
                    <div key={scan.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-gray-850/50 border border-gray-800">
                      <div className="min-w-0">
                        <p className="text-xs font-mono font-bold text-gray-200">
                          {scan.ticketId?.ticketNumber || 'UNKNOWN'}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1 max-w-[150px] truncate">
                          {scan.reason || (isSuccess ? 'Access Granted' : 'Rejected')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider
                          ${isSuccess ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}
                        `}>
                          {scan.result}
                        </span>
                        <span className="block text-[9px] text-gray-500 font-semibold mt-1">{timestampStr}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ContentWrapper>
  );
}
