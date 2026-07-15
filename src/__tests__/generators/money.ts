/**
 * Cluster 3 · Task 10 — generators + fixtures for the derived-money
 * EXPLORATION (bug-condition) test.
 *
 * Property 5 (Bug Condition) — "Money figures derived from one source".
 * Validates: Requirements 1.5, 2.5.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS MODULE EXISTS
 * ---------------------------------------------------------------------------
 * The derived-money property test needs a coherent "demo economy": an
 * employer's completed shifts plus the confirmed applications that filled
 * (some of) their positions, seeded so the REAL wallet ledger
 * (`walletStore.backfillFromHistory`) can be driven from the SAME confirmed
 * applications a worker dashboard would sum. This module builds those
 * fixtures and mirrors — verbatim — the two inline dashboard reductions the
 * pages use today, so the test can compare the three independent money
 * sources without importing the (not-yet-existing) `src/domain/finance.ts`.
 *
 * MONEY FORMULAS (grounded in product code):
 *   - `shift.depositAmount`         = calculateDeposit(wage, hours, positions)
 *                                   = wage × hours × positionsTotal   (deposit.ts)
 *   - `application.payoutAmount`    = wage × hours                     (one position)
 *                                   = calculateDeposit(wage, hours, 1)
 * So for a shift with N positions, `depositAmount === N × payoutAmount`.
 * A completed shift that filled only f of its p positions therefore has
 * `depositAmount` (p positions) STRICTLY GREATER than the wages actually
 * earned/released (f positions) whenever f < p — the seam this test exploits.
 */

import fc from 'fast-check';

import { calculateDeposit } from '@/domain/deposit';
import type { Application, Employer, Shift, Worker } from '@/types';

// ---------------------------------------------------------------------------
// Stable ids for the deterministic scenarios.
// ---------------------------------------------------------------------------

export const EMP_ID = 'emp-money';
export const WRK_ID = 'wrk-money';

// ---------------------------------------------------------------------------
// Fixture builders (minimal-but-valid domain records)
// ---------------------------------------------------------------------------

export function mkEmployer(over: Partial<Employer> = {}): Employer {
  return {
    id: EMP_ID,
    role: 'employer',
    email: 'employer@money.vn',
    phone: '+84900000010',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2020-01-01T00:00:00.000Z',
    companyName: 'Quán Demo',
    businessType: 'F&B',
    verifiedBusiness: true,
    boostCredits: 0,
    ...over,
  };
}

export function mkWorker(id: string, over: Partial<Worker> = {}): Worker {
  return {
    id,
    role: 'worker',
    email: `${id}@money.vn`,
    phone: '+84900000011',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2020-01-01T00:00:00.000Z',
    fullName: `Người làm ${id}`,
    skills: [],
    preferredJobTypes: [],
    preferredLocations: [],
    verifications: ['phone'],
    reputationScore: 100,
    completedShiftCount: 0,
    ratingsReceived: [],
    cancellationHistory: [],
    noShowCount: 0,
    ...over,
  };
}

export function mkShift(id: string, over: Partial<Shift> = {}): Shift {
  return {
    id,
    employerId: EMP_ID,
    title: `Ca ${id}`,
    description: '',
    requirements: '',
    jobType: 'Phục vụ',
    location: 'Quận 1, TP.HCM',
    district: 'Quận 1, TP.HCM',
    date: '2999-01-01',
    startTime: '08:00',
    endTime: '12:00',
    hourlyWage: 50_000,
    positionsTotal: 1,
    positionsFilled: 1,
    status: 'Completed',
    escrowStatus: 'Released',
    depositAmount: 0,
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
    ...over,
  };
}

export function mkApp(id: string, over: Partial<Application> = {}): Application {
  return {
    id,
    shiftId: 'sh-x',
    workerId: WRK_ID,
    status: 'Confirmed',
    appliedAt: '2020-01-01T00:00:00.000Z',
    ...over,
  };
}

// ---------------------------------------------------------------------------
// Verbatim mirrors of the dashboard money reductions.
//
//  worker dashboard (src/app/worker/dashboard/page.tsx:184-185):
//    const completedShifts = myApps.filter((a) => a.status === 'Confirmed');
//    const totalEarnings = completedShifts.reduce((acc, a) => acc + (a.payoutAmount ?? 0), 0);
//
//  employer dashboard (src/app/employer/dashboard/page.tsx:131-133):
//    const totalDeposited = myShifts.reduce((acc, s) => acc + s.depositAmount, 0);
//    const completedShifts = myShifts.filter((s) => s.status === 'Completed');
//    const totalPaidOut = completedShifts.reduce((acc, s) => acc + s.depositAmount, 0);
// ---------------------------------------------------------------------------

/** Worker "Tổng thu nhập" — sums `application.payoutAmount` over Confirmed apps. */
export function workerTotalIncome(apps: Application[]): number {
  return apps
    .filter((a) => a.status === 'Confirmed')
    .reduce((acc, a) => acc + (a.payoutAmount ?? 0), 0);
}

/** Employer "Tổng đã đảm bảo" — sums `shift.depositAmount` over all (non-Draft) shifts. */
export function employerTotalDeposited(shifts: Shift[]): number {
  return shifts.reduce((acc, s) => acc + s.depositAmount, 0);
}

/** Employer "Tổng đã chi trả" — sums `shift.depositAmount` over Completed shifts. */
export function employerTotalPaidOut(shifts: Shift[]): number {
  return shifts
    .filter((s) => s.status === 'Completed')
    .reduce((acc, s) => acc + s.depositAmount, 0);
}

// ---------------------------------------------------------------------------
// Coherent "demo economy" generator
// ---------------------------------------------------------------------------

export interface EconomyShiftSpec {
  /** VND per hour. */
  wage: number;
  /** Whole hours worked. */
  hours: number;
  /** Positions the employer deposited for. */
  positionsTotal: number;
  /** Positions actually filled by a confirmed worker (`<= positionsTotal`). */
  positionsFilled: number;
}

export interface Economy {
  /** One employer's completed shifts. */
  shifts: Shift[];
  /** The confirmed applications that filled (some of) their positions. */
  applications: Application[];
}

/**
 * Turn a list of shift specs into a coherent economy owned by `EMP_ID`.
 * Every shift is `Completed`; its `depositAmount` covers ALL positions
 * (`wage × hours × positionsTotal`). Each filled position becomes one
 * `Confirmed` application whose `payoutAmount` is a single position's wage
 * (`wage × hours`).
 */
export function buildEconomy(specs: EconomyShiftSpec[]): Economy {
  const shifts: Shift[] = [];
  const applications: Application[] = [];

  specs.forEach((spec, i) => {
    const positionsFilled = Math.min(spec.positionsFilled, spec.positionsTotal);
    const shiftId = `sh-${i}`;
    shifts.push(
      mkShift(shiftId, {
        hourlyWage: spec.wage,
        positionsTotal: spec.positionsTotal,
        positionsFilled,
        status: 'Completed',
        // depositAmount covers every position the employer deposited for.
        depositAmount: calculateDeposit(spec.wage, spec.hours, spec.positionsTotal),
      }),
    );
    for (let j = 0; j < positionsFilled; j += 1) {
      applications.push(
        mkApp(`app-${i}-${j}`, {
          shiftId,
          // Distinct worker per filled position (a worker fills one slot).
          workerId: `wrk-${i}-${j}`,
          status: 'Confirmed',
          // A single position's wage.
          payoutAmount: calculateDeposit(spec.wage, spec.hours, 1),
        }),
      );
    }
  });

  return { shifts, applications };
}

/**
 * A single completed-shift spec. `positionsTotal` is >= 2 and
 * `positionsFilled` ranges over `[1, positionsTotal]`, so under-filled
 * completed shifts (`positionsFilled < positionsTotal`) — where the
 * deposit-based paid-out figure overstates the wages actually released —
 * are common in the sampled space.
 */
const arbShiftSpec: fc.Arbitrary<EconomyShiftSpec> = fc
  .integer({ min: 2, max: 4 })
  .chain((positionsTotal) =>
    fc.record<EconomyShiftSpec>({
      wage: fc.integer({ min: 20, max: 100 }).map((k) => k * 1_000),
      hours: fc.integer({ min: 1, max: 8 }),
      positionsTotal: fc.constant(positionsTotal),
      positionsFilled: fc.integer({ min: 1, max: positionsTotal }),
    }),
  );

/** A demo economy of 1–4 completed shifts owned by one employer. */
export const arbEconomy: fc.Arbitrary<Economy> = fc
  .array(arbShiftSpec, { minLength: 1, maxLength: 4 })
  .map(buildEconomy);
