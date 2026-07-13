/**
 * Shared UI component prop types.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'accent';

export type InputSize = 'sm' | 'md' | 'lg';

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
  className?: string;
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export interface ToastData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}
