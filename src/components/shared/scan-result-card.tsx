'use client';

import * as React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw, AlertOctagon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import type { ScanResult } from '@/lib/utils/constants';

export interface ScanResultCardProps {
  result: ScanResult;
  ticketNumber?: string;
  ticketType?: string;
  customerName?: string;
  errorDetails?: string;
  scannedAt: Date;
  onReset: () => void;
}

export function ScanResultCard({
  result,
  ticketNumber = 'UNKNOWN',
  ticketType,
  customerName,
  errorDetails,
  scannedAt,
  onReset,
}: ScanResultCardProps) {
  
  const isAdmitted = result === 'admitted';

  // Config mapping for each scan outcome
  const config: Record<
    ScanResult,
    {
      title: string;
      desc: string;
      bgColor: string;
      borderColor: string;
      iconColor: string;
      icon: React.ReactNode;
      isShake: boolean;
    }
  > = {
    admitted: {
      title: 'ENTRY ADMITTED',
      desc: 'Ticket is valid. Proceed to entry.',
      bgColor: 'bg-success/5',
      borderColor: 'border-success/30',
      iconColor: 'text-success',
      icon: <CheckCircle2 size={48} className="animate-success-pulse rounded-full" />,
      isShake: false,
    },
    rejected_used: {
      title: 'DUPLICATE TICKET',
      desc: 'This ticket has already been scanned.',
      bgColor: 'bg-warning/5',
      borderColor: 'border-warning/30',
      iconColor: 'text-warning',
      icon: <AlertTriangle size={48} />,
      isShake: true,
    },
    rejected_invalid: {
      title: 'INVALID TICKET',
      desc: 'Ticket signature verification failed.',
      bgColor: 'bg-error/5',
      borderColor: 'border-error/30',
      iconColor: 'text-error',
      icon: <XCircle size={48} />,
      isShake: true,
    },
    rejected_expired: {
      title: 'EXPIRED TICKET',
      desc: 'This ticket is no longer active.',
      bgColor: 'bg-gray-800/20',
      borderColor: 'border-gray-700/50',
      iconColor: 'text-gray-400',
      icon: <Clock size={48} />,
      isShake: true,
    },
    rejected_wrong_exhibition: {
      title: 'WRONG EXHIBITION',
      desc: 'Ticket belongs to a different exhibition.',
      bgColor: 'bg-error/5',
      borderColor: 'border-error/30',
      iconColor: 'text-error',
      icon: <AlertOctagon size={48} />,
      isShake: true,
    },
    rejected_unknown: {
      title: 'UNRECOGNIZED QR',
      desc: 'Invalid payload structure. Forgery suspected.',
      bgColor: 'bg-error/5',
      borderColor: 'border-error/30',
      iconColor: 'text-error',
      icon: <AlertTriangle size={48} className="animate-pulse" />,
      isShake: true,
    },
  };

  const current = config[result];

  // Motion variants for shake vs pulse
  const variants: any = {
    initial: { scale: 0.96, opacity: 0 },
    animate: current.isShake
      ? {
          scale: 1,
          opacity: 1,
          x: [0, -10, 10, -10, 10, 0],
          transition: { duration: 0.45, ease: 'easeInOut' },
        }
      : {
          scale: 1,
          opacity: 1,
          transition: { type: 'spring', stiffness: 300, damping: 20 },
        },
  };

  return (
    <motion.div variants={variants} initial="initial" animate="animate" className="w-full max-w-md mx-auto">
      <Card className={`overflow-hidden border-2 ${current.bgColor} ${current.borderColor} shadow-lg rounded-xl`}>
        <CardContent className="p-8 flex flex-col items-center text-center space-y-6">
          
          {/* Big Status Icon */}
          <div className={`${current.iconColor} p-2 bg-gray-900/60 rounded-full border border-gray-800`}>
            {current.icon}
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className={`text-xl font-extrabold tracking-tight ${current.iconColor}`}>
              {current.title}
            </h2>
            <p className="text-sm text-gray-400 font-medium px-4">
              {errorDetails || current.desc}
            </p>
          </div>

          {/* Ticket Information Breakdown */}
          <div className="w-full bg-gray-950/60 rounded-lg p-4 border border-gray-800/60 divide-y divide-gray-800/40 text-left text-xs font-mono space-y-3">
            <div className="flex justify-between items-center pb-2.5">
              <span className="text-gray-500">Ticket Ref</span>
              <span className="font-semibold text-gray-200">{ticketNumber}</span>
            </div>
            
            {ticketType && (
              <div className="flex justify-between items-center py-2.5">
                <span className="text-gray-500">Type</span>
                <span className="font-semibold text-gray-200 capitalize">{ticketType}</span>
              </div>
            )}
            
            {customerName && (
              <div className="flex justify-between items-center py-2.5">
                <span className="text-gray-500">Customer</span>
                <span className="font-semibold text-gray-250 truncate max-w-[200px]">{customerName}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2.5">
              <span className="text-gray-500">Time Scanned</span>
              <span className="font-semibold text-gray-300">
                {new Intl.DateTimeFormat('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                }).format(scannedAt)}
              </span>
            </div>
          </div>

          {/* Action reset scanner */}
          <Button
            variant={isAdmitted ? 'primary' : 'danger'}
            size="md"
            onClick={onReset}
            leftIcon={<RefreshCw size={15} />}
            className="w-full font-semibold"
          >
            Ready for Next Scan
          </Button>

        </CardContent>
      </Card>
    </motion.div>
  );
}
