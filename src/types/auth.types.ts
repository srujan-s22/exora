import type { UserRoleType } from '@/lib/config/roles';

export interface JwtPayload {
  sub: string;
  staffId: string;
  role: UserRoleType;
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
  isSuperAdmin: boolean;
  assignedExhibitions: string[];
  isActive: boolean;
}

export interface SessionData {
  user: AuthUser;
  token: string;
  expiresAt: Date;
}
