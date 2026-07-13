'use client';

import * as React from 'react';
import { Camera, RefreshCw, X, ShieldAlert, CheckCircle2, AlertOctagon, HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { useToast } from '@/components/providers/toast-provider';
import { QRScanner } from '@/components/shared/qr-scanner';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

export default function GateScanPage() {
  const { addToast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Active terminal configs
  const [dataLoading, setDataLoading] = React.useState(true);
  const [activeExhibitions, setActiveExhibitions] = React.useState<any[]>([]);
  const [selectedExhId, setSelectedExhId] = React.useState('');

  // Validation States
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [outcome, setOutcome] = React.useState<{
    valid: boolean;
    result: string;
    ticketNumber: string;
    ticketType?: string;
    customerName?: string;
    message: string;
  } | null>(null);

  // Auth gate check
  React.useEffect(() => {
    if (!authLoading && user && user.role !== 'gate' && user.role !== 'admin') {
      router.push('/unauthorized');
    }
  }, [user, authLoading, router]);

  // Load exhibitions
  const loadExhibitions = React.useCallback(async () => {
    try {
      setDataLoading(true);
      const res = await fetch('/api/dashboard/gate');
      if (res.ok) {
        const body = await res.json();
        if (body.success) {
          const exhs = body.data.activeExhibitions || [];
          setActiveExhibitions(exhs);
          if (exhs.length > 0) {
            setSelectedExhId(exhs[0].id);
          }
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
      loadExhibitions();
    }
  }, [user, loadExhibitions]);

  const handleScan = async (payload: string, isFake = false) => {
    if (!selectedExhId) {
      addToast({ type: 'warning', title: 'Scope Required', message: 'Please select an exhibition scope.' });
      return;
    }

    setIsProcessing(true);
    setOutcome(null);

    try {
      const payloadToSend = isFake ? 'tampered-fake-signature-token-payload' : payload;
      
      const res = await fetch('/api/tickets/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          qrPayload: payloadToSend,
          exhibitionId: selectedExhId,
          gateId: 'fullscreen-terminal',
        }),
      });

      const body = await res.json();
      if (res.ok && body.success) {
        const data = body.data;
        
        setOutcome({
          valid: data.valid,
          result: data.result,
          ticketNumber: data.ticket?.ticketNumber || 'UNKNOWN',
          ticketType: data.ticket?.ticketType,
          customerName: data.ticket?.customerName,
          message: data.message,
        });

        // Trigger notification sound / haptic feedback
        if (data.valid) {
          try {
            // Web Audio API success ping
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            osc.frequency.setValueAtTime(520, ctx.currentTime); // high pitched clean frequency
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
          } catch {}
        } else {
          try {
            // Error buzz
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            osc.frequency.setValueAtTime(120, ctx.currentTime); // low buzz
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
          } catch {}
        }
      } else {
        addToast({
          type: 'error',
          title: 'System Error',
          message: body.error?.message || 'Error executing ticket validation.',
        });
      }
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'Network Failure', message: 'Failed to communicate with validator.' });
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

  // Active config outcome settings mapping
  const overlayMap: Record<
    string,
    {
      title: string;
      colorClass: string;
      icon: React.ReactNode;
    }
  > = {
    admitted: {
      title: 'ENTRY ADMITTED',
      colorClass: 'bg-success/95 border-success text-white',
      icon: <CheckCircle2 size={72} className="animate-bounce" />,
    },
    rejected_used: {
      title: 'DUPLICATE ATTEMPT',
      colorClass: 'bg-warning/95 border-warning text-white',
      icon: <AlertOctagon size={72} className="animate-pulse" />,
    },
    rejected_invalid: {
      title: 'INVALID CREDENTIAL',
      colorClass: 'bg-error/95 border-error text-white',
      icon: <X size={72} className="animate-pulse" />,
    },
    rejected_expired: {
      title: 'EXPIRED PASS',
      colorClass: 'bg-gray-850/95 border-gray-700 text-white',
      icon: <X size={72} />,
    },
    rejected_wrong_exhibition: {
      title: 'WRONG EXHIBITION',
      colorClass: 'bg-error/95 border-error text-white',
      icon: <AlertOctagon size={72} />,
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
        <div className="flex-1">
          <select
            value={selectedExhId}
            onChange={(e) => setSelectedExhId(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 text-xs text-gray-200 font-bold p-3 rounded-lg focus:outline-none cursor-pointer"
            disabled={isProcessing}
          >
            {activeExhibitions.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push('/gate')}
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

      {/* Subtle Bottom Instruction */}
      <div className="text-center mb-4 select-none">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
          Entry Checkpoint Terminal
        </span>
        <span className="text-xs text-gray-400 mt-1 block">
          Align ticket QR code within scanner boundaries.
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
              {outcome.ticketType && (
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-white/60">Type</span>
                  <span className="font-extrabold capitalize">{outcome.ticketType}</span>
                </div>
              )}
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
