# Implementation Plan: Phase 10C — Escrow Release Lifecycle

## Overview

This plan converts the approved Phase 10C requirements and design into incremental, reviewable coding tasks for the existing Next.js 16 + Zustand 5 + Tailwind v4 mock app. No new routes are added; the build invariant stays at exactly 28 routes, and the existing 165 tests must keep passing. Every task references specific Requirement clauses so the design's traceability survives implementation. Top-level groups are ordered so that no later task depends on a yet-to-be-introduced type or helper: types and the pure evidence helpers are seeded first, then UI surfaces, then the auto-release lifecycle, ledger updates, admin queue, notifications, docs, and finally the dedicated test file plus copy/route validation.

Stack invariants preserved on every task:

- Mock-only persistence (Zustand 5 + localStorage via `src/data/persistence.ts`); no backend, payment gateway, OTP, or external API.
- Next.js 16 App Router — implementers MUST read `node_modules/next/dist/docs/` before touching any App Router page (`AGENTS.md`).
- Tailwind v4 directives in CSS only — no Tailwind config file, no `dark:` variant, no `prefers-color-scheme: dark` media block.
- Currency in user-facing copy uses lowercase `đ` or spelled-out `đồng`; the strings `VNĐ` and `₫` are forbidden.
- User-facing prose refers to surfaces by visible page name, button label, or menu label — never by `Raw_Route_Path` tokens.
- Section 11 cross-phase invariants from prior phases stay intact (numeric changes always producing history records, applicant approve/reject blocked after shift start, pending-application-expiry idempotency, modals close on outside click, etc.).

## Tasks

- [x] 1. Types and constants
  - [x] 1.1 Add `EvidenceRequirement`, dispute category enums, and extended `DisputeStatus` in `src/types/index.ts`
    - Add `EvidenceRequirement` literal union (`'None' | 'ChecklistOnly' | 'OptionalPhoto' | 'RequiredPhoto' | 'RequiredHandoverChecklist'`).
    - Extend `Shift` with optional `evidenceRequirement?: EvidenceRequirement` (optional so legacy snapshots round-trip).
    - Extend `Application` with optional `checkoutChecklist?: boolean[]`, `workerCheckoutNote?: string`, `workerEvidenceFileName?: string`, `autoReleaseAt?: string`, `autoReleased?: boolean`.
    - Extend `Dispute` with required `category` (employer-side or worker-side enum), required `reason: string`, optional `evidenceDescription?: string`, optional `evidenceFileName?: string`. Keep existing fields.
    - Extend `DisputeStatus` union with `'PartialRelease' | 'RequestedMoreEvidence' | 'ClosedInvalid'`, retaining all pre-existing values.
    - Add and export `EmployerDisputeCategory` and `WorkerDisputeCategory` literal unions matching Requirements 7.2 and 7.3.
    - Affected files: `src/types/index.ts`.
    - Acceptance: `tsc` compiles; existing tests still type-check; no field is made required on legacy records.
    - _Requirements: 1.1, 4.11, 6.1, 7.1, 7.2, 7.3, 8.12_

  - [x] 1.2 Add `EVIDENCE_REQUIREMENT_VALUES`, label/helper dictionaries, and `CHECKOUT_CHECKLIST_ITEMS_VI`
    - Export `EVIDENCE_REQUIREMENT_VALUES: readonly EvidenceRequirement[]` in stable picker order in `src/domain/evidence.ts`.
    - In `src/i18n/vi.ts`, add the structured key namespaces from the design's Vietnamese label dictionary: `evidence.requirement.*`, `evidence.helper.*`, `evidence.privacy.warning`, `evidence.suggestedChip`, `error.evidence.*`, `dispute.status.PartialRelease`, `dispute.status.RequestedMoreEvidence`, `dispute.status.ClosedInvalid`.
    - In `src/i18n/vi.ts`, export `CHECKOUT_CHECKLIST_ITEMS_VI: Record<EvidenceRequirement, string[]>` exactly as listed in the design's "Static checkout-checklist template" table.
    - Export `EMPLOYER_DISPUTE_CATEGORIES` and `WORKER_DISPUTE_CATEGORIES` `readonly` arrays from `src/types/index.ts` (or `src/domain/disputes.ts` if a domain home is preferred — pick one and re-export from the same module that owns the enums).
    - Affected files: `src/domain/evidence.ts` (new), `src/i18n/vi.ts`, `src/types/index.ts`.
    - Acceptance: every Vietnamese label is 1–80 chars, contains at least one diacritic, is not the literal English name; `t('evidence.requirement.None')` etc. round-trips; no `VNĐ` / `₫` introduced.
    - _Requirements: 1.7, 12.6_

- [x] 2. Evidence requirement helper
  - [x] 2.1 Implement `getSuggestedEvidenceLevel`, `suggestedEvidenceForJobType`, and `validateCheckoutPayload` in `src/domain/evidence.ts`
    - Implement `getSuggestedEvidenceLevel(jobType, riskLevel)` per the design's mapping table: `Low → 'ChecklistOnly'`, `Medium → 'OptionalPhoto'`, `High → 'RequiredHandoverChecklist'`. Out-of-enum or empty `jobType` returns the safe default `'RequiredHandoverChecklist'`.
    - Implement `suggestedEvidenceForJobType(jobType)` as `getSuggestedEvidenceLevel(jobType, jobCategoryRiskLevel(jobType))` (composition equation, Property 2).
    - Implement `validateCheckoutPayload(requirement, payload)` returning `{ ok: true } | { ok: false; reason: 'CHECKLIST_INCOMPLETE' | 'PHOTO_REQUIRED' | 'NOTE_REQUIRED' | 'FIELD_TOO_LONG' }` exactly per the design's per-level rules table. Pure: never throws, no clock reads, no globals, no module-level mutation.
    - Export `EvidenceValidationFailure` and `CheckoutPayload` types.
    - Affected files: `src/domain/evidence.ts`.
    - Acceptance: two successive calls with identical args return strictly equal results; reachable module-level state snapshot is deep-equal before/after; no `Date.now()`, `Math.random()`, or I/O inside the module.
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 1.9, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 3. Shift posting UI for evidence requirement
  - [x] 3.1 Add the "Bằng chứng sau ca" fieldset to `ShiftForm` with picker, suggested chip, and high-risk gating
    - Render a `<fieldset>` "Bằng chứng sau ca" with a 5-radio picker over `EVIDENCE_REQUIREMENT_VALUES`, each option labelled by `evidence.requirement.*` with a one-line `evidence.helper.*` underneath.
    - Pre-select `suggestedEvidenceForJobType(values.jobType)` when the form first mounts for a new shift; show a "Hệ thống đề xuất" chip next to the suggested option whenever `jobType` is non-empty.
    - Render the privacy warning beginning with `Không yêu cầu chụp khách hàng, giấy tờ cá nhân` (key `evidence.privacy.warning`).
    - When `jobCategoryRiskLevel(values.jobType) === 'High'`, restrict the picker to `RequiredHandoverChecklist` and `RequiredPhoto`; disable the three lower options. If the form is submitted with a sub-`RequiredHandoverChecklist` value while the resolved risk is `High`, set `errs.evidenceRequirement = t('error.evidence.tooLowForHighRisk')` and do NOT invoke the parent submit handler; preserve all currently-entered values.
    - Persist `evidenceRequirement` on the `NewShiftInput` payload submitted via `useShiftStore.create`.
    - Affected files: `src/components/forms/ShiftForm.tsx`, `src/stores/shiftStore.ts` (only to accept the new field on `NewShiftInput`/`UpdateShiftInput`).
    - Acceptance: shifts created via `ShiftForm` always carry an explicit `evidenceRequirement`; high-risk gating blocks submission with an inline Vietnamese message; existing edit flow round-trips the field.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 3.2 Mount `<HelpPopover>` inside the `ShiftForm` evidence fieldset
    - Place a `<HelpPopover title="Cách chọn mức bằng chứng" description={…40–800 chars…}/>` inside the same `<fieldset>` as the picker.
    - Description is Vietnamese prose, 40–800 chars, no `Raw_Route_Path` token, currency uses `đ` / `đồng` only if money is mentioned.
    - Affected files: `src/components/forms/ShiftForm.tsx`, `src/i18n/vi.ts` (help body key).
    - Acceptance: popover dismisses on Escape, outside click, or close button and restores keyboard focus to the trigger.
    - _Requirements: 9.1, 9.5, 9.6, 9.7_

- [x] 4. Worker-facing evidence/payment education
  - [x] 4.1 Add the "Quy trình thanh toán & bằng chứng" card to the worker shift detail page
    - Mount the card on `src/app/shifts/[id]/page.tsx` (Next.js 16 App Router page — implementer reads `node_modules/next/dist/docs/` first), positioned ABOVE the apply section in the page's vertical flow.
    - Body is Vietnamese prose explaining (a) payment is released on employer confirmation after the shift, and (b) the 12 h Auto_Release rule when no dispute is open. No `Raw_Route_Path` tokens; currency in `đ` / `đồng` only.
    - Display the Vietnamese label for the shift's current `evidenceRequirement` via `t('evidence.requirement.<value>')`.
    - When `shift.evidenceRequirement ∈ {'RequiredPhoto', 'RequiredHandoverChecklist'}`, render a banner beginning with `Ca này yêu cầu bằng chứng bàn giao` either inside the card or immediately above/below it on the same section.
    - Render a Vietnamese fallback message in place of the card content when the shift cannot be loaded or `evidenceRequirement` is missing.
    - Affected files: `src/app/shifts/[id]/page.tsx` (App Router page), small co-located component if helpful (e.g. `src/components/shift/PaymentEvidenceCard.tsx`).
    - Acceptance: card renders above the apply section; banner appears for high-evidence shifts; non-owner viewers see no `evidenceFileName` text; never a blank space when the shift is missing.
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 4.2 Mount the worker-side `<HelpPopover>` on the payment & evidence card
    - Place a `<HelpPopover title="Cách bạn được thanh toán" description={…40–800 chars…}/>` adjacent to the card's `<h2>` (same flex/grid container).
    - Body explains payment release and the 12 h Auto_Release rule; Vietnamese prose, 40–800 chars, no `Raw_Route_Path` tokens, `đ` / `đồng` only.
    - Affected files: `src/app/shifts/[id]/page.tsx` (or `src/components/shift/PaymentEvidenceCard.tsx`), `src/i18n/vi.ts`.
    - Acceptance: popover dismisses on Escape / outside click / close button and restores focus to its trigger.
    - _Requirements: 9.2, 9.5, 9.6, 9.7_

- [x] 5. Worker check-out dialog and validation
  - [x] 5.1 Refactor `useApplicationStore.checkOut` to accept the structured payload and enforce evidence
    - Change the signature to `checkOut(input: { applicationId: string; checklist?: boolean[]; note?: string; evidenceFileName?: string }): Result<Application, CheckoutError>` where `CheckoutError = 'APPLICATION_NOT_FOUND' | 'WRONG_STATUS' | { code: 'EVIDENCE_REQUIRED'; reason: EvidenceValidationFailure }`.
    - Order of operations exactly as specified in the design: resolve application → reject `APPLICATION_NOT_FOUND` → reject `WRONG_STATUS` unless `status === 'CheckedIn'` → resolve linked Shift and read `shift.evidenceRequirement` (default `'None'` only for legacy seed shifts) → call `validateCheckoutPayload(requirement, payload)`.
    - On validation failure, leave the application untouched (no field writes, `autoReleaseAt` stays absent) and return `{ ok: false, error: { code: 'EVIDENCE_REQUIRED', reason } }`.
    - On success, compute `checkOutAt = nowIso()` and `autoReleaseAt = checkOutAt + 43_200_000 ms`, persist `status: 'CheckedOut'`, `checkOutAt`, `autoReleaseAt`, `checkoutChecklist`, `workerCheckoutNote: note?.trim() || ''`, `workerEvidenceFileName: evidenceFileName ?? ''`. Drive the existing escrow + shift transitions exactly as today (`transitionEscrow('WorkerCheckOut')`, the `setStatus(shift.id, 'AwaitingConfirmation')` rollover when applicable).
    - Persist via the existing `STORAGE_KEYS.applications` write helper — no ad-hoc localStorage calls.
    - Update every existing call site that passes a positional `applicationId` to use the new payload shape.
    - Affected files: `src/stores/applicationStore.ts`, every call site (worker dashboard upcoming card, any tests using positional `checkOut`).
    - Acceptance: existing 165 tests still pass; rejected `EVIDENCE_REQUIRED` leaves application deep-equal to its pre-call snapshot; success path sets `autoReleaseAt = checkOutAt + 12 h` exactly.
    - _Requirements: 4.9, 4.10, 4.11, 4.12, 6.2_

  - [x] 5.2 Implement `CheckoutDialog`
    - Create `src/components/forms/CheckoutDialog.tsx` exposing `{ open, onClose, application, shift, onSubmit, loading?, errorMessage? }`.
    - Layout per the design: dialog title `t('checkout.dialog.title')`, intro paragraph, conditional checklist (driven by `CHECKOUT_CHECKLIST_ITEMS_VI[shift.evidenceRequirement]`), photo filename input (mock; helper text `Tên tệp ảnh` / `Bản MVP không tải tệp thật`), handover note `<Textarea maxLength={1000}/>`.
    - Submit button enabled iff `validateCheckoutPayload(shift.evidenceRequirement, currentPayload).ok === true`. On submit, call `props.onSubmit(payload)`. On `EVIDENCE_REQUIRED`, dialog stays open and `errorMessage` resolves to the localized `t('error.evidence.<reason>')`.
    - Close paths: outside click, Escape, "Đóng" button (Section 11 invariant); reuse the existing `Modal` primitive so focus trap and `aria-modal` are inherited.
    - Mount `<HelpPopover title="Vì sao cần bằng chứng?" description={…}/>` below the dialog intro paragraph (≈200 chars, Vietnamese, no `Raw_Route_Path`).
    - Wire invocation from the worker dashboard upcoming card's existing "Check-out" button and from the worker shift detail page's check-out CTA.
    - Affected files: `src/components/forms/CheckoutDialog.tsx` (new), `src/app/worker/dashboard/page.tsx` (App Router page — read Next.js docs first), `src/app/shifts/[id]/page.tsx`, `src/components/forms/index.ts`, `src/i18n/vi.ts`.
    - Acceptance: rendered checklist length matches `CHECKOUT_CHECKLIST_ITEMS_VI[level]`; submit disabled mirrors the validator; on rejection, no application fields are written.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 9.3, 9.5, 9.6, 9.7_

- [x] 6. Employer confirmation/dispute panel
  - [x] 6.1 Implement `<AutoReleaseCountdown/>` presentational component
    - Create `src/components/shift/AutoReleaseCountdown.tsx` exposing `{ autoReleaseAt: string; nowSource?: () => number }`.
    - Render `hh:mm:ss` from `Math.max(0, Date.parse(autoReleaseAt) - now)`. When `remainingMs === 0`, render exactly `'00:00:00'` and stop re-scheduling.
    - Single UI-local `setInterval(..., 1000)` for the lifetime of the mounted component (presentational only — never mutates store state). The interval is cleared on unmount and when the countdown reaches zero.
    - `aria-label="Đếm ngược tự động thanh toán"`, `data-testid="auto-release-countdown"` so Property 18 / Requirement 11.12 can locate it.
    - Affected files: `src/components/shift/AutoReleaseCountdown.tsx` (new), `src/components/shift/index.ts`.
    - Acceptance: rendered text matches `/^\d{2}:\d{2}:\d{2}$/`; clamps at `00:00:00` for past timestamps; no store mutation; the only timer in the file is the `setInterval` documented in the design.
    - _Requirements: 5.7, 5.8_

  - [x] 6.2 Render the employer confirmation panel block per `CheckedOut` application
    - In `src/app/employer/shifts/[id]/page.tsx` (App Router page — read Next.js 16 docs first), extend each per-application block when `application.status === 'CheckedOut'` with:
      - Worker check-out time formatted via `Intl.DateTimeFormat('vi-VN', { day, month, year, hour, minute })`.
      - Binary checklist indicator: `Đã tích đầy đủ` success badge or `Còn N mục chưa tích` based on `checkoutChecklist`.
      - Read-only handover note block; placeholder `Người làm không gửi ghi chú bàn giao` when empty.
      - Read-only filename span; placeholder `Người làm không gửi tệp bằng chứng` when empty. Plain non-interactive text, no link, no file fetch.
      - `<AutoReleaseCountdown autoReleaseAt={application.autoReleaseAt!} />` plus a `<HelpPopover title="Đếm ngược 12 giờ" description={…220 chars…}/>` rendered in the same flex/grid container.
      - The existing `<RatingForm onSubmit={…confirmCompletion…}/>` as the SOLE confirm trigger on the panel (Requirement 5.9).
      - A "Khiếu nại" button that opens `DisputeDialog` with `side="employer"`.
    - Affected files: `src/app/employer/shifts/[id]/page.tsx`, possibly a co-located `EmployerConfirmationPanel` component for clarity.
    - Acceptance: when `autoReleaseAt` is in the future the countdown refreshes ≥1× per second; in the past it shows `00:00:00`; the panel never exposes file bytes or PII.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 9.4, 9.5, 9.6, 9.7_

  - [x] 6.3 Implement `DisputeDialog` and the `reportIssue`/`workerOpenDispute` store actions
    - Create `src/components/forms/DisputeDialog.tsx` exposing `{ open, onClose, side: 'employer' | 'worker', application, shift, onSubmit, loading?, errorMessage? }`. Renders a category `<select>` driven by `EMPLOYER_DISPUTE_CATEGORIES` or `WORKER_DISPUTE_CATEGORIES`, a required `reason` `<Textarea>` (1–1000 chars), an optional `evidenceDescription` `<Textarea>` (≤2000 chars), and an optional `evidenceFileName` text input (≤255 chars).
    - In `src/stores/applicationStore.ts`, refactor `reportIssue` to accept `{ applicationId, category, reason, evidenceDescription?, evidenceFileName? }` and add a sibling `workerOpenDispute(applicationId, payload)`. Both validate per the design's order: trim `reason` → reject `REASON_REQUIRED` when empty → reject `FIELD_TOO_LONG` for any over-length field → reject `CATEGORY_REQUIRED` / `CATEGORY_INVALID` (including wrong-role mismatches) → reject `APPLICATION_NOT_FOUND` → reject `WRONG_STATUS` when application is already `'Disputed'` or in any non-disputable status. Filename hygiene: strip whitespace; reject values containing `'/'` or `'\\'` with `FIELD_TOO_LONG`.
    - On success, build a `Dispute` (`id = newPrefixedId('dispute')`, `category`, trimmed `reason`, optional fields, `raisedBy = 'employer' | 'worker'`, `status: 'Open'`, `createdAt: nowIso()`), push onto `applicationStore.disputes` via the existing persistence helper, and flip the application's status to `'Disputed'`.
    - Wire the dispute dialog's submit handler to `reportIssue` (employer panel) and `workerOpenDispute` (any worker entry point exposed via the worker shift detail / dashboard if/when used). On rejection, stay open with the offending field highlighted.
    - Affected files: `src/components/forms/DisputeDialog.tsx` (new), `src/components/forms/index.ts`, `src/stores/applicationStore.ts`, `src/app/employer/shifts/[id]/page.tsx`, `src/i18n/vi.ts`.
    - Acceptance: round-trip persistence preserves `category`, `reason`, `evidenceDescription`, `evidenceFileName` exactly; second dispute on an already-`'Disputed'` application is rejected; non-admin viewers never see `evidenceFileName`.
    - _Requirements: 5.10, 5.11, 7.1, 7.2, 7.3, 7.4, 7.5, 7.7, 7.8, 7.9_

- [x] 7. Auto-release lifecycle
  - [x] 7.1 Implement `useApplicationStore.autoReleaseEligibleApplications(nowIso?)`
    - Add the action to `src/stores/applicationStore.ts` returning `{ releasedIds: string[] }`.
    - Eligibility predicate exactly as designed: `status === 'CheckedOut' && autoReleased !== true && typeof autoReleaseAt === 'string' && autoReleaseAt.length > 0 && Date.parse(autoReleaseAt) <= Date.parse(nowIso ?? new Date().toISOString()) && !openDisputeAppIds.has(a.id)`. The `Open_Dispute` set is derived from the live `disputes` array as `d.status ∉ {'ResolvedReleased', 'ResolvedRefunded', 'PartialRelease', 'ClosedInvalid'}`.
    - Per-eligible application: atomic update to `status: 'Confirmed'`, `confirmedAt: nowIso`, `autoReleased: true`, plus a default 5-star Rating built via the existing `confirmCompletion` flow (no rating prompt). Wrap each per-record block in `try { … } catch (err) { logDevWarning(a.id, err) }` so per-record error isolation holds (Requirement 6.10).
    - Idempotency: because the predicate filters on `autoReleased !== true`, a second call with no external changes finds zero eligible records and returns `{ releasedIds: [] }`; persisted snapshot is byte-identical between successive runs.
    - Persistence: write once at the end of the pass through the existing per-store `write(...)` helper (`STORAGE_KEYS.applications`, `STORAGE_KEYS.ratings`, etc.). NO new localStorage write paths.
    - Mock-only: NO `setTimeout`, NO `setInterval`, NO `requestAnimationFrame` polling, NO `fetch`, NO external API.
    - Affected files: `src/stores/applicationStore.ts`.
    - Acceptance: idempotent on second invocation; one fault-injected eligible record does not abort the loop; applications with an Open_Dispute remain unchanged.
    - _Requirements: 6.3, 6.4, 6.5, 6.6, 6.8, 6.10_

  - [x] 7.2 Wire `autoReleaseEligibleApplications` ONLY into `useLifecycleSync` and `AppHydrator`
    - **Reconciliation note (tracker sync):** Implemented via the canonical `applicationStore.runLifecycleSync()` orchestrator instead of a direct call. Both wired mount points (`src/lib/useLifecycleSync.ts` and `src/components/layout/AppHydrator.tsx`) call `runLifecycleSync()`, whose Step 4 invokes `autoReleaseEligibleApplications(at)`. Net effect matches the design: auto-release runs only on those two page-mount surfaces, with no `setTimeout`/`setInterval`/polling on the path. The literal "exactly two direct call sites" wording is satisfied functionally through the orchestrator.
    - In `src/lib/useLifecycleSync.ts`, append `useApplicationStore.getState().autoReleaseEligibleApplications();` AFTER the existing `expirePendingApplicationsForStartedShifts()` call inside the existing `useEffect`.
    - In `src/components/layout/AppHydrator.tsx`, append the same call after `expirePendingApplicationsForStartedShifts()` in the post-hydration boot block.
    - VERIFY no other module in `src/` invokes `autoReleaseEligibleApplications`. Add no `setTimeout`, `setInterval`, or polling to either site.
    - Affected files: `src/lib/useLifecycleSync.ts`, `src/components/layout/AppHydrator.tsx`.
    - Acceptance: a repository grep shows exactly two call sites for `autoReleaseEligibleApplications` (`useLifecycleSync.ts` and `AppHydrator.tsx`); no `setTimeout` / `setInterval` introduced on the auto-release path.
    - _Requirements: 6.7, 6.9, 12.9_

- [ ] 8. Ledger/history updates
  - [x] 8.1 Route auto-release through existing notification/ledger helpers (Section 11 invariant)
    - Ensure the per-record auto-release block in `autoReleaseEligibleApplications` reuses the existing `confirmCompletion` flow and existing `notificationStore.push(...)` helpers so each numeric change emits one `ShiftCompletedConfirmed` notification (or equivalent existing kind) and creates exactly one `Rating` record. The `autoReleased: true` flag is the audit marker for "auto vs manual" — DO NOT add a new `localStorage` key.
    - Verify with a code search that the action does not bypass `useShiftStore.transitionEscrow` or `notificationStore.push`.
    - Affected files: `src/stores/applicationStore.ts`, `src/stores/notificationStore.ts` (no behavior change, just confirmation that auto-release reuses it).
    - Acceptance: every auto-released application has a matching new Rating + Notification; no orphan `localStorage` keys are written.
    - _Requirements: 6.4, 12.10, 12.11_

  - [ ] 8.2 Implement `useAdminStore.resolveDisputeExtended` for the five outcomes (numeric paths only)
    - **Reconciliation note (PENDING — implementation diverged):** The shipped admin store does NOT expose `resolveDisputeExtended`. Instead it ships two simpler actions that cover the demo's needs: `resolveDispute(disputeId, 'ResolvedReleased' | 'ResolvedRefunded', note)` (the two full-release/full-refund outcomes, with escrow flip + ledger notification) and `requestMoreEvidence(disputeId, target, note)` (sets `status = 'RequestedMoreEvidence'`, no escrow change). The `'PartialRelease'` (with `releaseAmount` validation + `INVALID_AMOUNT`) and `'ClosedInvalid'` outcomes are NOT wired in the store. The extended `DisputeStatus` literals and the `WorkerPartialRelease`/`EmployerPartialRefund` ledger-kind labels exist in `src/types/index.ts` + `src/i18n/vi.ts` (reserved for a future wave) but no action sets them. This was a deliberate scope decision noted in QA-Fix-2's deferred list ("Admin `PartialRelease`/`ClosedInvalid` resolution outcomes (out of scope)"). Marked pending rather than complete because the five-outcome API contract is not met.
    - Add `resolveDisputeExtended(disputeId, outcome, note): Result<Dispute, AdminError | 'INVALID_AMOUNT'>` to `src/stores/adminStore.ts`. Keep the existing `resolveDispute` for backward compatibility with Phase 10A tests.
    - Outcome semantics exactly per the design table:
      - `'ResolvedReleased'` → `Dispute.status = 'ResolvedReleased'`, escrow flips to `Released` via `transitionEscrow('AdminRelease')`, one ledger notification.
      - `'ResolvedRefunded'` → `Dispute.status = 'ResolvedRefunded'`, escrow flips to `Refunded` via `transitionEscrow('AdminRefund')`, one ledger notification.
      - `{ kind: 'PartialRelease', releaseAmount }` → validate `0 < releaseAmount <= shift.depositAmount` (else `INVALID_AMOUNT`). Set `Dispute.status = 'PartialRelease'`. Release `releaseAmount`; record `shift.depositAmount - releaseAmount` as refund. Emit two paired notifications: `Đã thanh toán một phần` to worker, `Phần còn lại đã được hoàn` to employer. Numeric split recorded in `Dispute.resolutionNote`.
      - `'RequestedMoreEvidence'` → `Dispute.status = 'RequestedMoreEvidence'`; escrow unchanged; no ledger entry (no numeric change).
      - `'ClosedInvalid'` → `Dispute.status = 'ClosedInvalid'`; escrow unchanged; no ledger entry.
    - Persist via the existing `useShiftStore.hydrate(...) + write(...)` pattern that the existing `resolveDispute` already uses.
    - Affected files: `src/stores/adminStore.ts`, `src/i18n/vi.ts` (toast keys), `src/lib/errorMap.ts` (mapping `'INVALID_AMOUNT'` → `Số tiền thanh toán phải lớn hơn 0 và nhỏ hơn hoặc bằng số tiền cọc.`).
    - Acceptance: every numeric change creates a notification (Section 11 invariant); `RequestedMoreEvidence` and `ClosedInvalid` create no ledger entries (vacuously preserved); existing `resolveDispute` continues to function.
    - _Requirements: 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 12.10, 12.11_

- [ ] 9. Admin dispute queue and resolution
  - [x] 9.1 Extend the admin `DisputesPanel` row with full lifecycle context
    - In the existing admin disputes panel (referenced from `src/app/admin/dashboard/page.tsx` — read Next.js 16 docs first), expand each dispute row with:
      - Header line: dispute id, category badge, `raisedBy` chip, status badge with the three new colours (`PartialRelease`, `RequestedMoreEvidence`, `ClosedInvalid`).
      - Lifecycle context block: `Application.checkInAt`, `Application.checkOutAt`, `Shift.startTime`, `Shift.endTime` with placeholder `Chưa ghi nhận` for missing timestamps.
      - Per-item checklist read-out (`✓` / `✗`) + `workerCheckoutNote` with placeholder `Không có ghi chú bàn giao` when empty.
      - Employer statement (`reason`, `evidenceDescription`, `evidenceFileName`) and the symmetric worker counter-statement when present, with placeholder `Không có` for absent fields.
    - Affected files: existing admin disputes panel module under `src/app/admin/dashboard/` or `src/components/.../DisputesPanel.tsx` (use the file currently rendering `resolveDispute`), `src/i18n/vi.ts` for new strings.
    - Acceptance: panel shows full lifecycle context for every dispute row; missing fields use the documented Vietnamese placeholders.
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ] 9.2 Add the five-outcome action row to the admin `DisputesPanel`
    - **Reconciliation note (PENDING — implementation diverged):** The admin `DisputeRow` (in `src/app/admin/dashboard/page.tsx`) renders an action row gated on `dispute.status ∈ {'Open', 'RequestedMoreEvidence'}`, but with TWO resolution outcomes plus a request-evidence sub-form, not five: "Thanh toán cho người làm" (`ResolvedReleased`) / "Hoàn tiền" (`ResolvedRefunded`) via `resolveDispute`, and "Yêu cầu bổ sung thông tin" via `requestMoreEvidence` (targets worker/employer/both). The `Thanh toán một phần` (PartialRelease + amount modal + inline validation) and `Đóng vì không hợp lệ` (ClosedInvalid) actions are NOT present, consistent with task 8.2 above. Marked pending because the five-outcome row contract is not met.
    - Render an action row visible only while `dispute.status ∈ {'Open', 'RequestedMoreEvidence'}`:
      - `Thanh toán toàn bộ` → `resolveDisputeExtended(id, 'ResolvedReleased', note)`.
      - `Hoàn tiền toàn bộ` → `resolveDisputeExtended(id, 'ResolvedRefunded', note)`.
      - `Thanh toán một phần` → modal asking for a number; calls `resolveDisputeExtended(id, { kind: 'PartialRelease', releaseAmount }, note)`. Inline Vietnamese validation message beside the amount input.
      - `Yêu cầu thêm bằng chứng` → `resolveDisputeExtended(id, 'RequestedMoreEvidence', note)`.
      - `Đóng vì không hợp lệ` → `resolveDisputeExtended(id, 'ClosedInvalid', note)`.
    - Each successful action surfaces a Vietnamese toast through the existing `showSuccess(...)` helper. Each rejection routes through `toastFromStoreError(...)`.
    - Affected files: existing admin disputes panel module, `src/i18n/vi.ts`, possibly a small `PartialReleaseModal.tsx` co-located in the same folder.
    - Acceptance: terminal-status disputes show no action row; partial-release amount validation triggers a Vietnamese inline message; resolved disputes are removed from the actionable queue.
    - _Requirements: 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11_

- [ ] 10. Notifications/toasts
  - [ ] 10.1 Wire Vietnamese success/error toasts for every Phase 10C action surface
    - **Reconciliation note (PARTIAL — kept pending):** The worker/dialog side is fully shipped in `src/i18n/vi.ts`: `feedback.checkOut.success`, all `error.evidence.*` keys (`tooLowForHighRisk`, `checklistIncomplete`, `photoRequired`, `noteRequired`, `tooLong`), and the dispute dialog error keys (`dispute.dialog.error.categoryRequired`/`reasonRequired`/`fieldTooLong`), all routed through the existing `Toast` host via `toastFromStoreError`. What is NOT shipped: the admin five-outcome toasts that depend on the unwired `resolveDisputeExtended` — specifically `Đã thanh toán một phần`, `Phần còn lại đã được hoàn`, `Đã đóng tranh chấp vì không hợp lệ`, and the `INVALID_AMOUNT` → "Số tiền thanh toán phải lớn hơn 0…" mapping. (`requestMoreEvidence` success toast `admin.dispute.requestEvidence.success` and the two existing resolve toasts ARE shipped.) Kept pending because it is blocked by tasks 8.2 / 9.2.
    - Confirm/extend localized toasts in `src/i18n/vi.ts` and `src/lib/toast.ts` (or `src/lib/errorMap.ts` if mapping is centralized there) for:
      - `feedback.checkOut.success` ("Đã check-out") on successful `checkOut`.
      - `error.evidence.checklistIncomplete`, `error.evidence.photoRequired`, `error.evidence.noteRequired`, `error.evidence.tooLong`, `error.evidence.tooLowForHighRisk` for the dialog and `ShiftForm` rejection paths.
      - `error.dispute.categoryRequired`, `error.dispute.reasonRequired`, `error.dispute.fieldTooLong`, `error.dispute.duplicate` mapped from `reportIssue` / `workerOpenDispute` errors.
      - Admin: `Đã thanh toán toàn bộ`, `Đã hoàn tiền toàn bộ`, `Đã thanh toán một phần`, `Phần còn lại đã được hoàn`, `Đã yêu cầu thêm bằng chứng`, `Đã đóng tranh chấp vì không hợp lệ`, plus the `INVALID_AMOUNT` Vietnamese mapping.
    - Make sure every toast routes through the existing `Toast` host so Section 11 "validation toast tone" stays consistent. No `console.log` toasts.
    - Affected files: `src/i18n/vi.ts`, `src/lib/toast.ts`, `src/lib/errorMap.ts`.
    - Acceptance: every store error in Phase 10C maps to a Vietnamese toast; no `VNĐ` / `₫` introduced; no `Raw_Route_Path` tokens.
    - _Requirements: 4.9, 5.11, 7.8, 8.5, 8.7, 8.9, 8.10, 8.11, 12.6, 12.7_

- [ ] 11. User guide / HANDOFF / VISUAL_QA updates
  - [ ] 11.1 Add `#payment-release`, `#evidence-by-risk`, `#dispute-outcomes` sections to the user guide
    - **Reconciliation note (PENDING — not implemented):** `src/app/user-guide/page.tsx` has the Phase 9Z feature-anchor sections (`#employer-payments`, `#worker-total-income`, etc.) but none of the three Phase 10C anchors (`#payment-release`, `#evidence-by-risk`, `#dispute-outcomes`). The 12 h Auto_Release rule, the evidence-by-risk mapping, and the extended dispute-outcome glossary are not yet surfaced in the user guide. Genuinely pending.
    - In `src/app/user-guide/page.tsx` (App Router page — read Next.js 16 docs first), mount three new `<FeatureGuide>` cards each with `id="<anchor>"` and `scroll-mt-24`:
      - `#payment-release` — Vietnamese heading "Khi nào nhà tuyển dụng thanh toán?"; describes standard release on confirmation and the 12 h Auto_Release rule.
      - `#evidence-by-risk` — Vietnamese heading "Mức bằng chứng theo độ rủi ro công việc"; lists each of the three Risk_Level values and the `EvidenceRequirement` values mapped to that risk level (per Requirement 1).
      - `#dispute-outcomes` — Vietnamese heading "Các kết quả tranh chấp"; lists every `DisputeStatus` literal in the extended union with its localized meaning.
    - Vietnamese prose only. NO `Raw_Route_Path` tokens. Currency uses lowercase `đ` or `đồng`; never `VNĐ` or `₫`.
    - Native browser fragment scroll handles `#anchor` URLs via `scroll-mt-24`; do NOT add custom scroll JS.
    - Affected files: `src/app/user-guide/page.tsx`, `src/i18n/vi.ts`.
    - Acceptance: loading the user guide with each fragment scrolls the matching heading into view within 2 s; route count remains 28.
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ] 11.2 Append a Phase 10C entry to `HANDOFF.md`
    - **Reconciliation note (PENDING — partial):** `HANDOFF.md` documents the Phase 10C-Stab-1 batches (Batch 3 contracts, Batch 4 H request-more-evidence, etc.) but has NO foundational "Phase 10C — Escrow Release Lifecycle" feature entry describing the evidence-requirement model, the 12 h auto-release contract, and the auto-release wiring contract (only `useLifecycleSync` + `AppHydrator` via `runLifecycleSync`). A consolidated date-stamped Phase 10C section per this task is not present. Genuinely pending.
    - Append a date-stamped Phase 10C section to `HANDOFF.md` listing: feature summary, files changed (types, evidence helper, ShiftForm, CheckoutDialog, DisputeDialog, AutoReleaseCountdown, applicationStore actions, adminStore extension, useLifecycleSync, AppHydrator, user-guide additions, `phase10c.test.ts`), explicit limitations (no real backend, no real payment gateway, no OTP, no external API, no new routes — still 28), and the auto-release wiring contract (only `useLifecycleSync` and `AppHydrator`).
    - DO NOT modify `requirements.md` or `design.md`.
    - Affected files: `HANDOFF.md`.
    - Acceptance: the new section is visible at the bottom of `HANDOFF.md` with date stamp and a link back to `.kiro/specs/phase-10c-escrow-release/`.
    - _Requirements: 12.1, 12.2, 12.4, 12.5_

  - [ ] 11.3 Append a Phase 10C entry to `VISUAL_QA.md`
    - **Reconciliation note (PENDING — not implemented):** `VISUAL_QA.md` covers prior phases (through Phase 10A-Fix-4) but has no Phase 10C section walking the evidence picker / payment-evidence card / `CheckoutDialog` / employer countdown + dispute dialog / admin resolution row at 1280 px with the dark-mode and currency checks recorded. Genuinely pending.
    - Append a Phase 10C row/section to `VISUAL_QA.md` listing the surfaces walked through after a fresh page load: `ShiftForm` evidence picker (with high-risk gating), worker shift detail "Quy trình thanh toán & bằng chứng" card, worker `CheckoutDialog`, employer confirmation panel countdown + dispute dialog, admin five-outcome action row.
    - Verify each surface against the `dark:` / `prefers-color-scheme: dark` ban and the currency rules; record the result in the table.
    - Affected files: `VISUAL_QA.md`.
    - Acceptance: the new section is visible with a date stamp; manual QA covers every Phase 10C surface at 1280 px.
    - _Requirements: 12.3, 12.6, 12.7_

- [ ] 12. Tests and final validation
  - **Reconciliation note (tracker sync) — test-file location divergence:** The spec mandated all property tests live in a single `src/__tests__/phase10c.test.ts`. In practice `phase10c.test.ts` holds Properties 1, 2, 3, 6 (evidence-helper purity/mapping/label-totality + checkout-payload predicate), and the remaining contracts were locked down in dedicated sibling files: `phase10cCheckout.test.ts` (EVIDENCE_REQUIRED + 12 h `autoReleaseAt`), `phase10cAutoRelease.test.ts` (auto-release effect, idempotency, open-dispute lockout, per-record error isolation, no-timers), `phase10cDispute.test.ts` / `phase10cWorkerDispute.test.ts` (employer/worker dispute round-trip + rejection totality), plus component tests `AutoReleaseCountdown.test.tsx` and `ShiftForm.test.tsx` (countdown formatting, high-risk gating, pre-selection). Coverage exists; the file layout differs. Sub-tasks below are marked complete when an equivalent regression test exists somewhere in the suite, and pending when no test covers the contract.
  - [x] 12.1 Create `src/__tests__/phase10c.test.ts` with the deterministic time setup harness
    - Set up `NOW_MS = Date.now()`, `TWELVE_HOURS_MS = 12 * 60 * 60 * 1000`, `localDateTimeFromOffset(offsetMs)` helper, and the `beforeEach`/`afterEach` `vi.useFakeTimers({ now: NOW_MS })` / `vi.useRealTimers()` blocks exactly as designed.
    - Import `fast-check`; configure all property tests with `numRuns: 100` minimum.
    - Tag every property test with a comment of the form `// Feature: phase-10c-escrow-release, Property N: <property text>`.
    - Affected files: `src/__tests__/phase10c.test.ts` (new).
    - Acceptance: harness compiles; subsequent sub-tasks can drop `fc.assert(...)` blocks into the file without re-doing setup; no fixture depends on host timezone.
    - _Requirements: 11.1, 11.13_

  - [x]* 12.2 Property test for `getSuggestedEvidenceLevel — Risk_Level mapping is exact`
    - **Property 1: Risk-level evidence mapping**
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.9 (test mandated by Requirement 11.2)**
    - Generate any `jobType` string and any `riskLevel` from the three-element enum; assert the returned value lies in the design's allowed subset for each risk level. Generate `riskLevel` outside the enum or a falsy `jobType`; assert the helper returns `'RequiredHandoverChecklist'`.
    - Tag: `// Feature: phase-10c-escrow-release, Property 1: Risk-level evidence mapping`
    - File: `src/__tests__/phase10c.test.ts`.
    - _Requirements: 1.3, 1.4, 1.5, 1.9, 11.2_

  - [x]* 12.3 Property test for `ShiftForm — High-risk job rejects sub-RequiredHandoverChecklist evidence`
    - **Reconciliation note:** Equivalent regression coverage exists in `src/components/forms/ShiftForm.test.tsx` (`disables sub-min options for high-risk job categories`, `lifts the selection when switching from low-risk to high-risk`) — example-based rather than fast-check, but the high-risk gating contract is locked.
    - **Property 5: ShiftForm high-risk gating**
    - **Validates: Requirements 2.6, 2.7 (test mandated by Requirement 11.3)**
    - Generate any `jobType` for which `jobCategoryRiskLevel(jobType) === 'High'` and any `EvidenceRequirement` strictly below `'RequiredHandoverChecklist'`. Render `ShiftForm` with that pair, click submit, and assert: parent `onSubmit` callback NOT invoked; previously entered field values preserved; an inline Vietnamese validation message identifies the evidence field as the cause.
    - Tag: `// Feature: phase-10c-escrow-release, Property 5: ShiftForm high-risk gating`
    - File: `src/__tests__/phase10c.test.ts`.
    - _Requirements: 2.6, 2.7, 11.3_

  - [x]* 12.4 Property test for `applicationStore.checkOut — EVIDENCE_REQUIRED leaves application unchanged`
    - **Reconciliation note:** Covered by `phase10cCheckout.test.ts` (`rejects EVIDENCE_REQUIRED …` cases assert deep-equal pre/post snapshots) — example-based rather than fast-check, but the contract is regression-locked.
    - **Property 8: EVIDENCE_REQUIRED rejection leaves application strictly unchanged**
    - **Validates: Requirements 4.9, 11.4 (test mandated by Requirement 11.4)**
    - Generate any `Application` in `'CheckedIn'` status, any linked `Shift` whose `evidenceRequirement` is one of `ChecklistOnly | RequiredPhoto | RequiredHandoverChecklist`, and any `CheckoutPayload` for which `validateCheckoutPayload(...).ok === false`. Assert the `Result` returned from `applicationStore.checkOut({applicationId, ...payload})` equals `{ ok: false, error: { code: 'EVIDENCE_REQUIRED', reason } }` and the targeted Application record (including `status`, `checkOutAt`, `checkoutChecklist`, `workerCheckoutNote`, `workerEvidenceFileName`, `autoReleaseAt`) is deep-equal to its pre-call snapshot.
    - Tag: `// Feature: phase-10c-escrow-release, Property 8: EVIDENCE_REQUIRED rejection leaves application strictly unchanged`
    - File: `src/__tests__/phase10c.test.ts`.
    - _Requirements: 4.9, 11.4_

  - [x]* 12.5 Property test for `autoReleaseEligibleApplications — eligible application becomes Confirmed + 5★`
    - **Reconciliation note:** Covered by `phase10cAutoRelease.test.ts` (`flips an eligible CheckedOut application to Confirmed + autoReleased + 5★`).
    - **Property 9: Auto-release predicate exactness and effect**
    - **Validates: Requirements 6.3, 6.4 (test mandated by Requirement 11.5)**
    - Generate any combination of `applications`, `disputes`, and `nowIso` such that at least one application satisfies the eligibility predicate. Advance the deterministic time source by at least `TWELVE_HOURS_MS` past the application's `autoReleaseAt`. Invoke `autoReleaseEligibleApplications(nowIso)` and assert: every flipped record ends with `status === 'Confirmed'`, `autoReleased === true`, a corresponding `Rating` with `stars === 5`, and `confirmedAt` populated. Applications outside the eligible set end the call with `status`, `autoReleased`, `autoReleaseAt` unchanged.
    - Tag: `// Feature: phase-10c-escrow-release, Property 9: Auto-release predicate exactness and effect`
    - File: `src/__tests__/phase10c.test.ts`.
    - _Requirements: 6.3, 6.4, 11.5_

  - [x]* 12.6 Property test for `autoReleaseEligibleApplications — second invocation is a state-identity no-op`
    - **Reconciliation note:** Covered by `phase10cAutoRelease.test.ts` (`is idempotent — second invocation produces no further state change`).
    - **Property 10: Idempotency of wired lifecycle actions**
    - **Validates: Requirements 6.5, 12.9 (test mandated by Requirement 11.6)**
    - After a first invocation has settled, deep-snapshot every Application and Rating, then invoke a second time without external state changes. Assert no Application's status, rating, `autoReleaseAt`, or `autoReleased` fields differ from the snapshot. Assert `releasedIds` returned by the second invocation is empty.
    - Tag: `// Feature: phase-10c-escrow-release, Property 10: Idempotency of wired lifecycle actions`
    - File: `src/__tests__/phase10c.test.ts`.
    - _Requirements: 6.5, 11.6, 12.9_

  - [x]* 12.7 Property test for `autoReleaseEligibleApplications — Open_Dispute blocks release`
    - **Reconciliation note:** Covered by `phase10cAutoRelease.test.ts` (`skips an application that has an open dispute` + terminal-dispute sanity case).
    - **Property 9 + Property 13 (consolidated): Open_Dispute lock-out**
    - **Validates: Requirements 6.6, 7.6 (test mandated by Requirement 11.7)**
    - Generate any application with `status === 'CheckedOut'`, any `autoReleaseAt` already in the past relative to the deterministic clock, and any associated dispute whose status is in the non-terminal set `{'Open', 'RequestedMoreEvidence'}`. Invoke `autoReleaseEligibleApplications(nowIso)` and assert the application's `status`, `autoReleased`, and `autoReleaseAt` are unchanged. Repeat for any dispute in a terminal status outside `{'ResolvedReleased', 'ResolvedRefunded', 'PartialRelease', 'ClosedInvalid'}` and assert auto-release proceeds.
    - Tag: `// Feature: phase-10c-escrow-release, Property 9: Auto-release predicate (Open_Dispute branch)`
    - File: `src/__tests__/phase10c.test.ts`.
    - _Requirements: 6.6, 7.6, 11.7_

  - [x]* 12.8 Property test for `applicationStore.reportIssue — persists exact category/reason/desc/filename`
    - **Reconciliation note:** Covered by `phase10cDispute.test.ts` (`persists category, reason, evidenceDescription, and evidenceFileName exactly` + status flip to `'Disputed'`).
    - **Property 13: Dispute creation round-trip and lock-out (employer side)**
    - **Validates: Requirements 7.4 (test mandated by Requirement 11.8)**
    - Generate any `category` from `EMPLOYER_DISPUTE_CATEGORIES`, any `reason` of length 1..1000, any `evidenceDescription` of length 0..2000, any `evidenceFileName` of length 0..255 with no path separators, and any `Application` in a disputable status. Invoke `reportIssue(...)` and assert the resulting Dispute's `category`, `reason`, `evidenceDescription`, `evidenceFileName`, and `raisedBy === 'employer'` exactly equal the supplied values; the linked application's status becomes `'Disputed'`; subsequent auto-release with the clock advanced past `autoReleaseAt` leaves the application unchanged for as long as the dispute is non-terminal.
    - Tag: `// Feature: phase-10c-escrow-release, Property 13: Dispute creation round-trip (employer)`
    - File: `src/__tests__/phase10c.test.ts`.
    - _Requirements: 7.4, 7.5, 7.6, 11.8_

  - [ ]* 12.9 Property test for `adminStore.resolveDisputeExtended — partial-release sets PartialRelease and close-as-invalid sets ClosedInvalid`
    - **Reconciliation note (PENDING):** Blocked by task 8.2 — `resolveDisputeExtended` and the `PartialRelease`/`ClosedInvalid`/`INVALID_AMOUNT` paths are not implemented, so this property has nothing to assert against. The shipped two-outcome `resolveDispute` is covered by `phase10cStab1Batch3/4/4B.test.ts` (`ResolvedReleased`/`ResolvedRefunded` wallet credit + idempotency), but the five-outcome table is not.
    - **Property 16: Five-outcome admin resolution table** (also covers Property 17 partial-amount validation when generators include `INVALID_AMOUNT` cases)
    - **Validates: Requirements 8.8, 8.9, 8.11 (tests mandated by Requirement 11.9)**
    - Sub-assertion 1: generate any starting `Dispute.status ∈ {'Open', 'RequestedMoreEvidence'}` and any valid `releaseAmount` strictly in `(0, shift.depositAmount]`. Invoke `resolveDisputeExtended(id, { kind: 'PartialRelease', releaseAmount }, note)` and assert `Dispute.status === 'PartialRelease'`, `releaseAmount` is released, and the remainder is refunded.
    - Sub-assertion 2: generate any starting `Dispute.status ∈ {'Open', 'RequestedMoreEvidence'}`. Invoke `resolveDisputeExtended(id, 'ClosedInvalid', note)` and assert `Dispute.status === 'ClosedInvalid'` and no escrow change occurs.
    - Sub-assertion 3 (Property 17): for any `releaseAmount` that is `NaN`, non-finite, ≤ 0, or `> shift.depositAmount`, assert the call returns `{ ok: false, error: 'INVALID_AMOUNT' }` with no change to `Dispute.status` or `Shift.escrowStatus`.
    - Tag: `// Feature: phase-10c-escrow-release, Property 16: Five-outcome admin resolution table`
    - File: `src/__tests__/phase10c.test.ts`.
    - _Requirements: 8.8, 8.9, 8.11, 11.9_

  - [x]* 12.10 Property test for `applicationStore.workerOpenDispute — creates worker-side dispute`
    - **Reconciliation note:** Covered by `phase10cWorkerDispute.test.ts` (round-trip persistence + `raisedBy === 'worker'` + status flip).
    - **Property 13: Dispute creation round-trip and lock-out (worker side)**
    - **Validates: Requirements 7.5 (test mandated by Requirement 11.10)**
    - Generate any `category` from `WORKER_DISPUTE_CATEGORIES`, any `reason` of length 1..1000, any `evidenceDescription` of length 0..2000, any `evidenceFileName` of length 0..255 with no path separators, and any `Application` in a disputable status. Invoke `workerOpenDispute(applicationId, payload)` and assert the resulting Dispute's `category` is in the worker-side enum, `raisedBy === 'worker'`, all four payload fields round-trip exactly, application status becomes `'Disputed'`.
    - Tag: `// Feature: phase-10c-escrow-release, Property 13: Dispute creation round-trip (worker)`
    - File: `src/__tests__/phase10c.test.ts`.
    - _Requirements: 7.5, 11.10_

  - [x]* 12.11 Property test for `getSuggestedEvidenceLevel — pure (state snapshots match)`
    - **Property 2: Helper purity and composition equation**
    - **Validates: Requirements 1.6, 1.8 (test mandated by Requirement 11.11)**
    - Generate any `jobType` and any `riskLevel`. Snapshot reachable module-level + global state, invoke `getSuggestedEvidenceLevel(jobType, riskLevel)` twice, snapshot again. Assert the two return values are strictly equal AND the before/after snapshots are deep-equal. Assert `suggestedEvidenceForJobType(jobType) === getSuggestedEvidenceLevel(jobType, jobCategoryRiskLevel(jobType))` for all generated `jobType`.
    - Tag: `// Feature: phase-10c-escrow-release, Property 2: Helper purity and composition equation`
    - File: `src/__tests__/phase10c.test.ts`.
    - _Requirements: 1.6, 1.8, 11.11_

  - [x]* 12.12 Property test for `<AutoReleaseCountdown/> — decreases after deterministic clock advance`
    - **Reconciliation note:** Equivalent regression coverage exists in `src/components/shift/AutoReleaseCountdown.test.tsx` (`renders hh:mm:ss for a future deadline`, clamps at `00:00:00` for past deadlines, decreases across a clock advance) — example-based rather than fast-check, but the formatting/decrement contract is locked.
    - **Property 18: Countdown formatting and decrement**
    - **Validates: Requirements 5.7, 5.8 (test mandated by Requirement 11.12)**
    - Generate any `autoReleaseAt` ISO timestamp at least 1 minute in the future relative to the deterministic clock, and any clock advance `Δt ≥ 1` second that does not move the clock past `autoReleaseAt`. Mount `<AutoReleaseCountdown autoReleaseAt={...} />` (locate via `data-testid="auto-release-countdown"` or `aria-label="Đếm ngược tự động thanh toán"`); assert text matches `/^\d{2}:\d{2}:\d{2}$/`. Advance the fake timer by `Δt`; assert the rendered value is strictly less than the previous reading. For any `autoReleaseAt` at or before the current clock, assert the component renders exactly `'00:00:00'`.
    - Tag: `// Feature: phase-10c-escrow-release, Property 18: Countdown formatting and decrement`
    - File: `src/__tests__/phase10c.test.ts`.
    - _Requirements: 5.7, 5.8, 11.12_

  - [x]* 12.13 Property test for `Vietnamese label totality across the EvidenceRequirement enum`
    - **Property 3: Vietnamese label totality**
    - **Validates: Requirements 1.7**
    - Generate any `EvidenceRequirement` literal in the five-element enum; assert `EVIDENCE_REQUIREMENT_LABELS[lit]` (or `t('evidence.requirement.<lit>')`) has length in `[1, 80]`, contains at least one diacritic matching `/[à-ỹ]/i`, and is not equal to the literal's English name.
    - Tag: `// Feature: phase-10c-escrow-release, Property 3: Vietnamese label totality`
    - File: `src/__tests__/phase10c.test.ts`.
    - _Requirements: 1.7_

  - [ ]* 12.14 Property test for `ShiftForm evidence pre-selection`
    - **Reconciliation note (PENDING):** `ShiftForm.test.tsx` covers the high-risk gating and the suggested-chip, but no test asserts the first-paint checked radio equals `suggestedEvidenceForJobType(jobType)` for arbitrary job types. Genuinely pending.
    - **Property 4: ShiftForm evidence pre-selection**
    - **Validates: Requirements 2.2**
    - Generate any `jobType` value. Render `ShiftForm` for a new shift with that initial state; assert the rendered "Bằng chứng sau ca" picker has the radio corresponding to `suggestedEvidenceForJobType(jobType)` checked at first paint.
    - Tag: `// Feature: phase-10c-escrow-release, Property 4: ShiftForm evidence pre-selection`
    - File: `src/__tests__/phase10c.test.ts`.
    - _Requirements: 2.2_

  - [x]* 12.15 Property test for `validateCheckoutPayload predicate (success path)`
    - **Reconciliation note:** Property 6 (predicate) covered in `phase10c.test.ts`; Property 7 (success persistence + exact 43_200_000 ms `autoReleaseAt`) covered in `phase10cCheckout.test.ts` / `phase10cDispute.test.ts` (`sets autoReleaseAt = checkOutAt + 12h on success`).
    - **Property 6: Checkout payload validation predicate** + **Property 7: Checkout success persistence + 12 h auto-release timestamp** (consolidated)
    - **Validates: Requirements 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.12, 6.2**
    - Sub-assertion 1 (Property 6): generate any `EvidenceRequirement` level and any `CheckoutPayload`; assert `validateCheckoutPayload(level, payload).ok` equals the per-level predicate from the design.
    - Sub-assertion 2 (Property 7): generate any `Application` in `'CheckedIn'` and any payload satisfying the validator; invoke `applicationStore.checkOut(...)` and assert the post-call `Application` has `status === 'CheckedOut'`, `checkOutAt` is a valid ISO 8601 string, `autoReleaseAt` is a valid ISO 8601 string, `Date.parse(autoReleaseAt) - Date.parse(checkOutAt) === 43_200_000`, and the three evidence fields equal the payload exactly.
    - Tag: `// Feature: phase-10c-escrow-release, Property 6+7: Checkout validation predicate and success persistence`
    - File: `src/__tests__/phase10c.test.ts`.
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.12, 6.2_

  - [x]* 12.16 Property test for `Per-record error isolation in auto-release`
    - **Reconciliation note:** Covered by `phase10cAutoRelease.test.ts` (`One faulty application doesn't block the rest of the pass`).
    - **Property 11: Per-record error isolation in auto-release**
    - **Validates: Requirements 6.10**
    - Fault-inject a single eligible application so the per-record `confirmCompletion` throws; coexist with N non-faulty eligible applications. Invoke `autoReleaseEligibleApplications(nowIso)` once. Assert the faulty application's `status`, `autoReleased`, `autoReleaseAt` are strictly unchanged AND every non-faulty eligible application transitions to `'Confirmed' + autoReleased=true + 5★`.
    - Tag: `// Feature: phase-10c-escrow-release, Property 11: Per-record error isolation in auto-release`
    - File: `src/__tests__/phase10c.test.ts`.
    - _Requirements: 6.10_

  - [x]* 12.17 Property test for `Auto-release path uses no timers, polling, or external APIs`
    - **Reconciliation note:** Covered by `phase10cAutoRelease.test.ts` (`uses no polling primitives` — spies on `setInterval`/`requestAnimationFrame`/`fetch`).
    - **Property 12: Auto-release path uses no timers, polling, or external APIs**
    - **Validates: Requirements 6.8, 6.9**
    - Under a `vi.useFakeTimers()` harness, capture `vi.getTimerCount()` and any pending microtask queue depth before invoking `autoReleaseEligibleApplications(...)`. Assert the count is unchanged after the call returns. Repeat for both wired call sites (`useLifecycleSync.ts` and `AppHydrator.tsx`) using a spy stub for `setTimeout`, `setInterval`, `requestAnimationFrame`, `fetch`, and `WebSocket`; assert no calls.
    - Tag: `// Feature: phase-10c-escrow-release, Property 12: Auto-release path uses no timers, polling, or external APIs`
    - File: `src/__tests__/phase10c.test.ts`.
    - _Requirements: 6.8, 6.9_

  - [ ]* 12.18 Property test for `Dispute filename hygiene and viewer scoping (privacy)`
    - **Reconciliation note (PENDING):** Filename hygiene (no path separators, ≤255) is covered indirectly by the dispute round-trip/rejection tests, but the viewer-scoping leakage assertion (non-owner/non-admin mounts show no `evidenceFileName`/`evidenceDescription`; admin mount does) has no dedicated test. Genuinely pending.
    - **Property 14: Dispute filename hygiene and viewer scoping**
    - **Validates: Requirements 7.7, 12.8**
    - Sub-assertion 1: generate any persisted `Dispute`; assert `evidenceFileName` is either `undefined` or has length ≤ 255 and contains no `/` or `\\`.
    - Sub-assertion 2 (privacy/leakage check): mount every Phase 10C surface (worker shift detail education card, employer / worker public profile, applicant card, landing surfaces) as a non-owner / non-admin viewer (a separate worker, a separate employer); assert the rendered DOM contains no substring of `Dispute.evidenceFileName`, no substring of `Application.workerEvidenceFileName`, and no substring of `Dispute.evidenceDescription`. Mount the same surfaces as an admin viewer and assert those fields ARE rendered.
    - Tag: `// Feature: phase-10c-escrow-release, Property 14: Dispute filename hygiene and viewer scoping`
    - File: `src/__tests__/phase10c.test.ts`.
    - _Requirements: 7.7, 12.8_

  - [x]* 12.19 Property test for `Dispute creation rejection totality`
    - **Reconciliation note:** Covered across `phase10cDispute.test.ts` + `phase10cWorkerDispute.test.ts` (CATEGORY_REQUIRED, CATEGORY_INVALID role-mismatch, REASON_REQUIRED, FIELD_TOO_LONG path-separator, WRONG_STATUS already-Disputed/not-CheckedOut, APPLICATION_NOT_FOUND — each asserting no dispute appended + status unchanged).
    - **Property 15: Dispute creation rejection totality**
    - **Validates: Requirements 7.8, 7.9**
    - Generate any payload that fails along at least one validity axis: missing `category`, out-of-enum `category`, side-mismatch (employer category to `workerOpenDispute` or vice versa), `reason.trim() === ''`, `reason.length > 1000`, `evidenceDescription.length > 2000`, `evidenceFileName.length > 255`, `evidenceFileName` containing a path separator, unknown `applicationId`, or application already in `'Disputed'`. Assert the call returns `{ ok: false, error }` with no `Dispute` row appended to `applicationStore.disputes` and no change to the targeted application's `status`.
    - Tag: `// Feature: phase-10c-escrow-release, Property 15: Dispute creation rejection totality`
    - File: `src/__tests__/phase10c.test.ts`.
    - _Requirements: 7.8, 7.9_

  - [ ]* 12.20 Property test for `HelpPopover placement, content, and dismissal contract`
    - **Reconciliation note (PENDING):** `<HelpPopover>` is mounted at all four Phase 10C placements, but no test asserts the placement/content-length/diacritic/no-route-token + Escape/outside-click/close-button focus-restore contract for the Phase 10C instances. Genuinely pending.
    - **Property 19: HelpPopover placement, content, and dismissal contract**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7**
    - For each Phase 10C `<HelpPopover>` placement (the four locations: `ShiftForm` evidence fieldset, worker shift detail card, `CheckoutDialog`, employer countdown panel): assert the trigger renders inside the documented DOM container; assert the popover description has length in `[40, 800]`, contains at least one Vietnamese diacritic, and matches no `Raw_Route_Path` token (regex `/(worker|employer|admin|shifts|disputes|user-guide|register|login|safety|support|terms|privacy|faq|how-it-works|about|home)\b/`); assert that for each of Escape key, outside click, and explicit close button, dismissing returns keyboard focus to the trigger.
    - Tag: `// Feature: phase-10c-escrow-release, Property 19: HelpPopover placement, content, and dismissal contract`
    - File: `src/__tests__/phase10c.test.ts`.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [ ]* 12.21 Property test for `User-guide section completeness`
    - **Reconciliation note (PENDING):** Blocked by task 11.1 — the `#evidence-by-risk` and `#dispute-outcomes` user-guide sections do not exist, so there is nothing to assert section completeness against. Genuinely pending.
    - **Property 20: User-guide section completeness**
    - **Validates: Requirements 10.2, 10.3**
    - For any `riskLevel` in the three-element risk enum, render the `#evidence-by-risk` section and assert it contains the Vietnamese label of every `EvidenceRequirement` value mapped to that risk level. For any `DisputeStatus` literal in the six-element extended union, render the `#dispute-outcomes` section and assert it contains that literal's localized Vietnamese label.
    - Tag: `// Feature: phase-10c-escrow-release, Property 20: User-guide section completeness`
    - File: `src/__tests__/phase10c.test.ts`.
    - _Requirements: 10.2, 10.3_

  - [ ]* 12.22 Property test for `Currency and raw-route hygiene + dark-mode token absence` (copy-hygiene scan)
    - **Reconciliation note (PENDING):** No dedicated `fs.readFileSync`-based scan test over a Phase 10C allow-list exists. (Project-wide currency/dark-mode discipline is enforced by convention + manual VISUAL_QA, but the automated scan this task mandates is not present.) Genuinely pending.
    - **Property 21: Currency and raw-route hygiene across Phase 10C copy** + **Property 22: Dark-mode token absence** (consolidated)
    - **Validates: Requirements 3.2, 10.5, 10.6, 12.3, 12.6, 12.7**
    - Sub-assertion 1 (Property 21): for any string introduced or modified by Phase 10C in `src/i18n/vi.ts` and any string literal embedded in a Phase 10C component's user-facing JSX, assert the string contains neither `'VNĐ'` nor `'₫'`. For any such string that mentions money, assert it contains either lowercase `'đ'` or the standalone token `'đồng'`. For any such string, assert it matches no `Raw_Route_Path` token.
    - Sub-assertion 2 (Property 22): for any CSS or Tailwind directive file modified by Phase 10C, assert the file contains no `dark:` Tailwind class variant and no `prefers-color-scheme: dark` media block.
    - Implementation: scan files using `fs.readFileSync` against an explicit allow-list of Phase 10C-touched files, asserting the regex bans.
    - Tag: `// Feature: phase-10c-escrow-release, Property 21+22: Copy-hygiene + dark-mode ban`
    - File: `src/__tests__/phase10c.test.ts`.
    - _Requirements: 3.2, 10.5, 10.6, 12.3, 12.6, 12.7_

  - [x] 12.23 Run `npm run test:run`, `npm run build`, and verify the 28-route count
    - **Reconciliation note:** Verified during tracker reconciliation (2026): `npm run test:run` → 395/395 tests pass across 29 files (exit 0); `npm run build` → exit 0 with exactly 28 routes emitted. The original spec target of "165 pre-existing tests" has since grown to 395 as later waves added coverage; the invariant (all pass + 28 routes) holds.
    - Run `npm run test:run` and confirm exit code 0; confirm the 165 pre-existing tests still pass and the new `phase10c.test.ts` tests pass alongside.
    - Run `npm run build` and confirm exit code 0.
    - Parse the build's route table and assert exactly 28 routes are emitted (zero new routes added). If the count is not 28, FAIL the validation and do not ship the change.
    - Affected files: none (validation only).
    - Acceptance: both commands exit 0; route count is exactly 28; no new test file beyond `src/__tests__/phase10c.test.ts` is required.
    - _Requirements: 12.4, 12.5_

  - [ ] 12.24 Run a copy-hygiene scan over every Phase 10C-touched file
    - **Reconciliation note (PENDING):** No automated copy-hygiene scan over the Phase 10C file list has been run/recorded as part of this spec. Spot-checks during reconciliation found no `VNĐ`/`₫`/`dark:` in the shipped Phase 10C strings, but the formal scan deliverable is not present.
    - Search every Phase 10C-touched source file (the explicit list compiled from groups 1–11's `Affected files` entries) for the strings `VNĐ`, `₫`, `dark:`, and `prefers-color-scheme: dark`. Any hit FAILS the scan.
    - Search the same file list for `Raw_Route_Path` tokens in user-facing prose using the design's regex `/(worker|employer|admin|shifts|disputes|user-guide|register|login|safety|support|terms|privacy|faq|how-it-works|about|home)\b/` against text-only nodes (skip `href`, `Link`, route definitions, route segment names, and similar machinery).
    - Affected files: validation only — emit a fail report listing offending file + line + token.
    - Acceptance: no occurrences of the banned tokens; user-facing prose refers to surfaces by visible name, not path.
    - _Requirements: 10.5, 10.6, 12.3, 12.6, 12.7_

  - [ ] 12.25 Privacy/leakage check: mount every new Phase 10C surface as a non-owner/non-admin viewer
    - **Reconciliation note (PENDING):** Same gap as 12.18 — no automated multi-viewer privacy/leakage suite over the Phase 10C surfaces exists. Genuinely pending.
    - Render every Phase 10C-introduced surface (`PaymentEvidenceCard`, `CheckoutDialog`, employer confirmation panel block, admin `DisputesPanel` row, user-guide additions) under three viewer identities: a non-owner worker, a non-owner employer, and a guest/unauthenticated viewer. Assert the rendered DOM contains no `evidenceFileName` substring (from any application or dispute fixture), no `workerEvidenceFileName` substring, and no `evidenceDescription` substring.
    - Repeat under the admin viewer identity and assert those fields ARE present.
    - Affected files: extend `src/__tests__/phase10c.test.ts` with the privacy/leakage suite OR co-locate in a privacy describe-block already started by sub-task 12.18 — pick one and do not duplicate.
    - Acceptance: every non-admin / non-owner mount shows zero leakage; admin mount shows the expected fields; no Phase 10C surface bypasses this rule.
    - _Requirements: 7.7, 12.8_

- [ ] 13. Final checkpoint - Phase 10C ready
  - **Reconciliation note (PENDING):** Core lifecycle, evidence, checkout, dispute, and auto-release functionality is shipped and validated (395/395 tests, build clean, 28 routes, auto-release wired through `runLifecycleSync` on exactly the two intended mount surfaces). Remaining before this checkpoint can close: the five-outcome admin resolution (8.2/9.2/10.1), the user-guide + HANDOFF + VISUAL_QA documentation (11.1/11.2/11.3), and the copy-hygiene/privacy scan deliverables (12.24/12.25 and optional 12.9/12.14/12.18/12.20/12.21/12.22).
  - Ensure all tests pass (existing 165 + new `phase10c.test.ts`), `npm run build` exits 0 with exactly 28 routes, copy-hygiene and privacy scans report zero hits, HANDOFF.md and VISUAL_QA.md are updated, and the auto-release call graph contains exactly two entries (`useLifecycleSync.ts` and `AppHydrator.tsx`). Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP, but every starred task in group 12 is a property-based test that locks down a Phase 10C contract — skipping them removes the regression gate for that contract.
- Each task references specific Requirement clauses for traceability.
- Property-based test sub-tasks use `fast-check` with `numRuns: 100` minimum, are tagged with the `// Feature: phase-10c-escrow-release, Property N: <text>` comment format, and live in a single new file `src/__tests__/phase10c.test.ts` (Requirement 11.1).
- Auto-release is wired ONLY into `useLifecycleSync` and `AppHydrator`. The action itself MUST NOT use `setTimeout`, `setInterval`, polling, or any external API. The presentational `<AutoReleaseCountdown/>` component may use a UI-local `setInterval` per the design; this is the only timer permitted on the auto-release surface.
- Section 11 cross-phase invariants are preserved by reusing existing actions (`transitionEscrow`, `confirmCompletion`, `notificationStore.push`, the per-store `write(...)` helper). Phase 10C never opens its own write path that bypasses these invariants.
- Next.js 16 App Router pages touched by this plan (`/employer/shifts/new`, `/employer/shifts/[id]`, `/shifts/[id]`, `/worker/dashboard`, `/admin/dashboard`, `/user-guide`) MUST be implemented after reading `node_modules/next/dist/docs/` for the installed Next.js version, per `AGENTS.md`.
- Tailwind v4 directives in CSS only; no Tailwind config file, no `dark:` variant, no `prefers-color-scheme: dark` media block. Currency in user-facing copy uses lowercase `đ` or `đồng`; the strings `VNĐ` and `₫` are forbidden. User-facing prose refers to surfaces by visible name, not by `Raw_Route_Path` tokens.
- Build invariant: exactly 28 routes; sub-task 12.23 verifies. The 165 pre-existing tests must keep passing; sub-task 12.23 also verifies.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["3.1", "4.1", "5.1", "6.1"] },
    { "id": 4, "tasks": ["3.2", "4.2", "5.2", "6.2", "7.1", "8.2"] },
    { "id": 5, "tasks": ["6.3", "7.2", "8.1", "9.1"] },
    { "id": 6, "tasks": ["9.2", "10.1", "11.1"] },
    { "id": 7, "tasks": ["11.2", "11.3", "12.1"] },
    { "id": 8, "tasks": ["12.2", "12.3", "12.4", "12.5", "12.6", "12.7", "12.8", "12.9", "12.10", "12.11", "12.12", "12.13", "12.14", "12.15", "12.16", "12.17", "12.18", "12.19", "12.20", "12.21", "12.22", "12.24", "12.25"] },
    { "id": 9, "tasks": ["12.23"] }
  ]
}
```
