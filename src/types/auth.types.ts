import type { UserRoleType, UserPermissionKey } from '@/lib/config/roles';

export interface JwtPayload {
  sub: string;
  staffId: string;
  role: UserRoleType;
  permissions: Record<UserPermissionKey, boolean>;
  exhibitions: string[];
  iat: number;
  exp: number;
}

export interface LoginCredentials {
  staffId: string;
  password: string;
}

export interface AuthUser {
  id: string;
  staffId: string;
  name: string;
  role: UserRoleType;
  permissions: Record<UserPermissionKey, boolean>;
  assignedExhibitions: string[];
  isActive: boolean;
}

export interface SessionData {
  user: AuthUser;
  token: string;
  expiresAt: Date;
}
