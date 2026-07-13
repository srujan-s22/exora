import * as React from 'react';
import { Mail, Shield, User, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { StatusIndicator } from './status-indicator';

export interface StaffCardProps {
  id: string;
  staffId: string;
  name: string;
  email?: string;
  role: string;
  isActive: boolean;
  assignedExhibitionsCount?: number;
}

export function StaffCard({
  id,
  staffId,
  name,
  email,
  role,
  isActive,
  assignedExhibitionsCount = 0,
}: StaffCardProps) {
  return (
    <Card className="overflow-hidden group hover:border-gray-650 transition-all">
      <CardContent className="p-0">
        <Link href={`/admin/staff/${id}`} className="block p-5 space-y-4">
          
          {/* Avatar and header */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-accent-500/10 text-accent-300 font-bold border border-accent-600/30 flex items-center justify-center text-xs rounded-lg uppercase select-none">
              {name.slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-gray-50 truncate group-hover:text-accent-300 transition-colors">
                {name}
              </h4>
              <span className="text-[10px] text-gray-500 font-mono tracking-wide">
                Ref: {staffId}
              </span>
            </div>
            <StatusIndicator status={isActive ? 'active' : 'false'} className="shrink-0 select-none scale-90 origin-right" />
          </div>

          {/* Details */}
          <div className="space-y-1.5 text-xs">
            {email && (
              <div className="flex items-center gap-2 text-gray-400">
                <Mail size={12} className="text-gray-500 shrink-0" />
                <span className="truncate">{email}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-400">
              <Shield size={12} className="text-gray-500 shrink-0" />
              <span className="capitalize">{role} Staff</span>
            </div>
          </div>

          <div className="border-t border-gray-850 pt-3 flex items-center justify-between text-xs text-gray-500">
            <span>
              Assigned: <span className="font-semibold text-gray-300">{assignedExhibitionsCount} Exhib.</span>
            </span>
            <span className="text-gray-500 group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all">
              <ChevronRight size={15} />
            </span>
          </div>

        </Link>
      </CardContent>
    </Card>
  );
}
