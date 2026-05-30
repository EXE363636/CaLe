export type UserRole = 'worker' | 'employer' | 'admin';

export type ShiftStatus =
  | 'recruiting'
  | 'starting_soon'
  | 'in_progress'
  | 'pending_checkout'
  | 'pending_confirmation'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'disputed';

export type ApplicationStatus =
  | 'applied'
  | 'approved'
  | 'rejected'
  | 'pending'
  | 'checked_in'
  | 'confirmed_present'
  | 'waiting_checkout'
  | 'waiting_completion'
  | 'absent'
  | 'completed_worker';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  reputationScore: number;
  verified: boolean;
  createdAt: string;
}

export interface Worker extends User {
  role: 'worker';
  skills: Skill[];
  completedShifts: number;
  rating: number;
  walletBalance: number;
  absences: number;
  disputes: number;
}

export interface Employer extends User {
  role: 'employer';
  businessName: string;
  businessAddress: string;
  businessType: string;
  completedShifts: number;
  rating: number;
  walletBalance: number;
  verificationStatus: 'pending' | 'verified' | 'rejected';
}

export interface Skill {
  id: string;
  name: string;
  level: number;
  xp: number;
  maxXP: number;
  hint: string;
}

export interface Shift {
  id: string;
  title: string;
  employerId: string;
  employer: Employer;
  location: string;
  date: string;
  startTime: string;
  endTime: string;
  hourlyWage: number;
  requiredWorkers: number;
  currentApplicants: number;
  approvedWorkers: number;
  status: ShiftStatus;
  jobType: string;
  description: string;
  requirements: string[];
  contactPerson: string;
  contactPhone: string;
  workplaceNote?: string;
  depositAmount: number;
  depositStatus: 'pending' | 'paid' | 'refunded' | 'disputed';
  createdAt: string;
  tasks?: string[];
  evidenceRequired?: 'none' | 'checklist' | 'photo' | 'both';
}

export interface Application {
  id: string;
  shiftId: string;
  shift: Shift;
  workerId: string;
  worker: Worker;
  status: ApplicationStatus;
  appliedAt: string;
  checkInTime?: string;
  checkOutTime?: string;
  employerConfirmed?: boolean;
}

export interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string;
  targetId: string;
  rating: number;
  comment: string;
  shiftId: string;
  shiftTitle: string;
  createdAt: string;
  reported: boolean;
  reportReason?: string;
}

export interface Transaction {
  id: string;
  type: 'deposit_topup' | 'deposit' | 'withdraw' | 'wage' | 'deposit_refund' | 'refund';
  amount: number;
  shiftId?: string;
  shiftTitle?: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: NotificationType;
  shiftId?: string;
  shiftTitle?: string;
  timestamp: string;
  read: boolean;
}

export type NotificationType =
  | 'new_application'
  | 'application_approved'
  | 'application_rejected'
  | 'shift_starting_soon'
  | 'shift_started'
  | 'shift_ended'
  | 'worker_checked_in'
  | 'worker_checked_out'
  | 'employer_confirmed'
  | 'deposit_success'
  | 'deposit_refund'
  | 'wallet_topup'
  | 'wallet_withdraw'
  | 'new_dispute'
  | 'new_review'
  | 'shift_reminder';

export interface Dispute {
  id: string;
  shiftId: string;
  shift: Shift;
  workerId: string;
  worker: Worker;
  employerId: string;
  employer: Employer;
  reason: string;
  amount: number;
  status: 'open' | 'worker_responded' | 'employer_responded' | 'resolved';
  workerEvidence?: string;
  employerEvidence?: string;
  createdAt: string;
  resolution?: 'worker' | 'employer' | 'split';
  adminNotes?: string;
}

export interface Wallet {
  balance: number;
  pendingAmount: number;
  transactions: Transaction[];
}

export interface ReputationChange {
  id: string;
  points: number;
  reason: string;
  shiftId?: string;
  shiftTitle?: string;
  timestamp: string;
}

export interface CalendarEvent {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'available' | 'busy' | 'shift_approved' | 'shift_pending';
  shiftId?: string;
  shift?: Shift;
}

export interface ScheduleTimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  type: 'available' | 'busy';
}

// Status badge mapping type
export interface StatusBadgeConfig {
  label: string;
  color: 'blue' | 'orange' | 'green' | 'amber' | 'red' | 'gray';
}
