# Requirements Document

## Introduction

Phase 10C extends the Cà Lẻ ShiftNow mock platform with a structured shift-evidence and escrow-release lifecycle. It introduces a five-level evidence requirement attached to each shift, a worker check-out flow that validates evidence based on that level, an employer confirmation panel with a 12-hour auto-release countdown, structured dispute categories on both employer and worker sides, an expanded admin dispute resolution surface, in-context help popovers, user-guide updates, and a dedicated test file. The feature is mock-only: persistence is Zustand 5 with localStorage, no real backend, payment gateway, OTP, identity verification, server sync, or external APIs are introduced. All currency in user-facing prose uses the `đ` lowercase suffix or the spelled-out `đồng`; `VNĐ` and `₫` remain prohibited. No new routes are added; the build must remain at 28 routes.

## Glossary

- **ShiftNow_App**: The Cà Lẻ ShiftNow Next.js 16 mock application (Zustand 5 + localStorage, Tailwind v4, App Router).
- **Shift**: A posted job opening created by an employer, persisted in `shiftStore`.
- **Application**: A worker's application to a shift, persisted in `applicationStore`, carrying the lifecycle state (`Applied`, `Approved`, `CheckedIn`, `CheckedOut`, `Confirmed`, `Disputed`, etc.).
- **Evidence_Requirement**: One of `None`, `ChecklistOnly`, `OptionalPhoto`, `RequiredPhoto`, `RequiredHandoverChecklist`, attached to each Shift, governing what the worker must submit at check-out.
- **Risk_Level**: One of `Low`, `Medium`, `High`, returned by the existing `jobCategoryRiskLevel` helper for a given job category.
- **Suggested_Evidence_Level**: The Evidence_Requirement value returned by the pure helper `getSuggestedEvidenceLevel(jobType, riskLevel)` for the employer to consider as default.
- **Checklist**: The post-shift confirmation list (e.g., "Đã hoàn thành công việc", "Đã bàn giao khu vực") whose items the worker ticks during check-out.
- **Handover**: The act of transferring the work area, tools, or task state back to the employer at end of shift; tracked by checklist items and an optional handover note.
- **Worker_Evidence_File_Name**: A public-safe mock filename string (e.g., `handover-2025-01-15-abc.jpg`) representing an attached photo. No actual file bytes or PII are stored.
- **Auto_Release**: The mock lifecycle action that, 12 hours after a worker's check-out, treats the application as confirmed by the employer with a default 5-star rating when no dispute is open.
- **Auto_Release_At**: The ISO 8601 timestamp `Application.autoReleaseAt`, computed as `checkOutAt + 43,200,000 ms` (12 hours), after which Auto_Release becomes eligible.
- **Dispute**: A structured record raised by either employer or worker against an application, persisted via `applicationStore` and resolved by the admin.
- **Dispute_Category**: An enum value classifying the dispute reason. Employer-side: `NoShow`, `LeftEarly`, `ChecklistFailed`, `MisrepresentedSkills`, `BehaviorIssue`, `Damage`, `Other`. Worker-side: `WrongAddress`, `UnsafeWorksite`, `EmployerNoShow`, `ScopeChanged`, `PaymentDispute`, `Other`.
- **Open_Dispute**: A Dispute whose status is in a non-terminal value (i.e., not `ResolvedReleased`, `ResolvedRefunded`, `PartialRelease`, or `ClosedInvalid`).
- **Idempotent_Lifecycle_Action**: A function wired into `useLifecycleSync` and `AppHydrator` boot pass that filters its inputs (e.g., `status === 'CheckedOut' && !autoReleased`) so that repeated invocations on the same state produce no additional state changes after the first.
- **Lifecycle_Sync_Hook**: The existing `useLifecycleSync` React hook that runs idempotent lifecycle actions on hydration and dashboard mount.
- **Hydrator**: The existing `AppHydrator` boot component that runs idempotent lifecycle actions during initial app hydration.
- **Help_Popover**: The existing `<HelpPopover>` UI primitive used to attach inline education tooltips to controls and panels.
- **Raw_Route_Path**: Any user-facing string token that begins with `/` and matches an internal Next.js App Router path (e.g., `/worker/profile`, `/shifts/[id]`); user-facing copy refers to surfaces by visible page name, menu label, or button text instead.

## Requirements

### Requirement 1: Evidence Requirement Model and Risk Mapping

**User Story:** As a product engineer, I want a typed evidence requirement enum and a pure helper that suggests an evidence level from job type and risk level, so that employers see a consistent, risk-aware default when posting a shift.

#### Acceptance Criteria

1. THE ShiftNow_App SHALL extend the `Shift` type with a field `evidenceRequirement` of type `'None' | 'ChecklistOnly' | 'OptionalPhoto' | 'RequiredPhoto' | 'RequiredHandoverChecklist'`.
2. THE ShiftNow_App SHALL expose a pure helper `getSuggestedEvidenceLevel(jobType, riskLevel)` whose `riskLevel` argument is exactly one of `'Low' | 'Medium' | 'High'` and whose return value is exactly one of the five Evidence_Requirement literals.
3. WHEN `getSuggestedEvidenceLevel` is called with `riskLevel = 'Low'`, THE ShiftNow_App SHALL return either `ChecklistOnly` or `OptionalPhoto`.
4. WHEN `getSuggestedEvidenceLevel` is called with `riskLevel = 'Medium'`, THE ShiftNow_App SHALL return either `OptionalPhoto` or `RequiredHandoverChecklist`.
5. WHEN `getSuggestedEvidenceLevel` is called with `riskLevel = 'High'`, THE ShiftNow_App SHALL return either `RequiredHandoverChecklist` or `RequiredPhoto`.
6. WHEN `getSuggestedEvidenceLevel` is called twice with identical `jobType` and `riskLevel` arguments, THE ShiftNow_App SHALL return strictly equal values AND SHALL NOT mutate module-level state, perform I/O, read the system clock, or read global state during the call.
7. THE ShiftNow_App SHALL provide a Vietnamese display label for each of the five Evidence_Requirement literal values, where each label is 1–80 characters long, contains at least one Vietnamese-script character (with diacritics), and is not an English sentence or phrase fallback.
8. THE ShiftNow_App SHALL provide a composition helper that takes a job category and returns `getSuggestedEvidenceLevel(jobCategory, jobCategoryRiskLevel(jobCategory))`, returning the same Evidence_Requirement value as a direct call to `getSuggestedEvidenceLevel` with the equivalent risk level.
9. IF `getSuggestedEvidenceLevel` is called with a `riskLevel` argument outside `'Low' | 'Medium' | 'High'` or a missing `jobType`, THEN THE ShiftNow_App SHALL return the safe default `'RequiredHandoverChecklist'` rather than throw.

### Requirement 2: Employer Shift Posting UI for Evidence Requirement

**User Story:** As an employer, I want to choose the post-shift evidence level when creating a shift, with a system recommendation and clear privacy guidance, so that I can balance accountability and worker privacy.

#### Acceptance Criteria

1. THE ShiftNow_App SHALL render a "Bằng chứng sau ca" section inside `ShiftForm.tsx` containing a 5-level picker exposing all five Evidence_Requirement values as selectable options.
2. WHEN `ShiftForm.tsx` first mounts for a new shift, THE ShiftNow_App SHALL pre-select the Evidence_Requirement option returned by the composed `getSuggestedEvidenceLevel` helper for the form's currently selected job category.
3. WHEN the employer changes the job category in `ShiftForm.tsx`, THE ShiftNow_App SHALL display a chip labeled "Hệ thống đề xuất" next to the option returned by `getSuggestedEvidenceLevel` for that category's risk level.
4. THE ShiftNow_App SHALL render Vietnamese helper copy describing each of the five Evidence_Requirement options inside the "Bằng chứng sau ca" section.
5. THE ShiftNow_App SHALL render a privacy warning beginning with the text "Không yêu cầu chụp khách hàng, giấy tờ cá nhân" within the "Bằng chứng sau ca" section.
6. WHILE the selected job category has `Risk_Level = 'High'`, THE ShiftNow_App SHALL restrict the picker's selectable values to `RequiredHandoverChecklist` and `RequiredPhoto` only.
7. IF the employer attempts to submit `ShiftForm.tsx` with an Evidence_Requirement below `RequiredHandoverChecklist` while the selected job category has `Risk_Level = 'High'`, THEN THE ShiftNow_App SHALL block the submission, preserve all currently entered form values, and display an inline Vietnamese validation message identifying the evidence field as the cause.
8. WHEN the employer submits `ShiftForm.tsx` successfully, THE ShiftNow_App SHALL include `evidenceRequirement` on the `NewShiftInput` payload and persist it via `shiftStore.create()`.

### Requirement 3: Worker-Facing Shift Detail Education

**User Story:** As a worker viewing a shift before applying, I want to see how payment is released and what evidence will be expected at check-out, so that I can decide whether to apply with full information.

#### Acceptance Criteria

1. THE ShiftNow_App SHALL render a "Quy trình thanh toán & bằng chứng" card on the worker shift detail page, positioned above the apply section in the page's vertical flow.
2. THE "Quy trình thanh toán & bằng chứng" card SHALL describe in Vietnamese prose that payment is released to the worker upon employer confirmation after the shift, and SHALL NOT contain any Raw_Route_Path token.
3. THE "Quy trình thanh toán & bằng chứng" card SHALL describe in Vietnamese prose that, when the employer has neither confirmed nor disputed the shift within 12 hours after the worker's check-out, the platform automatically releases payment to the worker (Auto_Release rule).
4. THE "Quy trình thanh toán & bằng chứng" card SHALL display the Vietnamese label corresponding to the shift's current Evidence_Requirement value, using the label mapping defined in Requirement 1, criterion 7.
5. WHERE the shift's Evidence_Requirement is `RequiredPhoto` or `RequiredHandoverChecklist`, THE ShiftNow_App SHALL render a banner beginning with the text "Ca này yêu cầu bằng chứng bàn giao" inside the card or immediately above or below the card on the same page section.
6. IF the shift record cannot be loaded or the Evidence_Requirement value is missing, THEN THE ShiftNow_App SHALL render a Vietnamese fallback message in place of the missing card content rather than render a blank space.

### Requirement 4: Worker Check-out Dialog and Evidence Validation

**User Story:** As a worker finishing a shift, I want a check-out dialog whose required fields match the shift's evidence requirement, so that I submit exactly what is needed and receive payment without delay.

#### Acceptance Criteria

1. THE ShiftNow_App SHALL provide a `CheckoutDialog` component invoked from the worker dashboard upcoming card and from the worker shift detail page.
2. THE `CheckoutDialog` SHALL display, conditioned on the shift's Evidence_Requirement, up to 50 checklist items (each item's label ≤200 characters), an optional or required photo upload control accepting a filename of length 1–255 characters, and an optional or required handover note input accepting text of length 0–1000 characters.
3. WHEN the shift's Evidence_Requirement is `None`, THE ShiftNow_App SHALL enable the submit control with no checklist required, no photo required, and a note that may be empty or up to 1000 characters.
4. WHEN the shift's Evidence_Requirement is `ChecklistOnly` and every visible checklist item is ticked, THE ShiftNow_App SHALL enable the submit control.
5. WHEN the shift's Evidence_Requirement is `ChecklistOnly` and at least one visible checklist item is unticked, THE ShiftNow_App SHALL disable the submit control.
6. WHEN the shift's Evidence_Requirement is `OptionalPhoto`, THE ShiftNow_App SHALL enable the submit control with both photo and note optional.
7. WHEN the shift's Evidence_Requirement is `RequiredPhoto`, THE ShiftNow_App SHALL enable the submit control only when `evidenceFileName` is non-empty and ≤255 characters.
8. WHEN the shift's Evidence_Requirement is `RequiredHandoverChecklist`, THE ShiftNow_App SHALL enable the submit control only when every visible checklist item is ticked AND the handover note is non-empty (≤1000 characters).
9. IF the worker invokes `applicationStore.checkOut` with a payload that fails the shift's Evidence_Requirement, THEN THE ShiftNow_App SHALL reject the call with an error whose `code` property equals `'EVIDENCE_REQUIRED'`, leave the Application's status, evidence fields, and `autoReleaseAt` unchanged, and surface a Vietnamese error message in the dialog.
10. THE ShiftNow_App SHALL refactor `applicationStore.checkOut` to accept a single payload object `{ checklist?: boolean[], note?: string, evidenceFileName?: string }`.
11. THE ShiftNow_App SHALL extend the `Application` type with optional fields `checkoutChecklist: boolean[]`, `workerCheckoutNote: string`, and `workerEvidenceFileName: string`.
12. WHEN `applicationStore.checkOut` succeeds, THE ShiftNow_App SHALL persist the submitted `checklist`, `note`, and `evidenceFileName` onto the matching Application record using the new fields, mapping `checklist` → `checkoutChecklist`, `note` → `workerCheckoutNote`, and `evidenceFileName` → `workerEvidenceFileName`.

### Requirement 5: Employer Confirmation Panel with Countdown and Dispute Entry Point

**User Story:** As an employer reviewing a checked-out application, I want to see the worker's evidence, a countdown to auto-release, and a clear path to either confirm or dispute, so that I can act before the 12-hour window closes.

#### Acceptance Criteria

1. WHEN an Application on the employer shift detail page has `status = 'CheckedOut'`, THE ShiftNow_App SHALL display the worker's check-out time formatted with the `vi-VN` locale showing day, month, year, hours, and minutes.
2. WHEN an Application on the employer shift detail page has `status = 'CheckedOut'`, THE ShiftNow_App SHALL display a binary, Vietnamese-labeled indicator of whether every checklist item on the Application is ticked.
3. WHEN an Application on the employer shift detail page has `status = 'CheckedOut'` and the Application's `workerCheckoutNote` is a non-empty string, THE ShiftNow_App SHALL display that note as Vietnamese-locale text.
4. WHEN an Application on the employer shift detail page has `status = 'CheckedOut'` and the Application's `workerCheckoutNote` is empty or absent, THE ShiftNow_App SHALL display a Vietnamese placeholder indicating no handover note was submitted.
5. WHEN an Application on the employer shift detail page has `status = 'CheckedOut'` and the Application's `workerEvidenceFileName` is a non-empty string, THE ShiftNow_App SHALL display the filename as plain, non-interactive text without exposing file bytes or any PII.
6. WHEN an Application on the employer shift detail page has `status = 'CheckedOut'` and the Application's `workerEvidenceFileName` is empty or absent, THE ShiftNow_App SHALL display a Vietnamese placeholder indicating no evidence file was provided.
7. WHILE an Application on the employer shift detail page has `status = 'CheckedOut'` and `autoReleaseAt` is in the future, THE ShiftNow_App SHALL display a countdown to `autoReleaseAt` in `hh:mm:ss` format that refreshes at least once per second.
8. WHEN the value of `autoReleaseAt` is in the past, THE ShiftNow_App SHALL display the countdown as `00:00:00` (no negative values).
9. THE existing `RatingForm` SHALL be the sole control on the employer confirmation panel that invokes the `confirmCompletion` action.
10. THE ShiftNow_App SHALL render a "Khiếu nại" button on the employer confirmation panel that opens a `DisputeDialog` capturing required `category` (an employer-side `Dispute_Category` value), required `reason` (1–1000 characters), optional `evidenceDescription` (≤1000 characters), and optional `evidenceFileName` (≤255 characters).
11. IF the employer submits the `DisputeDialog` with a missing `category`, an empty `reason`, or any field exceeding its length bound, THEN THE ShiftNow_App SHALL block submission, preserve current input, and display a Vietnamese validation message identifying the offending field.

### Requirement 6: Auto-Release After 12 Hours

**User Story:** As a worker, I want the platform to auto-release my payment 12 hours after check-out when no dispute is open, so that I am paid even if the employer forgets to confirm.

#### Acceptance Criteria

1. THE ShiftNow_App SHALL extend the `Application` type with an optional field `autoReleaseAt: string` (ISO 8601 timestamp) and an optional boolean field `autoReleased`.
2. WHEN `applicationStore.checkOut` succeeds, THE ShiftNow_App SHALL set `autoReleaseAt` on the Application to the ISO 8601 string equal to `checkOutAt + 43,200,000 ms` (12 hours).
3. THE ShiftNow_App SHALL provide an action `applicationStore.autoReleaseEligibleApplications(nowIso?)` that iterates Applications whose `status === 'CheckedOut'`, `autoReleased !== true`, whose `autoReleaseAt` is a non-empty ISO 8601 string less than or equal to `nowIso` (defaulting to `new Date().toISOString()` when `nowIso` is undefined), and which have no associated Open_Dispute.
4. WHEN `applicationStore.autoReleaseEligibleApplications` processes an eligible Application, THE ShiftNow_App SHALL perform the equivalent of `confirmCompletion` with a default 5-star rating, set `autoReleased = true`, and set `status = 'Confirmed'` as a single atomic update for that Application.
5. WHEN `applicationStore.autoReleaseEligibleApplications` is invoked twice in succession without external state changes between the two invocations, THE ShiftNow_App SHALL produce no additional state changes on the second invocation (idempotent behavior).
6. IF an Application has an associated Open_Dispute, THEN THE ShiftNow_App SHALL skip Auto_Release for that Application even when `autoReleaseAt` has passed, leaving `status`, `autoReleased`, and `autoReleaseAt` unchanged for that Application.
7. THE ShiftNow_App SHALL invoke `applicationStore.autoReleaseEligibleApplications` from `useLifecycleSync` and from the `AppHydrator` boot pass alongside the existing `expirePendingApplicationsForStartedShifts` call, with no `nowIso` argument so that the current system time is used.
8. THE ShiftNow_App SHALL implement Auto_Release without `setTimeout`, `setInterval`, scheduled jobs, polling intervals, or external APIs.
9. THE ShiftNow_App SHALL invoke `applicationStore.autoReleaseEligibleApplications` only via `AppHydrator` on hydration and via `useLifecycleSync` on dashboard mount, and SHALL NOT invoke it from any other code path.
10. IF the equivalent of `confirmCompletion` throws or otherwise fails for one Application during a single invocation of `applicationStore.autoReleaseEligibleApplications`, THEN THE ShiftNow_App SHALL leave that Application's `status`, `autoReleased`, and `autoReleaseAt` unchanged AND SHALL continue processing the remaining eligible Applications in the same invocation.

### Requirement 7: Structured Dispute Categories and Evidence Flow

**User Story:** As an employer or worker, I want to file a dispute with a specific category and optional evidence description and filename, so that admin review has structured context to act on.

#### Acceptance Criteria

1. THE ShiftNow_App SHALL extend the `Dispute` type with required field `category` (a `Dispute_Category` literal), required field `reason` (string, 1–1000 characters), optional field `evidenceDescription` (string, ≤2000 characters), and optional field `evidenceFileName` (string, ≤255 characters).
2. THE ShiftNow_App SHALL accept the following employer-side `Dispute_Category` values: `NoShow`, `LeftEarly`, `ChecklistFailed`, `MisrepresentedSkills`, `BehaviorIssue`, `Damage`, `Other`.
3. THE ShiftNow_App SHALL accept the following worker-side `Dispute_Category` values: `WrongAddress`, `UnsafeWorksite`, `EmployerNoShow`, `ScopeChanged`, `PaymentDispute`, `Other`.
4. WHEN `applicationStore.reportIssue` is invoked with a structured payload `{ category, reason, evidenceDescription?, evidenceFileName? }` whose `category` is an employer-side `Dispute_Category` and whose fields satisfy the bounds in criterion 1, THE ShiftNow_App SHALL create a Dispute record persisting all four fields exactly as supplied and set `Dispute.raisedBy = 'employer'`.
5. WHEN `applicationStore.workerOpenDispute(applicationId, payload)` is invoked with a structured payload of the same shape whose `category` is a worker-side `Dispute_Category` and whose fields satisfy the bounds in criterion 1, THE ShiftNow_App SHALL create a Dispute record persisting all four fields exactly as supplied and set `Dispute.raisedBy = 'worker'`.
6. WHEN `applicationStore.reportIssue` or `applicationStore.workerOpenDispute` succeeds, THE ShiftNow_App SHALL set the Application status to `'Disputed'` and SHALL prevent Auto_Release for that Application until the Dispute reaches a terminal status.
7. THE ShiftNow_App SHALL store dispute `evidenceFileName` values as filename-only strings (no path separators `/` or `\`, no file bytes, no PII) and SHALL NOT persist any actual file content.
8. IF either dispute action is invoked with a payload missing `category`, an empty `reason`, an out-of-enum `category` value, a wrong-role `category` (worker-side category supplied to `reportIssue` or vice versa), an unknown `applicationId`, or any field exceeding its length bound, THEN THE ShiftNow_App SHALL reject the call without creating a Dispute record AND SHALL leave the Application's status unchanged.
9. IF either dispute action is invoked against an Application whose status is already `'Disputed'`, THEN THE ShiftNow_App SHALL reject the call without creating a duplicate Dispute record.

### Requirement 8: Admin Dispute Resolution View

**User Story:** As an admin, I want a dispute resolution panel that shows the full lifecycle context of a disputed application and offers structured resolution actions, so that I can act fairly with all available evidence.

#### Acceptance Criteria

1. WHEN an admin opens the disputes panel on the admin dashboard, THE ShiftNow_App SHALL display, for each Dispute, the associated Application's check-in time, check-out time, and the Shift's start/end times, falling back to the Vietnamese placeholder "Chưa ghi nhận" for any timestamp that is absent.
2. WHEN an admin opens the disputes panel, THE ShiftNow_App SHALL display, for each Dispute, the Application's checklist state (per-item ticked/unticked) and `workerCheckoutNote`, falling back to "Không có ghi chú bàn giao" when the note is empty.
3. WHEN an admin opens the disputes panel, THE ShiftNow_App SHALL display, for each Dispute, the employer statement (`reason`, `evidenceDescription`, `evidenceFileName`) and the worker counter-statement when present, falling back to "Không có" for any absent field.
4. WHILE a Dispute's status is `'Open'` or `'RequestedMoreEvidence'`, THE ShiftNow_App SHALL show resolution action controls on that Dispute's row.
5. WHEN the admin invokes "Release full" on a Dispute whose status is `'Open'` or `'RequestedMoreEvidence'`, THE ShiftNow_App SHALL set the Dispute status to `'ResolvedReleased'`, confirm payment release for the Application, and show a Vietnamese confirmation toast.
6. IF the admin invokes "Release full" on a Dispute already in a terminal status, THEN THE ShiftNow_App SHALL reject the action without modifying state.
7. WHEN the admin invokes "Refund full" on a Dispute whose status is `'Open'` or `'RequestedMoreEvidence'`, THE ShiftNow_App SHALL set the Dispute status to `'ResolvedRefunded'`, refund the Application escrow, and show a Vietnamese confirmation toast.
8. WHEN the admin invokes "Partial release" on a Dispute whose status is `'Open'` or `'RequestedMoreEvidence'` and supplies a release amount strictly greater than 0 and less than or equal to the Application's escrow amount, THE ShiftNow_App SHALL set the Dispute status to `'PartialRelease'`, release that amount, and refund the remainder.
9. IF the admin invokes "Partial release" with a non-numeric, zero, negative, or above-escrow amount, THEN THE ShiftNow_App SHALL reject the action and surface a Vietnamese validation message.
10. WHEN the admin invokes "Request more evidence" on a Dispute whose status is `'Open'`, THE ShiftNow_App SHALL set the Dispute status to `'RequestedMoreEvidence'` without releasing or refunding payment.
11. WHEN the admin invokes "Close as invalid" on a Dispute whose status is `'Open'` or `'RequestedMoreEvidence'`, THE ShiftNow_App SHALL set the Dispute status to `'ClosedInvalid'` without releasing or refunding payment.
12. THE ShiftNow_App SHALL extend the `DisputeStatus` union with the additional values `'PartialRelease'`, `'RequestedMoreEvidence'`, and `'ClosedInvalid'`, retaining all pre-existing values.

### Requirement 9: Inline Education Help Popovers

**User Story:** As a first-time user on either side, I want inline help on each new screen, so that I understand evidence, payment release, and dispute mechanics without leaving the page.

#### Acceptance Criteria

1. THE ShiftNow_App SHALL render a `<HelpPopover>` trigger within the same form group as the evidence picker in `ShiftForm.tsx`, whose content (40–800 characters of Vietnamese prose) explains how to choose between the five Evidence_Requirement levels.
2. THE ShiftNow_App SHALL render a `<HelpPopover>` trigger within or immediately adjacent to the "Quy trình thanh toán & bằng chứng" card on the worker shift detail page, whose content explains the payment release flow and the 12-hour Auto_Release rule.
3. THE ShiftNow_App SHALL render a `<HelpPopover>` trigger inside the worker `CheckoutDialog`, whose content explains why the listed evidence fields are required for the shift's Evidence_Requirement.
4. THE ShiftNow_App SHALL render a `<HelpPopover>` trigger within the same flex/grid container as the Auto_Release countdown on the employer confirmation panel, whose content explains what happens when the countdown reaches zero.
5. THE Help_Popover content for each location SHALL be Vietnamese prose of 40–800 characters and SHALL NOT contain any Raw_Route_Path token.
6. WHEN the user activates a Help_Popover trigger by mouse click, touch tap, Enter key, or Space key, THE ShiftNow_App SHALL display the popover content within 300 ms.
7. WHEN the user presses Escape, clicks outside the popover, or activates the popover's close control, THE ShiftNow_App SHALL dismiss the popover and restore keyboard focus to the trigger.

### Requirement 10: User Guide Updates

**User Story:** As a user looking up policy details, I want anchored sections in the user guide for payment release, evidence by risk, and dispute outcomes, so that other surfaces can deep-link to the canonical explanation.

#### Acceptance Criteria

1. THE ShiftNow_App SHALL add a section on the user guide page anchored at `#payment-release` with a visible Vietnamese heading, describing the standard payment release flow (release upon employer confirmation) and the 12-hour Auto_Release rule.
2. THE ShiftNow_App SHALL add a section on the user guide page anchored at `#evidence-by-risk` with a visible Vietnamese heading, enumerating each of the three Risk_Level values and the Evidence_Requirement values mapped to that risk level.
3. THE ShiftNow_App SHALL add a section on the user guide page anchored at `#dispute-outcomes` with a visible Vietnamese heading, enumerating each `DisputeStatus` value (including the new `PartialRelease`, `RequestedMoreEvidence`, and `ClosedInvalid`) along with its meaning.
4. WHEN the user-guide page is loaded with a URL fragment matching one of `#payment-release`, `#evidence-by-risk`, or `#dispute-outcomes`, THE ShiftNow_App SHALL scroll the corresponding section's heading into the viewport within 2 seconds of page load.
5. THE three sections added in this requirement SHALL be Vietnamese prose and SHALL NOT include any Raw_Route_Path token.
6. THE three sections added in this requirement SHALL use the `đ` lowercase suffix or the spelled-out `đồng` for any currency mention and SHALL NOT contain the strings `VNĐ` or `₫`.

### Requirement 11: Test Coverage for Phase 10C

**User Story:** As a maintainer, I want a dedicated Phase 10C test file that locks down each behavioral contract, so that future refactors cannot regress the evidence and escrow lifecycle.

#### Acceptance Criteria

1. THE ShiftNow_App SHALL include a test file at `src/__tests__/phase10c.test.ts`.
2. THE Phase 10C test file SHALL include a test asserting that `getSuggestedEvidenceLevel` returns the documented Evidence_Requirement value for each of the three Risk_Level inputs `Low`, `Medium`, and `High`, with the assertion failing if any of the three mappings deviates from the specification.
3. THE Phase 10C test file SHALL include a test asserting that `ShiftForm` validation rejects an Evidence_Requirement value below `RequiredHandoverChecklist` when the selected job category has `Risk_Level = 'High'`, where rejection is observable as the form surfacing a Vietnamese validation message and not invoking its submit handler.
4. THE Phase 10C test file SHALL include a test asserting that, when the submitted payload fails the shift's Evidence_Requirement, `applicationStore.checkOut` produces a rejected result whose `code` property equals the string `'EVIDENCE_REQUIRED'`, AND that the targeted Application's status, evidence fields, and `autoReleaseAt` remain identical to their pre-call values after the rejection settles.
5. THE Phase 10C test file SHALL include a test asserting that `applicationStore.autoReleaseEligibleApplications` transitions an eligible Application to `status = 'Confirmed'` with `autoReleased = true` and a default 5-star rating after the test advances a deterministic time source by at least 12 hours past the Application's `autoReleaseAt` timestamp.
6. THE Phase 10C test file SHALL include a test asserting that, after a first invocation of `applicationStore.autoReleaseEligibleApplications` has settled, a second invocation produces no change to any Application's status, rating, `autoReleaseAt`, or `autoReleased` fields, verified by deep-equality comparison of the affected records before and after the second call.
7. THE Phase 10C test file SHALL include a test asserting that `applicationStore.autoReleaseEligibleApplications` leaves Applications with an Open_Dispute in their pre-call status, rating, and `autoReleaseAt` values even when the deterministic time source has advanced past `autoReleaseAt`.
8. THE Phase 10C test file SHALL include a test asserting that `applicationStore.reportIssue` persists exactly the supplied `category`, `reason`, `evidenceDescription`, and `evidenceFileName` values onto the resulting Dispute record.
9. THE Phase 10C test file SHALL include a test asserting that the admin partial-release action sets the targeted Dispute's `DisputeStatus` to `'PartialRelease'`, AND a separate test asserting that the admin close-as-invalid action sets the targeted Dispute's `DisputeStatus` to `'ClosedInvalid'`.
10. THE Phase 10C test file SHALL include a test asserting that `applicationStore.workerOpenDispute` creates a Dispute record whose `category` is one of the worker-side `Dispute_Category` values and whose `raisedBy` is `'worker'`.
11. THE Phase 10C test file SHALL include a test asserting that `getSuggestedEvidenceLevel`, when invoked twice with identical arguments, returns strictly equal results AND does not mutate its arguments, module-level state, or any other observable value reachable from the test (verified by snapshotting reachable state before and after the calls).
12. THE Phase 10C test file SHALL include a test asserting that, when an Application has `status = 'CheckedOut'` and `autoReleaseAt` is at least 1 minute in the future relative to the deterministic time source, the employer confirmation panel renders a countdown element (locatable by an accessible label or test handle) whose displayed remaining time decreases after the time source is advanced.
13. WHEN Phase 10C tests construct shift `date` and `startTime` fixtures, THE Phase 10C test file SHALL derive all timestamps from a single `NOW_MS` constant initialized from `Date.now()` at test setup AND a `localDateTimeFromOffset` helper that converts a millisecond offset to the shift fixture's local-date and start-time strings, so that no fixture depends on the host machine's timezone.

### Requirement 12: Mock-Only Architecture and Cross-Phase Non-Functional Constraints

**User Story:** As a maintainer, I want Phase 10C to honor the existing mock-only architecture and the Section 11 cross-phase invariants, so that no prior-phase guarantees regress.

#### Acceptance Criteria

1. THE ShiftNow_App SHALL implement Phase 10C state using Zustand 5 stores persisted to localStorage only, with no real backend, payment gateway, OTP, identity verification, server sync, or external API calls.
2. THE ShiftNow_App SHALL implement Phase 10C UI on the Next.js 16 App Router, using only APIs and conventions documented in `node_modules/next/dist/docs/` for the installed Next.js version.
3. THE ShiftNow_App SHALL declare Phase 10C styling via Tailwind v4 directives in CSS (no Tailwind config file) AND SHALL NOT introduce a `dark:` class variant or a `prefers-color-scheme: dark` media block in any new or modified stylesheet.
4. WHEN `npm run test:run` is run after Phase 10C, THE ShiftNow_App SHALL keep all 165 pre-existing tests passing AND SHALL add new tests in line with Requirement 11.
5. WHEN `npm run build` is run after Phase 10C, THE ShiftNow_App SHALL exit with code 0 AND produce exactly 28 routes in the build output (zero new routes added by Phase 10C).
6. THE ShiftNow_App SHALL display currency in user-facing copy introduced or modified by Phase 10C using the `đ` lowercase suffix or the spelled-out `đồng` AND SHALL NOT contain the strings `VNĐ` or `₫`.
7. THE ShiftNow_App SHALL avoid Raw_Route_Path tokens in user-facing prose introduced by Phase 10C.
8. THE ShiftNow_App SHALL store Phase 10C dispute `evidenceFileName` values as public-safe mock filename strings only AND SHALL NOT expose identity-document data outside the admin role.
9. WHEN a Phase 10C lifecycle action is wired into `useLifecycleSync` or the `AppHydrator` boot pass, THE ShiftNow_App SHALL implement that action as an Idempotent_Lifecycle_Action by filtering its inputs (e.g., `status === 'CheckedOut' && !autoReleased`) before mutating state.
10. THE ShiftNow_App SHALL preserve the existing Section 11 cross-phase invariants, namely: verification document privacy, validation toast tone, top-nav badges remaining actionable, featured-job using `effectiveFilledCount`, modals closing on outside click, slot label format, employer cancellation trust rules, every numeric change creating a history record, applicant approve/reject blocked after shift start, reputation and skill-score independence, and pending application expiry idempotency.
11. IF any Phase 10C change would cause one of the Section 11 invariants in criterion 10 to regress (observable via the existing test suite), THEN THE ShiftNow_App SHALL NOT ship that change AND the affected tests SHALL fail to gate the regression.
