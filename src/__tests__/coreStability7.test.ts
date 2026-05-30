/**
 * CORE-STABILITY-7 — unit guards for:
 *   Part 1: notification deeplink resolver + dedup
 *   Part 3: initials helper (avatar consistency)
 *   Part 4: numeric-field input sanitizers (phone / digits)
 *   Part 5: attendance absent→present reversal (revertNoShowToPresent)
 *   Part 6: review-report store
 *
 * Deterministic store/domain tests; no React, no timers.
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { getUserInitials } from '@/lib/initials';
import {
  sanitizePhoneInput,
  digitsOnly,
  containsLetters,
  isValidVNPhone,
} from '@/lib/validate';
import {
  resolveNotificationTarget,
  walletHistoryLink,
  shiftLink,
} from '@/lib/notificationTarget';
import { useNotificationStore } from '@/stores/notificationStore';
import { useReviewReportStore } from '@/stores/reviewReportStore';
import { useUserStore } from '@/stores/userStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useWalletStore } from '@/stores/walletStore';
import type { Application, Employer, Shift, Worker } from '@/types';

// ---------------------------------------------------------------------------
// Part 3 — initials helper
// ---------------------------------------------------------------------------

describe('getUserInitials — global initials rule (Part 3)', () => {
  it('takes the first letter of the first two words, uppercased', () => {
    expect(getUserInitials('Quán Phở Hà')).toBe('QP');
    expect(getUserInitials('Nguyễn Văn An')).toBe('NV');
    expect(getUserInitials('Trần Bình')).toBe('TB');
  });

  it('returns a single letter for a single-word name', () => {
    expect(getUserInitials('Madonna')).toBe('M');
  });

  it('falls back to ? for empty / whitespace', () => {
    expect(getUserInitials('')).toBe('?');
    expect(getUserInitials('   ')).toBe('?');
  });

  it('collapses repeated whitespace', () => {
    expect(getUserInitials('  Quán   Phở   Hà ')).toBe('QP');
  });

  it('is stable (same input → same output) for long names', () => {
    const name = 'Công Ty Trách Nhiệm Hữu Hạn ABC';
    expect(getUserInitials(name)).toBe(getUserInitials(name));
    expect(getUserInitials(name)).toBe('CT');
  });
});

// ---------------------------------------------------------------------------
// Part 4 — numeric-field sanitizers
// ---------------------------------------------------------------------------

describe('numeric-field sanitizers (Part 4)', () => {
  it('sanitizePhoneInput strips letters but keeps digits/spaces/dashes', () => {
    expect(sanitizePhoneInput('abc0901')).toBe('0901');
    expect(sanitizePhoneInput('09a0b1')).toBe('0901');
    expect(sanitizePhoneInput('090 123 4567')).toBe('090 123 4567');
    expect(sanitizePhoneInput('090-123-4567')).toBe('090-123-4567');
  });

  it('sanitizePhoneInput keeps a single leading + (intl prefix)', () => {
    expect(sanitizePhoneInput('+84 90')).toBe('+84 90');
    // A non-leading + is dropped.
    expect(sanitizePhoneInput('84+90')).toBe('8490');
  });

  it('digitsOnly removes everything but digits', () => {
    expect(digitsOnly('12a3')).toBe('123');
    expect(digitsOnly('abc')).toBe('');
    expect(digitsOnly('1.000.000')).toBe('1000000');
  });

  it('containsLetters detects textual input', () => {
    expect(containsLetters('0901abc')).toBe(true);
    expect(containsLetters('0901234567')).toBe(false);
    expect(containsLetters('abc')).toBe(true);
  });

  it('isValidVNPhone rejects a phone that still contains letters', () => {
    // A digits-only valid phone passes; one with letters fails.
    expect(isValidVNPhone('0901234567').ok).toBe(true);
    expect(isValidVNPhone('09012abc').ok).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Part 1 — notification deeplink resolver
// ---------------------------------------------------------------------------

describe('resolveNotificationTarget (Part 1)', () => {
  it('routes wallet top-up / withdrawal to the recipient wallet history', () => {
    expect(
      resolveNotificationTarget({ kind: 'UserTopUp' }, 'worker'),
    ).toBe('/worker/dashboard?modal=wallet');
    expect(
      resolveNotificationTarget({ kind: 'UserWithdrawal' }, 'employer'),
    ).toBe('/employer/dashboard?modal=wallet');
  });

  it('an explicit link always wins over the resolver', () => {
    expect(
      resolveNotificationTarget(
        { kind: 'UserTopUp', link: '/custom/path' },
        'worker',
      ),
    ).toBe('/custom/path');
  });

  it('wage release → worker wallet history, employer → shift detail', () => {
    expect(
      resolveNotificationTarget(
        { kind: 'AutoReleaseSettled', shiftId: 's1' },
        'worker',
      ),
    ).toBe('/worker/dashboard?modal=wallet');
    expect(
      resolveNotificationTarget(
        { kind: 'AutoReleaseSettled', shiftId: 's1' },
        'employer',
      ),
    ).toBe('/employer/shifts/s1');
  });

  it('walletHistoryLink picks the right dashboard per role', () => {
    expect(walletHistoryLink('worker')).toBe('/worker/dashboard?modal=wallet');
    expect(walletHistoryLink('employer')).toBe(
      '/employer/dashboard?modal=wallet',
    );
  });

  it('shiftLink returns undefined without a shift id', () => {
    expect(shiftLink('worker', undefined)).toBeUndefined();
    expect(shiftLink('worker', 's9')).toBe('/shifts/s9');
    expect(shiftLink('employer', 's9')).toBe('/employer/shifts/s9');
  });
});

// ---------------------------------------------------------------------------
// Part 1 — notification dedup (re-affirm the CS6 behavior with wallet keys)
// ---------------------------------------------------------------------------

describe('notification dedup with wallet keys (Part 1)', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] });
  });

  it('does not duplicate a wallet top-up notification with the same dedupeKey', () => {
    const a = useNotificationStore.getState().push({
      userId: 'u1',
      kind: 'UserTopUp',
      title: 'Nạp tiền vào ví',
      body: '+100.000 đ',
      link: '/worker/dashboard?modal=wallet',
      dedupeKey: 'UserTopUp:entry-1',
    });
    const b = useNotificationStore.getState().push({
      userId: 'u1',
      kind: 'UserTopUp',
      title: 'Nạp tiền vào ví',
      body: '+100.000 đ',
      link: '/worker/dashboard?modal=wallet',
      dedupeKey: 'UserTopUp:entry-1',
    });
    expect(b.id).toBe(a.id);
    expect(useNotificationStore.getState().notifications.length).toBe(1);
  });

  it('two different shifts ending produce two distinct end notifications', () => {
    useNotificationStore.getState().push({
      userId: 'u1',
      kind: 'ShiftEnded',
      title: 'Ca làm đã kết thúc',
      body: 'shift A',
      dedupeKey: 'ShiftEnded:appA',
    });
    useNotificationStore.getState().push({
      userId: 'u1',
      kind: 'ShiftEnded',
      title: 'Ca làm đã kết thúc',
      body: 'shift B',
      dedupeKey: 'ShiftEnded:appB',
    });
    const ended = useNotificationStore
      .getState()
      .notifications.filter((n) => n.kind === 'ShiftEnded');
    expect(ended.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Part 6 — review-report store
// ---------------------------------------------------------------------------

describe('reviewReportStore (Part 6)', () => {
  beforeEach(() => {
    useReviewReportStore.setState({ reports: [] });
    useNotificationStore.setState({ notifications: [] });
    // Seed one admin so notifyAdmins has a recipient.
    useUserStore.setState({
      users: [
        {
          id: 'admin-1',
          role: 'admin',
          email: 'a@x.vn',
          phone: '0900000000',
          passwordHash: 'mock-hash:demo',
          suspended: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          fullName: 'Admin One',
        },
      ] as never,
    });
  });

  it('requires a non-empty reason', () => {
    const r = useReviewReportStore.getState().submit({
      targetKind: 'employerFeedback',
      targetReviewId: 'rev-1',
      reportedByUserId: 'worker-1',
      reason: '   ',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('REASON_REQUIRED');
  });

  it('creates a report, marks the review reported, and notifies admins', () => {
    const r = useReviewReportStore.getState().submit({
      targetKind: 'employerFeedback',
      targetReviewId: 'rev-1',
      reportedByUserId: 'worker-1',
      reason: 'Nội dung sai sự thật',
    });
    expect(r.ok).toBe(true);
    expect(useReviewReportStore.getState().isReported('rev-1')).toBe(true);
    const adminNotifs = useNotificationStore
      .getState()
      .notifications.filter((n) => n.kind === 'ReviewReported');
    expect(adminNotifs.length).toBe(1);
    expect(adminNotifs[0].userId).toBe('admin-1');
  });

  it('does NOT auto-delete the review (report is a separate record)', () => {
    useReviewReportStore.getState().submit({
      targetKind: 'employerFeedback',
      targetReviewId: 'rev-2',
      reportedByUserId: 'worker-1',
      reason: 'spam',
    });
    // The report store never touches feedback; only records the report.
    expect(useReviewReportStore.getState().forReview('rev-2').length).toBe(1);
  });

  it('blocks a duplicate open report from the same reporter', () => {
    const first = useReviewReportStore.getState().submit({
      targetKind: 'employerFeedback',
      targetReviewId: 'rev-3',
      reportedByUserId: 'worker-1',
      reason: 'spam',
    });
    expect(first.ok).toBe(true);
    const second = useReviewReportStore.getState().submit({
      targetKind: 'employerFeedback',
      targetReviewId: 'rev-3',
      reportedByUserId: 'worker-1',
      reason: 'spam again',
    });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe('ALREADY_REPORTED');
  });

  it('admin resolve clears the open flag', () => {
    const r = useReviewReportStore.getState().submit({
      targetKind: 'employerFeedback',
      targetReviewId: 'rev-4',
      reportedByUserId: 'worker-1',
      reason: 'spam',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      useReviewReportStore.getState().resolve(r.value.id, 'Reviewed');
    }
    expect(useReviewReportStore.getState().isReported('rev-4')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Part 5 — attendance absent→present reversal (late arrival)
// ---------------------------------------------------------------------------

const A_ISO = '2030-06-02T00:00:00.000Z';

function mkShift(over: Partial<Shift> = {}): Shift {
  return {
    id: 's-att',
    employerId: 'emp-att',
    title: 'Phục vụ',
    description: '',
    requirements: '',
    jobType: 'Phục vụ',
    location: 'TP.HCM',
    date: '2030-06-02',
    startTime: '08:00',
    endTime: '12:00',
    hourlyWage: 50_000,
    positionsTotal: 2,
    positionsFilled: 1,
    status: 'InProgress',
    escrowStatus: 'Deposited',
    depositAmount: 200_000,
    createdAt: A_ISO,
    updatedAt: A_ISO,
    evidenceRequirement: 'OptionalPhoto',
    timeline: [],
    ...over,
  };
}

function mkWorker(id: string, over: Partial<Worker> = {}): Worker {
  return {
    id,
    role: 'worker',
    email: `${id}@x.vn`,
    phone: '+84900000000',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: A_ISO,
    fullName: id,
    skills: [],
    preferredJobTypes: [],
    preferredLocations: [],
    verifications: ['phone'],
    reputationScore: 80,
    completedShiftCount: 0,
    ratingsReceived: [],
    cancellationHistory: [],
    noShowCount: 0,
    ...over,
  };
}

function mkEmployer(over: Partial<Employer> = {}): Employer {
  return {
    id: 'emp-att',
    role: 'employer',
    email: 'emp@x.vn',
    phone: '+84902000000',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: A_ISO,
    companyName: 'Quán Att',
    businessType: 'Nhà hàng',
    verifiedBusiness: false,
    boostCredits: 0,
    employerType10A: 'HouseholdBusiness',
    ...over,
  };
}

function mkApp(over: Partial<Application> = {}): Application {
  return {
    id: 'app-att',
    shiftId: 's-att',
    workerId: 'w-att',
    status: 'NoShow',
    appliedAt: A_ISO,
    approvedAt: A_ISO,
    payoutAmount: 200_000,
    ...over,
  };
}

describe('revertNoShowToPresent (Part 5.4)', () => {
  beforeEach(() => {
    useShiftStore.setState({ shifts: [mkShift()], lastLifecycleSyncAt: null });
    useApplicationStore.setState({
      applications: [mkApp()],
      ratings: [],
      disputes: [],
    });
    useUserStore.setState({
      users: [mkEmployer({ boostCredits: 1 }), mkWorker('w-att', { noShowCount: 1, reputationScore: 60 })],
    });
    useNotificationStore.setState({ notifications: [] });
    useWalletStore.setState({ wallets: [], ledger: [] });
  });

  it('requires a non-empty reason', () => {
    const r = useApplicationStore.getState().revertNoShowToPresent('app-att', '  ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('REASON_REQUIRED');
  });

  it('reverts NoShow → CheckedIn, restores reputation +20, decrements noShowCount, reclaims boost', () => {
    const r = useApplicationStore
      .getState()
      .revertNoShowToPresent('app-att', 'Đến muộn 20 phút');
    expect(r.ok).toBe(true);
    const app = useApplicationStore.getState().getById('app-att');
    expect(app?.status).toBe('CheckedIn');
    expect(app?.markedPresentAt).toBeDefined?.();

    const worker = useUserStore.getState().findById('w-att') as Worker;
    expect(worker.reputationScore).toBe(80); // 60 + 20
    expect(worker.noShowCount).toBe(0);

    const employer = useUserStore.getState().findById('emp-att') as Employer;
    expect(employer.boostCredits).toBe(0); // reclaimed from 1

    // Escrow restored to InProgress, shift InProgress.
    const shift = useShiftStore.getState().getById('s-att');
    expect(shift?.escrowStatus).toBe('InProgress');
    expect(shift?.status).toBe('InProgress');

    // Worker notified, timeline logged.
    const notif = useNotificationStore
      .getState()
      .notifications.find((n) => n.userId === 'w-att');
    expect(notif).toBeDefined();
    const kinds = (shift?.timeline ?? []).map((tl) => tl.kind);
    expect(kinds).toContain('EmployerMarkedPresent');
  });

  it('is blocked with DISPUTE_OPEN when an open dispute exists', () => {
    useApplicationStore.setState({
      applications: [mkApp()],
      ratings: [],
      disputes: [
        {
          id: 'd1',
          shiftId: 's-att',
          applicationId: 'app-att',
          raisedBy: 'worker',
          reason: 'unfair',
          status: 'Open',
          createdAt: A_ISO,
        },
      ],
    });
    const r = useApplicationStore
      .getState()
      .revertNoShowToPresent('app-att', 'Đến muộn');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('DISPUTE_OPEN');
  });

  it('rejects when the application is not NoShow', () => {
    useApplicationStore.setState({
      applications: [mkApp({ status: 'CheckedIn' })],
      ratings: [],
      disputes: [],
    });
    const r = useApplicationStore
      .getState()
      .revertNoShowToPresent('app-att', 'reason');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe('WRONG_STATUS');
  });
});
