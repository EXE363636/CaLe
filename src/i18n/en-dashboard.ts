/**
 * English dictionary — đợt 2b (01/10): dashboard người lao động / nhà tuyển dụng.
 *
 * Gộp vào `en` / `enText` trong `en.ts`. Cùng quy ước với `en-app.ts`: khoá trùng
 * `vi.ts`, không ghi đè câu đợt 1, tiền tệ viết `đ`.
 * ⚠️ Bản dịch do AI viết — nhờ người đọc lại trước khi quảng bá.
 */

export const enDashboard: Record<string, string> = {
  // --- Chung ------------------------------------------------------------------
  'btn.cancel': 'Cancel',
  'btn.findShift': 'Find a shift now',
  'common.employer': 'Employer',
  'help.viewFullGuide': 'View the full guide',
  'help.btn.close': 'Got it',
  'application.status.Pending': 'Pending',
  'application.status.Approved': 'Approved',
  'application.status.Rejected': 'Rejected',
  'application.status.Expired': 'Expired',
  'application.status.CancelledByWorker': 'Cancelled by worker',
  'application.status.CancelledByEmployer': 'Cancelled by employer',
  'application.status.CancellationRequested': 'Cancellation requested',
  'application.status.NoShow': 'No-show',
  'application.status.CheckedIn': 'Checked in',
  'application.status.CheckedOut': 'Checked out',
  'application.status.Confirmed': 'Confirmed',
  'application.status.Disputed': 'In dispute',
  'cancel.quota.weekly': 'You have {remaining}/{limit} cancellations left in the last 7 days.',
  'cancel.quota.monthly': 'You have {remaining}/{limit} cancellations left in the last 30 days.',
  'availability.suggest.title': 'Shifts that suit you',
  'availability.suggest.viewAll': 'View all shifts',
  'skill.dashboard.title': 'Your skills',
  'skill.section.intro': 'Your skills grow when you complete shifts well and receive good reviews.',

  // --- Dashboard người lao động -----------------------------------------------
  'worker.dashboard.greeting': 'Hello, {name}',
  'worker.dashboard.welcome.veteran': 'You have completed {count} shifts. Keep it up!',
  'worker.dashboard.welcome.newcomer': 'Ready for your first shift?',
  'help.workerDashboard.title': 'Guide: worker overview',
  'help.workerDashboard.intro': 'This page summarises your activity on CaLẻ.',
  'help.workerDashboard.section.purpose.heading': 'What this page is for',
  'help.workerDashboard.section.purpose.item1':
    'The Overview gathers everything for you: upcoming shifts, applications, reputation score and notifications.',
  'help.workerDashboard.section.numbers.heading': 'Key numbers / statuses',
  'help.workerDashboard.section.numbers.item1':
    'Reputation score 0–100, starting at 100: completed shift +5, no-show without notice −20, cancelling within 24 hours of the shift −10.',
  'help.workerDashboard.section.numbers.item2':
    'Weekly cancellation limit: 3 by default. A high reputation score raises it (4–5 per week).',
  'help.workerDashboard.section.numbers.item3': 'Total earnings: the pay from shifts that are completed and paid.',
  'help.workerDashboard.section.numbers.item4': 'Completed shifts: the number of shifts with the status "Confirmed".',
  'help.workerDashboard.section.actions.heading': 'Main actions',
  'help.workerDashboard.section.actions.item1':
    'Tap the "Reputation score" tile to see the timeline of points gained / lost and any administrator adjustments.',
  'help.workerDashboard.section.actions.item2':
    'Tap the "Weekly cancellation limit" tile to see usage over 7 and 30 days with your current reputation score.',
  'help.workerDashboard.section.actions.item3':
    'In "Upcoming shifts", tap "Check in" when the shift starts and "Check out" when it ends.',
  'help.workerDashboard.section.actions.item4':
    'Recently rejected applications show the reason; read it before applying for new shifts.',
  'help.workerDashboard.section.mistakes.heading': 'Common mistakes',
  'help.workerDashboard.section.mistakes.item1':
    'You cannot apply until your phone number is verified; go to Profile to verify it.',
  'help.workerDashboard.section.mistakes.item2':
    'You cannot apply for shifts that clash with your personal schedule or an approved shift; check your Schedule first.',
  'help.workerDashboard.section.mistakes.item3':
    'Cancelling within 3 hours needs the employer’s approval; your spot is held until then.',
  'worker.dashboard.restricted':
    'Your account is restricted because your reputation score is below 50. Complete shifts to raise it.',
  'worker.dashboard.stats.reputationScore': 'Reputation score',
  'worker.dashboard.stats.reputationAria': 'View reputation score details',
  'worker.dashboard.stats.upcoming': 'Upcoming shifts',
  'worker.dashboard.stats.upcomingAria': 'View upcoming shifts',
  'worker.dashboard.stats.pending': 'Pending applications',
  'worker.dashboard.stats.pendingAria': 'View applications waiting for the employer',
  'worker.dashboard.stats.completedShifts': 'Completed shifts',
  'worker.dashboard.stats.completedAria': 'View completed shift details',
  'worker.dashboard.stats.totalEarnings': 'Total earnings',
  'worker.dashboard.stats.incomeAria': 'View earnings details',
  'worker.dashboard.cancelQuota': 'Weekly cancellation limit',
  'worker.dashboard.cancelQuota.weekHint': 'left',
  'worker.dashboard.stats.quotaAria': 'View cancellation limit details',
  'worker.dashboard.upcomingShifts': 'Upcoming shifts',
  'worker.dashboard.noUpcomingShifts': 'You have no upcoming shifts.',
  'worker.dashboard.findMore': 'Find shifts →',
  'worker.dashboard.empty.upcoming.descriptionRich':
    'Go to "Find shifts" to see open shifts and apply for your first one. Only shifts whose deposit the employer has held are shown.',
  'worker.dashboard.pendingApplications': 'Applications awaiting review',
  'worker.dashboard.noPendingApplications': 'No applications are awaiting review.',
  'worker.dashboard.empty.applications.title': 'You have not applied for any shift yet.',
  'worker.dashboard.history.title': 'Unsuccessful applications',
  'worker.dashboard.recentlyRejected': 'Recently rejected applications',
  'worker.dashboard.history.cancelledByEmployer': 'Shift cancelled by the employer',
  'worker.dashboard.history.cancelledByEmployerNote':
    'Your reputation score and cancellation limit are not affected because the employer cancelled.',
  'worker.dashboard.history.expired': 'Application expired',
  'worker.dashboard.history.expiredNote':
    'The shift started before your application was approved. Your reputation score and cancellation limit are not affected.',
  'worker.dashboard.history.reasonLabel': 'Reason:',
  'worker.dashboard.feedbackPending': 'Rate the employer',
  'worker.dashboard.feedbackBtn': 'Send review',
  'worker.dashboard.skills.title': 'Skills & reputation',
  'worker.dashboard.reputationHint.title': 'How to improve your reputation score',
  'worker.dashboard.reputationHint.gain': 'Completing shifts as promised improves your score (+5 per shift).',
  'worker.dashboard.reputationHint.lose': 'No-shows or last-minute cancellations can lower it (−20 or −10).',
  'hint.worker.reputation':
    'The score reflects how reliable you are, based on your history of taking, completing and cancelling shifts.',
  'worker.dashboard.reputationModal.currentLabel': 'Current reputation score',
  'worker.dashboard.reputationModal.bandGood':
    'Good score: you get priority review and a higher cancellation limit.',
  'worker.dashboard.reputationModal.bandWarn':
    'Average score: you can still apply, but keep it up to raise your score.',
  'worker.dashboard.reputationModal.bandBad':
    'Low score: you temporarily cannot apply for new shifts (50 or more needed).',
  'worker.dashboard.reputationModal.completedLabel': 'Completed shifts',
  'worker.dashboard.reputationModal.ratingsLabel': 'Reviews received',
  'worker.dashboard.reputationModal.recentTitle': 'Recent score changes',
  'worker.dashboard.reputationModal.timelineNote':
    'Simulated data in the MVP. In the real system, the reputation score updates automatically from attendance, reviews, cancellations and disputes.',
  'worker.dashboard.reputationModal.noHistory':
    'Nothing has affected your reputation score yet. Each completed shift adds +5.',
  'worker.dashboard.reputationModal.adminBadge': 'Admin',
  'worker.dashboard.reputationModal.baseLabel': 'Starting score (MVP)',
  'worker.dashboard.reputationModal.baseSublabel': 'Every worker starts at 100, then gains or loses points per event.',
  'worker.dashboard.reputationModal.eventCompleted': '+5 Shift completed as promised',
  'worker.dashboard.reputationModal.eventAdminAdjust': 'Administrator adjusted the score: {old} → {new}',
  'worker.dashboard.reputationModal.eventAdminBy': 'Adjusted by an administrator',
  'worker.dashboard.reputationModal.eventLateCancel': '−10 Cancelled within 24 hours',
  'worker.dashboard.reputationModal.eventNoShow': '−20 No-show without notice (×{count})',
  'worker.dashboard.reputationModal.lateCancel': 'Late cancellation',
  'worker.dashboard.reputationModal.onTimeCancel': 'On-time cancellation',
  'worker.dashboard.protection.eventLabel': 'Protection because the employer cancelled the shift',
  'worker.dashboard.protection.capNote': 'You are already at 100 points, so no reputation is added.',
  'worker.dashboard.protection.title': 'Protection',
  'worker.dashboard.protection.quotaRefunded': '+{count} cancellation(s) refunded',
  'worker.dashboard.protection.quotaNotCounted': 'Not counted against your cancellation limit',
  'hint.worker.cancelQuota': 'How many more shifts you can cancel this week under the reputation rules.',
  'worker.dashboard.quotaModal.intro':
    'Each worker has a cancellation limit over the last 7 and 30 days. Going over it temporarily blocks cancelling.',
  'worker.dashboard.quotaModal.recentTitle': 'Recent cancellations',
  'worker.dashboard.quotaModal.empty': 'You have not cancelled any shift recently.',
  'worker.dashboard.quotaModal.unknownShift': 'Shift (data no longer available)',
  'worker.dashboard.quotaModal.bonus':
    'A high reputation score raises your limit: ≥80 → +1 per week / +2 per month, ≥95 → +2 per week / +4 per month.',
  'hint.worker.totalEarnings': 'Total pay from completed shifts with confirmed payment.',
  'worker.dashboard.incomeModal.totalLabel': 'Total earnings so far',
  'worker.dashboard.incomeModal.completedCount': 'From {count} completed and paid shifts.',
  'worker.dashboard.empty.income.title': 'You have no earnings yet.',
  'worker.dashboard.empty.income.description':
    'Complete shifts and wait for the employer to confirm to get paid (simulated in the MVP).',
  'worker.dashboard.empty.income.cta': 'Find a shift now',
  'worker.dashboard.incomeModal.recentTitle': 'Most recent shifts',
  'worker.dashboard.incomeModal.disclaimer':
    'Earnings are calculated from completed and paid shifts in the MVP. All transactions are simulated.',
  'hint.worker.completedShifts': 'The number of shifts you have completed and that are confirmed in the system.',
  'worker.dashboard.completedModal.totalLabel': 'Total completed shifts',
  'worker.dashboard.empty.completed.title': 'You have no completed shifts yet.',
  'worker.dashboard.empty.completed.description': 'Complete your first shift to see the details here.',
  'worker.dashboard.empty.completed.cta': 'Find a shift',
  'worker.dashboard.completedModal.recentTitle': 'Showing the {shown} most recent of {total} completed shifts',
  'worker.dashboard.completedModal.confirmedBadge': 'Confirmed',
  'worker.dashboard.completedModal.noRating': 'No review yet',
  'worker.dashboard.completedModal.legacyNote': '{count} older shift(s) have no detailed data in the MVP.',
  'worker.dashboard.rejectionReasonLabel': 'Rejection reason',

  // --- Dashboard nhà tuyển dụng -----------------------------------------------
  'employer.dashboard.refund.title': 'Deposit refunded',
  'employer.dashboard.refund.desc': 'Shift "{title}" was cancelled / expired: the unused deposit is back in your wallet.',
  'employer.dashboard.welcome.active': 'You have {count} active shift(s). Track their status and applications below.',
  'employer.dashboard.welcome.idle': 'No active shifts yet. Post a new shift to start receiving applications.',
  'help.employerDashboard.title': 'Guide: employer overview',
  'help.employerDashboard.intro': 'Track your shifts, applications and simulated payments.',
  'help.employerDashboard.section.purpose.heading': 'What this page is for',
  'help.employerDashboard.section.purpose.item1':
    'The Overview gathers every shift you have posted: hiring shifts, pending applications, finished shifts and pay.',
  'help.employerDashboard.section.numbers.heading': 'Key numbers / statuses',
  'help.employerDashboard.section.numbers.item1':
    'Active shifts: shifts that are "Hiring", "Full", "In progress" or "Awaiting confirmation".',
  'help.employerDashboard.section.numbers.item2': 'Pending applications: applications marked "Pending" on your shifts.',
  'help.employerDashboard.section.numbers.item3':
    'Total held / paid: the total deposit held and the total pay already paid to workers.',
  'help.employerDashboard.section.numbers.item4':
    'Boosts: you get 1 each time you mark a no-show; use it to push a shift to the top of the list.',
  'help.employerDashboard.section.actions.heading': 'Main actions',
  'help.employerDashboard.section.actions.item1': 'Tap "Post a new shift" to create a shift and hold the pay deposit.',
  'help.employerDashboard.section.actions.item2':
    'Tap a number tile to see the matching list (posted shifts / pending applications / payments).',
  'help.employerDashboard.section.actions.item3':
    'In "Pending applications", tap a worker to see their profile before approving.',
  'help.employerDashboard.section.actions.item4': 'Tap "View hiring schedule" to see shifts by week.',
  'help.employerDashboard.section.mistakes.heading': 'Common mistakes',
  'help.employerDashboard.section.mistakes.item1':
    'A shift only goes public after you tap "Confirm payment" (deposit held first); until then it is a "Draft".',
  'help.employerDashboard.section.mistakes.item2':
    'Rejecting an application requires a reason; the worker sees it on their Overview.',
  'help.employerDashboard.section.mistakes.item3':
    'A shift with applicants or approved workers cannot be cancelled within 6 hours of its start.',
  'employer.dashboard.viewSchedule': 'View hiring schedule',
  'btn.postShift': 'Post a shift',
  'employer.dashboard.stats.activeShifts': 'Active shifts',
  'employer.dashboard.stats.activeAria': 'View active shift details',
  'employer.dashboard.applicants': 'Pending applications',
  'employer.dashboard.stats.pendingAria': 'View pending application details',
  'employer.dashboard.stats.postedShifts': 'Posted shifts',
  'employer.dashboard.stats.postedAria': 'View posted shift details',
  'employer.dashboard.stats.completedShifts': 'Completed shifts',
  'employer.dashboard.stats.completedAria': 'View completed shift details',
  'employer.dashboard.stats.totalDeposited': 'TOTAL PAY AWAITING PAYMENT',
  'employer.dashboard.stats.depositedAria': 'View pay awaiting payment',
  'employer.dashboard.stats.totalPaidOut': 'TOTAL PAY PAID',
  'employer.dashboard.stats.paidOutAria': 'View payment summary',
  'employer.dashboard.upcomingShifts': 'Upcoming shifts',
  'employer.dashboard.noShifts': 'You have not posted any shift yet.',
  'employer.dashboard.noUpcoming': 'No upcoming shifts.',
  'employer.dashboard.empty.upcoming.descriptionRich':
    'Tap "Post a shift" to create a shift and hold the pay deposit. A shift only goes public once the deposit is held.',
  'employer.dashboard.noUpcoming.description':
    'Completed, cancelled or expired shifts are still in the Hiring schedule. Post a new shift to keep hiring.',
  'employer.dashboard.pendingApps': 'Applications awaiting review ({count})',
  'employer.dashboard.workerFallback': 'Worker',
  'employer.dashboard.reviewApplicant': 'View & review',
  'employer.payments.title': 'Payment summary',
  'hint.employer.totalDeposited':
    'Total pay for shifts that are completed or waiting for you to confirm payment.',
  'employer.payments.intro': 'Summary of deposits and payments for your shifts.',
  'hint.employer.totalPaidOut': 'Total pay you have confirmed as paid to workers.',
  'employer.payments.recentTitle': 'Recently paid shifts',
  'employer.payments.empty':
    'No completed shifts yet. When a worker completes a shift, the deposit moves to paid.',
  'employer.payments.disclaimer': 'All payments in the MVP are simulated. No real transactions take place.',
  'employer.detail.posted.title': 'All posted shifts',
  'hint.employer.postedShifts':
    'Every shift you have created: drafts, hiring, full, completed and cancelled.',
  'employer.detail.posted.intro': 'All shifts you have posted, including drafts, posted, full, completed and cancelled.',
  'employer.detail.posted.empty': 'You have not posted any shift yet. Tap "Post a new shift" to start.',
  'employer.detail.active.title': 'Active shifts',
  'hint.employer.activeShifts': 'Posted shifts with the deposit held that are hiring or in progress.',
  'employer.detail.active.intro': 'Shifts accepting applications or in progress.',
  'employer.detail.active.empty': 'No active shifts right now.',
  'employer.detail.completed.title': 'Completed shifts',
  'hint.employer.completedShifts':
    'Shifts confirmed as completed after the worker checked in / out and you confirmed.',
  'employer.detail.completed.intro': 'Shifts the worker completed and you confirmed payment for.',
  'employer.detail.completed.empty': 'You have no completed shifts yet.',
  'employer.detail.pending.title': 'Applications awaiting review',
  'hint.employer.pendingApps': 'Applications waiting for you to approve or reject.',
  'employer.detail.pending.intro': 'Workers have applied and are waiting for you to approve or reject.',
  'employer.dashboard.empty.pending.title': 'No applications awaiting review yet.',
  'employer.dashboard.empty.pending.description':
    'New applications appear here. Review the shift description, pay and time to attract more applicants.',
  'employer.dashboard.empty.pending.cta': 'Post a new shift',
  'employer.detail.pending.repBadge': 'Reputation {score}/100',
  'employer.detail.pending.completedShifts': '{count} completed shift(s)',
  'employer.detail.positionsLabel': 'positions approved',
  'employer.detail.truncated': 'Showing the 12 most recent shifts. {count} older shift(s) are in the schedule.',
  'verification.phone': 'Phone verified',

  // --- Hộp thoại / thẻ con dùng trong dashboard -------------------------------
  'cancel.confirm.reasonRequired': 'Please enter a cancellation reason.',
  'cancel.confirm.requestSubmit': 'Send cancellation request',
  'cancel.confirm.submit': 'Confirm cancellation',
  'cancel.confirm.title': 'Confirm application cancellation',
  'cancel.quota.blockedTitle': 'Cancellation limit reached',
  'cancel.quota.title': 'Your cancellation limit',
  'cancel.quota.blockedHint':
    'You cannot cancel more applications until the 7-day or 30-day window frees up.',
  'cancel.confirm.approvalRequired':
    'Because the shift starts within 3 hours, your cancellation request needs the employer’s approval before it takes effect.',
  'cancel.confirm.lateWarning':
    'This is a late cancellation (within 24 hours of the start). Your reputation score will drop by 10 points.',
  'cancel.confirm.onTimeNote': 'You are cancelling more than 24 hours before the start, so your reputation score is not affected.',
  'cancel.confirm.reasonLabel': 'Cancellation reason',
  'cancel.confirm.reasonPlaceholder': 'Please tell us why you cannot attend...',
  'cancel.confirm.keep': 'Keep my application',
  'checkout.dialog.title': 'Finish the shift',
  'checkout.dialog.intro':
    'Confirm the items below before checking out. After you submit, the employer has 12 hours to confirm or dispute; if they do nothing, your pay is released automatically.',
  'help.checkout.title': 'Why is evidence needed?',
  'help.checkout.description':
    'Only send what is asked for; do not photograph customers or personal documents. If the employer does nothing within 12 hours, your pay is released automatically.',
  'checkout.dialog.checklist.title': 'Completion checklist',
  'checkout.dialog.checklist.empty': 'This shift has no checklist; you can skip this.',
  'checkout.dialog.note.label': 'Handover note',
  'checkout.dialog.note.placeholder': 'e.g. handed over the area, tools and the last customers.',
  'checkout.dialog.note.hintRequired': 'Required: please describe your handover (≤1000 characters).',
  'checkout.dialog.note.hintOptional': 'Optional: leave empty if there is nothing to note (≤1000 characters).',
  'checkout.dialog.evidenceFile.label': 'Handover photo file name',
  'checkout.dialog.evidenceFile.placeholder': 'e.g. handover-2025-01-15.jpg',
  'checkout.dialog.evidenceFile.hintRequired':
    'Required: enter the file name of the handover photo you took (the MVP does not upload real files).',
  'checkout.dialog.evidenceFile.hintOptional':
    'Optional: add a photo file name if useful (the MVP does not upload real files).',
  'checkout.dialog.cancel': 'Close',
  'checkout.dialog.submit': 'Finish the shift',
  'employerFeedback.formIntro': 'Reviewing employers helps other workers apply with confidence.',
  'form.rating': 'Rating',
  'employerFeedback.tagsLabel': 'Quick tags (optional)',
  'employerFeedback.commentLabel': 'Comment (optional)',
  'employerFeedback.commentPlaceholder': 'Share what it was like to work with this employer...',
  'btn.submit': 'Send',
  'employerFeedback.tag.PaidOnTime': 'Paid as promised',
  'employerFeedback.tag.GoodEnvironment': 'Good environment',
  'employerFeedback.tag.ClearCommunication': 'Clear communication',
  'employerFeedback.tag.AccurateDescription': 'Job as described',
  'notification.viewDetail': 'View details',
  'workerDeposit.alert.title': 'You were marked absent on {n} shift(s) with a deposit',
  'workerDeposit.alert.body': 'If you did attend, dispute within 72 hours to keep your deposit.',
  'workerDeposit.alert.link': 'View and dispute',
  'error.dateInvalid': 'Invalid date. Please use dd/mm/yyyy.',
  'help.btn.aria': 'Open the guide for this page',
  'help.btn.label': 'Guide',
  'error.timeInvalid': 'Invalid time. Please use HH:mm (24-hour).',
};

/** Câu tiếng Việt viết cứng trong 2 dashboard. */
export const enDashboardText: Record<string, string> = {
  'Ca làm': 'Shift',
  'CA ĐANG CHỜ THANH TOÁN': 'SHIFTS AWAITING PAYMENT',
  'Không có ca nào đang giữ tiền chờ thanh toán.': 'No shifts are holding money awaiting payment.',
  'Đã xác minh': 'Verified',
  'đang chờ duyệt': 'awaiting review',
  'Phí hủy ca sau khi đã duyệt người': 'Cancellation fees after approving workers',
  '% tiền cọc': '% of deposit',
  'Lý do: {reason}': 'Reason: {reason}',
  'Phí hủy do ca đã có người lao động được duyệt.': 'Fee charged because the shift already had approved workers.',
  'Bạn sắp huỷ đơn ứng tuyển ca': 'You are about to cancel your application for',
  'Checklist bắt buộc — tích đầy đủ các mục để bật nút gửi.':
    'Checklist required: tick every item to enable the submit button.',
  'Ghi chú bàn giao bắt buộc — nhập ít nhất 1 ký tự.': 'Handover note required: enter at least 1 character.',
  'Tên tệp ảnh bàn giao bắt buộc — nhập tên tệp.': 'Handover photo file name required: enter the file name.',
  'Giải thích: {title}': 'Explanation: {title}',
};
