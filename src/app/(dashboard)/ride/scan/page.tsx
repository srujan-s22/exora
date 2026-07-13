'use client';

import * as React from 'react';
import { Camera, RefreshCw, X, ShieldAlert, CheckCircle2, AlertOctagon, Gamepad2, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useToast } from '@/components/providers/toast-provider';
import { QRScanner } from '@/components/shared/qr-scanner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { Ride } from '@/types/ride.types';

export default function RideScanPage() {
  const { addToast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Active terminal configs
  const [dataLoading, setDataLoading] = React.useState(true);
  const [assignedRide, setAssignedRide] = React.useState<Ride | null>(null);

  // Validation States
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [outcome, setOutcome] = React.useState<{
    valid: boolean;
    result: string;
    ticketNumber: string;
    customerName?: string;
    message: string;
  } | null>(null);

  // Auth gate check
  React.useEffect(() => {
    if (!authLoading && user && user.role !== 'gate' && user.role !== 'admin') {
      router.push('/unauthorized');
    }
  }, [user, authLoading, router]);

  // Load staff dashboard context
  const loadRideContext = React.useCallback(async () => {
    try {
      setDataLoading(true);
      const res = await fetch('/api/dashboard/ride-stats?staffDashboard=true');
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data.assigned) {
          setAssignedRide(body.data.ride);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (user && (user.role === 'gate' || user.role === 'admin')) {
      loadRideContext();
    }
  }, [user, loadRideContext]);

  const handleScan = async (payload: string, isFake = false) => {
    if (!assignedRide) {
      addToast({ type: 'warning', title: 'Scope Required', message: 'You have no assigned ride context.' });
      return;
    }

    setIsProcessing(true);
    setOutcome(null);

    try {
      const payloadToSend = isFake ? 'tampered-fake-signature-token-payload' : payload;
      
      const res = await fetch('/api/rides/tickets/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrPayload: payloadToSend,
          exhibitionId: assignedRide.exhibitionId,
          rideId: assignedRide.id,
          gateId: 'ride-terminal',
        }),
      });

      const body = await res.json();
      if (res.ok && body.success) {
        const data = body.data;
        
        setOutcome({
          valid: data.valid,
          result: data.result,
          ticketNumber: data.ticket?.ticketNumber || 'UNKNOWN',
          customerName: data.ticket?.customerName,
          message: data.message,
        });

        // Trigger notification sound / haptic feedback
        if (data.valid) {
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            osc.frequency.setValueAtTime(580, ctx.currentTime); // Ride Success beep (slightly higher pitch)
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
          } catch {}
        } else {
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            osc.frequency.setValueAtTime(140, ctx.currentTime); // Reject buzz
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
          } catch {}
        }
      } else {
        addToast({
          type: 'error',
          title: 'Validation Error',
          message: body.error?.message || 'Error occurred while verifying ticket.',
        });
      }
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Network Failure', message: 'Failed to communicate with ticket validator.' });
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading || dataLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <Spinner size="lg" className="text-accent-500" />
      </div>
    );
  }

  if (!assignedRide) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-950 p-6 text-center text-gray-300">
        <ShieldAlert size={48} className="text-warning-400 mb-4 animate-pulse" />
        <h2 className="text-xl font-bold mb-2">No Active Assignment Context</h2>
        <p className="text-sm text-gray-400 mb-6 max-w-xs">
          You must be assigned to an active ride/game to scan tickets.
        </p>
        <Button variant="secondary" onClick={() => router.push('/ride')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  // Visual outcomes mapping
  const overlayMap: Record<
    string,
    {
      title: string;
      colorClass: string;
      icon: React.ReactNode;
    }
  > = {
    admitted: {
      title: 'ACCESS GRANTED',
      colorClass: 'bg-success/95 border-success text-white',
      icon: <CheckCircle2 size={72} className="animate-bounce" />,
    },
    rejected_used: {
      title: 'DUPLICATE TICKET',
      colorClass: 'bg-warning/95 border-warning text-white',
      icon: <AlertOctagon size={72} className="animate-pulse" />,
    },
    rejected_wrong_ride: {
      title: 'WRONG RIDE PASS',
      colorClass: 'bg-error/95 border-error text-white',
      icon: <AlertOctagon size={72} />,
    },
    rejected_invalid: {
      title: 'INVALID PASS',
      colorClass: 'bg-error/95 border-error text-white',
      icon: <X size={72} className="animate-pulse" />,
    },
    rejected_closed: {
      title: 'RIDE CLOSED',
      colorClass: 'bg-gray-850/95 border-gray-700 text-white',
      icon: <X size={72} />,
    },
    rejected_unknown: {
      title: 'FORGERY SUSPECTED',
      colorClass: 'bg-error/95 border-error text-white',
      icon: <ShieldAlert size={72} className="animate-pulse" />,
    },
  };

  const currentOverlay = outcome ? overlayMap[outcome.result] || overlayMap.rejected_invalid : null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-between p-4 overflow-hidden">
      
      {/* Top Header selection & exit */}
      <div className="w-full max-w-md flex items-center justify-between gap-4 mt-2">
        <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 py-2 px-3 rounded-lg flex-1 min-w-0">
          <Gamepad2 className="text-accent-400 shrink-0" size={16} />
          <span className="text-xs font-bold text-gray-200 truncate">{assignedRide.name} Terminal</span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push('/ride')}
          className="shrink-0 font-semibold"
          leftIcon={<X size={15} />}
        >
          Exit
        </Button>
      </div>

      {/* Main scanner center viewfinder viewport */}
      <div className="w-full max-w-md flex-1 flex items-center justify-center py-6">
        <QRScanner onScan={handleScan} isProcessing={isProcessing} isLocked={!!outcome} />
      </div>

      {/* Bottom Info details */}
      <div className="text-center mb-4 select-none">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block flex items-center justify-center gap-1">
          <Info size={12} />
          <span>Pay-Per-Ride Scanner</span>
        </span>
        <span className="text-xs text-gray-400 mt-1 block">
          This scanner only accepts tickets issued for {assignedRide.name}.
        </span>
      </div>

      {/* Large Full Screen Validation Outcome Overlay */}
      {outcome && currentOverlay && (
        <div
          onClick={() => setOutcome(null)}
          className={`absolute inset-0 z-100 flex flex-col items-center justify-center text-center p-6 cursor-pointer select-none transition-all duration-300 ${currentOverlay.colorClass}`}
        >
          <div className="space-y-8 max-w-sm flex flex-col items-center">
            {/* Outcome Icon */}
            <div className="p-4 bg-black/20 rounded-full border border-white/10 shadow-lg">
              {currentOverlay.icon}
            </div>

            {/* Title & Detailed Message */}
            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-wider uppercase">
                {currentOverlay.title}
              </h1>
              <p className="text-lg font-bold text-white/90 leading-snug px-2">
                {outcome.message}
              </p>
            </div>

            {/* Ticket Info Card Overlay */}
            <div className="w-full bg-black/15 rounded-xl p-4.5 border border-white/10 text-left font-mono text-sm space-y-2">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-white/60">Ticket Ref</span>
                <span className="font-extrabold">{outcome.ticketNumber}</span>
              </div>
              {outcome.customerName && (
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-white/60">Customer</span>
                  <span className="font-extrabold truncate max-w-[180px]">{outcome.customerName}</span>
                </div>
              )}
            </div>

            {/* Tap prompt */}
            <span className="text-xs font-bold uppercase tracking-widest text-white/70 animate-pulse mt-4">
              Tap screen to clear and continue
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
