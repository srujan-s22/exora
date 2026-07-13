import type { UserRoleType } from '@/lib/config/roles';

export interface Staff {
  id: string;
  staffId: string;
  name: string;
  email?: string;
  role: UserRoleType;
  isSuperAdmin?: boolean;
  assignedExhibitions: string[];
  isActive: boolean;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStaffInput {
  name: string;
  email?: string;
  role: UserRoleType;
  password: string;
  assignedExhibitions?: string[];
}

export interface UpdateStaffInput {
  name?: string;
  email?: string;
  role?: UserRoleType;
  password?: string;
  assignedExhibitions?: string[];
  isActive?: boolean;
}
