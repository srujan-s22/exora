import type { UserRoleType, UserPermissionKey } from '@/lib/config/roles';

export interface Staff {
  id: string;
  staffId: string;
  name: string;
  phoneNumber: string;
  email?: string;
  role: UserRoleType;
  permissions?: Record<UserPermissionKey, boolean>;
  assignedExhibitions: string[];
  exhibitionAccessMode?: 'GENERAL' | 'SELECTED';
  isActive: boolean;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStaffInput {
  name: string;
  phoneNumber: string;
  email?: string;
  role: UserRoleType;
  password: string;
  permissions?: Partial<Record<UserPermissionKey, boolean>>;
  assignedExhibitions?: string[];
  exhibitionAccessMode?: 'GENERAL' | 'SELECTED';
  superAdminSecret?: string;
}

export interface UpdateStaffInput {
  name?: string;
  phoneNumber?: string;
  email?: string;
  role?: UserRoleType;
  password?: string;
  permissions?: Partial<Record<UserPermissionKey, boolean>>;
  assignedExhibitions?: string[];
  exhibitionAccessMode?: 'GENERAL' | 'SELECTED';
  isActive?: boolean;
  superAdminSecret?: string;
}
