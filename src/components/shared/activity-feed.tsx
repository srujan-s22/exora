import * as React from 'react';
import { Key, Ticket, ScanLine, UserPlus, Settings, BarChart2, HelpCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';

export interface ActivityItem {
  id: string;
  action: string;
  performedByName: string;
  performedByRole: string;
  details?: string;
  timestamp: Date;
}

export interface ActivityFeedProps {
  items: ActivityItem[];
  title?: string;
  className?: string;
}

export function ActivityFeed({ items, title = 'Recent Operations Activity', className = '' }: ActivityFeedProps) {
  
  // Resolve action icon types
  const getActionIcon = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('login') || act.includes('logout')) return <Key size={14} className="text-info" />;
    if (act.includes('ticket.create') || act.includes('sale.')) return <Ticket size={14} className="text-success" />;
    if (act.includes('scan')) return <ScanLine size={14} className="text-accent-400" />;
    if (act.includes('user.create') || act.includes('staff.')) return <UserPlus size={14} className="text-accent-300" />;
    if (act.includes('settings')) return <Settings size={14} className="text-gray-400" />;
    if (act.includes('exhibition.')) return <BarChart2 size={14} className="text-warning" />;
    return <HelpCircle size={14} className="text-gray-500" />;
  };

  const getElapsedTime = (date: Date) => {
    const elapsed = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="py-4">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-gray-400 select-none">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500 select-none">
            No recent logs to display.
          </div>
        ) : (
          <ul className="divide-y divide-gray-850">
            {items.map((item) => (
              <li key={item.id} className="p-4.5 flex gap-3.5 hover:bg-gray-850/20 transition-colors">
                
                {/* Event Icon Frame */}
                <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-lg bg-gray-800 border border-gray-700/50">
                  {getActionIcon(item.action)}
                </div>

                {/* Event Message */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs text-gray-250 leading-relaxed">
                    <span className="font-bold text-gray-50">{item.performedByName}</span>{' '}
                    <span className="text-[10px] uppercase font-bold text-accent-400 bg-accent-500/5 border border-accent-500/10 px-1 py-0.5 rounded mr-1">
                      {item.performedByRole}
                    </span>
                    <span className="text-gray-300">{item.details}</span>
                  </p>
                  
                  {/* Metadata line */}
                  <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 select-none pt-0.5">
                    <span>Action: {item.action}</span>
                    <span>{getElapsedTime(item.timestamp)}</span>
                  </div>
                </div>

              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
