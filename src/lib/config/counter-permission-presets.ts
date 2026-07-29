import type { UserPermissionKey } from './roles';

export interface CounterPreset {
  id: string;
  label: string;
  description: string;
  permissions: Partial<Record<UserPermissionKey, boolean>>;
}

export const COUNTER_PERMISSION_PRESETS: CounterPreset[] = [
  {
    id: 'entry_counter',
    label: 'Entry Counter',
    description: 'Entry ticket sales, history, reprinting, and cancellations only.',
    permissions: {
      canSellEntryTickets: true,
      canViewEntrySales: true,
      canReprintEntryTickets: true,
      canCancelEntryTickets: true,
      canSellRideTickets: false,
      canViewRideSales: false,
      canReprintRideTickets: false,
      canCancelRideTickets: false,
    },
  },
  {
    id: 'ride_counter',
    label: 'Ride Counter',
    description: 'Ride ticket sales, history, reprinting, and cancellations only.',
    permissions: {
      canSellEntryTickets: false,
      canViewEntrySales: false,
      canReprintEntryTickets: false,
      canCancelEntryTickets: false,
      canSellRideTickets: true,
      canViewRideSales: true,
      canReprintRideTickets: true,
      canCancelRideTickets: true,
    },
  },
  {
    id: 'full_counter',
    label: 'Full Counter (All Permissions)',
    description: 'Full access to both Entry ticket and Ride ticket operations.',
    permissions: {
      canSellEntryTickets: true,
      canViewEntrySales: true,
      canReprintEntryTickets: true,
      canCancelEntryTickets: true,
      canSellRideTickets: true,
      canViewRideSales: true,
      canReprintRideTickets: true,
      canCancelRideTickets: true,
    },
  },
  {
    id: 'custom',
    label: 'Custom Configuration',
    description: 'Manually configure individual permissions.',
    permissions: {},
  },
];
