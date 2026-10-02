/**
 * English dictionary — đợt 2d (02/10): màn nhà tuyển dụng / người lao động.
 *
 * Đăng ca, quản lý ca, lịch, thanh toán, đánh giá, hồ sơ, xác thực, cọc người lao
 * động, các hộp thoại khiếu nại / từ chối, menu tài khoản. Gộp vào `en` / `enText`
 * trong `en.ts` sau `enPages`. Cùng quy ước với các đợt trước: khoá trùng `vi.ts`,
 * không ghi đè câu đợt trước, tiền tệ viết `đ`.
 * - Câu ghi "(mô phỏng)" chỉ hiện ở chế độ demo / local → bản tiếng Anh ghi
 *   "simulated"; câu production (`.real`, PayOS) không có chữ đó.
 * - Thông báo gửi admin vẫn tiếng Việt (dữ liệu lưu lại, không dịch theo người gửi).
 * ⚠️ Bản dịch do AI viết — nhờ người đọc lại, nhất là câu về tiền / cọc / rút tiền.
 */

export const enRoles: Record<string, string> = {
  // --- Nhãn ghép động (trạng thái, loại, mục) -------------------------------------
  'admin.profile.verify.idApproved': 'ID card verified',
  'admin.profile.verify.idPending': 'ID card awaiting review',
  'admin.profile.verify.idRejected': 'ID card rejected',
  'admin.profile.verify.idNone': 'No ID card submitted',
  'applicantBucket.Pending': 'Pending applications',
  'applicantBucket.Pending.hint': 'Accept or reject each applicant.',
  'applicantBucket.Approved': 'Approved applications',
  'applicantBucket.Approved.hint': 'Wait for the worker to check in when the shift starts.',
  'applicantBucket.CheckedIn': 'Worker checked in',
  'applicantBucket.CheckedIn.hint': 'Tap Mark present once you meet the worker at the workplace.',
  'applicantBucket.PresenceConfirmed': 'Presence confirmed',
  'applicantBucket.PresenceConfirmed.hint': 'Both sides confirmed presence. Wait until the shift ends.',
  'applicantBucket.AwaitingCheckout': 'Awaiting check-out',
  'applicantBucket.AwaitingCheckout.hint':
    'The shift is over but the worker has not checked out. Remind them, or mark them absent if you cannot reach them.',
  'applicantBucket.AwaitingConfirmation': 'Awaiting completion confirmation',
  'applicantBucket.AwaitingConfirmation.hint.real':
    'Checked out: confirm to pay, or file a complaint if something is wrong. If you do nothing, the system confirms automatically after 24 hours.',
  'applicantBucket.Disputed': 'In dispute',
  'applicantBucket.Disputed.hint': 'An administrator is handling the dispute. You can add a response if needed.',
  'applicantBucket.Absent': 'Absent',
  'applicantBucket.Absent.hint': 'The worker did not show up as scheduled.',
  'applicantBucket.Confirmed': 'Completed',
  'applicantBucket.Confirmed.hint': 'The worker has been paid.',
  'deposit.trust.low': 'Trust level: Low (new or unverified account). Deposit 100% of wages.',
  'deposit.trust.medium': 'Trust level: Medium (verified or at least 3 completed shifts). Deposit 100% of wages.',
  'deposit.trust.high': 'Trust level: High (verified and at least 5 completed shifts). Deposit 100% of wages.',
  'deposit.trust.label.low': 'Low',
  'deposit.trust.label.medium': 'Medium',
  'deposit.trust.label.high': 'High',
  'employer.repost.banner.title.Completed': 'This shift is completed',
  'employer.repost.banner.title.Cancelled': 'This shift was cancelled',
  'employer.repost.banner.title.Expired': 'This shift has expired',
  'employerType.individual': 'Individual / Freelance',
  'employerType.business': 'Business',
  'employerType.individual.hint': 'An individual employer; no business licence required.',
  'employerType.business.hint': 'A registered business; can be verified to raise its trust level.',
  'escrow.PendingDeposit': 'Awaiting deposit',
  'escrow.Deposited': 'Deposit held',
  'escrow.InProgress': 'Processing',
  'escrow.Completed': 'Finalised',
  'escrow.Released': 'Paid',
  'escrow.Disputed': 'In dispute',
  'escrow.Refunded': 'Refunded',
  'evidence.helper.None': 'Fits light work with no handover.',
  'evidence.helper.ChecklistOnly': 'The worker confirms each item is done.',
  'evidence.helper.OptionalPhoto': 'A photo is encouraged as proof if needed.',
  'evidence.helper.RequiredPhoto': 'A photo is required at check-out.',
  'evidence.helper.RequiredHandoverChecklist': 'Needs the full checklist and a handover note.',
  'evidence.requirement.None': 'No evidence needed',
  'evidence.requirement.ChecklistOnly': 'Completion checklist only',
  'evidence.requirement.OptionalPhoto': 'Handover photo optional',
  'evidence.requirement.RequiredPhoto': 'Handover photo required',
  'evidence.requirement.RequiredHandoverChecklist': 'Checklist + handover note required',
  'review.error.NOT_COMPLETED': 'You can review only after the shift is confirmed as completed.',
  'review.error.ALREADY_SUBMITTED': 'You have already reviewed this shift.',
  'review.error.REVIEW_WINDOW_CLOSED': 'More than 14 days have passed since the shift, so it can no longer be reviewed.',
  'review.error.NOT_PARTICIPANT': 'You did not take part in this shift, so you cannot review it.',
  'review.error.INVALID_STARS': 'Choose 1 to 5 stars.',
  'review.error.COMMENT_TOO_LONG': 'Comments can be up to 500 characters.',
  'review.error.SUSPENDED': 'Your account is suspended, so you cannot leave reviews.',
  'review.error.unavailable': 'Reviews are not available yet. Please try again later.',
  'review.error.generic': 'Could not send the review. Please try again.',
  'schedule.slotCfg.error.INVALID_SLOT_DURATION': 'Each slot must be at least 15 minutes long.',
  'schedule.slotCfg.error.TOO_MANY_SLOTS': 'Too many slots. Make each slot longer or narrow the hours of the day.',
  'shift.status.Draft': 'Draft',
  'shift.status.Published': 'Hiring',
  'shift.status.InProgress': 'In progress',
  'shift.status.AwaitingConfirmation': 'Awaiting confirmation',
  'shift.status.Completed': 'Completed',
  'shift.status.Cancelled': 'Cancelled',
  'shift.status.Expired': 'Expired',
  'shift.timeline.kind.CreatedFromRepost': 'A new shift was created from this one',
  'shift.timeline.kind.EmployerCancelled': 'The employer cancelled the shift',
  'shift.timeline.kind.AutoExpired': 'The system marked it as expired',
  'shift.timeline.kind.Reposted': 'Reposted from an earlier shift',
  'shift.timeline.kind.ShiftPublished': 'Shift posted',
  'shift.timeline.kind.DepositHeld': 'Deposit held',
  'shift.timeline.kind.WorkerApplied': 'A worker applied',
  'shift.timeline.kind.EmployerApprovedApplicant': 'The employer approved a worker',
  'shift.timeline.kind.WorkerCheckedIn': 'The worker checked in',
  'shift.timeline.kind.EmployerMarkedPresent': 'The employer confirmed presence',
  'shift.timeline.kind.EmployerMarkedAbsent': 'The employer marked the worker absent',
  'shift.timeline.kind.WorkerCheckedOut': 'The worker checked out',
  'shift.timeline.kind.EmployerOpenedDispute': 'The employer filed a complaint',
  'shift.timeline.kind.WorkerOpenedDispute': 'The worker filed a complaint',
  'shift.timeline.kind.WorkerRespondedToDispute': 'The worker responded to the complaint',
  'shift.timeline.kind.EmployerRespondedToDispute': 'The employer responded to the complaint',
  'shift.timeline.kind.AdminRequestedEvidence': 'An administrator asked for more evidence',
  'shift.timeline.kind.AdminResolvedDispute': 'An administrator resolved the complaint',
  'shift.timeline.kind.WageReleased': 'Wages paid',
  'shift.timeline.kind.WageRefunded': 'Deposit refunded',
  'shifts.detail.paymentEvidence.prepare.None': 'Just let the employer know when the work is done.',
  'shifts.detail.paymentEvidence.prepare.ChecklistOnly': 'Tick every item on the completion checklist when you check out.',
  'shifts.detail.paymentEvidence.prepare.OptionalPhoto': 'You can attach a handover photo if you think it helps - not required.',
  'shifts.detail.paymentEvidence.prepare.RequiredPhoto': 'Attach a photo of the handed-over work area when you check out.',
  'shifts.detail.paymentEvidence.prepare.RequiredHandoverChecklist':
    'Tick the whole checklist and write a complete handover note when you check out.',
  'verify.card.intro.worker': 'Verifying your phone number and ID card helps employers trust you when approving you for shifts.',
  'verify.card.intro.employer': 'Verifying your phone number and ID card helps workers trust you when applying to your shifts.',
  'worker.profile.prompt.bio.title': 'About you',
  'worker.profile.prompt.bio.hint': 'A few lines about your experience and the hours you usually work.',
  'worker.profile.prompt.skills.title': 'Skills',
  'worker.profile.prompt.skills.hint': 'For example: serving, bartending, cashier, event serving.',
  'worker.profile.prompt.jobTypes.title': 'Preferred job types',
  'worker.profile.prompt.jobTypes.hint': 'The kinds of work you want more of.',
  'worker.profile.prompt.locations.title': 'Preferred areas',
  'worker.profile.prompt.locations.hint': 'Districts that are easy for you to get to. Only you can see this.',

  // --- Thời hạn xác nhận / trả công: bản production (`tSettlement`, `.real`) --------
  'feedback.checkOut.success.desc.real':
    'If the employer does nothing, the system confirms and pays your wages into your wallet 24 hours after the shift ends.',
  'checkout.dialog.intro.real':
    'Confirm the items below before checking out. After you submit, the employer confirms or files a complaint - if they do nothing, the system confirms and pays your wages into your wallet 24 hours after the shift ends.',
  'help.checkout.description.real':
    'Send only what is asked; do not photograph customers or personal documents. If the employer does nothing, the system confirms and pays your wages about 24 hours after the shift.',
  'help.paymentEvidence.description.real':
    'Light work needs only the checklist; work involving cash or stock also needs a handover photo and note. Do not photograph customers, personal documents or sensitive receipts.',
  'shifts.detail.paymentEvidence.confirmRule.real':
    'After you check out, the employer confirms completion or files a complaint if something is wrong.',
  'shifts.detail.paymentEvidence.autoReleaseRule.real':
    'If the employer does nothing, the system confirms and pays your wages into your wallet 24 hours after the shift ends.',

  // --- /employer/profile -------------------------------------------------------------
  'common.success': 'Success!',
  'btn.edit': 'Edit',
  'employer.profile.workerFeedback.title': 'Reviews from workers',
  'employer.profile.workerFeedback.intro': 'Feedback from people who completed shifts for your business.',
  'employer.understaffed.runWithApproved': 'Run with the workers already approved',
  'employer.understaffed.runWithApproved.hint':
    'The shift goes ahead with the approved workers. The deposit for unused positions is refunded when the shift ends.',
  'employer.understaffed.requireFull': 'Run only when fully staffed',
  'employer.understaffed.requireFull.hint':
    'If the shift is not fully staffed before it starts, it is cancelled automatically, the whole deposit is refunded and approved workers are notified.',
  'employer.understaffed.title': 'When a shift is understaffed',
  'employer.understaffed.intro': 'Choose what happens when a shift does not have enough approved workers before it starts.',
  'employer.profile.firstSet.legacy':
    'Only for older accounts without an account type. New accounts choose their type when signing up.',

  // --- /employer/schedule ------------------------------------------------------------
  'common.positions': 'people',
  'schedule.slotCfg.toggle': 'Customise time slots',
  'schedule.slotCfg.dayStart': 'Day starts at',
  'schedule.slotCfg.dayEnd': 'Day ends at',
  'schedule.slotCfg.slotMinutes': 'Slot length (minutes)',
  'calendar.empty.employer': 'You have not posted any shifts in this period.',
  'employerSchedule.page.title': 'Hiring calendar',
  'employerSchedule.page.subtitle': 'See the shifts you posted week by week. Tap a shift to manage it.',
  'help.employerSchedule.title': 'Guide - Hiring calendar',
  'help.employerSchedule.intro': 'See your posted shifts in a week / day / agenda calendar.',
  'help.employerSchedule.section.purpose.heading': 'Use this page to',
  'help.employerSchedule.section.purpose.item1': 'See posted shifts by week to keep track of your hiring schedule.',
  'help.employerSchedule.section.numbers.heading': 'Key numbers / statuses',
  'help.employerSchedule.section.numbers.item1':
    'Each shift on the calendar has a chip coloured by status: blue (Hiring), yellow (Fully staffed / Awaiting confirmation), green (Completed), brick red (Cancelled / Expired).',
  'help.employerSchedule.section.numbers.item2':
    'The number on the chip shows filled/total - for example 2/3 means 2 of 3 positions are filled.',
  'help.employerSchedule.section.actions.heading': 'Main actions',
  'help.employerSchedule.section.actions.item1': 'Tap a shift on the calendar to open its management page.',
  'help.employerSchedule.section.actions.item2':
    'Tap "◀ Previous week" / "Next week ▶" to move around. "This week" brings you back to the current week.',
  'help.employerSchedule.section.actions.item3': 'Tap "Customise time slots" to change the hours shown.',
  'help.employerSchedule.section.mistakes.heading': 'Common mistakes',
  'help.employerSchedule.section.mistakes.item1':
    'Shift statuses update on their own with the real clock - there is nothing to do by hand here.',

  // --- /employer/shifts/[id] (quản lý ca) ---------------------------------------------
  'employer.manageShift.loadError.title': 'Could not load the shift',
  'employer.manageShift.loadError.body': 'This may be an unstable connection. Check your connection and try again.',
  'employer.manageShift.backToDashboard': 'Back to dashboard',
  'feedback.applicant.approve.success': 'Applicant approved',
  'reject.error.reasonRequired': 'Please enter a reason for rejecting.',
  'feedback.applicant.reject.success': 'Application rejected',
  'feedback.applicant.markNoShow.success': 'Marked as absent',
  'lifecycle.toast.markPresent.success': 'Worker confirmed present',
  'feedback.applicant.confirm.success': 'Shift completion confirmed',
  'attendance.revert.error.reasonRequired': 'Please enter a reason.',
  'attendance.revert.success': 'The worker is now marked present.',
  'feedback.applicant.cancellationApproved.success': 'Cancellation request accepted',
  'feedback.applicant.cancellationRejected.success': 'Cancellation request declined',
  'feedback.repost.success': 'Opening the form',
  'feedback.repost.success.desc': 'Edit the new shift and pick a date and time before holding the deposit.',
  'employer.manageShift.cancel.reasonRequired': 'Please enter a reason for cancelling.',
  'feedback.shift.cancel.success': 'Shift cancelled',
  'feedback.shift.cancel.success.descReal': 'Affected workers will see the shift as Cancelled.',
  'employer.manageShift.cancel.successPenalty':
    'Workers have been notified and a cancellation fee of {rate}% of the deposit was applied.',
  'feedback.shift.cancel.success.desc': 'The deposit has been refunded (simulated).',
  'employer.manageShift.positionsApproved': 'approved',
  'employer.manageShift.positionsLeft': 'positions open',
  'employer.manageShift.viewAsWorker': 'View as a worker',
  'btn.cancelShift': 'Cancel shift',
  'employer.repost.banner.body': 'You can create a new shift with the same details to post it again.',
  'employer.repost.button': 'Repost from this shift',
  'shift.cancelled.banner': 'This shift was cancelled. Affected workers have been notified.',
  'employer.manageShift.cancelled.reasonLabel': 'Reason:',
  'employer.manageShift.cancelled.penaltyPrefix': 'Fee for cancelling after approving workers:',
  'employer.manageShift.cancelled.penaltyUnit': '% of deposit',
  'employer.manageShift.cancelled.affectedLabel': 'Approved workers affected:',
  'attendance.markNoShow.title': 'Mark absent',
  'attendance.markNoShow.confirm':
    'Mark this worker ABSENT? This cannot be undone: they will not be paid, and the matching part of the deposit returns to your wallet when the shift is settled.',
  'attendance.markNoShow.submit': 'Confirm absence',
  'employer.manageShift.cancel.title': 'Cancel shift',
  'employer.manageShift.cancel.warnApproved':
    'This shift already has approved workers. If you cancel, they are not penalised and the cancellation counts against your employer reputation.',
  'employer.manageShift.cancel.intro':
    'Please enter a reason for cancelling. Workers waiting for approval will be told the shift no longer applies.',
  'employer.manageShift.cancel.reasonLabel': 'Reason for cancelling (required)',
  'employer.manageShift.cancel.reasonPlaceholder': 'For example: plans changed suddenly and the shift cannot go ahead.',
  'employer.manageShift.cancel.penaltyPrefix': 'Cancellation fee:',
  'employer.manageShift.cancel.keep': 'No',
  'employer.manageShift.cancel.confirm': 'Confirm cancellation',
  'employer.applicants.parentHeading': 'Applications',
  'employer.manageShift.risk.title': 'High-risk work',
  'employer.manageShift.risk.body':
    'Prefer people with a verified identity, a high reputation and a relevant work history.',
  'employer.manageShift.empty.applicants.title': 'No one has applied to this shift yet.',
  'employer.manageShift.empty.applicants.description':
    'Check the title, description, pay and requirements - clear shifts with competitive pay usually get applications faster.',
  'employer.manageShift.workerMissing': 'Could not load the worker’s profile',
  'attendance.absentDisabled.checkedIn': 'The worker has checked in. Mark them absent only if there is a dispute.',
  'review.employer.prompt': 'The shift is completed — you have 14 days to review the worker.',
  'review.employer.open': 'Review the worker',
  'cancel.request.employerHeading': 'The worker asked to cancel',
  'cancel.request.employerHint':
    'Because the shift starts within 3 hours, the worker needs your approval before the cancellation takes effect.',
  'employer.manageShift.manual.title': 'The shift has ended but the worker has not checked out',
  'employer.manageShift.manual.body':
    'You confirmed the worker was present. If they finished the shift, you can confirm it manually.',
  'employer.manageShift.manual.button': 'Confirm the worker finished',
  'employer.dispute.statusLine.byWorker':
    'The worker has filed a complaint about this shift. An administrator is reviewing it - the wages are on hold.',
  'employer.dispute.statusLine.byEmployer':
    'You filed a complaint about this shift. An administrator is handling it - the wages are on hold.',
  'employer.dispute.workerStatement.title': 'The worker’s complaint',
  'employer.manageShift.dispute.category': 'Type:',
  'employer.manageShift.dispute.none': 'None',
  'employer.manageShift.dispute.reason': 'Reason:',
  'employer.manageShift.dispute.evidence': 'Evidence description:',
  'employer.manageShift.dispute.file': 'Attachment:',
  'employer.dispute.respondButton': 'Respond to complaint / Add evidence',
  'employer.manageShift.dispute.sideWorker': 'Worker',
  'employer.manageShift.dispute.sideEmployer': 'Employer',
  'review.employer.intro':
    'Give {name} a star rating and a one-line comment. The worker and other employers will see this review.',
  'attendance.revert.title': 'Mark present (arrived late)',
  'attendance.revert.body':
    'Did the worker arrive late? Switch them from absent to present to restore their reputation points and continue the shift.',
  'attendance.revert.reasonLabel': 'Reason for the change',
  'attendance.revert.reasonPlaceholder': 'For example: the worker arrived 20 minutes late because of traffic.',
  'attendance.revert.confirm': 'Confirm present',
  'employer.manageShift.manual.modalTitle': 'Confirm completion manually',
  'employer.manageShift.manual.modalBody':
    'The worker has not checked out. You are confirming completion manually because they were present and the shift has ended.',
  'btn.approveCancellation': 'Accept cancellation',
  'btn.rejectCancellation': 'Decline cancellation',
  'employer.manageShift.pendingExpired': 'Application expired',
  'employer.manageShift.pendingExpiredHint': 'The shift has started, so no more applicants can be approved.',
  'btn.approve': 'Approve',
  'btn.reject': 'Reject',
  'lifecycle.btn.employerMarkPresent': 'Confirm present',
  'lifecycle.btn.employerMarkAbsent': 'Mark absent',
  'employer.manageShift.status.disputed': 'In dispute — waiting for an administrator',
  'employer.manageShift.status.confirmed': 'Confirmed & paid',
  'attendance.revert.button': 'Arrived late - mark present',
  'shift.timeline.title': 'Shift history',
  'feedback.applicant.markNoShow.success.descReal':
    'The deposit for this position will return to your wallet when the shift is settled.',
  'feedback.applicant.markNoShow.success.desc': 'You got 1 free boost for your next shift.',
  'employer.manageShift.cancel.within6h': 'You are cancelling within 6 hours of the start time.',
  'employer.manageShift.cancel.within24h': 'You are cancelling within 24 hours of the start time.',
  'employer.manageShift.cancel.over24h': 'You are cancelling more than 24 hours before the start time.',
  'applicantBucket.AwaitingConfirmation.hint':
    'Checked out: confirm to pay the wages, or file a complaint if something is wrong. Confirmed automatically after 12 hours.',
  'employer.manageShift.status.noShowReal':
    'Absent — the deposit for this position returns to your wallet when the shift is settled',
  'employer.manageShift.status.noShowLocal': 'Absent — refunded & boost given',

  // --- /employer/shifts/new (đăng ca) ---------------------------------------------------
  'shiftForm.draft.deleted': 'Draft deleted.',
  'posting.readiness.intro': 'You need to finish employer verification before posting shifts.',
  'shift.create.error.CONTACT_PERSON_REQUIRED': 'Please enter the on-site contact person.',
  'shift.create.error.CONTACT_PHONE_REQUIRED': 'Please enter the contact person’s phone number.',
  'feedback.shift.create.success': 'Shift created',
  'feedback.shift.create.success.desc': 'Tap "Simulate deposit" to publish the shift to workers.',
  'shiftForm.saveDraft.success': 'Draft saved. You can keep editing later under "Saved drafts".',
  'feedback.shift.deposit.success': 'Deposit simulated - the shift is now public',
  'deposit.insufficient.savedDraft': 'The shift was saved as a draft. You can top up and hold the deposit later.',
  'posting.readiness.cta.profile': 'Open employer profile',
  'help.shiftCreate.title': 'Guide - Post a new shift',
  'help.shiftCreate.intro': 'Fill in the shift details; a shift is posted only after its wages are held as a deposit.',
  'help.shiftCreate.real.item1': 'Enter the hourly pay as a whole number; the amount is also spelled out in words.',
  'help.shiftCreate.real.item2':
    'When you tap Post, the wages + 10% fee are held from your wallet. If your wallet is short, top up with a PayOS QR code.',
  'help.shiftCreate.real.item3': 'The shift goes public as soon as the full amount is held.',
  'help.shiftCreate.item1': 'Enter the hourly pay as a whole number - the amount is also spelled out in Vietnamese words.',
  'help.shiftCreate.item3': 'Tap "Confirm payment" to finish holding the deposit - no real transaction happens.',
  'help.shiftCreate.item4': 'Once the deposit is held, the shift moves to the public "Posted" status.',
  'shifts.deposit.success': 'Deposit held! The shift has been posted.',
  'shiftForm.draft.section.title': 'Saved drafts',
  'shiftForm.draft.section.intro':
    'A draft is a saved form - it is not posted and workers cannot see it. Keep editing, then hold the deposit to post the shift.',
  'shiftForm.draft.untitled': '(Untitled)',
  'shiftForm.draft.noDate': 'No date or time yet',
  'shiftForm.draft.savedAt': 'Saved at',
  'shiftForm.draft.continue': 'Continue editing',
  'shiftForm.draft.delete': 'Delete draft',
  'deposit.insufficient.title': 'Not enough wallet balance to hold the deposit',
  'deposit.insufficient.body':
    'Your wallet does not have enough to hold this shift’s deposit; the draft is kept. Would you like to top up?',
  'deposit.insufficient.required': 'Deposit needed',
  'deposit.insufficient.balance': 'Current balance',
  'deposit.insufficient.shortfall': 'Shortfall',
  'deposit.insufficient.draftNote':
    'The shift is a draft: it is not published and workers cannot see it. You can top up and confirm again without re-entering anything.',
  'deposit.insufficient.topUpNow': 'Top up now',
  'deposit.insufficient.saveDraft': 'Save draft',
  'deposit.insufficient.backToEdit': 'Back to editing',
  'posting.readiness.checklist.type': 'Account type chosen',
  'posting.readiness.checklist.id': 'Representative’s ID card approved',
  'posting.readiness.checklist.business': 'Business licence or tax code approved',
  'posting.readiness.checklist.event': 'Event contract / confirmation approved',
  'posting.readiness.checklist.workplaceProof': 'Storefront / workplace photo approved on your profile',
  'posting.readiness.checklist.workplaceImage': 'This shift has a photo of the location',
  'posting.readiness.allClear': 'All requirements are met. You can post the shift.',
  'posting.readiness.title': 'Before you post a shift',
  'posting.readiness.depositLocked': 'The deposit step opens only after you meet the requirements above.',
  'posting.readiness.individualNote': 'For individual accounts hiring short-term, a deposit of 100% of wages is required.',
  'deposit.trust.title': 'Deposit 100% of wages',
  'deposit.trust.ratio':
    'You pay 100% of the total wages up front before posting the shift. Your trust level affects listing priority and future service fees.',
  'shifts.deposit.title': 'Deposit first',
  'shifts.deposit.description':
    'Employers pay the full wages into the business wallet before the shift is posted publicly.',
  'deposit.breakdown.fullWage': 'Total wages',
  'deposit.breakdown.trust': 'Trust level',
  'deposit.breakdown.ratio': 'Deposit ratio',
  'shifts.deposit.amount': 'Hiring balance to secure',
  'deposit.confirmPaid': 'Simulate deposit',
  'shifts.new.subtitle.real':
    'Fill in the shift details. The deposit amount is calculated automatically and shown right below the form.',
  'shifts.new.subtitle':
    'Fill in the shift details. The deposit is calculated automatically from your employer trust level.',

  // --- /worker/profile ------------------------------------------------------------------
  'worker.profile.joinedSince': 'On CaLẻ since {date}',
  'worker.profile.chip.reputation': '{score}/100 reputation',
  'worker.profile.chip.phoneVerified': 'Phone verified',
  'worker.profile.metric.completed': 'Completed shifts',
  'worker.profile.metric.noShows': 'No-shows',
  'worker.profile.metric.cancellations': 'Cancellations',
  'worker.profile.saveFailed': 'Could not save your changes. Please try again.',
  'worker.profile.saved': 'Profile saved',
  'worker.profile.reviews.title': 'Reviews from employers',
  'worker.profile.reviews.intro':
    'After each completed shift, the employer can rate and comment on you. Other employers see this when reviewing your applications.',
  'worker.profile.reviews.empty':
    'No reviews yet. Reviews appear here after employers rate shifts you completed.',
  'skill.section.title': 'Your skills',
  'skill.section.footnote':
    'Skill points are separate from your overall reputation. Employers see the skill level that matches the shift type when reviewing applications.',
  'worker.profile.info.title': 'Personal details',
  'worker.profile.empty.lead':
    'Employers read your introduction, skills and preferred job types when reviewing applications. Add a few lines so they get to know you.',
  'worker.profile.empty.cta': 'Fill in your profile',
  'worker.profile.info.progress': '{n}/4 sections filled in',
  'form.bio': 'About you',
  'form.skills': 'Skills',
  'form.preferredJobTypes': 'Preferred job types',
  'form.preferredLocations': 'Preferred areas',
  'worker.profile.privateNote': 'Only you can see this',
  'worker.profile.edit.title': 'Edit profile',
  'worker.profile.edit.commaHint': 'Separate with commas',
  'worker.profile.addMissing': 'Not set — tap to add',

  // --- /worker/schedule -----------------------------------------------------------------
  'schedule.event.availableLabel': 'Available',
  'schedule.event.personalLabel': 'Personal',
  'feedback.schedule.delete.success': 'Schedule entry deleted',
  'schedule.page.approvedShiftsNote': 'Approved shifts also count as busy time when you apply.',
  'schedule.page.deviceOnlyNote':
    'Your busy/available times are stored on this device and browser for now, and are not synced to other devices.',
  'schedule.btn.add': 'Add schedule entry',
  'schedule.sync.loadFailed':
    'Could not load your personal schedule from the server. What you see may not be up to date.',
  'schedule.sync.saveFailed':
    'Could not save your schedule change to the server, so it was undone. Please try again.',
  'schedule.sync.retry': 'Try again',
  'schedule.slotCfg.error.INVALID_TIME_RANGE': 'The day end time must be after the day start time.',
  'calendar.empty.worker': 'No busy times or shifts in this period.',
  'schedule.list.title': 'All schedule entries',
  'schedule.empty.title': 'You have no schedule entries yet.',
  'schedule.empty.description':
    'Add available times to get matching shift suggestions, or busy times so you cannot apply to clashing shifts.',
  'schedule.page.title': 'Personal schedule',
  'schedule.page.subtitle':
    'Add available times to get matching shift suggestions, or busy times (classes, other jobs, personal plans) to avoid applying to clashing shifts.',
  'help.workerSchedule.title': 'Guide - Personal schedule',
  'help.workerSchedule.intro': 'Mark your busy times so you cannot apply to clashing shifts.',
  'help.workerSchedule.section.purpose.heading': 'Use this page to',
  'help.workerSchedule.section.purpose.item1':
    'Mark busy times to avoid applying to clashing shifts. These can be classes, other jobs or personal plans.',
  'help.workerSchedule.section.numbers.heading': 'Key numbers / statuses',
  'help.workerSchedule.section.numbers.item1':
    'Each busy block has a date, a start time and an end time. You cannot apply to shifts that overlap a busy block.',
  'help.workerSchedule.section.numbers.item2': 'Approved shifts also count as busy blocks automatically.',
  'help.workerSchedule.section.actions.heading': 'Main actions',
  'help.workerSchedule.section.actions.item1': 'Tap an empty cell in week/day view to add a busy block with the time filled in.',
  'help.workerSchedule.section.actions.item2': 'Tap an existing busy block to edit or delete it.',
  'help.workerSchedule.section.actions.item3':
    'Tap "Customise time slots" to change the hours shown (default 07:00–21:00, 120 minutes per slot).',
  'help.workerSchedule.section.mistakes.heading': 'Common mistakes',
  'help.workerSchedule.section.mistakes.item1':
    'You cannot create a busy block that overlaps an approved shift - you will see an error.',
  'help.workerSchedule.section.mistakes.item2': 'Enter dates as dd/mm/yyyy and times in 24-hour HH:mm.',
  'schedule.event.lockedLabel': 'Approved shift',
  'schedule.kind.available': 'Available',
  'schedule.kind.busy': 'Busy',
  'btn.delete': 'Delete',
  'schedule.btn.confirmDelete': 'Confirm delete',
  'schedule.error.TIME_REQUIRED': 'Please choose a start time and an end time.',
  'error.endBeforeStart': 'The end time must be after the start time.',
  'error.shiftOverlap': 'This time overlaps one of your approved shifts.',
  'feedback.schedule.update.success': 'Schedule entry updated',
  'feedback.schedule.add.success': 'Schedule entry added',
  'schedule.dialog.editTitle': 'Update schedule entry',
  'schedule.dialog.addTitle': 'Add a schedule entry',
  'schedule.form.title': 'Name',
  'schedule.kind.label': 'Entry type',
  'schedule.kind.helper':
    'Add available time to get matching shift suggestions, or busy time to avoid clashes.',
  'schedule.kind.availableHint':
    'Available time helps suggest shifts that fit your schedule - it does not block applications.',
  'schedule.kind.busyHint': 'Busy time blocks applications that overlap it.',
  'schedule.form.date': 'Date',
  'schedule.form.startTime': 'Start time',
  'schedule.form.endTime': 'End time',
  'schedule.form.note': 'Note (optional)',

  // --- Lịch (calendar/*) ----------------------------------------------------------------
  'calendar.legend.title': 'Legend',
  'calendar.legend.worker.personalBusy': 'Busy',
  'calendar.legend.worker.availableSlot': 'Available',
  'calendar.legend.worker.approvedShift': 'Approved / ongoing shift',
  'calendar.legend.worker.pendingShift': 'Shift awaiting approval',
  'calendar.legend.worker.completedShift': 'Completed shift',
  'calendar.legend.employer.published': 'Posted',
  'calendar.legend.employer.fullyBooked': 'Fully staffed',
  'calendar.legend.employer.awaiting': 'Awaiting confirmation',
  'calendar.legend.employer.completed': 'Completed',
  'calendar.legend.employer.cancelled': 'Cancelled',
  'calendar.legend.employer.expired': 'Expired',
  'calendar.today': 'Today',
  'calendar.prev': 'Previous',
  'calendar.next': 'Next',
  'calendar.view.day': 'Day',
  'calendar.view.week': 'Week',
  'calendar.view.agenda': 'Agenda',
  'calendar.miniMonth.aria.prev': 'Previous month',
  'calendar.miniMonth.aria.next': 'Next month',

  // --- Hộp thoại / nút trên chi tiết ca (ApplicationActions, khiếu nại…) ------------------
  'apply.outcome.completed': 'The employer confirmed you completed this shift.',
  'apply.outcome.viewWallet': 'View wallet',
  'apply.outcome.disputed': 'This shift has a complaint. An administrator will review it and let you know the outcome.',
  'apply.outcome.cancelledByEmployer':
    'The employer cancelled this shift. Your reputation and cancellation allowance are not affected.',
  'apply.outcome.expiredNote':
    'The shift has started, so your application is no longer valid. Your reputation and cancellation allowance are not affected.',
  'apply.outcome.closed': 'This shift is no longer accepting applications.',
  'shift.status.FullyBooked': 'Fully staffed',
  'verification.required': 'You need to verify your phone number before applying.',
  'verification.goToProfile': 'Go to your profile to verify your phone',
  'btn.cancelApplication': 'Cancel application',
  'cancel.requested.awaitingDecision':
    'Your cancellation request was sent to the employer. Your application keeps its spot until they decide.',
  'btn.apply': 'Apply',
  'apply.outcome.paid.real': 'Wages of {amount} have been paid into your wallet.',
  'apply.outcome.paid.demo': 'Wages of {amount} have been recorded in your simulated wallet.',
  'apply.outcome.checkedOut': 'You have checked out. Waiting for the employer to confirm completion.',
  'apply.outcome.checkedIn': 'You have checked in. The check-out button appears when the shift ends.',
  'dispute.dialog.error.reasonRequired': 'Please enter the reason for your complaint.',
  'dispute.dialog.error.evidenceDescriptionRequired': 'Please describe the evidence.',
  'dispute.dialog.error.invalidFileName': 'The file name cannot contain "/" or "\\".',
  'dispute.dialog.title': 'File a complaint about the shift',
  'dispute.dialog.intro':
    'Please give complete information so an administrator can review your complaint. The wages are held until there is a decision.',
  'dispute.dialog.category.label': 'Complaint type',
  'dispute.dialog.category.placeholder': '- Choose a complaint type -',
  'dispute.dialog.reason.label': 'Specific reason',
  'dispute.dialog.reason.placeholder': 'Briefly describe why you are filing a complaint about this shift.',
  'dispute.dialog.reason.hint': 'Required - 1 to 1000 characters.',
  'dispute.dialog.evidenceDescription.label': 'Evidence description',
  'dispute.dialog.evidenceDescription.placeholder':
    'For example: a photo of the area still full of rubbish, a call recording, system logs.',
  'dispute.dialog.evidenceDescription.hint': 'Required - up to 2000 characters.',
  'dispute.dialog.evidenceFile.label': 'Attachment (optional)',
  'dispute.dialog.evidenceFile.placeholder': 'For example: photo-2025-01-15.jpg',
  'dispute.dialog.evidenceFile.hint':
    'Optional - file name only (≤255 characters, no "/" or "\\"). The MVP does not upload real files.',
  'dispute.dialog.privacyWarning':
    'Do not photograph customers, personal documents, sensitive receipts or confidential goods.',
  'dispute.dialog.cancel': 'Close',
  'dispute.dialog.submit': 'Submit complaint',
  'dispute.response.dialog.title': 'Respond to the complaint',
  'dispute.response.dialog.intro':
    'Describe your response and add evidence if you have any. It is attached to the complaint file for the administrator to review.',
  'dispute.response.dialog.reason.label': 'Response / statement',
  'dispute.response.dialog.reason.placeholder':
    'For example: I worked the full time and handed over to the shift manager at 22:05.',
  'dispute.response.dialog.evidenceDescription.label': 'Evidence description (if any)',
  'dispute.response.dialog.evidenceDescription.placeholder':
    'For example: a photo of the checklist after the shift, handover messages with the shift manager…',
  'dispute.response.dialog.evidenceFileName.label': 'Evidence file name (if any)',
  'dispute.response.dialog.evidenceFileName.placeholder': 'evidence-2026-05-25.jpg',
  'dispute.response.dialog.evidenceFileName.hint':
    'The MVP does not upload real files - only the file name is recorded for the administrator to cross-check.',
  'rating.submitted': 'Review sent.',
  'form.feedback': 'Comment (optional)',
  'reject.dialog.title': 'Reject application',
  'reject.dialog.intro':
    'You are about to reject {worker}’s application for the shift "{shift}". Please give a reason so the worker understands.',
  'reject.dialog.reasonLabel': 'Reason for rejecting',
  'reject.dialog.reasonPlaceholder': 'For example: experience not a match, already fully staffed, schedule does not fit...',
  'reject.dialog.confirm': 'Confirm rejection',

  // --- ShiftForm (đăng ca) -------------------------------------------------------------------
  'error.wage.invalid': 'Pay must be a positive number.',
  'error.time.endBeforeStart': 'The end time must be after the start time.',
  'error.shift.pastDateTime': 'You cannot post a shift in the past. Please choose a future date/time.',
  'shiftForm.wage.recommendedMin.warning':
    'Your pay is below the recommended minimum for this job type. You can continue, but consider raising it to attract workers.',
  'shiftForm.customJobType.required': 'Please enter the job type name when choosing "Other".',
  'error.positions.required': 'Please enter how many people you need.',
  'error.positions.invalid': 'You need at least 1 person.',
  'error.positions.belowFilled': 'You cannot reduce the number of people below {min} (some are already approved).',
  'error.workplaceImage.required': 'Add a photo of the location / work area for this shift.',
  'error.contactPerson.required': 'Please enter the on-site contact person.',
  'error.contactPhone.required': 'Please enter the contact person’s phone number.',
  'error.evidence.tooLowForHighRisk': 'High-risk work requires a higher evidence level.',
  'shiftForm.section.basics': 'Shift details',
  'form.title': 'Shift name',
  'form.jobType': 'Job type',
  'shiftForm.customJobType.label': 'Custom job type name',
  'shiftForm.customJobType.placeholder': 'For example: Help with moving house',
  'shiftForm.customJobType.hint': 'Required when the job type is "Other".',
  'form.location': 'Location',
  'form.date': 'Work date',
  'form.startTime': 'Start time',
  'form.endTime': 'End time',
  'form.hourlyWage': 'Hourly pay (đ)',
  'form.hourlyWage.hint': 'For example: 35000 is shown as 35.000. The amount is also spelled out below.',
  'shiftForm.wage.recommendedMin.title': 'Recommended minimum',
  'shiftForm.wage.recommendedMin.disclaimer': 'This is an internal recommendation - not the legal minimum wage.',
  'shiftForm.wage.recommendedMin.acknowledge': 'I understand and want to continue with this pay',
  'form.positionsTotal': 'Number of people needed',
  'shiftForm.section.details': 'Description and requirements',
  'form.description': 'Job description',
  'form.requirements': 'Requirements',
  'form.workplaceImageLabel': 'Photo of the location / work area',
  'form.workplaceImageLabel.placeholder': 'mat-tien-quan-pho-ha.jpg',
  'form.workplaceImageLabel.hint':
    'Image file name (simulated). Workers see this label on the shift detail page.',
  'form.workplaceNotes': 'Location notes',
  'form.workplaceNotes.placeholder': 'For example: Use the back gate; free parking available.',
  'form.onSiteContactName': 'On-site contact person',
  'form.onSiteContactPhone': 'On-site contact’s phone',
  'form.requiresVerifiedDocumentOnArrival': 'Workers must bring a verified ID document when they arrive.',
  'shiftForm.depositSummary.wage': 'Wages',
  'shiftForm.depositSummary.feeFree': 'Service fee',
  'shiftForm.depositSummary.fee': '10% service fee',
  'shiftForm.depositSummary.feeFreeValue': 'Free (offer until {date})',
  'shiftForm.depositSummary.total': 'Total held from wallet',
  'shiftForm.depositSummary.feeFreeTooFar':
    'The free-service offer only covers shifts up to {date}. This shift is still charged the 10% fee.',
  'shiftForm.depositSummary.note':
    'The shift is posted as soon as this amount is held. Anything unused (empty positions, no-shows, cancelled shifts) is refunded to your wallet.',
  'btn.deposit': 'Simulate deposit',
  'shiftForm.saveDraft': 'Save draft',
  'shiftForm.evidence.section.title': 'Evidence after the shift',
  'help.evidence.title': 'Choosing an evidence level',
  'help.evidence.description':
    'The higher the level, the more evidence the worker has to send (checklist, photos, notes). A level that fits the job type is suggested; you can change it.',
  'shiftForm.evidence.section.intro':
    'Choose the evidence the worker must send at check-out. A level is suggested from the job type - keep it or pick another.',
  'evidence.suggestedChip': 'Suggested',
  'evidence.privacy.warning':
    'Do not ask for photos of customers, personal documents, sensitive receipts, confidential goods or private spaces.',
  'evidence.privacy.warning.detailed':
    'Do not photograph customers’ faces without permission. Do not photograph personal documents, receipts, order codes, sensitive information or confidential goods.',
  'evidence.examples.checklist.title': 'Checklist examples',
  'evidence.examples.checklist.item1': 'Worked the full agreed time.',
  'evidence.examples.checklist.item2': 'Finished the main tasks.',
  'evidence.examples.checklist.item3': 'Handed over to the person in charge.',
  'evidence.examples.photo.title': 'Handover photo examples',
  'evidence.examples.photo.item1': 'The work area after finishing.',
  'evidence.examples.photo.item2': 'Products or an area that has been packed.',
  'evidence.examples.photo.item3': 'An event booth after setup.',
  'evidence.examples.photo.item4': 'Tools or goods handed over to the person in charge.',
  'shiftForm.evidence.highRiskNote':
    'High-risk work only allows “Checklist + handover note required” or higher.',
  'form.workplaceSection.title.supabase': 'Contact at the workplace',
  'form.workplaceSection.title': 'Location photo and workplace contact',
  'form.workplaceSection.intro.supabase':
    'Give contact details at the workplace so workers can find you and get in touch when they arrive.',
  'form.workplaceSection.intro':
    'A photo helps workers recognise the real workplace before taking the shift. In the MVP you only need to enter a simulated file name (for example: "mat-tien-quan-pho-ha.jpg").',

  // --- FeaturedJobMockup (trang chủ) ------------------------------------------------------
  'landing.hero.featured.viewAria': 'View shift details for {title}',
  'landing.hero.featured.exploreAria': 'Explore shifts on CaLẻ',
  'landing.hero.featured.badge': 'Open shift',
  'landing.hero.featured.repLabel': 'Reputation',
  'landing.hero.featured.repHint': 'out of 100',
  'landing.hero.featured.upcomingLabel': 'Your next shift',
  'landing.hero.featured.boardNote': 'The shift list updates each time you open the page.',
  'landing.hero.featured.statusBadge': 'Hiring',
  'landing.hero.featured.timeLabel': 'Time',
  'landing.hero.featured.wageLabel': 'Pay',
  'landing.hero.featured.wageUnit': 'per hour',
  'landing.hero.featured.slotsLabel': 'Open spots',
  'landing.hero.featured.slotsUnit': 'positions',
  'landing.hero.featured.viewCta': 'View details',
  'landing.hero.featured.fallbackTitle': 'Explore shifts that suit you',
  'landing.hero.featured.fallbackHint': 'No featured shift right now - tap to see all open shifts.',
  'landing.hero.featured.exploreCta': 'Explore shifts',

  // --- UserMenu ----------------------------------------------------------------------------
  'nav.userMenu.worker.dashboard': 'Overview',
  'nav.userMenu.worker.profile': 'Profile',
  'nav.userMenu.worker.schedule': 'Personal schedule',
  'nav.userMenu.worker.applications': 'My applications',
  'nav.userMenu.worker.reputation': 'Reputation',
  'nav.userMenu.support': 'Support',
  'nav.userMenu.employer.dashboard': 'Employer overview',
  'nav.userMenu.employer.postShift': 'Post a shift',
  'nav.userMenu.employer.schedule': 'Hiring calendar',
  'nav.userMenu.employer.profile': 'Business profile',
  'nav.userMenu.employer.pending': 'Manage applicants',
  'nav.userMenu.employer.payments': 'Payments & guarantees',
  'nav.userMenu.admin.dashboard': 'Admin overview',
  'nav.userMenu.admin.users': 'Users',
  'nav.userMenu.admin.shifts': 'Shifts',
  'nav.userMenu.admin.disputes': 'Disputes',
  'nav.userMenu.closeLabel': 'Close account menu',
  'nav.userMenu.openLabel': 'Open account menu',
  'nav.userMenu.account': 'Account',

  // --- Ví / thanh toán ---------------------------------------------------------------------
  'deposit.promo.use': 'Pay the fee with bonus credit',
  'deposit.promo.cash': 'Deduct from wallet balance',
  'wallet.topUp.reviewClosed':
    'An administrator checked this order’s transaction and did not credit it to your wallet. See the note in your wallet; do not transfer again for this order.',

  // --- EmployerConfirmationPanel ----------------------------------------------------------
  'employer.confirm.panel.title': 'Confirm shift completion',
  'employer.confirm.panel.intro':
    'The worker has checked out. Confirm completion to pay the wages, or file a complaint if you find a problem.',
  'employer.confirm.checkOutAt': 'Check-out time',
  'employer.confirm.checklist.title': 'Completion checklist',
  'employer.confirm.checklist.empty': 'This shift does not require a checklist.',
  'employer.confirm.checklist.complete': 'All {n} items ticked',
  'employer.confirm.checklist.incomplete': '{n} of {total} items not ticked',
  'checklist.row.notSubmitted': 'The worker did not submit this checklist item',
  'employer.confirm.note.title': 'The worker’s handover note',
  'employer.confirm.note.empty': 'The worker did not send a handover note.',
  'employer.confirm.evidenceFile.title': 'Handover photo file',
  'employer.confirm.evidenceFile.empty': 'The worker did not send an evidence file.',
  'employer.confirm.countdown.label': 'Time left to confirm or file a complaint',
  'help.autoRelease.title': '12-hour countdown',
  'help.autoRelease.description':
    'The time you have left to confirm or file a complaint, counted from the worker’s check-out. When it runs out, the system confirms automatically; if you filed a complaint, an administrator handles it.',
  'employer.confirm.countdown.warning':
    'If you do not confirm or file a complaint within 12 hours, the system pays the wages automatically.',
  'employer.confirm.btn.dispute': 'File a complaint',
  'employer.confirm.btn.confirm': 'Confirm completion',

  // --- PaymentEvidenceCard ------------------------------------------------------------------
  'shifts.detail.paymentEvidence.title': 'Payment & evidence process',
  'shifts.detail.paymentEvidence.fallback':
    'Could not find the evidence requirement for this shift. Please reload the page or contact support.',
  'help.paymentEvidence.title': 'When is evidence needed?',
  'shifts.detail.paymentEvidence.intro':
    'After you finish the shift, the employer confirms it and your wages are paid to you. Each shift may ask for a different evidence level depending on how risky the work is - not every shift needs a handover photo.',
  'shifts.detail.paymentEvidence.required.title': 'This shift requires handover evidence',
  'shifts.detail.paymentEvidence.required.body':
    'Be ready to complete the full checklist and attach a handover photo at check-out to get paid quickly.',
  'shifts.detail.paymentEvidence.evidenceLabel': 'Evidence level for this shift',
  'help.paymentEvidence.description':
    'Light work needs only the checklist; work involving cash or stock also needs a handover photo and note. Do not photograph customers, personal documents or sensitive receipts.',
  'shifts.detail.paymentEvidence.confirmRule':
    'After you check out, the employer has up to 12 hours to confirm or file a complaint.',
  'shifts.detail.paymentEvidence.autoReleaseRule':
    'If the employer does nothing within 12 hours, the system pays your wages automatically.',

  // --- Hồ sơ người dùng (user/*) --------------------------------------------------------------
  'admin.profile.title': 'User profile',
  'employer.applicant.completedShifts': 'Completed shifts',
  'employer.applicant.avgRating': 'Rating',
  'employer.applicant.noShows': 'No-shows',
  'employer.applicant.cancellations': 'Cancellations',
  'admin.reputation.derivedBreakdown':
    '{completed} completed shifts · {noShows} no-shows · {lateCancels} late cancellations',
  'admin.profile.quota.title': 'Cancellation allowance',
  'admin.profile.quota.weekly': '7 days: used {used}/{limit} ({remaining} left).',
  'admin.profile.quota.monthly': '30 days: used {used}/{limit} ({remaining} left).',
  'admin.profile.verify.title': 'Verification',
  'admin.profile.verify.identityVerified': 'Identity verified',
  'admin.profile.verify.identityNotVerified': 'Identity not verified',
  'admin.profile.verify.pendingCount': '{count} awaiting review',
  'employer.applicant.bio': 'About',
  'employer.applicant.noBio': 'The worker has not added an introduction.',
  'employer.applicant.skills': 'Skills',
  'employer.applicant.preferredJobs': 'Preferred job types',
  'employer.applicant.preferredLocations': 'Preferred areas',
  'employer.applicant.ratingHistory': 'Review history',
  'reputation.noRatings': 'No reviews yet.',
  'admin.user.adjustmentHistory.title': 'Score adjustment history',
  'admin.user.adjustmentHistory.empty': 'No score adjustments by administrators yet.',
  'employer.profile.verifiedBusiness': 'Verified business',
  'employer.profile.notVerified': 'Individual / not verified',
  'employer.profile.postedShifts': 'Shifts posted',
  'employer.profile.activeShifts': 'Active',
  'employer.profile.completedShifts': 'Shifts completed',
  'employer.profile.cancelledShifts': 'Cancelled',
  'admin.profile.employer.disputedPayments': '{count} payments are currently in dispute.',
  'employer.profile.description': 'About',
  'employer.profile.noDescription': 'The employer has not added an introduction.',
  'employerFeedback.title': 'Reviews from workers',
  'admin.profile.admin.note': 'Administrator rights',
  'admin.profile.admin.description':
    'This account has administrator rights over the whole system. All actions are mock/localStorage.',
  'admin.profile.verify.phoneVerified': 'Phone verified',
  'admin.profile.verify.phoneNotVerified': 'Phone not verified',
  'admin.profile.verify.since': 'since {date}',
  'admin.profile.verify.submittedAt': 'Submitted {date}',
  'admin.profile.verify.reviewHint': 'Review it in the Verification tab.',
  'employerFeedback.empty': 'No reviews from workers yet.',
  'employer.profile.title': 'Employer profile',
  'employer.profile.publicPhotos.title': 'Verified location photos',
  'employer.profile.publicPhotos.empty': 'No verified workplace photos yet.',
  'employer.profile.email': 'Email',
  'common.reviews': 'reviews',
  'employer.trust.noReviews': 'No reviews yet - this may be a new employer.',
  'employer.trust.viewProfile': 'View profile',
  'review.report.error.already': 'You have already reported this review.',
  'review.report.error.reasonRequired': 'Please enter a reason for the report.',
  'review.report.success': 'Report sent. An administrator will review it.',
  'review.summary.count': 'reviews',
  'review.summary.distribution': 'Star distribution',
  'review.report.underReview': 'Under review',
  'review.report.button': 'Report review',
  'review.report.modal.title': 'Report review',
  'review.report.modal.body':
    'Reporting a review does not delete it. An administrator will look at what you reported.',
  'review.report.modal.reasonLabel': 'Reason for the report',
  'review.report.modal.reasonPlaceholder': 'For example: false, offensive, spam...',
  'review.report.modal.noteLabel': 'Extra notes (optional)',
  'review.report.modal.notePlaceholder': 'Evidence or further explanation...',
  'review.report.modal.submit': 'Send report',
  'review.sort.newest': 'Newest',
  'review.sort.oldest': 'Oldest',
  'review.sort.highest': 'Highest rated',
  'review.sort.lowest': 'Lowest rated',
  'review.sort.withComment': 'With comments',
  'verification.none': 'Not verified',
  'verification.id': 'ID card verified',
  'verification.student': 'Student card verified',
  'common.stars': 'stars',
  'employer.applicant.fullProfile': 'Worker profile',
  'workerRow.verifyTitle': 'Verification',
  'workerRow.identityVerified': 'Identity verified',
  'workerRow.identityNotVerified': 'Identity not verified',
  'workerRow.pendingCount': '{n} awaiting review',
  'workerRow.completedWithYou': 'Shifts with you',
  'workerRow.noShowsWithYou': 'No-shows with you',
  'workerRow.jobFitScore': 'Job fit: {score} points · {badge}',
  'workerRow.jobFit': 'Job fit: {badge}',
  'skill.highlight.title': 'Top skills',
  'employer.applicant.viewProfile': 'View profile',

  // --- Xác thực tài khoản (verification/*) ----------------------------------------------------
  'verify.card.title': 'Account verification',
  'verify.status.verified': 'Verified',
  'verify.status.pending': 'Awaiting review',
  'verify.status.rejected': 'Rejected',
  'verify.status.notVerified': 'Not verified',
  'verify.otp.error.INVALID_PHONE': 'Not a valid Vietnamese mobile number.',
  'verify.otp.error.OTP_INVALID': 'Incorrect code.',
  'verify.phone.success': 'Phone number verified',
  'verify.phone.title': 'Phone number',
  'verify.required': 'Required',
  'verify.phone.change': 'Change number',
  'verify.phone.label': 'Mobile number',
  'verify.phone.resendIn': 'Resend in {seconds} seconds',
  'verify.phone.send': 'Send code',
  'verify.phone.codeSent': 'Code sent to {phone}. It is valid for 5 minutes.',
  'verify.phone.codeSentMock':
    'Test mode: no real SMS is sent. An admin can see the code in the phone-otp Edge Function log.',
  'verify.phone.codeLabel': '6-digit code',
  'verify.phone.confirm': 'Confirm',
  'verify.phone.resend': 'Resend code',
  'verify.phone.changeWarning': 'Changing the phone number in your profile means verifying it again.',
  'verify.id.error.missingImages': 'Please choose all 3 photos.',
  'verify.id.error.consent': 'Please agree to the photo storage terms to continue.',
  'verify.id.submitted': 'ID card sent. An administrator will review it as soon as possible.',
  'verify.id.title': 'Citizen ID card (CCCD)',
  'verify.id.approvedBody': 'Your identity has been verified.',
  'verify.id.pendingBody': 'Your ID card is waiting for an administrator’s review.',
  'verify.id.collapsedHint': 'You need photos of both sides of your ID card and a portrait of you holding it.',
  'verify.id.start': 'Start ID card verification',
  'verify.id.rejectedBody': 'ID card rejected: {reason}. You can send it again.',
  'verify.id.intro':
    'Take clear photos of both sides of your ID card and a portrait of you holding it. Only CaLẻ administrators can see the photos, to check them; they are never shown publicly.',
  'verify.id.fullName': 'Full name (exactly as on the ID card)',
  'verify.id.choose': 'Choose / take a photo',
  'verify.id.consent': 'I agree that CaLẻ may store and use these ID card photos only to verify my identity.',
  'verify.id.submit': 'Submit for verification',
  'verify.otp.error.OTP_COOLDOWN': 'You just asked for a code. Please wait {seconds} seconds and try again.',
  'verify.otp.error.OTP_INVALID_LEFT': 'Incorrect code. {count} attempts left.',
  'verify.gate.phone.worker': 'You need to verify your phone number before applying.',
  'verify.gate.phone.employer': 'You need to verify your phone number before posting shifts.',
  'verify.gate.identityPending': 'Your ID card is awaiting review. You can post shifts as soon as it is approved.',
  'verify.gate.identity': 'You need a verified ID card (approved by an administrator) before posting shifts.',
  'verify.gate.cta': 'Verify in your Profile',

  // --- Cọc người lao động (workerDeposit/*) -----------------------------------------------------
  'workerDeposit.exempt.IDENTITY': 'You do not need an application deposit because your ID card is verified.',
  'workerDeposit.exempt.COMPLETED_SHIFTS':
    'You do not need an application deposit because you completed {n} shifts in {days} days.',
  'workerDeposit.apply.required': 'Applying to this shift needs a deposit of {amount}.',
  'workerDeposit.apply.rules':
    'You get it all back when you finish the shift, are rejected, or cancel before the start time. If you do not show up without notice, the deposit goes to the employer.',
  'workerDeposit.blocked':
    'You need to pay a deposit when applying until {date} because of a recent no-show.',
  'workerDeposit.apply.limit': 'You are holding {open}/{max} deposits, the maximum.',
  'workerDeposit.apply.balance': 'Wallet balance: {balance}.',
  'workerDeposit.apply.insufficient': 'Your wallet does not have enough for the deposit.',
  'workerDeposit.apply.topUp': 'Top up your wallet',
  'workerDeposit.apply.verify': 'Verify your ID card to skip the deposit',
  'workerDeposit.confirm.title': 'Pay a deposit to apply',
  'workerDeposit.confirm.body':
    '{amount} will be held from your wallet. You get it all back when you finish the shift, are rejected, or cancel before the start time.',
  'workerDeposit.confirm.noShow':
    'If you do not show up without notice, the deposit goes to the employer (you have 72 hours to dispute it).',
  'workerDeposit.confirm.cancel': 'Later',
  'workerDeposit.confirm.submit': 'Pay deposit and apply',
  'workerDeposit.contest.noDeposit.title': 'You were marked absent for this shift',
  'workerDeposit.contest.refunded': 'Your deposit of {amount} has been refunded to your wallet.',
  'workerDeposit.contest.noDeposit.expired': 'The deadline to dispute this shift has passed.',
  'workerDeposit.contest.noDeposit.body':
    'If you did show up, send a dispute before {deadline} for an administrator to review.',
  'workerDeposit.contest.title': 'Your deposit of {amount} is on hold',
  'workerDeposit.contest.reviewPending':
    'The deposit is waiting for an administrator’s review before it is transferred. If you did show up, send a dispute for the administrator to consider.',
  'workerDeposit.contest.pending':
    'You sent a dispute. An administrator is reviewing it; the deposit stays on hold until there is a decision.',
  'workerDeposit.contest.expired': 'The dispute deadline has passed. The deposit will go to the employer.',
  'workerDeposit.contest.body':
    'You were marked absent for this shift. If you did show up, send a dispute before {deadline}. After that, the deposit goes to the employer.',
  'workerDeposit.contest.adminNote': 'Administrator’s note: {note}',
  'workerDeposit.contest.reasonShort': 'Please give a reason (at least 5 characters).',
  'workerDeposit.contest.sent': 'Dispute sent. An administrator will review it and decide.',
  'workerDeposit.contest.label': 'Reason for the dispute',
  'workerDeposit.contest.placeholder': 'For example: I arrived at 8:05 and met the shift manager.',
  'workerDeposit.contest.submit': 'Send dispute',
  'workerDeposit.contest.noDeposit.upheld': 'An administrator accepted your dispute: this absence does not count.',
  'workerDeposit.contest.noDeposit.rejected': 'An administrator did not accept your dispute.',
  'workerDeposit.contest.noDeposit.pending': 'You sent a dispute. An administrator is reviewing it.',
  'workerDeposit.contest.forfeited': 'Your deposit of {amount} has gone to the employer.',
  'workerDeposit.status.needs':
    'Each time you apply, you pay a deposit of {pct}% of the shift’s wages (up to {max}). It is refunded when you finish the shift.',
  'workerDeposit.status.howToExempt':
    'Verify your ID card or complete {n} shifts in {days} days to skip the deposit (done {done}/{n}).',
  'workerDeposit.status.title': 'Application deposit',
};

/** Câu tiếng Việt viết cứng (`tx('…')`) và nhãn lấy từ store / hằng số. */
export const enRolesText: Record<string, string> = {
  // --- Checklist check-out (CHECKOUT_CHECKLIST_ITEMS_VI) ------------------------------------
  'Đã bàn giao khu vực và dụng cụ.': 'Handed over the area and tools.',
  'Đã chụp ảnh bàn giao khu vực làm việc.': 'Took a handover photo of the work area.',
  'Đã hoàn thành công việc theo mô tả ca làm.': 'Finished the work as described for the shift.',
  'Đã thông báo nhà tuyển dụng kết quả ca làm.': 'Told the employer how the shift went.',
  'Đã viết ghi chú bàn giao đầy đủ.': 'Wrote a complete handover note.',

  // --- Lịch: thứ trong tuần, tháng --------------------------------------------------------------
  'Thứ Hai': 'Monday',
  'Thứ Ba': 'Tuesday',
  'Thứ Tư': 'Wednesday',
  'Thứ Năm': 'Thursday',
  'Thứ Sáu': 'Friday',
  'Thứ Bảy': 'Saturday',
  'Chủ Nhật': 'Sunday',
  T2: 'Mon',
  T3: 'Tue',
  T4: 'Wed',
  T5: 'Thu',
  T6: 'Fri',
  T7: 'Sat',
  CN: 'Sun',
  'Tháng {month} / {year}': '{month}/{year}',

  // --- Nhãn xác minh (verificationStore) --------------------------------------------------------
  'CCCD / CMND': 'Citizen ID / old ID card',
  'Thẻ sinh viên': 'Student card',
  'Bằng lái xe': 'Driving licence',
  'CCCD đại diện': 'Representative’s ID card',
  'Giấy phép kinh doanh': 'Business licence',
  'Mã số thuế': 'Tax code',
  'Ảnh mặt tiền': 'Storefront photo',
  'Ảnh nơi làm việc': 'Workplace photo',
  'Hợp đồng / xác nhận sự kiện': 'Event contract / confirmation',
  'Chứng minh địa chỉ': 'Proof of address',
  'Google Maps / Fanpage': 'Google Maps / Fanpage',
  'Cá nhân thuê ngắn hạn': 'Individual hiring short-term',
  'Hộ kinh doanh': 'Household business',
  'Doanh nghiệp': 'Business',
  'Agency / Sự kiện': 'Agency / Events',
  // Nhãn giấy tờ lưu sẵn trong hồ sơ (displayLabel của dữ liệu mẫu).
  'Giấy phép hộ kinh doanh': 'Household business licence',
  'Giấy phép sự kiện': 'Event permit',
  'Ảnh chi nhánh': 'Branch photo',
  // Gợi ý giấy tờ theo loại tài khoản (TYPE_HINT ở /employer/profile).
  'Không cần giấy phép kinh doanh. Bạn có thể xác minh bằng danh tính người thuê, địa điểm làm việc và giữ cọc 100% tiền công.':
    'No business licence needed. You can verify with the hirer’s identity and the workplace, and deposit 100% of wages.',
  'Hộ kinh doanh: nộp CCCD đại diện + giấy phép hộ kinh doanh + ảnh mặt tiền.':
    'Household business: submit the representative’s ID card + household business licence + storefront photo.',
  'Doanh nghiệp: nộp giấy phép kinh doanh + mã số thuế + ảnh chi nhánh hoặc địa chỉ.':
    'Business: submit the business licence + tax code + a photo of the branch or address.',
  'Agency / sự kiện: nộp giấy phép kinh doanh + hợp đồng / xác nhận sự kiện + ảnh địa điểm hoặc Google Maps / fanpage.':
    'Agency / events: submit the business licence + event contract / confirmation + a venue photo or Google Maps / fanpage.',
  'Chưa gửi': 'Not submitted',
  'Đang chờ duyệt': 'Awaiting review',
  'Cần bổ sung': 'Needs more information',
  'Bị từ chối': 'Rejected',

  '⭐ {score} điểm': '⭐ {score} pts',

  // --- Kỹ năng (SkillProgressBar; tên nhóm là DEFAULT_SKILL_CATEGORIES / loại công việc) ----
  'Cấp {level}': 'Level {level}',
  'Hoàn thành: {n} ca': 'Completed: {n} shifts',
  '{score}/100 điểm kỹ năng': '{score}/100 skill points',
  'Bốc xếp': 'Loading & unloading',
  'Sự kiện': 'Events',
  'Đóng gói': 'Packing',
  'Giao tiếp': 'Communication',

  // --- Nhãn tính sẵn trong domain (cấp kỹ năng, lý do chưa đăng được ca ở chế độ demo) -------
  'Mới': 'New',
  'Khá': 'Fair',
  'Tốt': 'Good',
  'Nổi bật': 'Standout',
  'Cần chọn loại tài khoản nhà tuyển dụng trước khi đăng ca.': 'Choose an employer account type before posting shifts.',
  'Cần xác minh CCCD đại diện đã được duyệt trước khi đăng ca.':
    'The representative’s ID card must be verified and approved before posting shifts.',
  'Cần thêm ảnh địa điểm / khu vực làm việc cho ca này.': 'Add a photo of the location / work area for this shift.',
  'Cần ảnh địa điểm cho ca này hoặc ảnh mặt tiền/nơi làm việc đã được duyệt trên hồ sơ.':
    'You need a location photo for this shift or an approved storefront/workplace photo on your profile.',
  'Cần giấy phép kinh doanh hoặc mã số thuế đã được duyệt.': 'You need an approved business licence or tax code.',
  'Cần hợp đồng / xác nhận sự kiện hoặc ảnh địa điểm sự kiện đã được duyệt.':
    'You need an approved event contract / confirmation or event venue photo.',
  'Cần ảnh địa điểm / khu vực sự kiện cho ca này.': 'You need a photo of the event venue / area for this shift.',

  // --- /employer/payments --------------------------------------------------------------------
  'Bạn bấm "Xác nhận hoàn thành" cho từng người: tiền công vào ví người đó ngay.':
    'You tap "Confirm completion" for each person: their wages go into their wallet straight away.',
  'Cấp độ tin cậy (Mới / Đã xác minh / Tin cậy cao) sẽ ảnh hưởng đến hiển thị, ưu tiên và phí dịch vụ trong tương lai, nhưng không làm giảm tỷ lệ cọc.':
    'Trust levels (New / Verified / Highly trusted) will affect visibility, priority and service fees in the future, but do not lower the deposit ratio.',
  'Cấp độ tin cậy và tỷ lệ giữ tiền ca làm': 'Trust levels and the share of shift money held',
  'Khi bạn huỷ ca đúng quy định (trước 6 giờ và chưa có người ứng tuyển), tiền được hoàn về ví.':
    'When you cancel a shift within the rules (more than 6 hours ahead and no applicants yet), the money is refunded to your wallet.',
  'Khi bạn xác nhận hoàn thành ca, hệ thống chuyển khoản tiền ca được giữ thành tiền công cho người lao động.':
    'When you confirm a shift is completed, the held shift money becomes the worker’s wages.',
  'Khi người lao động vắng mặt không báo trước, bạn được tặng 1 lượt boost để dùng cho ca tiếp theo, giúp ca hiển thị ưu tiên trong danh sách tìm việc.':
    'When a worker does not show up without notice, you get 1 free boost for your next shift, which gives it priority in the job listings.',
  'Khi nào tiền được trả': 'When the money is paid',
  'Khi nào tiền được trả hoặc hoàn': 'When the money is paid or refunded',
  'Khi xảy ra tranh chấp, quản trị viên quyết định trả hoặc hoàn khoản tiền ca được giữ dựa trên bằng chứng.':
    'If there is a dispute, an administrator decides from the evidence whether the held shift money is paid out or refunded.',
  'Lưu ý phiên bản dùng thử': 'Note about the trial version',
  'Lượt boost': 'Boosts',
  'Mọi giao dịch tiền tệ trên CaLẻ hiện tại là mô phỏng. Khi phiên bản chính thức ra mắt, chúng tôi sẽ thông báo rõ về cổng thanh toán hỗ trợ và các điều khoản tài chính áp dụng.':
    'All money transactions on CaLẻ are currently simulated. When the official version launches, we will announce the supported payment gateway and the financial terms that apply.',
  'Mục tiêu là bảo vệ tiền công cho người lao động ngay cả khi nhà tuyển dụng không liên hệ được.':
    'The goal is to protect workers’ wages even if the employer cannot be reached.',
  'Nhà tuyển dụng giữ cọc tiền công trước; tiền chỉ trả cho người lao động khi ca hoàn thành. Trong MVP/demo không có giao dịch thật.':
    'Employers deposit the wages up front; the money is paid to workers only when the shift is completed. The MVP/demo has no real transactions.',
  'Nạp tiền vào ví bằng chuyển khoản (PayOS). Khi đăng ca, hệ thống giữ cọc tiền công cùng phí dịch vụ 10% từ ví của bạn; tiền công chỉ được trả cho người lao động khi ca hoàn thành.':
    'Top up your wallet by bank transfer (PayOS). When you post a shift, the wages plus the 10% service fee are held from your wallet; the wages are paid to workers only when the shift is completed.',
  'Nếu bạn không xác nhận, hệ thống tự xác nhận sau 24 giờ kể từ khi ca kết thúc.':
    'If you do not confirm, the system confirms automatically 24 hours after the shift ends.',
  'Quy định huỷ ca cho nhà tuyển dụng': 'Shift cancellation rules for employers',
  'Sau giờ bắt đầu: không được huỷ.': 'After the start time: cannot be cancelled.',
  'Sau giờ bắt đầu: không được phép huỷ.': 'After the start time: cancelling is not allowed.',
  'Số dư ví rút về tài khoản ngân hàng bất cứ lúc nào.': 'You can withdraw your wallet balance to your bank account at any time.',
  'Trong giai đoạn dùng thử, mọi nhà tuyển dụng đều giữ trước 100% tiền công của ca, không phụ thuộc cấp độ tin cậy.':
    'During the trial, every employer deposits 100% of a shift’s wages up front, whatever their trust level.',
  'Trong vòng 6 giờ trước giờ bắt đầu và đã có người ứng tuyển chờ duyệt/đã duyệt: chặn huỷ để bảo vệ người lao động.':
    'Within 6 hours of the start time with applicants pending or approved: cancelling is blocked to protect workers.',
  'Trong vòng 6 giờ trước giờ bắt đầu, có người ứng tuyển đang chờ duyệt hoặc đã được duyệt: chặn huỷ để bảo vệ người lao động.':
    'Within 6 hours of the start time, if applicants are pending or approved: cancelling is blocked to protect workers.',
  'Trong vòng 6 giờ và chưa có người ứng tuyển nào: vẫn được huỷ.': 'Within 6 hours with no applicants yet: can still be cancelled.',
  'Trong vòng 6 giờ và chưa có người ứng tuyển nào: vẫn được phép huỷ.':
    'Within 6 hours with no applicants yet: cancelling is still allowed.',
  'Trước 6 giờ: huỷ tự do, hoàn 100% khoản tiền ca được giữ.':
    'More than 6 hours ahead: cancel freely and get 100% of the held shift money back.',
  'Trước 6 giờ: được huỷ.': 'More than 6 hours ahead: can be cancelled.',
  'Tổng khoản tiền ca được giữ = mức theo giờ × số giờ × số vị trí. Toàn bộ khoản này được giữ trong ví cho đến khi ca hoàn thành hoặc được hoàn theo quy định huỷ.':
    'Total held shift money = hourly rate × hours × positions. The whole amount stays held in the wallet until the shift is completed or refunded under the cancellation rules.',
  'Vị trí không có người làm, người lao động bị đánh dấu vắng mặt, hoặc ca bị huỷ: phần cọc tương ứng (kể cả phí) được hoàn về ví của bạn.':
    'Unfilled positions, workers marked absent, or a cancelled shift: the matching part of the deposit (including the fee) is refunded to your wallet.',

  // --- /employer/profile ---------------------------------------------------------------------
  'Bạn đã có một yêu cầu đang chờ duyệt.': 'You already have a request awaiting review.',
  'Chưa có': 'None yet',
  'Chưa xác minh': 'Not verified',
  'Chỉnh sửa thông tin': 'Edit details',
  'Chọn loại tài khoản phù hợp nhất. Loại tài khoản dùng để xác định giấy tờ cần xác minh và sẽ được khoá sau khi bạn xác nhận; nếu cần đổi sau này hãy gửi yêu cầu để quản trị viên xem xét.':
    'Choose the account type that fits best. It determines which documents need verifying and is locked once you confirm; if you need to change it later, send a request for an administrator to review.',
  'Gửi lại': 'Send again',
  'Gửi tài liệu (mô phỏng)': 'Send document (simulated)',
  'Gửi yêu cầu': 'Send request',
  'Huỷ': 'Cancel',
  'Không lưu được thay đổi. Vui lòng thử lại.': 'Could not save your changes. Please try again.',
  'Không thể gửi yêu cầu: {error}': 'Could not send the request: {error}',
  'Loại hiện tại:': 'Current type:',
  'Loại mới': 'New type',
  'Loại tài khoản hiện tại': 'Current account type',
  'Loại tài khoản mới phải khác loại hiện tại.': 'The new account type must be different from the current one.',
  'Loại tài khoản quyết định giấy tờ cần xác minh và không tự đổi được sau khi chọn. Nếu chọn nhầm, hãy gửi yêu cầu để quản trị viên xem xét.':
    'The account type decides which documents need verifying and cannot be changed by you once chosen. If you picked the wrong one, send a request for an administrator to review.',
  'Lý do (bắt buộc)': 'Reason (required)',
  'Mô tả': 'Description',
  'Thông tin doanh nghiệp': 'Business details',
  'Trong bản MVP, tài liệu là mô phỏng — không có upload thật.': 'In the MVP, documents are simulated — nothing is really uploaded.',
  'Tài liệu cần nộp': 'Documents to submit',
  'Tất cả tài liệu đã gửi': 'All submitted documents',
  'Vui lòng chọn loại tài khoản trước khi nộp tài liệu.': 'Please choose an account type before submitting documents.',
  'Vui lòng nhập lý do.': 'Please enter a reason.',
  'Ví dụ: Doanh nghiệp đã được đăng ký chính thức nên cần chuyển sang loại Doanh nghiệp.':
    'For example: the business is now officially registered, so it should move to the Business type.',
  'Xác minh doanh nghiệp': 'Business verification',
  'Xác minh nhà tuyển dụng': 'Employer verification',
  'Xác nhận và khoá loại tài khoản': 'Confirm and lock account type',
  'Yêu cầu đổi loại tài khoản': 'Request an account type change',
  'Yêu cầu đổi sang {type}.': 'Requested change to {type}.',
  'Đang chờ duyệt:': 'Awaiting review:',
  'Đã chọn loại tài khoản: {type}. Loại tài khoản sẽ được khoá; nếu cần đổi sau này hãy gửi yêu cầu để quản trị viên xem xét.':
    'Account type chosen: {type}. It will be locked; if you need to change it later, send a request for an administrator to review.',
  'Đã gửi tài liệu xác minh (mô phỏng).': 'Verification document sent (simulated).',
  'Đã gửi yêu cầu đổi loại tài khoản. Quản trị viên sẽ xem xét.': 'Account type change request sent. An administrator will review it.',

  // --- /employer/reviews ---------------------------------------------------------------------
  'Chất lượng công việc: có hoàn thành đúng yêu cầu trong mô tả ca?':
    'Quality of work: did they do what the shift description asked?',
  'Giao tiếp: nghe máy, báo trước nếu đến muộn hoặc có vấn đề?':
    'Communication: did they answer calls and warn you about lateness or problems?',
  'Khi cần báo cáo thay vì đánh giá': 'When to report instead of reviewing',
  'Khi nào cần đánh giá': 'When to leave a review',
  'Khi xác nhận hoàn thành ca, bạn chấm 1–5 sao và viết nhận xét ngắn. Trong bản demo, phải đánh giá thì tiền công (mô phỏng) mới được trả.':
    'When you confirm a shift is completed, you give 1–5 stars and a short comment. In the demo, the (simulated) wages are paid only after you review.',
  'Mở dashboard nhà tuyển dụng': 'Open the employer dashboard',
  'Nếu có hành vi không phù hợp (vắng mặt không báo, gây mất an toàn), đừng chỉ đánh giá thấp —':
    'If there is inappropriate behaviour (a no-show without notice, unsafe conduct), do not just leave a low rating —',
  'Sau khi ca được xác nhận hoàn thành, bạn có 14 ngày để chấm 1–5 sao cho từng người trong trang quản lý ca. Đánh giá không ảnh hưởng tiền công, và người lao động cũng có thể đánh giá lại bạn.':
    'Once a shift is confirmed as completed, you have 14 days to give each person 1–5 stars on the shift management page. Reviews do not affect wages, and workers can review you too.',
  'Thái độ: lịch sự, hợp tác với khách và đồng nghiệp?': 'Attitude: polite and cooperative with customers and colleagues?',
  'Tiêu chí gợi ý': 'Suggested criteria',
  'Viết cụ thể: "Pha chế nhanh, gọn quầy" hữu ích hơn "Tốt". Đánh giá đã gửi không sửa được.':
    'Be specific: "Quick drinks, kept the bar tidy" is more useful than "Good". Reviews cannot be edited once sent.',
  'hãy liên hệ bộ phận hỗ trợ CaLẻ để quản trị viên xem xét.': 'contact CaLẻ support so an administrator can look into it.',
  'hãy mở "Báo cáo sự cố" để quản trị viên xem xét.': 'open "Report an incident" so an administrator can look into it.',
  'Đánh giá hai chiều giúp xây dựng cộng đồng tin cậy. Sau mỗi ca hoàn thành, bạn nên dành 1–2 phút để chấm điểm và viết một câu nhận xét cho người lao động.':
    'Two-way reviews build a trustworthy community. After each completed shift, take 1–2 minutes to rate the worker and write a one-line comment.',
  'Đánh giá vẫn nên trung thực nhưng sự cố cần được xử lý riêng.':
    'Reviews should still be honest, but incidents need to be handled separately.',
  'Đánh giá xây dựng': 'Constructive reviews',
  'Đúng giờ: người lao động có mặt đúng giờ bắt đầu ca không?': 'Punctuality: was the worker there when the shift started?',
  // --- /employer/shifts/new --------------------------------------------------------------------
  'Cần chọn loại tài khoản trước khi đăng ca': 'Choose an account type before posting shifts',
  'Vui lòng chọn loại tài khoản nhà tuyển dụng trước khi đăng ca. Loại tài khoản giúp xác định giấy tờ cần xác minh, mức cọc và quy tắc an toàn cho người lao động.':
    'Please choose your employer account type before posting shifts. It determines which documents need verifying, the deposit level and the safety rules for workers.',
  'Vui lòng chọn ngày giờ mới trước khi giữ cọc.': 'Please choose a new date and time before holding the deposit.',
  'Đang tạo ca mới từ:': 'Creating a new shift from:',

  // --- /worker/profile -----------------------------------------------------------------------
  'Bạn chỉ cần dùng một trong các giấy tờ hợp lệ để xác minh danh tính. Nếu giấy tờ đã được duyệt, bạn không cần tải lại trừ khi muốn bổ sung phương thức khác.':
    'You only need one valid document to verify your identity. Once a document is approved, you do not need to upload again unless you want to add another method.',
  'Bằng lái xe — dùng được khi không có CCCD/CMND.': 'Driving licence — usable if you have no ID card.',
  'CCCD / CMND — phổ biến nhất, nhận trên mọi loại ca.': 'Citizen ID / old ID card — the most common, accepted for every shift type.',
  'Cần thiết trước khi ứng tuyển. Trong bản MVP đây chỉ là mô phỏng, không gửi OTP thật.':
    'Required before applying. In the MVP this is only simulated; no real OTP is sent.',
  'Mô phỏng xác minh SĐT (demo)': 'Simulate phone verification (demo)',
  'Phục vụ, Pha chế': 'Serving, Bartending',
  'Quận 1, Quận 3': 'District 1, District 3',
  'Thẻ sinh viên — phù hợp nếu bạn đang đi học.': 'Student card — suitable if you are studying.',
  'Trong bản MVP, tài liệu là mô phỏng — không có upload thật. Quản trị viên là người duy nhất xem tài liệu đầy đủ; nhà tuyển dụng chỉ thấy huy hiệu và số đăng ký dạng rút gọn.':
    'In the MVP, documents are simulated — nothing is really uploaded. Only administrators see the full document; employers see just the badge and a shortened document number.',
  'Xác minh': 'Verification',
  'Xác minh danh tính': 'Identity verification',
  'Xác minh số điện thoại': 'Phone verification',
  'phục vụ, pha chế, thu ngân': 'serving, bartending, cashier',
  'Đã gửi tài liệu xác minh (mô phỏng). Quản trị viên sẽ duyệt.':
    'Verification document sent (simulated). An administrator will review it.',
  '✓ Đã xác minh (mô phỏng) — bấm để hoàn tác': '✓ Verified (simulated) — tap to undo',

  // --- Hộp thoại / form ------------------------------------------------------------------------
  'Nhận xét về người lao động...': 'Comment on the worker...',
  'Anh Liêm — quản lý': 'Mr Liêm — manager',
  'Chọn loại công việc': 'Choose a job type',
  'đ/giờ': 'đ/hour',

  // --- FeaturedJobMockup ------------------------------------------------------------------------
  'Bắt đầu sau {days} ngày {hh} giờ': 'Starts in {days} days {hh} hours',
  'Bắt đầu sau {hours} giờ {mm} phút': 'Starts in {hours} hours {mm} minutes',
  'Bắt đầu sau {mm}:{ss} phút': 'Starts in {mm}:{ss} minutes',

  // --- DepositWalletConfirm (giữ cọc từ ví) ------------------------------------------------------
  '(tối thiểu {amount})': '(minimum {amount})',
  ', rồi quay lại xác nhận đăng ca.': ', then come back to confirm posting the shift.',
  'Khoản cần giữ cọc': 'Amount to hold',
  'Máy chủ tính lại chính xác số tiền khi giữ cọc.': 'The server recalculates the exact amount when holding the deposit.',
  'Nạp phần còn thiếu bằng QR chuyển khoản': 'Top up the shortfall with a bank transfer QR code',
  'Nạp phần còn thiếu để giữ cọc': 'Top up the shortfall to hold the deposit',
  'Nạp {amount} qua QR': 'Top up {amount} by QR',
  'Phí dịch vụ vừa thay đổi — số tiền cần giữ là {amount}. Bấm xác nhận lại để đăng ca.':
    'The service fee just changed — the amount to hold is now {amount}. Tap confirm again to post the shift.',
  'Quay lại chỉnh sửa': 'Back to editing',
  'Số dư sau khi giữ cọc': 'Balance after the deposit',
  'Số dư ví': 'Wallet balance',
  'Ví của bạn (để giữ cọc ca này)': 'Your wallet (to hold this shift’s deposit)',
  'Ví không đủ để giữ cọc. Cần thêm': 'Your wallet does not have enough to hold the deposit. You need',
  'Xác nhận đăng ca — giữ cọc từ ví': 'Confirm posting — hold the deposit from your wallet',
  'Xác nhận đăng ca — giữ cọc {amount}': 'Confirm posting — hold {amount}',

  // --- PayosTopUpQr (nạp qua QR) -------------------------------------------------------------
  'Chưa nhận được xác nhận thanh toán. Nếu vừa chuyển khoản, đợi vài giây rồi bấm kiểm tra lại.':
    'No payment confirmation yet. If you just made the transfer, wait a few seconds and tap check again.',
  'Không tạo được mã QR. Dùng nút mở trang thanh toán bên dưới.':
    'Could not create the QR code. Use the button below to open the payment page.',
  'MÔ PHỎNG — KHÔNG CÓ GIAO DỊCH TIỀN THẬT': 'SIMULATION — NO REAL MONEY IS MOVED',
  'Mã QR chuyển khoản': 'Bank transfer QR code',
  'Mở trang thanh toán PayOS': 'Open the PayOS payment page',
  'Nạp vào': 'Top up to',
  'Quét mã QR bằng app ngân hàng để chuyển khoản. Giữ nguyên số tiền và nội dung chuyển khoản. Sau khi chuyển xong, bấm "Tôi đã chuyển khoản".':
    'Scan the QR code with your banking app to transfer. Do not change the amount or the transfer description. When you are done, tap "I have transferred".',
  'Số tiền nạp': 'Top-up amount',
  'Tôi đã chuyển khoản': 'I have transferred',
  'Tôi đã chuyển khoản (mô phỏng)': 'I have transferred (simulated)',
  'Ví của bạn': 'Your wallet',
  'Đây là luồng mô phỏng: bấm "Tôi đã chuyển khoản (mô phỏng)" để cộng số dư ví ngay, không có tiền thật.':
    'This is a simulated flow: tap "I have transferred (simulated)" to add to your wallet balance straight away, with no real money.',

  // --- Hồ sơ người dùng --------------------------------------------------------------------------
  'Hoạt động': 'Active',
  'Tạm khoá': 'Suspended',
  'Chưa xác minh danh tính': 'Identity not verified',
  'Đã xác minh danh tính': 'Identity verified',
};
