# Bugfix Requirements Document

## Introduction

This batch fixes demo-logic and data-consistency defects that testers found in the CaLẻ / ShiftNow demo — a Next.js shift-marketplace MVP with worker, employer, and admin roles backed by mock, browser-stored data (no real transactions). The defects group into four themes: flow/state correctness (the attendance CTA after both sides confirm presence, and check-in notification deep-links), data consistency (reputation score, wallet/income figures, and hard-coded landing previews), content and navigation clarity (payment-guarantee wording, the handbook, and footer grouping), and demo-experience gaps (a mock AI suggestion assistant and per-skill progress in the worker profile).

Because the product is a demo, the guiding principle is that every number and preview must be "simulated with logic" derived from the current user, role, and mock data rather than hard-coded, and that copy must make the demo nature explicit. Fixes are prioritized P1 → P2 → P3, starting with the check-in/absence flow and data consistency, then content/navigation, then the demo prototypes.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a worker and employer have both confirmed presence for a shift (attendance state "both confirmed present", copy "Hai bên đã xác nhận có mặt…") THEN the system still shows "Đánh dấu vắng mặt" (Mark absent) as a primary red/pink CTA, which contradicts the confirmation copy.

1.2 WHEN the public landing hero renders THEN the system shows a hard-coded "Sắp diễn ra" (Upcoming) card and a hard-coded "95" reputation preview regardless of whether the current viewer is a worker or actually has any upcoming shift.

1.3 WHEN a worker's reputation is shown in more than one place THEN the system displays inconsistent values (for example the account dropdown shows the real score "80/100" while the home/hero shows "95/100") because there is no single shared reputation source.

1.4 WHEN a worker taps a check-in–related notification THEN the system does not reliably open that shift's detail with the check-in/check-out action present, so the worker has to leave and return to the dashboard to act.

1.5 WHEN wallet balance, total income, total paid, payment-guaranteed/deposit amount, and recent transactions are shown across screens and demo accounts THEN the system displays figures that do not reconcile, because they are sourced or hard-coded independently instead of being derived from one computation over the mock transactions/shifts.

1.6 WHEN the "đảm bảo thanh toán" (payment guarantee) concept is shown THEN the system uses wording testers found confusing and does not consistently state that the demo has no real transactions.

1.7 WHEN a user opens the guide/handbook and its menu entry THEN the system presents it as "Tin cậy & An toàn" (Trust & Safety) / "Tin cậy & cẩm nang" rather than a practical handbook aimed at workers and employers.

1.8 WHEN a user views the footer THEN the system lists "Bắt đầu nhanh" (Quick start / user guide) under the "Pháp lý & Hỗ trợ" (Legal & Support) group instead of under the handbook/guide group.

1.9 WHEN a worker wants help finding shifts THEN the system provides no assistant that takes the worker's free schedule and suggests matching shifts from the mock data.

1.10 WHEN an employer wants help creating a shift THEN the system provides no assistant that takes the employer's needs and suggests a title, description, time, pay, and required skills.

1.11 WHEN an employer opens a worker's profile modal THEN the system lists skills as flat chips with no per-skill progress or level, and does not derive per-skill levels from the worker's mock skill data.

### Expected Behavior (Correct)

2.1 WHEN a worker and employer have both confirmed presence for a shift THEN the system SHALL move the primary state to waiting-for-checkout / end-of-shift and SHALL NOT show "Đánh dấu vắng mặt" as a primary CTA; any absence reporting SHALL be relocated to a secondary or dispute flow consistent with the "both confirmed" copy.

2.2 WHEN the public landing hero renders THEN the system SHALL show an "Upcoming" card only when the current user actually has an upcoming shift, and SHALL show a worker reputation preview only when the current user is a worker, deriving all values from the current user/role and mock data (no fake upcoming card, no hard-coded 95).

2.3 WHEN a worker's reputation is shown anywhere THEN the system SHALL read it from a single shared source (for example `getWorkerReputation(currentUserId)` or one store/domain source) so every surface shows the same value for the same worker.

2.4 WHEN a worker taps a check-in–related notification THEN the system SHALL deep-link into the corresponding shift's detail, and that detail SHALL contain the matching check-in/check-out action so the worker can act without returning to the dashboard.

2.5 WHEN wallet balance, total income, total paid, payment-guaranteed/deposit amount, and recent transactions are shown THEN the system SHALL derive them all from a single computation over the mock transactions/shifts so they reconcile everywhere, verified per demo account (worker and employer).

2.6 WHEN the payment-guarantee concept is shown THEN the system SHALL use clearer wording (for example "Giữ tiền ca làm (mô phỏng)", "Tiền ca được giữ tạm trong demo", or "Mô phỏng giữ tiền để đảm bảo trả công") and SHALL always include a note that there are no real transactions in the MVP/demo ("Trong MVP/demo không có giao dịch thật.").

2.7 WHEN a user opens the guide/handbook and its menu entry THEN the system SHALL present original, short, practical handbook content for both audiences — workers (satisfying employers, arriving on time, communicating schedule conflicts, handling wanting to cancel a shift) and employers (attracting staff, writing clear shift descriptions, setting appropriate pay, reducing cancellations/no-shows) — and the menu SHALL read "Cẩm nang" or "Cẩm nang đi ca".

2.8 WHEN a user views the footer THEN the system SHALL place "Bắt đầu nhanh"/quick-start in the handbook/guide group, and the "Pháp lý & Hỗ trợ" group SHALL contain only Terms, Privacy, Dispute handling, and Contact support.

2.9 WHEN a worker enters their free schedule in the assistant THEN the system SHALL suggest matching shifts from the mock shifts and SHALL clearly label the output as "Gợi ý AI trong demo" (a mock prototype, no real AI backend).

2.10 WHEN an employer enters their needs in the assistant THEN the system SHALL suggest a title, description, time, pay, and required skills as a mock prototype clearly labeled "Gợi ý AI trong demo" (no real AI/API call).

2.11 WHEN an employer opens a worker's profile modal THEN the system SHALL show each skill with a clearer progress/level bar (for example "Phục vụ 85%", "Thu ngân 72%", "Tiếng Anh giao tiếp 60%") derived from that worker's mock skill data, not a value hard-coded the same for everyone.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a worker checks in, an employer marks a worker present, a worker checks out, or a worker genuinely no-shows (any state other than "both confirmed present") THEN the system SHALL CONTINUE TO drive the existing attendance state machine with the correct role-aware copy and actions.

3.2 WHEN a worker is genuinely absent (never checked in within the window) THEN the system SHALL CONTINUE TO let the employer report the absence/no-show through the appropriate secondary or dispute flow.

3.3 WHEN a logged-in worker views their own dashboard THEN the system SHALL CONTINUE TO show their real reputation score, completed-shift count, earnings, and upcoming shifts derived from their own data.

3.4 WHEN reputation events occur (completed +5, late-cancel −10, no-show −20, admin adjustment, clamped to 0–100, apply threshold 50) THEN the system SHALL CONTINUE TO compute scores using the existing reputation rules.

3.5 WHEN a non-check-in notification is tapped, or a notification that already routes correctly is tapped THEN the system SHALL CONTINUE TO route to its existing destination without regression.

3.6 WHEN wallet mutations occur (credit, debit, top-up, and withdraw with its invalid-amount and insufficient-balance guards, plus history-backfill idempotency) THEN the system SHALL CONTINUE TO update balances and the append-only ledger correctly, never producing a negative wallet.

3.7 WHEN a shift's deposit amount is computed (wage × hours × positions) and its escrow status transitions THEN the system SHALL CONTINUE TO produce the same values and the same legal transitions.

3.8 WHEN a user follows the footer legal links (Terms, Privacy, Dispute handling, Contact support) THEN the system SHALL CONTINUE TO route to the correct existing pages.

3.9 WHEN a user navigates to existing guide/safety routes (for example /user-guide and /safety) THEN the system SHALL CONTINUE TO reach a valid page after the handbook and menu rename.

3.10 WHEN an employer views the non-skill sections of a worker profile modal (identity, verification summary, stats, bio, rating history), or views a worker who has no recorded skill data THEN the system SHALL CONTINUE TO render those sections correctly and gracefully.

3.11 WHEN the demo runs THEN the system SHALL CONTINUE TO make no real external AI/API calls and no real financial transactions.
