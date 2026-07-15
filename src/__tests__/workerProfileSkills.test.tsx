/**
 * Cluster 6 · Task 20 — EXPLORATION (bug-condition) test.
 *
 * Property 9 (Bug Condition) — "Per-skill progress in the worker profile modal".
 *
 * Validates: Requirements 1.11, 2.11
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS TEST ENCODES (the correct, post-fix behavior)
 * ---------------------------------------------------------------------------
 * When an employer opens the profile modal of a worker who has recorded
 * `skillScores`, each skill must render a per-skill PROGRESS / LEVEL indicator
 * DERIVED from that worker's own skill data — not a flat name-only chip that
 * looks identical for every worker.
 *
 * The fix (task 22.1) replaces the skills `ChipList` in
 * `src/components/user/WorkerProfileModal.tsx` with the existing
 * `SkillProgressBar` (`src/components/user/SkillProgressBar.tsx`), driven by
 * `worker.skillScores` via `buildSkillDisplayList` from
 * `src/domain/skillProgression.ts`. For each `WorkerSkillScore` entry the
 * default (full) `SkillProgressBar` card renders:
 *
 *   - the category label (e.g. "Phục vụ"),
 *   - a level chip "Cấp {level}" where `level = skillProgress(entry.xp).level`
 *     (from the cumulative-XP thresholds 0/50/120/250/500 → levels 1–5),
 *   - a progress line whose width is the fraction into the current level, and
 *   - a footer line "Hoàn thành: {completedCount} ca · {score}/100 điểm kỹ năng"
 *     (the trailing "· {score}/100 …" segment only when `score > 0`).
 *
 * `buildSkillDisplayList(worker.skillScores)` sorts the worker's real scores by
 * XP (desc) and appends default-category placeholders at Level 1 / 0 XP, so the
 * three seeded skills below each surface a DISTINCT derived level + score.
 *
 * This test keys on the SkillProgressBar output the fix legitimately
 * introduces — each skill's NAME, the derived level ("Cấp N", present in both
 * the full and compact variants), and the derived 0–100 skill score
 * ("{score}/100") — and asserts the level/score DIFFER per skill. It
 * deliberately avoids over-fitting exact prose (it derives the expected level
 * from the same `skillProgress` the component uses, rather than hard-coding
 * it).
 *
 * The assertions query the REAL DOM element-by-element via Testing Library's
 * `getByText` (scoped with `within(dialog)`), NOT a regex over the dialog's
 * concatenated `textContent`. `getByText` matches each element's OWN text (its
 * direct text nodes), so the level chip is matched as its own element whose
 * text is exactly "Cấp N" and the score is matched inside the footer element
 * that owns it. Because SkillProgressBar renders the level chip ("Cấp 4") and
 * the XP line ("50/250 XP") as SEPARATE elements, the whole-`textContent`
 * approach fuses them into "Cấp 450/250 XP"; element-scoped queries sidestep
 * that concatenation entirely.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS EXPECTED TO FAIL ON THE CURRENT (UNFIXED) CODE
 * ---------------------------------------------------------------------------
 * The current modal renders skills as flat gray chips and IGNORES
 * `worker.skillScores` entirely (confirmed by inspecting
 * `src/components/user/WorkerProfileModal.tsx`):
 *
 *     {worker.skills.length > 0 && (
 *       <Section title={t('employer.applicant.skills')}>
 *         <ChipList items={worker.skills} />   // names only — no level/score
 *       </Section>
 *     )}
 *
 * `ChipList` renders each string in `worker.skills` as a `bg-gray-100` chip
 * containing ONLY the skill name — no "Cấp N" level element, no "{score}/100"
 * progress, no per-skill derivation. The bare name still renders (so the name
 * assertion alone is NOT the discriminator), but there is no level chip and no
 * score footer element anywhere in the modal, so `getByText` finds nothing and
 * throws — the derived-level and derived-score assertions FAIL. That FAILURE is
 * the counterexample proving the bug (state = WorkerProfileModal AND skills
 * rendered as flat chips). This test is NOT fixed here — the SAME test later
 * validates the fix (task 22.2).
 *
 * Seed pattern mirrors the neighboring render tests (`featuredJobMockup`,
 * `paymentGuaranteeWording`): a `Worker` fixture + the verification store slice
 * the modal reads (`useVerificationStore.workerDocuments`).
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

import { WorkerProfileModal } from '@/components/user/WorkerProfileModal';
import { useVerificationStore } from '@/stores/verificationStore';
import { skillProgress } from '@/domain/skillProgression';
import type { Worker, WorkerSkillScore } from '@/types';

// ---------------------------------------------------------------------------
// Seeded per-skill data (recorded here per the task's requirement to document
// what the test keys on). Scores 85 / 72 / 60 mirror the design's Property 9
// example ("Phục vụ 85%", "Thu ngân 72%", "Tiếng Anh giao tiếp 60%"). The XP
// values are chosen so `skillProgress(xp).level` yields three DISTINCT levels
// (4 / 3 / 2 under the 0/50/120/250/500 thresholds), proving the render is
// derived per skill rather than a set of identical flat chips.
// ---------------------------------------------------------------------------

const SEEDED_SKILL_SCORES: WorkerSkillScore[] = [
  {
    category: 'Phục vụ',
    score: 85,
    completedCount: 20,
    xp: 300, // → Level 4
    lastUpdatedAt: '2026-05-01T00:00:00.000Z',
  },
  {
    category: 'Thu ngân',
    score: 72,
    completedCount: 12,
    xp: 150, // → Level 3
    lastUpdatedAt: '2026-05-01T00:00:00.000Z',
  },
  {
    category: 'Tiếng Anh giao tiếp',
    score: 60,
    completedCount: 6,
    xp: 60, // → Level 2
    lastUpdatedAt: '2026-05-01T00:00:00.000Z',
  },
];

/** NFC-normalize so Vietnamese diacritics compare reliably. */
const nfc = (s: string | null | undefined): string => (s ?? '').normalize('NFC');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * A worker WITH recorded per-skill scores. `skills` carries the same category
 * names so the CURRENT modal renders them as flat chips (the bug), while
 * `skillScores` carries the derived data the fixed modal must surface.
 */
function mkWorkerWithSkillScores(): Worker {
  return {
    id: 'worker-skills',
    role: 'worker',
    email: 'skills@worker.vn',
    phone: '+84900000123',
    passwordHash: 'mock-hash:demo',
    suspended: false,
    createdAt: '2026-05-01T00:00:00.000Z',
    fullName: 'Nguyễn Kỹ Năng',
    skills: SEEDED_SKILL_SCORES.map((s) => s.category),
    preferredJobTypes: [],
    preferredLocations: [],
    verifications: ['phone'],
    reputationScore: 80,
    completedShiftCount: 20,
    ratingsReceived: [],
    cancellationHistory: [],
    noShowCount: 0,
    skillScores: SEEDED_SKILL_SCORES,
  };
}

function seedStores(): void {
  // The modal reads `useVerificationStore.workerDocuments`; an empty slice is
  // the graceful "no docs" baseline and keeps the render deterministic.
  useVerificationStore.setState({ workerDocuments: [] });
}

afterEach(() => {
  cleanup();
  useVerificationStore.setState({ workerDocuments: [] });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 9 (Bug Condition): per-skill progress in the worker profile modal', () => {
  it('renders each recorded skill NAME and its DERIVED level chip ("Cấp N") as its own element, distinct per skill', () => {
    seedStores();
    render(
      <WorkerProfileModal open onClose={() => {}} worker={mkWorkerWithSkillScores()} />,
    );

    const dialog = screen.getByRole('dialog');

    // Each recorded skill surfaces its NAME (the SkillProgressBar heading). On
    // the unfixed flat-chip render the bare name also shows, so this alone is
    // not the discriminator — the derived level (here) and score (next test)
    // are. Same-source string ⇒ an exact element-text match is reliable.
    for (const s of SEEDED_SKILL_SCORES) {
      expect(within(dialog).getByText(s.category)).toBeInTheDocument();
    }

    // EXPECTED (post-fix): each recorded skill surfaces the level derived from
    // its XP via `skillProgress`, rendered by SkillProgressBar as its OWN
    // element whose text is exactly "Cấp N". We match that element directly
    // (element-scoped `getByText`), so we read only the chip's own text — never
    // the sibling XP line ("{into}/{span} XP") that lives in a separate
    // element — which sidesteps the "Cấp 4" + "50/250 XP" → "Cấp 450/250 XP"
    // concatenation the whole-`textContent` approach suffered from.
    //
    // CURRENT (unfixed): `ChipList` renders only the skill names — there is no
    // "Cấp N" element at all, so `getByText` throws and the assertion FAILS,
    // the counterexample proving the flat-chip bug.
    const derivedLevels = SEEDED_SKILL_SCORES.map((s) => skillProgress(s.xp ?? 0).level);

    for (const level of derivedLevels) {
      // Element-level exact match on the chip's OWN text, NFC-normalized on both
      // sides so Vietnamese diacritics ("Cấp") compare reliably regardless of
      // the source's Unicode composition. `getByText` compares each element's
      // direct text nodes, so this resolves to the single level-chip <span>.
      expect(
        within(dialog).getByText((content) => nfc(content) === nfc(`Cấp ${level}`)),
      ).toBeInTheDocument();
    }

    // The seeded skills produce three DISTINCT levels, so a per-skill (derived)
    // render shows three different "Cấp N" chips — impossible with identical
    // flat chips.
    expect(new Set(derivedLevels).size).toBe(derivedLevels.length);
  });

  it('surfaces each skill\'s DERIVED 0–100 skill score ("{score}/100") in its own element, distinct per skill', () => {
    seedStores();
    render(
      <WorkerProfileModal open onClose={() => {}} worker={mkWorkerWithSkillScores()} />,
    );

    const dialog = screen.getByRole('dialog');

    // EXPECTED (post-fix): each recorded skill shows its own 0–100 score
    // (e.g. "85/100", "72/100", "60/100") in the SkillProgressBar footer line
    // ("Hoàn thành: N ca · {score}/100 điểm kỹ năng"). We match the footer by
    // its OWN text via a substring matcher — tolerant of the surrounding prose
    // in the SAME element, while still element-scoped (`getByText` reads a
    // node's direct text, so no ancestor's concatenated text can satisfy it).
    //
    // CURRENT (unfixed): the flat `ChipList` shows names only — no "{score}/100"
    // element exists, so `getByText` throws and the assertion FAILS.
    for (const s of SEEDED_SKILL_SCORES) {
      expect(
        within(dialog).getByText((content) => content.includes(`${s.score}/100`)),
      ).toBeInTheDocument();
    }

    // Distinct scores ⇒ per-skill derivation, not one value repeated.
    const scores = SEEDED_SKILL_SCORES.map((s) => s.score);
    expect(new Set(scores).size).toBe(scores.length);
  });
});
