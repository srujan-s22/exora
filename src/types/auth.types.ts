import type { UserRoleType, UserPermissionKey } from '@/lib/config/roles';

export interface JwtPayload {
  sub: string;
  staffId: string;
  role: UserRoleType;
  permissions: Record<UserPermissionKey, boolean>;
  exhibitions: string[];
  exhibitionAccessMode?: 'GENERAL' | 'SELECTED';
  sid?: string;
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
  exhibitionAccessMode?: 'GENERAL' | 'SELECTED';
  isActive: boolean;
}

export interface SessionData {
  user: AuthUser;
  token: string;
  expiresAt: Date;
}

export interface DeviceSession {
  id: string;
  sessionId: string;
  userId: string;
  userName?: string;
  staffId?: string;
  role: string;
  deviceName: string;
  browserName: string;
  browserVersion: string;
  osName: string;
  osVersion: string;
  ipAddress?: string;
  userAgent?: string;
  locationLabel: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt?: string;
  revokedBy?: string;
  revokeReason?: string;
  isRevoked: boolean;
  isCurrentSession: boolean;
  loginMethod: string;
}
