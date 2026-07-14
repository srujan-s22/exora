export type PasswordResetStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface PasswordResetRequest {
  id: string;
  requestedBy: string;
  requestedByName?: string;
  requestedByStaffId?: string;
  targetUserId: string;
  targetStaffId: string;
  targetName?: string;
  targetPhoneNumber: string;
  status: PasswordResetStatus;
  approvedBy?: string;
  rejectedBy?: string;
  reason?: string;
  notes?: string;
  requestedAt: Date;
  actionTakenAt?: Date;
  completedAt?: Date;
}

export interface CreatePasswordResetInput {
  targetPhoneNumber: string;
}

export interface PasswordResetActionInput {
  action: 'approve' | 'reject';
  reason?: string;
}
