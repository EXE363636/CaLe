# Demo Logic & Data Consistency Bugfix Design

## Overview

This batch fixes a cluster of demo-logic and data-consistency defects in the CaLẻ / ShiftNow MVP — a Next.js shift-marketplace with worker, employer, and admin roles backed entirely by browser-stored mock data (no backend, no real money). The defects share one root theme: several surfaces present **hard-coded or independently-sourced values** instead of deriving them from the current user, role, and the single mock data store. The result is contradictory UI (a "mark absent" button under a "both sides confirmed present" banner, a home page showing reputation 95 while the account menu shows 80, wallet/income figures that don't reconcile), plus content/navigation gaps (confusing payment-guarantee wording, a mis-grouped footer link, a "trust & safety" page where a practical handbook belongs, flat skill chips, and no AI helper).

The fix strategy mirrors that theme: **replace hard-coded and divergent reads with single shared/derived sources**, and make copy explicit about the demo's simulated nature. Concretely:

- A single shared reputation reader (`getWorkerReputation(userId)`) that every surface consumes.
- A single derived money computation over the mock ledger/shifts that backs wallet balance, total income, total paid, deposit/guarantee amount, and recent transactions.
- Landing/hero previews derived from the current user + role (no fake upcoming card, no hard-coded 95).
- The attendance action row driven by the already-canonical `deriveAttendanceState`, so "Đánh dấu vắng mặt" never appears once both sides confirmed presence.
- Check-in notifications that deep-link to a surface that actually contains the check-in/out action.
- Clearer payment-guarantee wording with an always-present "no real transactions in the demo" note.
- An original worker/employer handbook and a corrected footer grouping.
- Per-skill progress bars in the worker profile modal (reusing the existing `SkillProgressBar`).
- A clearly-labelled mock AI assistant ("Gợi ý AI trong demo") with no real API calls.

Work proceeds in a fixed order so each cluster is verified before the next builds on it: (1) check-in/absence CTA + notification deep-link, (2) current-user/reputation/upcoming hard-coding, (3) money consistency via derived data, (4) payment/escrow wording, (5) handbook/footer, (6) skill progress, (7) AI prototype. After each cluster we run `tsc`, `eslint`, and the UI anti-pattern detector; no commits are made by this workflow.

## Glossary

- **Bug_Condition (C)**: The set of inputs (surface + current user/role + mock data state) for which a surface renders a hard-coded, contradictory, or independently-sourced value instead of the correct derived one. Each cluster below defines its own sub-condition; `isBugCondition` is their disjunction.
- **Property (P)**: The correct derived behavior for inputs in C — the value/copy/CTA the surface should render once it reads from the shared source, current user/role, or canonical state machine.
- **Preservation**: Behavior for inputs **outside** C that must stay byte-for-byte identical after the fix — the reputation/escrow/deposit/wallet domain rules, the attendance state machine for non-"both confirmed" states, existing legal routes, and the demo's no-real-transactions guarantee.
- **F / F′**: The original (buggy) and fixed rendering of a surface.
- **deriveAttendanceState** (`src/domain/attendanceState.ts`): Pure function mapping an `(application, shift, now)` triple to a canonical `AttendanceState` (e.g. `BothConfirmedPresent`, `WorkerCheckedInInProgress`). Already the single source of truth for attendance copy; this batch also makes it the source of truth for the attendance **action row**.
- **canEmployerMarkAbsent** (`src/domain/timeGates.ts`): Predicate that is `true` only for an `Approved` (never-checked-in) worker inside `[start+15min, end+grace]`. It is **not** the source of the BUG 1 button; the stray button comes from the `absentDisabledReason` branch in the employer detail page.
- **getWorkerReputation(userId)**: The new single shared reputation reader (to be added) that reads `Worker.reputationScore` from `userStore` for the given user id. Replaces per-surface reads and the hard-coded `95`.
- **Derived money source**: The single computation (to be added, e.g. `src/domain/finance.ts`) over the mock wallet ledger (`walletStore`) plus confirmed applications/shifts that yields wallet balance, total income, total paid, deposit/guarantee amount, and recent transactions for a given user.
- **FeaturedJobMockup** (`src/components/landing/FeaturedJobMockup.tsx`): The landing hero's client island. Contains the hard-coded `95` reputation tile and the hard-coded "Sắp diễn ra / Thứ Bảy, 24/05 / Ca 14:00 – 18:00" upcoming card.
- **Demo AI label**: The fixed string "Gợi ý AI trong demo" that every AI-assistant output must carry to signal it is a mock prototype with no real backend.

## Bug Details

### Bug Condition

The bug manifests across seven surface clusters. In every case the surface either renders a **hard-coded literal**, reads a value from an **independent source** that can disagree with another surface, drives a **CTA from the wrong predicate**, or presents **content/labels** that misrepresent the feature. The `handleKeyPress`-equivalent here is "the render function of the affected surface": it is producing output inconsistent with the current user/role, the shared source, or the canonical state.

**Formal Specification:**

```
FUNCTION isBugCondition(input)
  INPUT: input = { surface, currentUser, role, mockData }
  OUTPUT: boolean

  RETURN
    // Cluster 1a — attendance CTA (Req 1.1)
    (input.surface = EmployerShiftDetailRow
       AND deriveAttendanceState(app, shift, now) = 'BothConfirmedPresent'
       AND markAbsentCtaIsRendered(input))                              // stray red CTA
    OR
    // Cluster 1b — check-in notification deep-link (Req 1.4)
    (input.surface = CheckInNotification
       AND resolveNotificationTarget(input) does NOT land on a surface
           that contains the matching check-in/check-out action)
    OR
    // Cluster 2 — landing hero hard-coding (Req 1.2)
    (input.surface = LandingHero
       AND (reputationPreviewValue(input) is a literal (95)
            OR upcomingCardShown(input) AND currentUser has no real upcoming shift
            OR reputationPreviewShown(input) AND role != 'worker'))
    OR
    // Cluster 3 — reputation read-source divergence (Req 1.3)
    (input.surface reads worker reputation
       AND reputationRead(input) does NOT come from getWorkerReputation(userId))
    OR
    // Cluster 4 — money figures not reconciled (Req 1.5)
    (input.surface shows any money figure
       AND figureSource(input) is NOT the single derived money source)
    OR
    // Cluster 5 — payment-guarantee wording (Req 1.6)
    (input.surface shows the payment-guarantee concept
       AND (wordingIsConfusing(input) OR missingNoRealTxnNote(input)))
    OR
    // Cluster 6 — handbook + footer (Req 1.7, 1.8)
    (guideMenuLabelIsTrustSafety(input) OR handbookContentMissing(input)
       OR quickStartLinkGroupedUnderLegal(input))
    OR
    // Cluster 7 — worker profile skills (Req 1.11)
    (input.surface = WorkerProfileModal
       AND skillsRenderedAsFlatChips(input))
    OR
    // Cluster 8 — AI assistant absent / unlabelled (Req 1.9, 1.10)
    (assistantRequested(input)
       AND (noAssistantExists(input) OR outputNotLabelledDemoAI(input)))
END FUNCTION
```

### Examples

- **BUG 1 (attendance CTA):** An employer opens a shift where the worker tapped "Tôi đã có mặt" and the employer tapped "Xác nhận có mặt". State is `BothConfirmedPresent`; the banner reads "Hai bên đã xác nhận có mặt. Đợi đến hết ca để người làm check-out." Yet the action row still renders a red **"Đánh dấu vắng mặt"** button (disabled, via the `absentDisabledReason` branch). Expected: no mark-absent CTA in the primary row; absence, if ever needed, goes through the existing dispute flow.
- **BUG 4 (deep-link):** A worker receives a "ca sắp bắt đầu" (`ShiftStartingSoon`) notification and taps it. `resolveNotificationTarget` returns `undefined` for that kind, so the app stays put; the worker must navigate to `/worker/dashboard` to find the check-in button. Expected: tapping lands on the shift's detail with the check-in action present.
- **BUG 2 (landing hero):** A logged-out visitor (or a logged-in employer) sees a reputation tile hard-coded to **95** and an "Sắp diễn ra — Thứ Bảy, 24/05 — Ca 14:00 – 18:00" card that belongs to nobody. Expected: reputation preview shown only for a worker, upcoming card shown only when the current user has a real upcoming shift, all values derived.
- **BUG 3 (reputation divergence):** The worker dashboard `StatTile` shows `worker.reputationScore` = 80 while the landing hero shows 95 — two sources for "the same worker's reputation." Expected: one shared reader → same value everywhere.
- **BUG 5 (money):** Worker dashboard `totalEarnings` sums `application.payoutAmount`; employer dashboard `totalPaidOut` sums `shift.depositAmount`; the wallet tile reads `walletStore.getBalance`. Three independent sources that don't reconcile. Expected: all derived from one computation over the mock ledger/shifts.
- **BUG 6 (wording):** "Đảm bảo thanh toán" / "Mô phỏng đảm bảo thanh toán" appears with no consistent note that the demo has no real transactions. Expected: clearer wording plus an always-present "Trong MVP/demo không có giao dịch thật." note.
- **BUG 7/8 (handbook/footer):** The guide menu reads "Bắt đầu nhanh" and is grouped under "Pháp lý & hỗ trợ"; the page is framed as trust/safety rather than a practical handbook. Expected: a "Cẩm nang" handbook with original content, and "Bắt đầu nhanh" moved to the guide group.
- **BUG 11 (skills):** The employer's worker-profile modal lists skills as flat gray chips (`ChipList`). Expected: per-skill progress bars (e.g. "Phục vụ 85%") via the existing `SkillProgressBar`, derived from `worker.skillScores`; degrade gracefully when a worker has none.
- **BUG 9/10 (AI):** No assistant exists for workers (suggest shifts from free schedule) or employers (suggest a shift draft). Expected: a mock prototype for each, output labelled "Gợi ý AI trong demo", no real API call.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

- The attendance state machine and role-aware copy for every state **other than** `BothConfirmedPresent` — `ApprovedNotStarted`, `WorkerCheckedInEarly`, `WorkerCheckedInInProgress`, `EmployerMarkedPresentOnly`, `AwaitingCheckout`, `NoShow`, checkout/confirmation — keep their existing buttons and text (Req 3.1).
- A genuine no-show (an `Approved` worker who never checked in) still lets the employer report absence via `canEmployerMarkAbsent` / the dispute flow (Req 3.2).
- A logged-in worker's own dashboard keeps showing their real reputation, completed-shift count, earnings, and upcoming shifts derived from their own data (Req 3.3).
- The reputation rules in `domain/reputation.ts` (completed +5, late-cancel −10, no-show −20, admin adjust, clamp 0–100, apply threshold 50) are untouched — only the **read source** for display is unified (Req 3.4).
- Non-check-in notifications, and check-in notifications that already routed correctly, keep their existing destinations (Req 3.5).
- Wallet mutations (`credit`/`debit`/`topUp`/`withdraw` with its invalid-amount and insufficient-balance guards, `backfillFromHistory` idempotency, never-negative balance) keep their exact behavior; the derived money layer is **read-only** over them (Req 3.6).
- `calculateDeposit` (wage × hours × positions) and the `transitionEscrow` state machine keep their values and legal transitions (Req 3.7).
- Footer legal links (Terms, Privacy, Dispute handling, Contact support) and existing guide/safety routes (`/user-guide`, `/safety`) keep resolving to valid pages (Req 3.8, 3.9).
- The worker-profile modal's non-skill sections (identity, verification summary, stats, bio, preferences, rating history) render exactly as before, including for a worker with no skill data (Req 3.10).
- The demo makes no real external AI/API calls and no real financial transactions (Req 3.11).

**Scope:**

All inputs where `isBugCondition` is `false` must be completely unaffected. This includes every surface not in the seven clusters, every attendance state except `BothConfirmedPresent`, every non-check-in notification, all wallet/deposit/escrow domain computations, and any worker with no `skillScores`.

_The actual expected correct behavior for buggy inputs is defined per property in the Correctness Properties section below._

## Hypothesized Root Cause

1. **Attendance CTA driven by the wrong branch (BUG 1).** `ManageShiftContent` already derives `employerAttendanceCopy` from `deriveAttendanceState`, but the button row uses a separate `absentDisabledReason` computed as `app.status === 'CheckedIn' && Boolean(app.checkInAt)`. That predicate is `true` for `BothConfirmedPresent`, so the disabled red "Đánh dấu vắng mặt" button renders even though both sides confirmed. Root cause: the action row is not gated by the canonical attendance state.

2. **Notification resolver missing check-in kinds (BUG 4).** `resolveNotificationTarget` only maps a handful of kinds; `ShiftStartingSoon` and worker check-in prompts fall through to `return undefined`, so the click has no target. Also, the check-in/check-out CTA currently lives only on `/worker/dashboard`, not on the worker shift detail `/shifts/[id]`. Root cause: no deep-link mapping for check-in kinds, and the deep-link target may not host the action.

3. **Hard-coded hero + divergent reputation reads (BUG 2, 3).** `FeaturedJobMockup` renders a literal `95` and a literal upcoming card; other surfaces read `worker.reputationScore` directly and independently. Root cause: no shared reputation reader and marketing literals never replaced with derived values.

4. **Three independent money sources (BUG 5).** Worker earnings sum `application.payoutAmount`, employer paid-out sums `shift.depositAmount`, wallet reads the ledger. Root cause: no single derived money computation; each surface rolls its own.

5. **Copy not demo-explicit (BUG 6).** Payment-guarantee strings ("Đảm bảo thanh toán", "Mô phỏng đảm bảo thanh toán") are scattered across NavBar/Footer/employer payments and don't consistently state "no real transactions." Root cause: wording never standardized with a mandatory demo note.

6. **Menu/footer/handbook content drift (BUG 7, 8).** `nav.label.userGuide` = "Bắt đầu nhanh" sits in the Footer LEGAL column; the guide page is framed as trust/safety. Root cause: label + grouping + content were never aligned to a practical handbook.

7. **Flat skill chips (BUG 11).** `WorkerProfileModal` renders `worker.skills` via `ChipList`, ignoring `worker.skillScores` and the existing `SkillProgressBar`. Root cause: the modal predates the skill-score/progression model and was never migrated.

8. **No AI assistant (BUG 9, 10).** The feature does not exist. Root cause: not yet built; must be a clearly-labelled mock so it never implies a real backend.

## Correctness Properties

Property 1: Bug Condition — Attendance CTA respects "both confirmed present"

_For any_ employer-viewed application+shift where `deriveAttendanceState(application, shift, now)` returns `BothConfirmedPresent`, the fixed employer shift-detail row SHALL NOT render "Đánh dấu vắng mặt" as a primary CTA; it SHALL render only the waiting-for-checkout banner, and any absence reporting SHALL be reachable solely through the secondary dispute flow.

**Validates: Requirements 2.1**

Property 2: Bug Condition — Check-in notification deep-links to an actionable surface

_For any_ check-in-related notification (e.g. `ShiftStartingSoon`) delivered to a worker with a resolvable `shiftId`, the fixed `resolveNotificationTarget` SHALL return the worker shift-detail link for that shift, and that detail SHALL render the matching check-in/check-out action when the time gates allow it, so the worker can act without navigating back to the dashboard.

**Validates: Requirements 2.4**

Property 3: Bug Condition — Landing hero derives from current user + role

_For any_ landing-hero render, the fixed hero SHALL derive every value from the current user and role: it SHALL show a reputation preview only when the current user is a worker (using the shared reputation reader), and an "upcoming" card only when the current user has a real upcoming shift — never a hard-coded `95` and never a fabricated upcoming card.

**Validates: Requirements 2.2**

Property 4: Bug Condition — Single shared reputation source

_For any_ two surfaces that display the same worker's reputation at the same data state, the fixed code SHALL read both from `getWorkerReputation(userId)` so they display the identical value.

**Validates: Requirements 2.3**

Property 5: Bug Condition — Money figures derived from one source

_For any_ demo account (worker or employer), the fixed wallet balance, total income, total paid, deposit/guarantee amount, and recent transactions SHALL all be produced by the single derived money computation over the mock ledger/shifts, so the figures reconcile across every surface that shows them.

**Validates: Requirements 2.5**

Property 6: Bug Condition — Payment-guarantee wording + demo note

_For any_ surface that presents the payment-guarantee concept, the fixed copy SHALL use the clearer standardized wording and SHALL always include a note that the MVP/demo has no real transactions ("Trong MVP/demo không có giao dịch thật.").

**Validates: Requirements 2.6**

Property 7: Bug Condition — Practical handbook content + menu label

_For any_ visit to the guide/handbook and its menu entry, the fixed system SHALL present original, short, practical handbook content for both workers and employers, and the menu label SHALL read "Cẩm nang" (or "Cẩm nang đi ca") rather than "Bắt đầu nhanh"/"Tin cậy & An toàn".

**Validates: Requirements 2.7**

Property 8: Bug Condition — Footer grouping

_For any_ footer render, the fixed footer SHALL place "Bắt đầu nhanh"/quick-start in the handbook/guide group, and the "Pháp lý & Hỗ trợ" group SHALL contain only Terms, Privacy, Dispute handling, and Contact support.

**Validates: Requirements 2.8**

Property 9: Bug Condition — Per-skill progress in the worker profile modal

_For any_ worker with recorded `skillScores` whose profile modal an employer opens, the fixed modal SHALL render each skill with a progress/level bar derived from that worker's mock skill data (e.g. "Phục vụ 85%") rather than flat identical chips.

**Validates: Requirements 2.11**

Property 10: Bug Condition — Labelled mock AI assistant

_For any_ worker who enters a free schedule or employer who enters their needs, the fixed assistant SHALL return suggestions computed from the mock data (matching shifts for the worker; a title/description/time/pay/required-skills draft for the employer) and SHALL label the output "Gợi ý AI trong demo", making no real AI/API call.

**Validates: Requirements 2.9, 2.10**

Property 11: Preservation — Attendance states other than "both confirmed present"

_For any_ application+shift whose attendance state is **not** `BothConfirmedPresent` (including a genuine no-show), the fixed code SHALL produce the same attendance copy and the same employer actions as the original — including the existing "Đánh dấu vắng mặt" affordance for an `Approved` never-checked-in worker.

**Validates: Requirements 3.1, 3.2**

Property 12: Preservation — Worker's own dashboard + reputation rules

_For any_ logged-in worker viewing their own dashboard, and _for any_ reputation event, the fixed code SHALL show the same real reputation/earnings/upcoming data and SHALL compute scores with the unchanged reputation rules (completed +5, late-cancel −10, no-show −20, admin adjust, clamp 0–100, threshold 50).

**Validates: Requirements 3.3, 3.4**

Property 13: Preservation — Existing notification routing

_For any_ non-check-in notification, or any notification that already carried a correct explicit `link`, the fixed `resolveNotificationTarget` SHALL return the same destination as the original.

**Validates: Requirements 3.5**

Property 14: Preservation — Wallet mutations + deposit/escrow

_For any_ wallet mutation (credit, debit, top-up, withdraw with its guards, history backfill) and _for any_ deposit or escrow computation, the fixed code SHALL produce the same balances, the same append-only ledger (never negative), the same `calculateDeposit` value, and the same `transitionEscrow` transitions as the original; the derived money layer only reads these.

**Validates: Requirements 3.6, 3.7**

Property 15: Preservation — Legal links + guide routes

_For any_ footer legal link (Terms, Privacy, Dispute handling, Contact support) and _for any_ existing guide/safety route (`/user-guide`, `/safety`), the fixed system SHALL continue to reach the correct valid page after the handbook and menu rename.

**Validates: Requirements 3.8, 3.9**

Property 16: Preservation — Worker profile non-skill sections + no-skill-data

_For any_ worker-profile modal, the fixed modal SHALL render the identity, verification summary, stats, bio, preferences, and rating-history sections exactly as before, and SHALL degrade gracefully for a worker with no recorded skill data.

**Validates: Requirements 3.10**

Property 17: Preservation — No real external AI/API or financial transactions

_For any_ demo interaction, including the new AI assistant, the fixed system SHALL make no real external AI/API calls and no real financial transactions.

**Validates: Requirements 3.11**

## Fix Implementation

The clusters are implemented in the required order. Each cluster lists the files, the change, and the requirements it satisfies.

### Cluster 1 — Check-in/absence CTA + notification deep-link (P1)

**BUG 1 — attendance CTA (Req 2.1; preserve 3.1, 3.2)**

**File:** `src/app/employer/shifts/[id]/page.tsx`

1. **Gate the action row by the canonical state.** Compute the attendance state once per row (it is already computed for `employerAttendanceCopy` via `deriveAttendanceState(app, shift, nowIso)`) and reuse it for the buttons.
2. **Suppress the stray mark-absent affordance when both confirmed.** Change `absentDisabledReason` so it is `null` when the derived state is `BothConfirmedPresent` (and, more generally, whenever the worker has self-confirmed presence such that absence must go through a dispute). The disabled red "Đánh dấu vắng mặt" button no longer renders in that state.
3. **Keep the genuine no-show path.** `canMarkAbsent` (driven by `canEmployerMarkAbsent` / `shouldMarkNoShow` on an `Approved` worker) is unchanged, so a real no-show still shows the button.
4. **Route real absence-after-confirmation through dispute.** Rely on the existing "report issue" / dispute affordance already present on the row for post-confirmation problems; no new absence CTA is introduced.

**BUG 4 — check-in notification deep-link (Req 2.4; preserve 3.5)**

**File:** `src/lib/notificationTarget.ts`

1. **Map check-in-related kinds to the worker shift detail.** Extend `resolveNotificationTarget` so worker-facing check-in kinds (`ShiftStartingSoon`, plus any check-in-window kind) resolve to `shiftLink('worker', shiftId)`, falling back to `/worker/dashboard` when `shiftId` is absent.
2. **Preserve overrides and existing kinds.** An explicit `notification.link` still wins; all currently-mapped kinds and the `undefined` fallback for genuinely context-less kinds are unchanged.

**File:** `src/app/shifts/[id]/page.tsx` (worker view)

3. **Ensure the deep-link target hosts the action.** Confirm/add the worker check-in/check-out CTA on the worker shift-detail page, reusing `canCheckIn` / `canCheckOut` and the same handler the dashboard uses, so the worker can act in place. (The exploratory test in the Testing Strategy determines whether the CTA is already present or must be added.)

### Cluster 2 — Current user / reputation / upcoming hard-coding (P1/P2)

**BUG 3 — single reputation source (Req 2.3; preserve 3.3, 3.4)**

**File:** `src/domain/reputation.ts` (or a thin `src/stores` selector)

1. **Add `getWorkerReputation(userId)`** that reads `Worker.reputationScore` from `userStore` and returns the clamped score. This is a read-only accessor; the scoring rules stay in `reputation.ts` untouched.
2. **Route every reputation display through it** — worker dashboard `StatTile`, `UserMenu` trust chip, employer applicant badges, and the landing hero — so the same worker shows one value everywhere.

**BUG 2 — landing hero derives from current user + role (Req 2.2; preserve 3.3)**

**File:** `src/components/landing/FeaturedJobMockup.tsx`

3. **Remove the hard-coded `95` tile.** Render a reputation preview only when `useCurrentUser()` is a worker, sourcing the number from `getWorkerReputation(currentUser.id)`; otherwise omit the tile.
4. **Remove the hard-coded upcoming card.** Show the "Sắp diễn ra" card only when the current user has a real upcoming shift (derived from the shift/application stores for that user); otherwise omit it.
5. **Delete the now-unused literals** `landing.hero.featured.upcomingDay` / `upcomingTime` usage; keep labels that remain meaningful.

### Cluster 3 — Money consistency via derived data (P2)

**BUG 5 — one derived money source (Req 2.5; preserve 3.6, 3.7)**

**File:** `src/domain/finance.ts` (new, pure)

1. **Add a single derived computation** over the mock wallet ledger (`walletStore`) plus confirmed applications/shifts, exposing per-user: `walletBalance`, `totalIncome`, `totalPaid`, `guaranteed/deposit amount`, and `recentTransactions`. Pure functions; no store writes.
2. **Consume it on every money surface** — worker dashboard `totalEarnings` tile + income modal, employer dashboard `totalPaidOut`/`totalDeposited` tiles, and the wallet panel — replacing the three independent reductions with reads from the derived source so figures reconcile.
3. **Read-only over existing stores.** `walletStore` mutations, guards, and `backfillFromHistory` idempotency are unchanged; `calculateDeposit` and `transitionEscrow` are unchanged.

### Cluster 4 — Payment/escrow wording (P2)

**BUG 6 — clearer wording + demo note (Req 2.6)**

**File:** `src/i18n/vi.ts` and the surfaces that show the concept (`NavBar`, `Footer`, `/employer/payments`)

1. **Standardize the label** to a clearer phrase (e.g. "Giữ tiền ca làm (mô phỏng)" / "Mô phỏng giữ tiền để đảm bảo trả công").
2. **Add a mandatory demo note** ("Trong MVP/demo không có giao dịch thật.") wherever the concept appears.
3. Keep escrow **status** strings and routes intact; this is wording only.

### Cluster 5 — Handbook / footer (P3)

**BUG 7 — handbook content + menu label (Req 2.7; preserve 3.9)**

**Files:** `src/app/user-guide/page.tsx`, `src/i18n/vi.ts`, `NavBar`

1. **Rewrite the guide as an original practical handbook** for workers (satisfying employers, punctuality, communicating conflicts, cancelling well) and employers (attracting staff, clear descriptions, fair pay, reducing no-shows). Content is original, not copied from the web.
2. **Rename the menu label** `nav.label.userGuide` to "Cẩm nang" (or "Cẩm nang đi ca"). The route `/user-guide` stays valid (Req 3.9).

**BUG 8 — footer grouping (Req 2.8; preserve 3.8)**

**File:** `src/components/layout/Footer.tsx`

3. **Move "Bắt đầu nhanh"** out of `LEGAL_COLUMN` into the handbook/guide group; leave `LEGAL_COLUMN` with only Terms, Privacy, Dispute handling, and Contact support. Legal routes are unchanged (Req 3.8).

### Cluster 6 — Skill progress (P3)

**BUG 11 — per-skill bars in the worker profile modal (Req 2.11; preserve 3.10)**

**File:** `src/components/user/WorkerProfileModal.tsx`

1. **Replace the skills `ChipList`** with the existing `SkillProgressBar`, driven by `worker.skillScores` (via `buildSkillDisplayList` from `domain/skillProgression.ts`) so each skill shows a level/progress bar derived from the worker's data.
2. **Degrade gracefully** when the worker has no `skillScores` — render the existing placeholder / omit the section, leaving all non-skill sections untouched (Req 3.10).

### Cluster 7 — AI prototype (P3, last)

**BUG 9/10 — labelled mock assistant (Req 2.9, 2.10; preserve 3.11)**

**Files:** new components under `src/components/` + reuse `domain/availabilityMatch.ts` (`suggestShiftsForWorker`)

1. **Worker assistant:** takes a free schedule and returns matching shifts from the mock store using the existing `suggestShiftsForWorker` logic.
2. **Employer assistant:** takes free-text needs and returns a suggested title/description/time/pay/required-skills draft computed locally from mock data heuristics.
3. **Label every output** "Gợi ý AI trong demo" and make **no** network/API call (Req 3.11).

## Testing Strategy

### Validation Approach

Two phases per cluster: first surface counterexamples that demonstrate the bug on the **unfixed** code, then verify the fix works and preserves everything outside the bug condition. After each cluster: `tsc`, `eslint`, and the UI anti-pattern detector. No commits.

### Exploratory Bug Condition Checking

**Goal:** Surface counterexamples on the UNFIXED code to confirm (or refute) each root-cause hypothesis. If refuted, re-hypothesize before fixing.

**Test Plan:** For each cluster, construct the buggy input and assert the correct behavior — expecting failure on current code.

**Test Cases:**

1. **Attendance CTA (BUG 1):** Build an `(application, shift, now)` in `BothConfirmedPresent` and assert the employer row renders no "Đánh dấu vắng mặt" CTA (fails now — the disabled red button renders).
2. **Deep-link (BUG 4):** Call `resolveNotificationTarget` for a worker `ShiftStartingSoon` with a `shiftId` and assert it returns the worker shift-detail link (fails now — returns `undefined`); assert the target renders a check-in action when the gate allows.
3. **Landing hero (BUG 2):** Render the hero as an employer / logged-out and assert no `95` tile and no fabricated upcoming card (fails now).
4. **Reputation divergence (BUG 3):** For one worker, assert dashboard and hero reputation reads are equal (fails now — 80 vs 95).
5. **Money (BUG 5):** For a seeded account, assert `walletBalance`, `totalIncome`, `totalPaid` come from the derived source and reconcile (fails now — three sources).
6. **Wording (BUG 6):** Assert every payment-guarantee surface includes the no-real-transactions note (fails now).
7. **Handbook/footer (BUG 7/8):** Assert menu label is "Cẩm nang" and "Bắt đầu nhanh" is not under LEGAL (fails now).
8. **Skills (BUG 11):** Render the modal for a worker with `skillScores` and assert progress bars, not flat chips (fails now).
9. **AI (BUG 9/10):** Assert an assistant exists and its output is labelled "Gợi ý AI trong demo" (fails now — none exists).

**Expected Counterexamples:** the stray disabled red button in `BothConfirmedPresent`; `resolveNotificationTarget` → `undefined` for `ShiftStartingSoon`; literal `95`; divergent reputation reads; three money sources; missing demo note; "Bắt đầu nhanh" under LEGAL; flat chips; no assistant.

### Fix Checking

**Goal:** For all inputs where the bug condition holds, the fixed surface produces the expected behavior.

**Pseudocode:**

```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderFixed(input)
  ASSERT expectedBehavior(result)   // per the matching Property 1..10
END FOR
```

### Preservation Checking

**Goal:** For all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original.

**Pseudocode:**

```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT renderOriginal(input) = renderFixed(input)
END FOR
```

**Testing Approach:** Property-based testing (fast-check, already a dev dependency) is recommended for preservation, especially for the pure domain layers (attendance states, reputation rules, deposit/escrow, wallet mutations, derived money). It generates many inputs across the domain and catches edge cases manual tests miss. Observe behavior on UNFIXED code first, then encode it.

**Test Cases:**

1. **Attendance preservation:** Across all non-`BothConfirmedPresent` states (property-based over the state enum), assert identical copy + actions, including no-show still showing mark-absent.
2. **Reputation rules preservation:** Property-based over reputation events — `applyReputationEvent` output unchanged; only the display reader changed.
3. **Money domain preservation:** Property-based over wallet mutation sequences — balances, ledger append-only, never negative, `calculateDeposit`, `transitionEscrow` all unchanged.
4. **Notification routing preservation:** For non-check-in kinds and explicit-link notifications, `resolveNotificationTarget` returns the original destination.
5. **Routes preservation:** `/user-guide`, `/safety`, and the four legal links still resolve.
6. **Profile modal preservation:** Non-skill sections and the no-skill-data path render unchanged.

### Unit Tests

- Attendance action-row gating for each `AttendanceState` (especially `BothConfirmedPresent` vs `WorkerCheckedInInProgress`).
- `resolveNotificationTarget` for check-in kinds, non-check-in kinds, and explicit-link overrides.
- `getWorkerReputation` returns the same value the dashboard and hero render.
- Derived money functions for representative worker/employer seeds.
- `WorkerProfileModal` skill rendering with and without `skillScores`.

### Property-Based Tests

- Reputation-rule invariance under random event sequences.
- Wallet balance/ledger invariance (never negative; sum-of-ledger equals balance) under random mutation sequences.
- Reputation display equality across surfaces for random worker states.
- Derived money reconciliation (income/paid/balance consistency) across random ledger/shift states.

### Integration Tests

- E2E: worker taps a `ShiftStartingSoon` notification → lands on the shift detail with the check-in action (extends the existing Playwright `03-checkin-window` / notification specs).
- E2E: employer marks present after the worker self-confirms → row shows the waiting-for-checkout banner with no "Đánh dấu vắng mặt" CTA.
- E2E: worker and employer money figures reconcile across dashboard and wallet panel for a seeded account.
- E2E: footer/menu — "Cẩm nang" label present, "Bắt đầu nhanh" in the guide group, legal links still route.
