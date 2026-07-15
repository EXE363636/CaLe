/**
 * Cluster 1 · Task 1 — EXPLORATION (bug-condition) test.
 *
 * Property 1 (Bug Condition) — "Attendance CTA respects 'both confirmed
 * present'".
 *
 * Validates: Requirements 1.1, 2.1
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS TEST ENCODES
 * ---------------------------------------------------------------------------
 * For an employer-viewed (application, shift, now) triple whose canonical
 * attendance state is `BothConfirmedPresent` (worker tapped "Tôi đã có mặt"
 * AND employer tapped "Xác nhận có mặt"), the employer shift-detail action
 * row must render ONLY the waiting-for-checkout banner
 * ("Hai bên đã xác nhận có mặt…") and MUST NOT render a
 * "Đánh dấu vắng mặt" (mark-absent) CTA.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS EXPECTED TO FAIL ON THE CURRENT (UNFIXED) CODE
 * ---------------------------------------------------------------------------
 * `ManageShiftContent` computes the action row's `absentDisabledReason` from
 * a predicate that ignores the canonical attendance state:
 *
 *     absentDisabledReason =
 *       !shiftTerminal && app.status === 'CheckedIn' && Boolean(app.checkInAt)
 *
 * That predicate is `true` for `BothConfirmedPresent`, so the row renders a
 * disabled red "Đánh dấu vắng mặt" button via the `absentDisabledReason`
 * branch even though both sides already confirmed presence. This test is a
 * bug-condition probe: its FAILURE proves the defect exists. It is NOT
 * fixed here — the SAME test later validates the fix (task 5).
 *
 * The test reuses the canonical `deriveAttendanceState` (the app's single
 * source of truth) to build / verify the `BothConfirmedPresent` inputs, and
 * renders the real page so it exercises the actual `absentDisabledReason`
 * computation the fix will change.
 *
 * NOTE ON TIME: the page reads the real wall clock (`new Date()`) and cannot
 * be handed an injected "now"; faking `Date` breaks React's scheduler (the
 * Suspense retry for `use(params)` never commits). So instead the shift
 * window is built AROUND the real current time — `endTime` is parsed on its
 * own calendar date so `end > now` holds regardless of timezone / midnight.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { createElement, Suspense } from 'react';
import fc from 'fast-check';

import { deriveAttendanceState } from '@/domain/attendanceState';
import { useAuthStore } from '@/stores/authStore';
import { useUserStore } from '@/stores/userStore';
import { useShiftStore } from '@/stores/shiftStore';
import { useApplicationStore } from '@/stores/applicationStore';
import { useHydrationStore } from '@/stores/hydrationStore';
import EmployerShiftDetailPage from '@/app/employer/shifts/[id]/page';
import type { Application, Employer, Shift, Worker } from '@/types';

// The employer shift-detail page (and RoleGuard) reach for the Next.js
// router / notFound. Provide inert stand-ins so the client component renders
// under jsdom. `notFound` throws loudly so a mis-seeded fixture surfaces as a
// clear error rather than a silent empty render.
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/employer/shifts/shift-cta',
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('notFound() was called — fixture seeding is wrong');
  },
  redirect: vi.fn(),
}));

// The page mounts a one-shot lifecycle sync on load. It is irrelevant to the
// attendance-CTA gating under test and would only add nondeterministic store
// mutation, so it is neutralised here.
vi.mock('@/lib/useLifecycleSync', () => ({
  useLifecycleSync: () => {},
}));

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MARK_ABSENT_CTA = 'Đánh dấu vắng mặt';
const BOTH_CONFIRMED_BANNER = /Hai bên đã xác nhận có mặt/;

const EMPLOYER_ID = 'emp-cta';
const WORKER_ID = 'wrk-cta';
const SHIFT_ID = 'shift-cta';

// ---------------------------------------------------------------------------
// Local wall-clock helpers (the page parses shift date/time in local time)
// ---------------------------------------------------------------------------

const pad2 = (n: number): string => String(n).padStart(2, '0');
const localDate = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const localHHMM = (d: Date): string => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function mkEmployer(): Employer {
  return {
    id: EMPLOYER_ID,
    role: 'employer',
    email: 'employer@cta.vn',
    phone: '+84900000001',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2020-01-01T00:00:00.000Z',
    companyName: 'CTA Co.',
    businessType: 'F&B',
    verifiedBusiness: true,
    boostCredits: 0,
  };
}

function mkWorker(): Worker {
  return {
    id: WORKER_ID,
    role: 'worker',
    email: 'worker@cta.vn',
    phone: '+84900000002',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2020-01-01T00:00:00.000Z',
    fullName: 'Nguyễn Văn CTA',
    skills: [],
    preferredJobTypes: [],
    preferredLocations: [],
    verifications: ['phone'],
    reputationScore: 80,
    completedShiftCount: 0,
    ratingsReceived: [],
    cancellationHistory: [],
    noShowCount: 0,
  };
}

/**
 * A shift whose window straddles the real "now": it started `startAgoMin`
 * minutes ago and ends `endInMin` minutes from now. `date`/`endTime` are
 * derived from the END instant so `end > now` holds even across midnight.
 */
function mkShiftAroundNow(startAgoMin = 60, endInMin = 60): Shift {
  const now = Date.now();
  const start = new Date(now - startAgoMin * 60_000);
  const end = new Date(now + endInMin * 60_000);
  return {
    id: SHIFT_ID,
    employerId: EMPLOYER_ID,
    title: 'Ca phục vụ trưa',
    description: '',
    requirements: '',
    jobType: 'Phục vụ',
    location: 'Quận 1, TP.HCM',
    district: 'Quận 1, TP.HCM',
    date: localDate(end),
    startTime: localHHMM(start),
    endTime: localHHMM(end),
    hourlyWage: 50_000,
    positionsTotal: 2,
    positionsFilled: 1,
    // In-progress (NOT a terminal state), so the buggy `absentDisabledReason`
    // branch is live — `shiftTerminal` is false.
    status: 'InProgress',
    escrowStatus: 'InProgress',
    depositAmount: 200_000,
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
    evidenceRequirement: 'OptionalPhoto',
  };
}

/**
 * A worker who self-checked-in AND was marked present by the employer:
 * `deriveAttendanceState` → `BothConfirmedPresent` for any `now` inside the
 * shift window. Timestamps only need to be truthy for the state.
 */
function mkBothConfirmedApp(): Application {
  const stamp = new Date(Date.now() - 30 * 60_000).toISOString();
  return {
    id: 'app-cta',
    shiftId: SHIFT_ID,
    workerId: WORKER_ID,
    status: 'CheckedIn',
    appliedAt: '2020-01-01T00:00:00.000Z',
    approvedAt: '2020-01-01T01:00:00.000Z',
    checkInAt: stamp, // worker tapped "Tôi đã có mặt"
    markedPresentAt: stamp, // employer tapped "Xác nhận có mặt"
    payoutAmount: 200_000,
  };
}

// ---------------------------------------------------------------------------
// Store seeding / teardown
// ---------------------------------------------------------------------------

function seedStores(app: Application, shift: Shift): void {
  useHydrationStore.setState({ hydrated: true });
  useUserStore.setState({ users: [mkEmployer(), mkWorker()] });
  useAuthStore.setState({ currentUserId: EMPLOYER_ID, lastActivityAt: null });
  useShiftStore.setState({ shifts: [shift] });
  useApplicationStore.setState({ applications: [app], disputes: [] });
}

function resetStores(): void {
  useApplicationStore.setState({ applications: [], disputes: [] });
  useShiftStore.setState({ shifts: [] });
  useUserStore.setState({ users: [] });
  useAuthStore.setState({ currentUserId: null, lastActivityAt: null });
  useHydrationStore.setState({ hydrated: false });
}

async function renderEmployerDetailAtBothConfirmed(): Promise<void> {
  // Stable promise instance so React's `use(params)` tracks one thenable
  // across the suspend → resolve → retry cycle. The render is performed
  // INSIDE an awaited async `act` so React commits the resolved (un-
  // suspended) tree — a bare `render()` suspends in a sync act and never
  // flushes the `use(params)` retry.
  const params = Promise.resolve({ id: SHIFT_ID });
  await act(async () => {
    render(
      createElement(
        Suspense,
        { fallback: createElement('div', null, 'loading') },
        createElement(EmployerShiftDetailPage, { params }),
      ),
    );
    await params;
  });
  // Awaiting the banner proves we rendered the correct `BothConfirmedPresent`
  // action row before asserting on the (absence of the) mark-absent CTA.
  await screen.findByText(BOTH_CONFIRMED_BANNER);
}

afterEach(() => {
  cleanup();
  resetStores();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 1 (Bug Condition): attendance CTA under "both confirmed present"', () => {
  it('does NOT render a "Đánh dấu vắng mặt" CTA — only the waiting-for-checkout banner', async () => {
    const shift = mkShiftAroundNow();
    const app = mkBothConfirmedApp();

    // Precondition (reuses the canonical state machine): the triple is
    // genuinely `BothConfirmedPresent` at the real "now".
    expect(deriveAttendanceState(app, shift, new Date().toISOString())).toBe(
      'BothConfirmedPresent',
    );

    seedStores(app, shift);
    await renderEmployerDetailAtBothConfirmed();

    // EXPECTED (post-fix): no mark-absent CTA in this state.
    // CURRENT (unfixed): the disabled red "Đánh dấu vắng mặt" button renders
    // via the `absentDisabledReason` branch → this assertion FAILS, proving
    // the bug.
    expect(screen.queryAllByText(MARK_ABSENT_CTA)).toHaveLength(0);
  });

  it('property: no mark-absent CTA anywhere across the in-shift window', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Shift started 5–240 min ago and ends 5–240 min from now: every such
        // window keeps a both-stamped CheckedIn app in `BothConfirmedPresent`.
        fc.integer({ min: 5, max: 240 }),
        fc.integer({ min: 5, max: 240 }),
        async (startAgoMin, endInMin) => {
          const shift = mkShiftAroundNow(startAgoMin, endInMin);
          const app = mkBothConfirmedApp();

          // Only exercise inputs that are actually in the bug condition.
          if (
            deriveAttendanceState(app, shift, new Date().toISOString()) !==
            'BothConfirmedPresent'
          ) {
            return true;
          }

          seedStores(app, shift);
          await renderEmployerDetailAtBothConfirmed();

          const markAbsentCount = screen.queryAllByText(MARK_ABSENT_CTA).length;
          cleanup();
          resetStores();

          // Holds after the fix; FAILS now (count === 1) → counterexample.
          return markAbsentCount === 0;
        },
      ),
      { numRuns: 12 },
    );
  });
});
