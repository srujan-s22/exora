'use client';

import * as React from 'react';
import { X, ShieldAlert, CheckCircle2, AlertOctagon, Gamepad2, UserCheck, Users } from 'lucide-react';
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
  const [lastScannedPayload, setLastScannedPayload] = React.useState('');
  const [outcome, setOutcome] = React.useState<{
    valid: boolean;
    result: string;
    ticketNumber: string;
    customerName?: string;
    message: string;
    quantity: number;
    usedCount: number;
    remainingCount: number;
  } | null>(null);

  // Admit All Confirmation Modal state
  const [showAdmitAllConfirm, setShowAdmitAllConfirm] = React.useState(false);

  // Auth gate check
  React.useEffect(() => {
    if (!authLoading && user && user.role !== 'ride' && user.role !== 'admin' && user.role !== 'super_admin') {
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
    if (user && (user.role === 'ride' || user.role === 'admin' || user.role === 'super_admin')) {
      loadRideContext();
    }
  }, [user, loadRideContext]);

  const handleScan = async (payload: string, isFake = false, countToAdmit = 1) => {
    if (!assignedRide) {
      addToast({ type: 'warning', title: 'Scope Required', message: 'You have no assigned ride context.' });
      return;
    }

    setIsProcessing(true);
    const payloadToSend = isFake ? 'tampered-fake-signature-token-payload' : payload;
    setLastScannedPayload(payloadToSend);

    try {
      const res = await fetch('/api/rides/tickets/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrPayload: payloadToSend,
          exhibitionId: assignedRide.exhibitionId,
          rideId: assignedRide.id,
          gateId: 'ride-terminal',
          countToAdmit,
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
          quantity: data.ticket?.quantity || 1,
          usedCount: data.ticket?.usedCount || (data.valid ? 1 : 0),
          remainingCount: data.ticket?.remainingCount ?? 0,
        });

        // Audio feedback
        if (data.valid) {
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            osc.frequency.setValueAtTime(580, ctx.currentTime);
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
            osc.frequency.setValueAtTime(140, ctx.currentTime);
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

  const handleAdmitMore = (count: number) => {
    if (!lastScannedPayload) return;
    if (count === outcome?.remainingCount && count > 1) {
      setShowAdmitAllConfirm(true);
    } else {
      executeAdmission(count);
    }
  };

  const executeAdmission = async (count: number) => {
    setShowAdmitAllConfirm(false);
    await handleScan(lastScannedPayload, false, count);
  };

  if (authLoading || dataLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <Spinner size="lg" className="text-accent-500" />
      </div>
    );
  }

  const overlayMap: Record<
    string,
    {
      title: string;
      colorClass: string;
      icon: React.ReactNode;
    }
  > = {
    admitted: {
      title: outcome && outcome.remainingCount > 0 ? 'PARTIALLY ADMITTED' : 'RIDE ENTRY ADMITTED',
      colorClass: 'bg-success/95 border-success text-white',
      icon: <CheckCircle2 size={64} className="animate-bounce" />,
    },
    rejected_used: {
      title: 'RIDE TICKET EXHAUSTED',
      colorClass: 'bg-warning/95 border-warning text-white',
      icon: <AlertOctagon size={64} className="animate-pulse" />,
    },
    rejected_closed: {
      title: 'RIDE CLOSED',
      colorClass: 'bg-error/95 border-error text-white',
      icon: <X size={64} />,
    },
    rejected_wrong_ride: {
      title: 'WRONG RIDE TICKET',
      colorClass: 'bg-error/95 border-error text-white',
      icon: <AlertOctagon size={64} />,
    },
    rejected_invalid: {
      title: 'INVALID CREDENTIAL',
      colorClass: 'bg-error/95 border-error text-white',
      icon: <X size={64} className="animate-pulse" />,
    },
    rejected_unknown: {
      title: 'FORGERY SUSPECTED',
      colorClass: 'bg-error/95 border-error text-white',
      icon: <ShieldAlert size={64} className="animate-pulse" />,
    },
  };

  const currentOverlay = outcome ? overlayMap[outcome.result] || overlayMap.rejected_invalid : null;

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-between p-4 overflow-hidden">
      {/* Top Header selection & exit */}
      <div className="w-full max-w-md flex items-center justify-between gap-4 mt-2">
        <div className="flex-1 bg-gray-900 border border-gray-800 p-3 rounded-lg flex items-center gap-2">
          <Gamepad2 size={16} className="text-accent-400 shrink-0" />
          <span className="text-xs font-bold text-gray-200 truncate">
            {assignedRide ? assignedRide.name : 'No Assigned Ride'}
          </span>
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
        <QRScanner onScan={(p) => handleScan(p, false, 1)} isProcessing={isProcessing} isLocked={!!outcome} />
      </div>

      {/* Bottom Instruction */}
      <div className="text-center mb-4 select-none">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
          Ride Entry Verification Terminal
        </span>
        <span className="text-xs text-gray-400 mt-1 block">
          Align ride ticket QR code within scanner boundaries.
        </span>
      </div>

      {/* Outcome Overlay */}
      {outcome && currentOverlay && (
        <div
          className={`absolute inset-0 z-100 flex flex-col items-center justify-between text-center p-6 select-none transition-all duration-300 ${currentOverlay.colorClass}`}
        >
          <div className="w-full flex justify-end">
            <button
              onClick={() => setOutcome(null)}
              className="p-2 rounded-full bg-black/30 hover:bg-black/50 text-white cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-6 max-w-sm flex flex-col items-center my-auto w-full">
            <div className="p-4 bg-black/20 rounded-full border border-white/10 shadow-lg">
              {currentOverlay.icon}
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-wider uppercase">
                {currentOverlay.title}
              </h1>
              <p className="text-base sm:text-lg font-bold text-white/90 leading-snug px-2">
                {outcome.message}
              </p>
            </div>

            {/* Ticket Bundle Info & Counter Card */}
            <div className="w-full bg-black/25 rounded-2xl p-4 border border-white/15 text-left text-xs font-mono space-y-3 shadow-inner">
              <div className="flex justify-between items-center pb-2 border-b border-white/10">
                <span className="text-white/70">Ticket Ref</span>
                <span className="font-extrabold text-sm">{outcome.ticketNumber}</span>
              </div>

              {assignedRide && (
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Ride</span>
                  <span className="font-extrabold">{assignedRide.name}</span>
                </div>
              )}

              {/* Bundle Counters Display */}
              <div className="pt-2 border-t border-white/10 grid grid-cols-3 gap-2 text-center font-sans">
                <div className="p-2 bg-black/30 rounded-xl">
                  <span className="text-[10px] text-white/60 uppercase block font-medium">Total</span>
                  <span className="text-lg font-black text-white">{outcome.quantity}</span>
                </div>
                <div className="p-2 bg-black/30 rounded-xl">
                  <span className="text-[10px] text-white/60 uppercase block font-medium">Admitted</span>
                  <span className="text-lg font-black text-amber-300">{outcome.usedCount}</span>
                </div>
                <div className="p-2 bg-black/30 rounded-xl">
                  <span className="text-[10px] text-white/60 uppercase block font-medium">Remaining</span>
                  <span className="text-lg font-black text-emerald-300">{outcome.remainingCount}</span>
                </div>
              </div>
            </div>

            {/* Partial Admission Action Buttons */}
            {outcome.remainingCount > 0 && (
              <div className="w-full space-y-2 pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-white/80 block">
                  Admit More Visitors For Ride:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleAdmitMore(1)}
                    disabled={isProcessing}
                    className="p-3 bg-white/20 hover:bg-white/30 border border-white/30 rounded-xl font-bold text-sm text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <UserCheck size={16} />
                    <span>Admit 1</span>
                  </button>

                  {outcome.remainingCount >= 2 && (
                    <button
                      onClick={() => handleAdmitMore(2)}
                      disabled={isProcessing}
                      className="p-3 bg-white/20 hover:bg-white/30 border border-white/30 rounded-xl font-bold text-sm text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <UserCheck size={16} />
                      <span>Admit 2</span>
                    </button>
                  )}

                  {outcome.remainingCount >= 3 && (
                    <button
                      onClick={() => handleAdmitMore(3)}
                      disabled={isProcessing}
                      className="p-3 bg-white/20 hover:bg-white/30 border border-white/30 rounded-xl font-bold text-sm text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <UserCheck size={16} />
                      <span>Admit 3</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleAdmitMore(outcome.remainingCount)}
                    disabled={isProcessing}
                    className="p-3 bg-accent-500 hover:bg-accent-400 border border-accent-400 text-gray-950 rounded-xl font-black text-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 col-span-2"
                  >
                    <Users size={16} />
                    <span>Admit All Remaining ({outcome.remainingCount})</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setOutcome(null)}
            className="text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white mt-4 cursor-pointer"
          >
            Tap or click here to close and scan next
          </button>
        </div>
      )}

      {/* QUICK CONFIRMATION POPUP FOR "ADMIT ALL" */}
      {showAdmitAllConfirm && outcome && (
        <div className="fixed inset-0 z-150 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5 text-center shadow-2xl">
            <div className="mx-auto h-14 w-14 rounded-full bg-accent-500/10 border border-accent-500/30 flex items-center justify-center text-accent-400">
              <Users size={28} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-gray-100">
                Confirm Full Ride Admission?
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Admit all <strong className="text-gray-200">{outcome.remainingCount} remaining visitors</strong> for Ticket <strong className="text-accent-400 font-mono">{outcome.ticketNumber}</strong>?
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowAdmitAllConfirm(false)}
                className="flex-1 py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => executeAdmission(outcome.remainingCount)}
                className="flex-1 py-2.5 px-4 bg-accent-500 hover:bg-accent-400 text-gray-950 font-extrabold text-xs rounded-xl transition-colors cursor-pointer shadow-lg"
              >
                Yes, Admit All ({outcome.remainingCount})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
