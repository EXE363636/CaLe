/**
 * Cluster 6 · Task 21 — PRESERVATION (baseline) test.
 *
 * Property 16 (Preservation) — "Worker profile non-skill sections + no-skill-data".
 *
 * Validates: Requirements 3.10
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS TEST ENCODES (the CURRENT, must-survive behavior)
 * ---------------------------------------------------------------------------
 * The Cluster 6 fix (task 22.1) replaces ONLY the skills `ChipList` in
 * `src/components/user/WorkerProfileModal.tsx` with per-skill progress bars
 * derived from `worker.skillScores`. Everything else in the modal must be
 * left byte-for-byte identical, and the modal must keep working for a worker
 * who has NO recorded skill data.
 *
 * This test pins the NON-skill sections the modal renders today and the
 * graceful no-skill-data path Property 16 protects. It deliberately does NOT
 * assert anything about the skills section (`Kỹ năng`) — that is exactly what
 * the fix changes, so pinning it would make this preservation baseline break
 * on the fixed code.
 *
 * The non-skill sections (confirmed by reading the component) are:
 *   1. Modal title + identity header — "Hồ sơ người làm", full name, email,
 *      and the reputation badge ("⭐ {score} điểm").
 *   2. Verification summary — the "Xác minh" section with the phone badge
 *      ("Đã xác minh SĐT") and the identity status ("Chưa xác minh danh tính"
 *      for a worker with no approved identity docs).
 *   3. Stats grid — "Ca hoàn thành" (completed count), "Điểm đánh giá"
 *      (average rating, or "—"), "Vắng mặt" (no-show count).
 *   4. Bio — "Giới thiệu" with the worker's bio, or the
 *      "Người làm chưa thêm giới thiệu." placeholder.
 *   5. Preferences — "Loại công việc ưa thích" and "Khu vực ưa thích".
 *   6. Rating history — "Lịch sử đánh giá" with the received ratings, or the
 *      "Chưa có đánh giá nào." placeholder.
 *
 * ---------------------------------------------------------------------------
 * WHY IT PASSES ON THE CURRENT (UNFIXED) CODE
 * ---------------------------------------------------------------------------
 * All six sections above already render from the worker's own data and the
 * verification store slice the modal reads
 * (`useVerificationStore.workerDocuments`). None of them touch
 * `worker.skillScores`, so they are unaffected by the skills-chips→progress-
 * bars change. A worker with no `skills`/`skillScores` simply omits the skills
 * block (guarded today by `worker.skills.length > 0`), and every other section
 * still renders — so the modal degrades gracefully. This baseline is expected
 * to PASS now and to keep passing after the fix (task 22.3).
 *
 * Seed pattern mirrors the sibling render tests (`workerProfileSkills`,
 * `featuredJobMockup`): a `Worker` fixture + the verification store slice the
 * modal reads.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

import { WorkerProfileModal } from '@/components/user/WorkerProfileModal';
import { useVerificationStore } from '@/stores/verificationStore';
import { averageRating } from '@/domain/rating';
import { t } from '@/i18n/vi';
import type { Rating, Worker, WorkerSkillScore } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** NFC-normalize so Vietnamese diacritics compare reliably. */
const nfc = (s: string | null | undefined): string => (s ?? '').normalize('NFC');

function seedStores(): void {
  // The modal reads `useVerificationStore.workerDocuments`; an empty slice is
  // the graceful "no docs" baseline and keeps the render deterministic. With
  // no approved identity docs the summary reports `identityVerified: false`,
  // so the verification section shows "Chưa xác minh danh tính".
  useVerificationStore.setState({ workerDocuments: [] });
}

afterEach(() => {
  cleanup();
  useVerificationStore.setState({ workerDocuments: [] });
});

/** A rating with feedback, so the rating-history section renders a real row. */
function mkRating(id: string, stars: 1 | 2 | 3 | 4 | 5, feedback: string): Rating {
  return {
    id,
    shiftId: `shift-${id}`,
    applicationId: `app-${id}`,
    fromUserId: 'employer-1',
    toUserId: 'worker-preserve',
    stars,
    feedback,
    createdAt: '2026-04-01T09:00:00.000Z',
  };
}

const SKILL_SCORES: WorkerSkillScore[] = [
  { category: 'Phục vụ', score: 85, completedCount: 20, xp: 300, lastUpdatedAt: '2026-05-01T00:00:00.000Z' },
  { category: 'Thu ngân', score: 72, completedCount: 12, xp: 150, lastUpdatedAt: '2026-05-01T00:00:00.000Z' },
];

/** Base worker with every non-skill field populated. */
function mkBaseWorker(overrides: Partial<Worker> = {}): Worker {
  return {
    id: 'worker-preserve',
    role: 'worker',
    email: 'toantb@cale.vn',
    phone: '+84900000200',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2026-05-01T00:00:00.000Z',
    fullName: 'Trần Bảo Toàn',
    bio: 'Tôi phục vụ nhà hàng nhiều năm, luôn đúng giờ và thân thiện.',
    // `preferredJobTypes` / `preferredLocations` use values that do NOT appear
    // among the skills, so pinning them targets the preferences sections
    // unambiguously.
    preferredJobTypes: ['Pha chế'],
    preferredLocations: ['Quận 1, TP.HCM'],
    verifications: ['phone'],
    reputationScore: 80,
    completedShiftCount: 12,
    ratingsReceived: [mkRating('r1', 5, 'Làm việc rất tốt'), mkRating('r2', 4, 'Đúng giờ')],
    cancellationHistory: [],
    noShowCount: 3,
    // Default to no skills so the base literal satisfies the required
    // `Worker.skills` field; every case below sets `skills` (and `skillScores`)
    // via `overrides`, so this is type-only and does not change any test's
    // runtime behavior.
    skills: [],
    ...overrides,
  };
}

/**
 * Assert that every NON-skill section renders for a worker whose non-skill
 * fields are populated. Derives expected values from the worker so it is
 * reusable for both the "with skills" and "no-skill-data" fixtures.
 */
function expectAllNonSkillSectionsRender(worker: Worker): void {
  const dialog = screen.getByRole('dialog');
  const text = nfc(dialog.textContent);
  const has = (s: string) => expect(text).toContain(nfc(s));

  // 1. Modal title + identity header
  has(t('employer.applicant.fullProfile')); // "Hồ sơ người làm"
  has(worker.fullName);
  has(worker.email);
  has(`${worker.reputationScore} điểm`); // ReputationBadge → "⭐ {score} điểm"

  // 2. Verification summary
  has('Xác minh');
  has(t('verification.phone')); // "Đã xác minh SĐT"
  has('Chưa xác minh danh tính'); // no approved identity docs seeded

  // 3. Stats grid — labels + derived values.
  has(t('employer.applicant.completedShifts')); // "Ca hoàn thành"
  has(t('employer.applicant.avgRating')); // "Điểm đánh giá"
  has(t('employer.applicant.noShows')); // "Vắng mặt"
  // Element-scoped exact matches for the numeric tiles (robust against
  // substring collisions in the concatenated text content).
  expect(within(dialog).getByText(String(worker.completedShiftCount))).toBeInTheDocument();
  expect(within(dialog).getByText(String(worker.noShowCount))).toBeInTheDocument();
  const avg = averageRating(worker.ratingsReceived);
  expect(avg).not.toBeNull();
  expect(within(dialog).getByText(avg!.toFixed(1))).toBeInTheDocument();

  // 4. Bio
  has(t('employer.applicant.bio')); // "Giới thiệu"
  if (worker.bio) has(worker.bio);

  // 5. Preferences
  has(t('employer.applicant.preferredJobs')); // "Loại công việc ưa thích"
  has(worker.preferredJobTypes[0]);
  has(t('employer.applicant.preferredLocations')); // "Khu vực ưa thích"
  has(worker.preferredLocations[0]);

  // 6. Rating history
  has(t('employer.applicant.ratingHistory')); // "Lịch sử đánh giá"
  const firstFeedback = worker.ratingsReceived.find((r) => r.feedback)?.feedback;
  if (firstFeedback) has(firstFeedback);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 16 (Preservation): worker profile non-skill sections + no-skill-data', () => {
  it('renders every non-skill section for a fully-populated worker (with skills present)', () => {
    seedStores();
    // This worker HAS skills + skillScores, but we assert only the NON-skill
    // sections — the skills block itself is what the fix changes.
    const worker = mkBaseWorker({
      skills: SKILL_SCORES.map((s) => s.category),
      skillScores: SKILL_SCORES,
    });

    render(<WorkerProfileModal open onClose={() => {}} worker={worker} />);

    expectAllNonSkillSectionsRender(worker);
  });

  it('still renders the non-skill sections for a worker with NO skill data (graceful degradation)', () => {
    seedStores();
    // The no-skill-data path Property 16 protects: no `skills`, no
    // `skillScores`. The modal must not crash and every non-skill section
    // must still render exactly as before. We intentionally do NOT assert on
    // the skills section (absent today; a placeholder/omission after the fix).
    const worker = mkBaseWorker({ skills: [], skillScores: undefined });

    render(<WorkerProfileModal open onClose={() => {}} worker={worker} />);

    // No crash — the dialog mounted.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expectAllNonSkillSectionsRender(worker);
  });

  it('degrades gracefully for a worker with empty optional fields (bio / ratings placeholders)', () => {
    seedStores();
    // Minimal worker: no skill data AND empty optional non-skill fields. The
    // identity/verification/stats sections still render, and the bio +
    // rating-history sections fall back to their existing placeholders.
    const worker = mkBaseWorker({
      fullName: 'Lê Tối Giản',
      email: 'giản@cale.vn',
      bio: undefined,
      preferredJobTypes: [],
      preferredLocations: [],
      ratingsReceived: [],
      reputationScore: 55,
      completedShiftCount: 0,
      noShowCount: 0,
      skills: [],
      skillScores: undefined,
    });

    render(<WorkerProfileModal open onClose={() => {}} worker={worker} />);

    const dialog = screen.getByRole('dialog');
    const text = nfc(dialog.textContent);
    const has = (s: string) => expect(text).toContain(nfc(s));

    // Identity + verification + stats labels still render.
    has(t('employer.applicant.fullProfile'));
    has(worker.fullName);
    has(worker.email);
    has(`${worker.reputationScore} điểm`);
    has('Xác minh');
    has(t('verification.phone'));
    has(t('employer.applicant.completedShifts'));
    has(t('employer.applicant.avgRating'));
    has(t('employer.applicant.noShows'));

    // Average rating tile shows the "—" placeholder when there are no ratings.
    expect(averageRating(worker.ratingsReceived)).toBeNull();
    expect(within(dialog).getByText('—')).toBeInTheDocument();

    // Bio + rating-history placeholders (existing non-skill behavior).
    has(t('employer.applicant.bio')); // "Giới thiệu"
    has(t('employer.applicant.noBio')); // "Người làm chưa thêm giới thiệu."
    has(t('employer.applicant.ratingHistory')); // "Lịch sử đánh giá"
    has(t('reputation.noRatings')); // "Chưa có đánh giá nào."
  });
});
