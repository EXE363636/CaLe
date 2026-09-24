/**
 * Vietnamese i18n dictionary for CaLẻ / ShiftNow MVP.
 *
 * Flat key → string map. Keys use dot-notation namespaces.
 * Components import `t` and look up keys; unknown keys fall back to the
 * key itself with a console.warn in development (Req 27.1, 27.4, 27.5).
 *
 * Usage:
 *   import { t } from '@/i18n/vi';
 *   <button>{t('btn.apply')}</button>  // "Ứng tuyển"
 */

// ---------------------------------------------------------------------------
// Dictionary
// ---------------------------------------------------------------------------

export const vi: Record<string, string> = {

  // -------------------------------------------------------------------------
  // Site / meta
  // -------------------------------------------------------------------------
  'site.name': 'CaLẻ',
  'site.tagline': 'Nền tảng ca làm ngắn hạn tại Việt Nam',
  'site.description':
    'Kết nối nhà tuyển dụng cần người lao động tạm thời với người lao động linh hoạt tại Việt Nam.',

  // -------------------------------------------------------------------------
  // Roles
  // -------------------------------------------------------------------------
  'role.worker': 'Người lao động',
  'role.employer': 'Nhà tuyển dụng',
  'role.admin': 'Quản trị viên',

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  'nav.home': 'Trang chủ',
  'nav.shifts': 'Tìm ca làm',
  'nav.dashboard': 'Tổng quan',
  'nav.profile': 'Hồ sơ',
  'nav.login': 'Đăng nhập',
  'nav.register': 'Đăng ký',
  'nav.logout': 'Đăng xuất',
  'nav.postShift': 'Đăng ca tuyển',
  'nav.notifications': 'Thông báo',
  'nav.admin': 'Quản trị',
  'nav.schedule': 'Lịch cá nhân',
  'nav.employerSchedule': 'Lịch tuyển dụng',

  // HEADER-NAV-LAYOUT-3 - short desktop top-nav labels (employer
  // priority). These shorten ONLY the visible horizontal desktop nav
  // text so the full employer nav fits a single row at >= 1280px
  // without a hamburger. Routes are unchanged; the mobile drawer and
  // UserMenu keep the full labels, and each shortened link carries a
  // `title` tooltip with the full label (see the `*.full` keys).
  'nav.short.postShift': 'Đăng ca',
  'nav.short.employerSchedule': 'Lịch tuyển',
  'nav.short.publicShifts': 'Ca công khai',
  'nav.short.employerProfile': 'Hồ sơ',
  'nav.full.publicShifts': 'Danh sách ca công khai',
  'nav.full.employerProfile': 'Hồ sơ doanh nghiệp',
  'nav.support': 'Hỗ trợ',

  // checkpoint-readiness-phase-1 (Task 1.3) - shared nav labels so
  // NavBar / MobileNav / Footer render the SAME text for these routes.
  // Route paths are unchanged; only the display label is updated.
  'nav.label.safety': 'Bảo vệ người dùng',
  'nav.label.userGuide': 'Hướng dẫn sử dụng',


  // Phase 9X - user menu (authenticated avatar dropdown).
  'nav.userMenu.openLabel': 'Mở menu tài khoản',
  'nav.userMenu.closeLabel': 'Đóng menu tài khoản',
  'nav.userMenu.account': 'Tài khoản',
  'nav.userMenu.shortcuts': 'Truy cập nhanh',
  'nav.userMenu.support': 'Hỗ trợ',

  // Worker shortcuts
  'nav.userMenu.worker.dashboard': 'Tổng quan',
  'nav.userMenu.worker.profile': 'Hồ sơ cá nhân',
  'nav.userMenu.worker.schedule': 'Lịch cá nhân',
  'nav.userMenu.worker.applications': 'Việc đã ứng tuyển',
  'nav.userMenu.worker.reputation': 'Điểm uy tín',

  // Employer shortcuts
  'nav.userMenu.employer.dashboard': 'Tổng quan nhà tuyển dụng',
  'nav.userMenu.employer.postShift': 'Đăng ca tuyển',
  'nav.userMenu.employer.schedule': 'Lịch tuyển dụng',
  'nav.userMenu.employer.profile': 'Hồ sơ doanh nghiệp',
  'nav.userMenu.employer.pending': 'Quản lý ứng viên',
  'nav.userMenu.employer.payments': 'Thanh toán & đảm bảo',

  // Admin shortcuts
  'nav.userMenu.admin.dashboard': 'Tổng quan admin',
  'nav.userMenu.admin.users': 'Người dùng',
  'nav.userMenu.admin.shifts': 'Ca làm',
  'nav.userMenu.admin.disputes': 'Tranh chấp',

  // Trust chips
  'nav.userMenu.chip.reputation': 'Điểm uy tín: {score}/100',
  'nav.userMenu.chip.verifiedBusiness': 'Doanh nghiệp đã xác minh',
  'nav.userMenu.chip.individualEmployer': 'Cá nhân / Freelance',
  'nav.userMenu.chip.admin': 'Quản trị viên',

  // -------------------------------------------------------------------------
  // Buttons
  // -------------------------------------------------------------------------
  'btn.apply': 'Ứng tuyển',
  // Phase 10C-Stab-1 Batch 3 I - link affordance for already-applied
  // shifts in the worker shift listing.
  'btn.viewApplication': 'Xem chi tiết →',
  'btn.cancel': 'Huỷ',
  'btn.confirm': 'Xác nhận',
  'btn.save': 'Lưu',
  'btn.edit': 'Chỉnh sửa',
  'btn.delete': 'Xoá',
  'btn.back': 'Quay lại',
  'btn.submit': 'Gửi',
  'btn.login': 'Đăng nhập',
  'btn.register': 'Đăng ký',
  'btn.logout': 'Đăng xuất',
  'btn.approve': 'Duyệt',
  'btn.reject': 'Từ chối',
  'btn.checkIn': 'Check-in',
  'btn.checkOut': 'Check-out',
  'btn.checkOutLate': 'Check-out muộn',
  'btn.confirmCompletion': 'Xác nhận hoàn thành',
  'btn.reportIssue': 'Báo cáo vấn đề',
  'btn.deposit': 'Mô phỏng đảm bảo thanh toán',
  'btn.postShift': 'Đăng ca cần tuyển',
  'btn.findShift': 'Tìm ca làm ngay',
  'btn.viewDetail': 'Xem chi tiết',
  'btn.cancelApplication': 'Huỷ đơn ứng tuyển',
  'btn.cancelShift': 'Huỷ ca làm',
  'btn.useBoostCredit': 'Dùng lượt boost',
  'btn.resolveDispute': 'Giải quyết tranh chấp',
  'btn.suspend': 'Tạm khoá tài khoản',
  'btn.reactivate': 'Mở khoá tài khoản',
  'btn.adjustReputation': 'Điều chỉnh điểm uy tín',
  'btn.approveCancellation': 'Chấp nhận huỷ',
  'btn.rejectCancellation': 'Từ chối huỷ',
  'btn.markAllRead': 'Đánh dấu tất cả đã đọc',
  'btn.verifyPhone': 'Xác minh số điện thoại',
  'btn.uploadId': 'Tải lên CMND/CCCD',
  'btn.uploadStudentCard': 'Tải lên thẻ sinh viên',
  'btn.search': 'Tìm kiếm',
  'btn.filter': 'Lọc',
  'btn.clearFilter': 'Xoá bộ lọc',
  'btn.loadMore': 'Xem thêm',
  'btn.close': 'Đóng',
  'btn.retry': 'Thử lại',

  // -------------------------------------------------------------------------
  // Shift statuses
  // -------------------------------------------------------------------------
  'shift.status.Draft': 'Bản nháp',
  'shift.status.Published': 'Đang tuyển',
  'shift.status.FullyBooked': 'Đã đủ người',
  'shift.status.InProgress': 'Đang diễn ra',
  'shift.status.AwaitingConfirmation': 'Chờ xác nhận',
  'shift.status.Completed': 'Đã hoàn thành',
  'shift.status.Cancelled': 'Đã huỷ',
  'shift.status.Expired': 'Đã hết hạn',

  // Phase 10C-Stab-1 Batch 4 C - employer applicant bucket headings + hints.
  'employer.applicants.parentHeading': 'Tình trạng đơn',
  'applicantBucket.Pending': 'Đơn chờ duyệt',
  'applicantBucket.Pending.hint':
    'Quyết định nhận hoặc từ chối từng người ứng tuyển.',
  'applicantBucket.Approved': 'Đơn đã duyệt',
  'applicantBucket.Approved.hint':
    'Đợi người lao động check-in khi đến giờ.',
  'applicantBucket.CheckedIn': 'Người lao động đã check-in',
  'applicantBucket.CheckedIn.hint':
    'Hãy bấm Đánh dấu có mặt khi gặp được người lao động tại điểm làm.',
  'applicantBucket.PresenceConfirmed': 'Đã xác nhận có mặt',
  'applicantBucket.PresenceConfirmed.hint':
    'Cả hai bên đã xác nhận có mặt. Đợi đến hết ca.',
  'applicantBucket.AwaitingCheckout': 'Chờ check-out',
  'applicantBucket.AwaitingCheckout.hint':
    'Ca đã hết giờ nhưng người lao động chưa check-out. Bạn có thể nhắc nhở hoặc đánh dấu vắng mặt nếu không liên lạc được.',
  'applicantBucket.AwaitingConfirmation': 'Chờ xác nhận hoàn thành',
  'applicantBucket.AwaitingConfirmation.hint':
    'Người lao động đã check-out. Hãy xác nhận hoàn thành để giải ngân hoặc khiếu nại nếu có vấn đề. Tự động xác nhận sau 12 giờ.',
  'applicantBucket.Disputed': 'Đang khiếu nại',
  'applicantBucket.Disputed.hint':
    'Quản trị viên đang xử lý tranh chấp. Bạn có thể bổ sung phản hồi nếu cần.',
  'applicantBucket.Absent': 'Vắng mặt',
  'applicantBucket.Absent.hint':
    'Người lao động không có mặt theo lịch.',
  'applicantBucket.Confirmed': 'Đã hoàn thành',
  'applicantBucket.Confirmed.hint':
    'Đã thanh toán cho người lao động.',


  'shift.phase.Upcoming': 'Sắp diễn ra',
  'shift.phase.CheckInOpen': 'Sắp bắt đầu',
  'shift.phase.InProgress': 'Đang diễn ra',
  'shift.phase.AwaitingWorkerCheckout': 'Chờ người lao động check-out',
  'shift.phase.AwaitingEmployerConfirmation': 'Chờ nhà tuyển dụng xác nhận',
  'shift.phase.Disputed': 'Đang khiếu nại',
  'shift.phase.Completed': 'Đã hoàn thành',
  'shift.phase.Expired': 'Đã hết hạn',
  'shift.phase.Cancelled': 'Đã hủy',
  // Legacy alias kept so imports still resolve until call sites are
  // migrated to the new phase keys above.
  'shift.phase.Ended': 'Đã kết thúc',

  // CORE-STABILITY-10 - canonical lifecycle-state labels. ONE label per
  // state, used by the single `ShiftLifecycleBadge` everywhere so the
  // same shift never shows different text on different pages.
  'shift.lifecycle.Draft': 'Bản nháp',
  'shift.lifecycle.PendingDeposit': 'Chờ đảm bảo thanh toán',
  'shift.lifecycle.Published': 'Đang tuyển',
  'shift.lifecycle.StartingSoon': 'Sắp bắt đầu',
  'shift.lifecycle.InProgress': 'Đang diễn ra',
  'shift.lifecycle.AwaitingCheckout': 'Chờ check-out',
  'shift.lifecycle.AwaitingEmployerConfirmation': 'Chờ xác nhận',
  'shift.lifecycle.Completed': 'Đã hoàn thành',
  'shift.lifecycle.Expired': 'Đã hết hạn',
  'shift.lifecycle.Cancelled': 'Đã hủy',
  'shift.lifecycle.Disputed': 'Đang khiếu nại',

  // -------------------------------------------------------------------------
  // Escrow / payment statuses
  // -------------------------------------------------------------------------
  'escrow.PendingDeposit': 'Chờ đảm bảo thanh toán',
  'escrow.Deposited': 'Đã đảm bảo thanh toán',
  'escrow.InProgress': 'Đang xử lý',
  'escrow.Completed': 'Đã hoàn tất',
  'escrow.Released': 'Đã thanh toán',
  'escrow.Disputed': 'Đang tranh chấp',
  'escrow.Refunded': 'Đã hoàn tiền',

  // -------------------------------------------------------------------------
  // Application statuses
  // -------------------------------------------------------------------------
  'application.status.Pending': 'Chờ duyệt',
  'application.status.Approved': 'Đã duyệt',
  'application.status.Rejected': 'Bị từ chối',
  'application.status.CancelledByWorker': 'Người lao động đã huỷ',
  'application.status.CancelledByEmployer': 'Đã hủy bởi nhà tuyển dụng',
  'application.status.Expired': 'Đã hết hạn',
  'application.status.CancellationRequested': 'Yêu cầu huỷ',
  'application.status.NoShow': 'Vắng mặt',
  'application.status.CheckedIn': 'Đã check-in',
  'application.status.CheckedOut': 'Đã check-out',
  'application.status.Confirmed': 'Đã xác nhận',
  'application.status.Disputed': 'Đang khiếu nại',

  // Phase 10C-Stab-1 Batch 3 I - already-applied chip labels for the
  // worker shift listing. Worker-friendly phrasing distinct from the
  // operator-facing `application.status.*` pool.
  'apply.applied.Pending': 'Đã ứng tuyển',
  'apply.applied.Approved': 'Đã được duyệt',
  'apply.applied.CheckedIn': 'Đã check-in',
  'apply.applied.CheckedOut': 'Đã check-out',
  'apply.applied.Confirmed': 'Đã hoàn thành',
  'apply.applied.Disputed': 'Đang khiếu nại',
  'apply.applied.Rejected': 'Bị từ chối',
  'apply.applied.Expired': 'Đã hết hạn',
  'apply.applied.CancelledByWorker': 'Bạn đã hủy',
  'apply.applied.CancelledByEmployer': 'Nhà tuyển dụng đã hủy',
  'apply.applied.NoShow': 'Vắng mặt',
  'apply.applied.CancellationRequested': 'Đang yêu cầu hủy',

  // -------------------------------------------------------------------------
  // Dispute statuses
  // -------------------------------------------------------------------------
  'dispute.status.Open': 'Đang xem xét',
  'dispute.status.ResolvedReleased': 'Đã giải quyết – Thanh toán',
  'dispute.status.ResolvedRefunded': 'Đã giải quyết – Hoàn tiền',

  // -------------------------------------------------------------------------
  // Notification kinds
  // -------------------------------------------------------------------------
  'notification.kind.ApplicationReceived': 'Đơn ứng tuyển mới',
  'notification.kind.ApplicationApproved': 'Đơn ứng tuyển được duyệt',
  'notification.kind.ApplicationRejected': 'Đơn ứng tuyển bị từ chối',
  'notification.kind.NoShow': 'Vắng mặt',
  'notification.kind.ShiftCompletedConfirmed': 'Ca làm đã xác nhận',
  'notification.kind.ShiftEdited': 'Ca làm đã chỉnh sửa',
  'notification.kind.ShiftCancelled': 'Ca làm đã huỷ',
  'notification.kind.LateCancel': 'Huỷ muộn',
  'notification.kind.WorkerCancelled': 'Người lao động đã huỷ',
  'notification.kind.CancellationRequested': 'Yêu cầu huỷ',
  'notification.kind.CancellationApproved': 'Yêu cầu huỷ được chấp nhận',
  'notification.kind.CancellationRejected': 'Yêu cầu huỷ bị từ chối',
  'notification.kind.ReputationAdjusted': 'Điều chỉnh điểm uy tín',
  'notification.kind.EmployerFeedbackReceived': 'Đánh giá từ người lao động',
  'notification.kind.DisputeResolved': 'Tranh chấp đã giải quyết',
  'notification.kind.EmployerCancelledShift': 'Ca làm đã bị hủy bởi nhà tuyển dụng',
  'notification.kind.ApplicationExpired': 'Đơn ứng tuyển đã hết hạn',
  'notification.kind.DisputeFiled': 'Nhà tuyển dụng đang khiếu nại ca làm',
  'notification.kind.DisputeOpened': 'Có khiếu nại mới cần xử lý',
  'notification.kind.AutoReleaseSettled': 'Tự động giải ngân tiền công',
  'notification.kind.ShiftStarted': 'Ca làm đã bắt đầu',
  'notification.kind.ShiftEnded': 'Ca làm đã kết thúc',
  'notification.kind.WorkerCheckedIn': 'Người lao động đã check-in',
  'notification.kind.EmployerMarkedPresent': 'Nhà tuyển dụng đã xác nhận có mặt',
  'notification.kind.WorkerCheckedOut': 'Người lao động đã check-out',
  // Phase 10C-Stab-1 Batch 3 B - employer expiry notifications.
  'notification.kind.ShiftStartingSoon': 'Ca sắp bắt đầu',
  'notification.kind.ShiftExpiredEmpty': 'Ca đã hết hạn',
  // Phase 10C-Stab-1 Batch 4 - post-payment rating + admin evidence.
  'notification.kind.WorkerPostPaymentRatingRequired': 'Hãy đánh giá nhà tuyển dụng',
  'notification.kind.WorkerRatedEmployer': 'Người lao động đã đánh giá bạn',
  'notification.kind.AdminRequestedEvidence': 'Quản trị viên yêu cầu bổ sung bằng chứng',
  // CORE-STABILITY-6 Part 3 - wallet withdrawal notification.
  'notification.kind.UserWithdrawal': 'Rút tiền khỏi ví',
  // CORE-STABILITY-7 Part 1 - wallet top-up notification.
  'notification.kind.UserTopUp': 'Nạp tiền vào ví',
  // CORE-STABILITY-7 Part 1 - employer deposit-paid notification.
  'notification.kind.EmployerDepositPaid': 'Đã đặt cọc cho ca làm',
  // CORE-STABILITY-7 Part 6 - review reported (admin alert).
  'notification.kind.ReviewReported': 'Có báo cáo đánh giá mới',
  // Phase 9M - affordance label on dashboard notification cards.
  'notification.viewDetail': 'Xem chi tiết',

  // -------------------------------------------------------------------------
  // Verification statuses
  // -------------------------------------------------------------------------
  'verification.phone': 'Đã xác minh SĐT',
  'verification.id': 'Đã xác minh CMND/CCCD',
  'verification.student': 'Đã xác minh thẻ sinh viên',
  'verification.none': 'Chưa xác minh',
  'verification.notVerified': 'Chưa xác minh số điện thoại',
  'verification.required': 'Bạn cần xác minh số điện thoại trước khi ứng tuyển.',
  'verification.goToProfile': 'Đến hồ sơ để xác minh SĐT',

  // -------------------------------------------------------------------------
  // Form labels
  // -------------------------------------------------------------------------
  'form.email': 'Email',
  'form.password': 'Mật khẩu',
  'form.phone': 'Số điện thoại',
  'form.fullName': 'Họ và tên',
  'form.companyName': 'Tên công ty / cơ sở',
  'form.businessType': 'Loại hình kinh doanh',
  'form.employerType': 'Loại tài khoản nhà tuyển dụng',
  'form.role': 'Vai trò',
  'form.title': 'Tên ca làm',
  'form.description': 'Mô tả công việc',
  'form.requirements': 'Yêu cầu',
  'form.jobType': 'Loại công việc',
  'form.location': 'Địa điểm',
  'form.date': 'Ngày làm',
  'form.startTime': 'Giờ bắt đầu',
  'form.endTime': 'Giờ kết thúc',
  'form.hourlyWage': 'Lương theo giờ (đ)',
  'form.hourlyWage.hint':
    'Ví dụ: 35000 sẽ hiển thị thành 35.000. Hệ thống sẽ đọc thành chữ bên dưới.',
  'form.positionsTotal': 'Số lượng người cần',
  'form.bio': 'Giới thiệu bản thân',
  'form.skills': 'Kỹ năng',
  'form.preferredJobTypes': 'Loại công việc ưa thích',
  'form.preferredLocations': 'Khu vực ưa thích',
  'form.feedback': 'Nhận xét (tuỳ chọn)',
  'form.rating': 'Đánh giá',
  'form.reasonNote': 'Lý do',
  'form.resolutionNote': 'Ghi chú giải quyết',
  'form.searchPlaceholder': 'Tìm theo tên ca, địa điểm...',
  'form.filterLocation': 'Khu vực',
  'form.filterDateFrom': 'Từ ngày',
  'form.filterDateTo': 'Đến ngày',
  'form.filterWageMin': 'Lương tối thiểu',
  'form.filterWageMax': 'Lương tối đa',
  'form.filterJobType': 'Loại công việc',

  // -------------------------------------------------------------------------
  // Validation errors (keys match lib/validate.ts error codes)
  // -------------------------------------------------------------------------
  'error.required': 'Trường này là bắt buộc.',
  'error.email.invalid': 'Địa chỉ email không hợp lệ.',
  'error.dateInvalid': 'Ngày không hợp lệ. Vui lòng nhập theo dạng dd/mm/yyyy.',
  'error.timeInvalid': 'Giờ không hợp lệ. Vui lòng nhập theo dạng HH:mm (24 giờ).',
  'error.endBeforeStart': 'Giờ kết thúc phải sau giờ bắt đầu.',
  'error.shiftOverlap':
    'Khung giờ này trùng với ca làm đã được duyệt của bạn.',
  'error.password.tooShort': 'Mật khẩu phải có ít nhất 8 ký tự.',
  'error.phone.invalid': 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam.',
  // CORE-STABILITY-8 Part 2 - required on-site contact.
  'error.contactPerson.required': 'Vui lòng nhập người phụ trách tại chỗ.',
  'error.contactPhone.required': 'Vui lòng nhập số điện thoại người phụ trách.',
  'error.date.invalid': 'Ngày không hợp lệ.',
  'error.date.past': 'Ngày làm phải là ngày trong tương lai.',
  'error.time.invalid': 'Giờ không hợp lệ (định dạng HH:mm).',
  'error.time.endBeforeStart': 'Giờ kết thúc phải sau giờ bắt đầu.',
  // QA-Fix-2 Phase 1 - past-shift posting block.
  'error.shift.pastDateTime':
    'Không thể đăng ca trong quá khứ. Vui lòng chọn ngày/giờ trong tương lai.',
  'error.wage.invalid': 'Lương phải là số dương.',
  'error.positions.invalid': 'Số lượng người cần phải ít nhất là 1.',
  'error.positions.required': 'Vui lòng nhập số lượng người cần.',
  'error.positions.belowFilled':
    'Không thể giảm số lượng người xuống dưới {min} (đã có người được duyệt).',
  'error.generic': 'Đã có lỗi xảy ra. Vui lòng thử lại.',

  // -------------------------------------------------------------------------
  // Apply / application errors
  // -------------------------------------------------------------------------
  'apply.error.VERIFICATION_REQUIRED': 'Bạn cần xác minh số điện thoại trước khi ứng tuyển.',
  'apply.error.REPUTATION_TOO_LOW':
    'Điểm uy tín của bạn quá thấp (dưới 50). Vui lòng hoàn thành các ca làm để tăng điểm.',
  'apply.error.CONFLICT':
    'Bạn đã có ca làm trùng giờ. Vui lòng kiểm tra lịch của bạn.',
  'apply.error.SCHEDULE_CONFLICT':
    'Ca này trùng với lịch cá nhân của bạn.',
  'apply.error.FULLY_BOOKED': 'Ca làm này đã đủ người.',
  'apply.error.ALREADY_APPLIED': 'Bạn đã ứng tuyển ca làm này rồi.',
  'apply.error.SHIFT_NOT_FOUND': 'Không tìm thấy ca làm.',
  'apply.error.SHIFT_NOT_AVAILABLE': 'Ca làm này không còn nhận đơn ứng tuyển.',
  'apply.error.SHIFT_NOT_DEPOSITED': 'Ca làm chưa được đảm bảo thanh toán.',
  'apply.error.WORKER_NOT_FOUND': 'Không tìm thấy tài khoản người lao động.',
  'apply.error.NOT_PUBLISHED': 'Ca làm này chưa được đăng công khai.',

  // -------------------------------------------------------------------------
  // Phase 9O - global action feedback (toast titles + descriptions).
  //
  // Naming: `feedback.<actor>.<action>.{success,error}`.
  // Use these via `showSuccess` / `showError` from `@/lib/toast`.
  // -------------------------------------------------------------------------
  'feedback.error.generic': 'Có lỗi xảy ra. Vui lòng thử lại.',
  'feedback.error.applicationNotFound': 'Không tìm thấy đơn ứng tuyển.',
  'feedback.error.wrongStatus': 'Trạng thái hiện tại không cho phép thao tác này.',
  'feedback.error.shiftAlreadyStarted':
    'Ca đã bắt đầu, không thể duyệt thêm ứng viên.',
  'feedback.error.reasonRequired': 'Vui lòng nhập lý do.',
  'feedback.error.positionsBelowFilled':
    'Số người tuyển không thể nhỏ hơn số người đã được duyệt.',
  'feedback.error.userNotFound': 'Không tìm thấy người dùng.',
  'feedback.error.notAWorker': 'Tài khoản này không phải là người lao động.',
  'feedback.error.disputeNotFound': 'Không tìm thấy tranh chấp.',
  'feedback.error.invalidOutcome': 'Kết quả tranh chấp không hợp lệ.',
  'feedback.error.cannotSuspendSelf': 'Bạn không thể tự khoá tài khoản mình.',
  'feedback.error.cannotSuspendLastAdmin':
    'Không thể khoá quản trị viên đang hoạt động cuối cùng.',
  'feedback.error.invalidStars': 'Số sao đánh giá không hợp lệ (1–5).',
  'feedback.error.alreadySubmitted': 'Bạn đã gửi đánh giá cho ca này rồi.',
  'feedback.error.commentTooLong': 'Nội dung đánh giá quá dài.',
  'feedback.error.ownerMismatch': 'Lịch này không thuộc về bạn.',
  'feedback.error.titleRequired': 'Vui lòng nhập tiêu đề.',
  'feedback.error.dateRequired': 'Vui lòng chọn ngày.',
  'feedback.error.timeRequired': 'Vui lòng nhập giờ.',
  'feedback.error.timeRangeInvalid': 'Giờ kết thúc phải sau giờ bắt đầu.',
  'feedback.error.blockNotFound': 'Không tìm thấy lịch bận.',
  'feedback.error.overlapsApprovedShift':
    'Khung giờ này trùng với ca đã được duyệt.',
  'feedback.error.invalidCredentials': 'Email hoặc mật khẩu không đúng.',
  'feedback.error.suspended':
    'Tài khoản đã bị tạm khoá. Vui lòng liên hệ quản trị viên.',
  'feedback.error.emailTaken': 'Email này đã được đăng ký.',
  'feedback.error.backend':
    'Không kết nối được máy chủ. Vui lòng thử lại sau giây lát.',
  'feedback.error.invalidEmail': 'Email không hợp lệ.',
  'feedback.error.invalidPassword': 'Mật khẩu cần ít nhất 8 ký tự.',
  'feedback.error.invalidPhone': 'Số điện thoại không hợp lệ.',
  'feedback.error.rateLimited':
    'Bạn thử lại quá nhiều lần. Vui lòng đợi ít phút rồi thử lại.',
  'feedback.error.invalidInput': 'Thông tin đăng ký chưa hợp lệ. Vui lòng kiểm tra lại.',

  // Worker action feedback
  'feedback.apply.success': 'Đã ứng tuyển thành công',
  'feedback.apply.success.desc':
    'Nhà tuyển dụng sẽ xem hồ sơ và phản hồi sớm.',
  'feedback.cancel.success': 'Đã huỷ đơn ứng tuyển',
  'feedback.cancelRequest.success': 'Đã gửi yêu cầu huỷ ca',
  'feedback.cancelRequest.success.desc':
    'Nhà tuyển dụng sẽ duyệt hoặc từ chối yêu cầu của bạn.',
  'feedback.checkIn.success': 'Đã check-in',
  'feedback.checkOut.success': 'Đã check-out, chờ nhà tuyển dụng xác nhận',
  'feedback.schedule.add.success': 'Đã thêm lịch trình',
  'feedback.schedule.update.success': 'Đã cập nhật lịch trình',
  'feedback.schedule.delete.success': 'Đã xoá lịch trình',

  // Employer action feedback
  'feedback.shift.create.success': 'Đã tạo ca tuyển dụng',
  'feedback.shift.create.success.desc':
    'Bấm "Mô phỏng đảm bảo thanh toán" để công khai ca cho người lao động.',
  'feedback.shift.deposit.success': 'Đã mô phỏng đảm bảo thanh toán - ca đã được công khai',
  'feedback.shift.edit.success': 'Đã lưu thay đổi',
  'feedback.shift.cancel.success': 'Đã huỷ ca làm',
  'feedback.shift.cancel.success.desc':
    'Khoản đảm bảo thanh toán đã được hoàn (mô phỏng).',
  'feedback.applicant.approve.success': 'Đã duyệt người ứng tuyển',
  'feedback.applicant.reject.success': 'Đã từ chối đơn ứng tuyển',
  'feedback.applicant.confirm.success': 'Đã xác nhận hoàn thành ca',
  'feedback.applicant.confirm.success.desc':
    'Tiền công đã được cộng vào ví của người lao động.',
  'feedback.applicant.markNoShow.success': 'Đã đánh dấu vắng mặt',
  'feedback.applicant.markNoShow.success.desc':
    'Bạn được tặng 1 lượt boost cho ca tiếp theo.',
  'feedback.applicant.cancellationApproved.success':
    'Đã chấp nhận yêu cầu huỷ',
  'feedback.applicant.cancellationRejected.success': 'Đã từ chối yêu cầu huỷ',

  // Admin action feedback
  'feedback.admin.reputationAdjust.success': 'Đã cập nhật điểm uy tín',
  'feedback.admin.suspend.success': 'Đã tạm khoá tài khoản',
  'feedback.admin.reactivate.success': 'Đã mở khoá tài khoản',
  'feedback.admin.dispute.resolve.success': 'Đã giải quyết tranh chấp',
  'feedback.admin.escrow.override.success': 'Đã override trạng thái đặt cọc',

  // Auth action feedback
  'feedback.auth.login.success': 'Đăng nhập thành công',
  'feedback.auth.register.success': 'Tạo tài khoản thành công',
  'feedback.auth.register.success.desc':
    'Bạn có thể đăng nhập và bắt đầu sử dụng ngay.',
  'feedback.auth.logout.success': 'Đã đăng xuất',
  'feedback.profile.save.success': 'Đã lưu hồ sơ',

  // -------------------------------------------------------------------------
  // Auth errors
  // -------------------------------------------------------------------------
  'auth.error.INVALID_CREDENTIALS': 'Email hoặc mật khẩu không đúng.',
  'auth.error.SUSPENDED':
    'Tài khoản của bạn đã bị tạm khoá. Vui lòng liên hệ quản trị viên.',
  'auth.error.EMAIL_TAKEN': 'Email này đã được đăng ký.',
  'auth.error.INVALID_ROLE': 'Vai trò không hợp lệ.',
  'auth.error.INVALID_INPUT': 'Thông tin đăng ký không hợp lệ. Vui lòng kiểm tra lại.',

  // -------------------------------------------------------------------------
  // Admin errors
  // -------------------------------------------------------------------------
  'admin.error.USER_NOT_FOUND': 'Không tìm thấy người dùng.',
  'admin.error.NOT_A_WORKER': 'Tài khoản này không phải là người lao động.',
  'admin.error.SHIFT_NOT_FOUND': 'Không tìm thấy ca làm.',
  'admin.error.DISPUTE_NOT_FOUND': 'Không tìm thấy tranh chấp.',
  'admin.error.INVALID_OUTCOME': 'Kết quả giải quyết không hợp lệ.',
  'admin.error.INVALID_SCORE': 'Điểm uy tín phải là số nguyên từ 0 đến 100.',
  'admin.error.REASON_REQUIRED': 'Vui lòng nhập lý do điều chỉnh.',
  'admin.error.CANNOT_SUSPEND_SELF':
    'Bạn không thể tạm khoá chính tài khoản đang đăng nhập.',
  'admin.error.CANNOT_SUSPEND_LAST_ADMIN':
    'Không thể tạm khoá quản trị viên đang hoạt động cuối cùng.',
  'admin.user.currentAccount': 'Tài khoản hiện tại',
  // -------------------------------------------------------------------------
  // Admin Account Management (task C/D) — tạo / khoá / xoá tài khoản thật.
  // CHỈ hiển thị ở chế độ supabase. Mọi thao tác chạy qua Edge Function.
  // -------------------------------------------------------------------------
  'admin.accounts.create.title': 'Tạo tài khoản mới',
  'admin.accounts.create.intro':
    'Tạo tài khoản Người lao động hoặc Nhà tuyển dụng. Tài khoản quản trị viên chỉ tạo được bằng công cụ bootstrap, không tạo từ đây.',
  'admin.accounts.create.email': 'Email đăng nhập',
  'admin.accounts.create.displayName.worker': 'Họ và tên',
  'admin.accounts.create.displayName.employer': 'Tên doanh nghiệp',
  'admin.accounts.create.role': 'Vai trò',
  'admin.accounts.create.role.worker': 'Người lao động',
  'admin.accounts.create.role.employer': 'Nhà tuyển dụng',
  'admin.accounts.create.password': 'Mật khẩu tạm thời',
  'admin.accounts.create.password.hint': 'Tối thiểu 8 ký tự. Nhắc người dùng đổi lại sau khi đăng nhập.',
  'admin.accounts.create.submit': 'Tạo tài khoản',
  'admin.accounts.create.submitting': 'Đang tạo…',
  'admin.accounts.delete.button': 'Xoá vĩnh viễn',
  'admin.accounts.delete.modal.title': 'Xoá vĩnh viễn tài khoản',
  'admin.accounts.delete.modal.warning':
    'Hành động này KHÔNG THỂ hoàn tác. Tài khoản sẽ bị xoá khỏi hệ thống đăng nhập và cơ sở dữ liệu. Chỉ áp dụng cho tài khoản chưa có ca làm hoặc đơn ứng tuyển nào.',
  'admin.accounts.delete.modal.retype': 'Nhập lại email để xác nhận',
  'admin.accounts.delete.modal.retypePlaceholder': 'Nhập chính xác email tài khoản',
  'admin.accounts.delete.modal.confirm': 'Tôi hiểu, xoá vĩnh viễn',
  'admin.accounts.delete.modal.deleting': 'Đang xoá…',
  'admin.accounts.refresh': 'Tải lại danh sách',
  // Feedback
  'admin.accounts.feedback.created': 'Đã tạo tài khoản mới.',
  'admin.accounts.feedback.deleted': 'Đã xoá vĩnh viễn tài khoản.',
  'admin.accounts.feedback.suspended': 'Đã khoá tài khoản.',
  'admin.accounts.feedback.reactivated': 'Đã mở khoá tài khoản.',
  // Mã lỗi từ Edge Function → thông báo tiếng Việt.
  'admin.accounts.error.EMAIL_EXISTS': 'Email này đã được sử dụng cho một tài khoản khác.',
  'admin.accounts.error.INVALID_EMAIL': 'Email không hợp lệ.',
  'admin.accounts.error.WEAK_PASSWORD': 'Mật khẩu cần tối thiểu 8 ký tự.',
  'admin.accounts.error.MISSING_DISPLAY_NAME': 'Vui lòng nhập tên hiển thị.',
  'admin.accounts.error.INVALID_ROLE': 'Chỉ tạo được Người lao động hoặc Nhà tuyển dụng.',
  'admin.accounts.error.USER_HAS_HISTORY':
    'Tài khoản đã có ca làm hoặc đơn ứng tuyển nên không thể xoá. Hãy dùng "Khoá tài khoản" để ngăn hoạt động mới mà vẫn giữ lịch sử.',
  'admin.accounts.error.CANNOT_DELETE_ADMIN': 'Không thể xoá tài khoản quản trị viên.',
  'admin.accounts.error.CANNOT_DELETE_SELF': 'Bạn không thể tự xoá tài khoản đang đăng nhập.',
  'admin.accounts.error.CANNOT_SUSPEND_ADMIN': 'Không thể khoá tài khoản quản trị viên.',
  'admin.accounts.error.CANNOT_SUSPEND_SELF': 'Bạn không thể khoá chính tài khoản đang đăng nhập.',
  'admin.accounts.error.NOT_FOUND': 'Không tìm thấy tài khoản.',
  'admin.accounts.error.FORBIDDEN': 'Bạn không có quyền thực hiện thao tác này.',
  'admin.accounts.error.UNAUTHENTICATED': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'admin.accounts.error.RETYPE_MISMATCH': 'Email nhập lại chưa khớp.',
  'admin.accounts.error.UNKNOWN': 'Có lỗi xảy ra. Vui lòng thử lại.',
  'admin.user.sortBy.reputation': 'Sắp xếp theo điểm uy tín ↓',
  'admin.user.sortField': 'Sắp xếp theo',
  'admin.user.sortField.name': 'Tên',
  'admin.user.sortField.role': 'Vai trò',
  'admin.user.sortField.reputation': 'Điểm uy tín',
  'admin.user.sortField.status': 'Trạng thái',
  'admin.user.sortField.joined': 'Ngày tham gia',
  'admin.user.sortDir.asc': 'Tăng dần',
  'admin.user.sortDir.desc': 'Giảm dần',
  'admin.user.sortDir.toAsc': 'Đổi sang tăng dần',
  'admin.user.sortDir.toDesc': 'Đổi sang giảm dần',
  'admin.shifts.filter.all': 'Tất cả',
  'admin.shifts.filter.active': 'Đang hoạt động',
  'admin.shifts.filter.completed': 'Đã hoàn thành',
  'admin.shifts.filter.disputed': 'Tranh chấp',
  'admin.user.currentScore': 'Điểm hiện tại',
  'admin.user.newScore': 'Điểm uy tín mới',
  'admin.user.newScore.placeholder': '0–100',
  'admin.user.newScore.hint': 'Nhập điểm từ 0 đến 100.',
  'admin.user.scoreOutOfRange': 'Điểm uy tín phải nằm trong khoảng 0–100.',
  'admin.user.reasonNote.placeholder': 'Ví dụ: bù điểm sau khi gỡ tranh chấp',
  'admin.user.reasonNote.hint': 'Mô tả ngắn lý do điều chỉnh (lưu vào lịch sử).',
  'admin.user.adjustmentHistory.title': 'Lịch sử điều chỉnh điểm',
  'admin.user.adjustmentHistory.empty':
    'Chưa có lịch sử điều chỉnh điểm bởi quản trị viên.',

  // -------------------------------------------------------------------------
  // Admin user-profile modal (Phase 4)
  // -------------------------------------------------------------------------
  'admin.profile.title': 'Hồ sơ người dùng',
  'admin.profile.quota.title': 'Hạn mức huỷ ca',
  'admin.profile.quota.weekly':
    '7 ngày: đã dùng {used}/{limit} (còn {remaining}).',
  'admin.profile.quota.monthly':
    '30 ngày: đã dùng {used}/{limit} (còn {remaining}).',
  'admin.profile.employer.disputedPayments':
    'Hiện có {count} thanh toán đang tranh chấp.',
  'admin.profile.admin.note': 'Quyền quản trị',
  'admin.profile.admin.description':
    'Tài khoản này có quyền quản trị toàn hệ thống. Mọi thao tác đều mock/localStorage.',

  // -------------------------------------------------------------------------
  // Worker cancellation flow
  // -------------------------------------------------------------------------
  'cancel.confirm.title': 'Xác nhận huỷ đơn ứng tuyển',
  'cancel.confirm.lateWarning':
    'Đây là huỷ muộn (trong vòng 24 giờ trước giờ bắt đầu). Điểm uy tín của bạn sẽ giảm 10 điểm.',
  'cancel.confirm.onTimeNote':
    'Bạn huỷ trước giờ bắt đầu hơn 24h nên không bị trừ điểm uy tín.',
  'cancel.confirm.approvalRequired':
    'Vì ca bắt đầu trong vòng 3 giờ, yêu cầu huỷ của bạn cần được nhà tuyển dụng duyệt trước khi có hiệu lực.',
  'cancel.confirm.reasonLabel': 'Lý do huỷ',
  'cancel.confirm.reasonPlaceholder': 'Vui lòng cho biết lý do bạn không thể tham gia...',
  'cancel.confirm.reasonRequired': 'Vui lòng nhập lý do huỷ.',
  'cancel.confirm.submit': 'Xác nhận huỷ',
  'cancel.confirm.requestSubmit': 'Gửi yêu cầu huỷ',
  'cancel.confirm.keep': 'Giữ đơn ứng tuyển',
  'cancel.confirm.quotaBlocked':
    'Bạn đã vượt hạn mức huỷ trong tuần hoặc trong tháng này. Vui lòng thử lại sau.',
  'cancel.quota.title': 'Hạn mức huỷ của bạn',
  'cancel.quota.blockedTitle': 'Đã hết hạn mức huỷ',
  'cancel.quota.blockedHint':
    'Bạn không thể huỷ thêm đơn ứng tuyển cho đến khi cửa sổ 7 ngày hoặc 30 ngày trống thêm chỗ.',
  'cancel.quota.weekly':
    'Bạn còn {remaining}/{limit} lượt huỷ trong 7 ngày gần đây.',
  'cancel.quota.monthly':
    'Bạn còn {remaining}/{limit} lượt huỷ trong 30 ngày gần đây.',
  'cancel.requested.awaitingDecision':
    'Yêu cầu huỷ đã được gửi tới nhà tuyển dụng. Đơn của bạn vẫn giữ chỗ cho tới khi có quyết định.',
  'cancel.request.employerHeading': 'Người lao động yêu cầu huỷ ca',
  'cancel.request.employerHint':
    'Vì ca bắt đầu trong vòng 3 giờ, người lao động cần bạn duyệt trước khi huỷ có hiệu lực.',

  // -------------------------------------------------------------------------
  // Worker personal schedule (Phase 5)
  // -------------------------------------------------------------------------
  'schedule.page.title': 'Lịch cá nhân',
  'schedule.page.subtitle':
    'Thêm lịch rảnh để nhận gợi ý ca phù hợp, hoặc lịch bận (giờ học, ca làm khác, việc cá nhân) để tránh ứng tuyển trùng giờ.',
  'schedule.page.approvedShiftsNote':
    'Ca làm đã được duyệt cũng được tính là thời gian bận khi ứng tuyển.',
  'schedule.empty.title': 'Bạn chưa có lịch trình nào.',
  'schedule.empty.description':
    'Thêm khung giờ rảnh để nhận gợi ý ca phù hợp, hoặc thêm lịch bận để hệ thống chặn ứng tuyển trùng giờ.',
  'schedule.btn.add': 'Thêm lịch trình',
  'schedule.btn.confirmDelete': 'Xác nhận xoá',
  'schedule.dialog.addTitle': 'Thêm lịch trình của bạn',
  'schedule.dialog.editTitle': 'Cập nhật lịch trình',
  'schedule.form.title': 'Tên',
  'schedule.form.date': 'Ngày',
  'schedule.form.startTime': 'Giờ bắt đầu',
  'schedule.form.endTime': 'Giờ kết thúc',
  'schedule.form.note': 'Ghi chú (tuỳ chọn)',
  'schedule.error.NOT_FOUND': 'Không tìm thấy lịch.',
  'schedule.error.OWNER_MISMATCH': 'Bạn không có quyền chỉnh sửa lịch này.',
  'schedule.error.TITLE_REQUIRED': 'Vui lòng nhập tên cho khung giờ bận.',
  'schedule.error.DATE_REQUIRED': 'Vui lòng chọn ngày.',
  'schedule.error.TIME_REQUIRED': 'Vui lòng chọn giờ bắt đầu và giờ kết thúc.',
  'schedule.error.TIME_RANGE_INVALID':
    'Giờ kết thúc phải sau giờ bắt đầu.',

  // Phase 5B - weekly timetable view
  'schedule.week.prev': 'Tuần trước',
  'schedule.week.current': 'Tuần này',
  'schedule.week.next': 'Tuần sau',
  'schedule.slotCfg.title': 'Cấu hình khung giờ',
  'schedule.slotCfg.toggle': 'Tuỳ chỉnh khung giờ',
  'schedule.slotCfg.dayStart': 'Giờ bắt đầu ngày',
  'schedule.slotCfg.dayEnd': 'Giờ kết thúc ngày',
  'schedule.slotCfg.slotMinutes': 'Độ dài mỗi slot (phút)',
  'schedule.slotCfg.error.INVALID_TIME_RANGE':
    'Giờ kết thúc ngày phải sau giờ bắt đầu ngày.',
  'schedule.slotCfg.error.INVALID_SLOT_DURATION':
    'Độ dài mỗi slot phải từ 15 phút trở lên.',
  'schedule.slotCfg.error.TOO_MANY_SLOTS':
    'Số slot quá nhiều. Hãy tăng độ dài mỗi slot hoặc thu hẹp khung giờ trong ngày.',
  'schedule.timetable.timeColumn': 'Giờ',
  'schedule.timetable.addInSlot': 'Thêm lịch vào khung giờ này',
  'schedule.list.title': 'Tất cả lịch trình',
  'schedule.event.lockedLabel': 'Ca đã duyệt',
  'schedule.event.personalLabel': 'Lịch cá nhân',
  'schedule.empty.weekHint':
    'Không có lịch trình trong tuần này. Bấm vào ô trống để thêm.',

  // -------------------------------------------------------------------------
  // Employer profile (worker view)
  // -------------------------------------------------------------------------
  'employer.profile.title': 'Hồ sơ nhà tuyển dụng',
  'employer.profile.businessType': 'Loại hình kinh doanh',
  'employer.profile.description': 'Giới thiệu',
  'employer.profile.email': 'Email',
  'employer.profile.postedShifts': 'Ca đã đăng',
  'employer.profile.activeShifts': 'Đang hoạt động',
  'employer.profile.completedShifts': 'Ca đã hoàn thành',
  'employer.profile.cancelledShifts': 'Đã huỷ',
  'employer.profile.verifiedBusiness': 'Doanh nghiệp đã xác minh',
  'employer.profile.notVerified': 'Cá nhân / chưa xác minh',
  'employer.profile.noDescription': 'Nhà tuyển dụng chưa thêm giới thiệu.',

  // -------------------------------------------------------------------------
  // Shift / store action errors
  // -------------------------------------------------------------------------
  'shift.error.NOT_FOUND': 'Không tìm thấy ca làm.',
  // Phase 9F: cancel and edit have separate windows now (cancel = 6h,
  // edit = 24h). The legacy `shift.error.TOO_LATE` key is preserved as
  // an alias for `TOO_LATE_CANCEL` since the only existing call site is
  // the employer cancel flow.
  // Phase 9G: applicant-aware cancel rule. Cancel is now blocked only
  // when the shift has active applicants AND is within 6h of start, or
  // when the shift has already started. New explicit error codes
  // surface the precise reason; the legacy `TOO_LATE` key now points
  // at the "has applicants" case since that's the most common block.
  'shift.error.TOO_LATE':
    'Không thể huỷ ca trong vòng 6 giờ trước khi ca bắt đầu vì ca đã có người ứng tuyển hoặc được duyệt.',
  'shift.error.TOO_LATE_CANCEL':
    'Không thể huỷ ca trong vòng 6 giờ trước khi ca bắt đầu vì ca đã có người ứng tuyển hoặc được duyệt.',
  'shift.error.TOO_LATE_HAS_APPLICANTS':
    'Không thể huỷ ca trong vòng 6 giờ trước khi ca bắt đầu vì ca đã có người ứng tuyển hoặc được duyệt.',
  'shift.error.TOO_LATE_STARTED':
    'Không thể huỷ ca sau khi ca đã bắt đầu.',
  'shift.error.TOO_LATE_EDIT':
    'Không thể chỉnh sửa ca trong vòng 24 giờ trước khi ca bắt đầu.',
  'shift.cancelled.banner':
    'Ca làm này đã bị huỷ. người lao động có liên quan đã được thông báo.',
  'application.error.APPLICATION_NOT_FOUND': 'Không tìm thấy đơn ứng tuyển.',
  'application.error.WRONG_STATUS': 'Trạng thái đơn ứng tuyển không phù hợp.',

  // -------------------------------------------------------------------------
  // Landing page
  //
  // HONESTY RULE (PRODUCT.md "Trung thực mặc định"): landing copy must NOT
  // imply that deposits, escrow, payouts, or ID/business verification are
  // real, working systems. Anything financial is described as a prototype
  // simulation ("mô phỏng") - never a real transaction or a payout guarantee.
  // NOTE: `landing.hero.featured.repLabel` MUST stay "Điểm uy tín" - the
  // featuredJobMockup + reputationDisplayEquality tests key on that string.
  // -------------------------------------------------------------------------

  // Hero - one unified message across every breakpoint ("rõ ca – rõ tiền").
  'landing.hero.badge': 'Rõ ràng · Đáng tin · Nhanh gọn',
  'landing.hero.title': 'Việc làm ngắn hạn,',
  'landing.hero.titleAccent': 'rõ ca – rõ tiền',
  'landing.hero.subtitle':
    'Nền tảng điều phối ca làm ngắn hạn tại Việt Nam: rõ thời gian, rõ tiền công và rõ trạng thái từng ca. Dùng ngay trên trình duyệt, không cần cài ứng dụng.',
  // Honest microcopy rendered directly under the hero CTAs.
  'landing.hero.trustHint':
    'Miễn phí dùng thử · Đây là bản demo · Các bước thanh toán đều là mô phỏng.',
  // Supabase/production (Beta): tài khoản/ca/đơn là thật; CaLẻ chưa thu/giữ tiền.
  'landing.hero.trustHint.supabase':
    'Miễn phí dùng thử · Giai đoạn thử nghiệm giới hạn (Beta) · CaLẻ chưa thu hoặc giữ tiền.',

  // Live shift board (FeaturedJobMockup). Presentation-only labels for the
  // dispatch board. repLabel is locked (see HONESTY RULE note above).
  'landing.hero.featured.badge': 'Ca đang mở tuyển',
  'landing.hero.featured.statusBadge': 'Đang tuyển',
  'landing.hero.featured.viewCta': 'Xem chi tiết',
  'landing.hero.featured.exploreCta': 'Khám phá ca làm',
  'landing.hero.featured.exploreAria': 'Khám phá ca làm trên CaLẻ',
  'landing.hero.featured.fallbackTitle': 'Khám phá ca làm phù hợp',
  'landing.hero.featured.fallbackHint':
    'Chưa có ca nổi bật ngay lúc này - bấm để xem toàn bộ ca đang mở.',
  'landing.hero.featured.repLabel': 'Điểm uy tín',
  'landing.hero.featured.repHint': 'trên thang 100',
  'landing.hero.featured.upcomingLabel': 'Ca sắp tới của bạn',
  'landing.hero.featured.boardNote': 'Danh sách ca cập nhật theo thời gian thực.',

  // CTAs - worker always explores shifts first (/shifts); employer registers
  // to post a shift (/register?role=employer). Never send a worker to register.
  'landing.cta.worker': 'Tìm ca làm ngay',
  'landing.cta.employer': 'Đăng ca cần tuyển',

  // Trust strip - three honest signals + a plain-language simulation note.
  'landing.trust.time': 'Rõ thời gian và tiền công',
  'landing.trust.time.desc':
    'Mỗi ca ghi rõ giờ làm và mức tiền công trước khi bạn ứng tuyển.',
  'landing.trust.confirm': 'Xác nhận hai chiều',
  'landing.trust.confirm.desc':
    'Hai bên cùng xác nhận trạng thái ca, không ai tự quyết một mình.',
  'landing.trust.reputation': 'Uy tín sau mỗi ca',
  'landing.trust.reputation.desc':
    'Điểm uy tín được cập nhật sau mỗi ca đã hoàn thành.',
  'landing.trust.simNote':
    'Các bước giữ tiền và thanh toán hiện là mô phỏng trong prototype.',
  'landing.trust.simNote.supabase':
    'CaLẻ hiện chưa hỗ trợ thu, giữ hoặc chuyển tiền giữa hai bên. Nhà tuyển dụng và người lao động tự thống nhất phương thức thanh toán.',

  // How it works - merged worker lane + employer lane, three steps each.
  'landing.howItWorks.title': 'Cách hoạt động',
  'landing.howItWorks.lead':
    'Một quy trình rõ ràng cho cả hai phía - mỗi bước đều có trạng thái minh bạch.',
  'landing.howItWorks.worker.title': 'Người lao động',
  'landing.howItWorks.worker.step1': 'Tìm và ứng tuyển ca làm phù hợp',
  'landing.howItWorks.worker.step2': 'Được duyệt và xác nhận ca',
  'landing.howItWorks.worker.step3': 'Hoàn thành ca và nhận đánh giá',
  'landing.howItWorks.worker.step4': 'Đánh giá nhà tuyển dụng',
  'landing.howItWorks.employer.title': 'Nhà tuyển dụng',
  'landing.howItWorks.employer.step1': 'Đăng ca với thời gian và tiền công rõ ràng',
  'landing.howItWorks.employer.step2': 'Chọn người lao động từ danh sách ứng tuyển',
  'landing.howItWorks.employer.step3': 'Xác nhận kết quả sau ca làm',
  'landing.howItWorks.employer.step4': 'Đánh giá chất lượng của người lao động',
  'landing.howItWorks.viewGuide': 'Xem hướng dẫn chi tiết',

  // Safety & trust - one short list; the financial row is explicitly a mock.
  'landing.safety.title': 'An toàn và minh bạch theo từng ca',
  'landing.safety.lead':
    'Những cơ chế giúp hai bên yên tâm - và phần tài chính hiện chỉ là mô phỏng.',
  'landing.safety.lead.supabase':
    'Những cơ chế giúp hai bên yên tâm khi thống nhất và theo dõi từng ca làm.',
  'landing.safety.confirm.title': 'Xác nhận hai chiều',
  'landing.safety.confirm.desc':
    'Người lao động và nhà tuyển dụng cùng xác nhận trạng thái từng ca.',
  'landing.safety.reputation.title': 'Lịch sử uy tín',
  'landing.safety.reputation.desc':
    'Điểm uy tín ghi nhận hành vi của người lao động, nhận xét về nhà tuyển dụng sau ca làm.',
  'landing.safety.dispute.title': 'Tranh chấp minh bạch',
  'landing.safety.dispute.desc':
    'Có quy trình xử lý rõ ràng khi hai bên chưa thống nhất về ca làm.',
  'landing.safety.finance.title': 'Đảm bảo thanh toán',
  'landing.safety.finance.desc':
    'Đặt cọc, ví và thanh toán đều là sổ cái mô phỏng trong bản demo - chưa có giao dịch thật.',
  // Supabase/production: không có ví/ký quỹ; nói đúng bản chất tự thống nhất.
  'landing.safety.finance.title.supabase': 'Tự thống nhất thanh toán',
  'landing.safety.finance.desc.supabase':
    'CaLẻ chưa thu hoặc giữ tiền. Nhà tuyển dụng và người lao động tự thống nhất phương thức thanh toán trực tiếp.',

  // Worker / employer split - two clear choices.
  'landing.split.worker.title': 'Tôi muốn tìm ca',
  'landing.split.worker.desc':
    'Xem ca đang mở, lọc theo lịch của bạn và ứng tuyển ngay.',
  'landing.split.employer.title': 'Tôi cần tìm người',
  'landing.split.employer.desc':
    'Đăng ca cần tuyển và chọn người lao động phù hợp cho ca trống.',

  // Final CTA - one worker primary action + an employer text link.
  'landing.finalCta.title': 'Sẵn sàng nhận ca đầu tiên?',
  'landing.finalCta.subtitle':
    'Xem ca đang mở và ứng tuyển ngay - miễn phí, không cần cài ứng dụng.',
  'landing.finalCta.employerPrompt': 'Bạn cần tuyển người lao động?',

  // -------------------------------------------------------------------------
  // Auth pages
  // -------------------------------------------------------------------------
  'auth.login.title': 'Đăng nhập',
  'auth.login.subtitle': 'Chào mừng bạn quay lại CaLẻ',
  'auth.login.noAccount': 'Chưa có tài khoản?',
  'auth.register.title': 'Đăng ký tài khoản',
  'auth.register.subtitle': 'Tham gia CaLẻ ngay hôm nay',
  'auth.register.hasAccount': 'Đã có tài khoản?',
  'auth.register.selectRole': 'Bạn muốn đăng ký với vai trò nào?',
  'auth.register.asWorker': 'Tôi muốn tìm ca làm',
  'auth.register.asEmployer': 'Tôi cần tuyển người lao động',

  // Auth side panel (Phase 9 visual polish)
  'auth.side.welcome': 'Chào mừng quay lại',
  'auth.side.welcome.desc':
    'Đăng nhập để tiếp tục quản lý ca làm, đơn ứng tuyển và lịch cá nhân của bạn.',
  'auth.side.join': 'Tham gia CaLẻ',
  'auth.side.join.desc':
    'Tạo tài khoản miễn phí trong vài phút. Phù hợp cho cả người tìm việc linh hoạt lẫn quán/sự kiện cần người lao động linh hoạt.',
  'auth.side.benefit1': 'Thanh toán minh bạch',
  'auth.side.benefit1.desc': 'Nhà tuyển dụng thanh toán trước, tiền chỉ giải ngân khi hoàn thành.',
  // Supabase/production: CaLẻ chưa thu/giữ tiền → mô tả trung thực.
  'auth.side.benefit1.supabase': 'Rõ ca – rõ tiền',
  'auth.side.benefit1.desc.supabase':
    'Mỗi ca ghi rõ giờ làm và tiền công. CaLẻ chưa thu hoặc giữ tiền; hai bên tự thống nhất cách thanh toán.',
  'auth.side.benefit2': 'Không phí ẩn',
  'auth.side.benefit2.desc': 'Người lao động không phải trả trước. Đăng ký miễn phí.',
  'auth.side.benefit3': 'Điểm uy tín hai chiều',
  'auth.side.benefit3.desc': 'Đánh giá hai chiều giúp xây dựng cộng đồng tin cậy.',
  'auth.side.disclaimer':
    'Phiên bản MVP - toàn bộ thanh toán & xác minh đều giả lập, không có giao dịch thật.',
  'auth.side.disclaimer.supabase':
    'Giai đoạn thử nghiệm giới hạn (Beta). Dữ liệu tài khoản, ca làm và đơn ứng tuyển được lưu trên hệ thống. CaLẻ hiện chưa hỗ trợ thu, giữ hoặc chuyển tiền giữa hai bên.',

  // -------------------------------------------------------------------------
  // Worker dashboard
  // -------------------------------------------------------------------------
  'worker.dashboard.title': 'Tổng quan người lao động',
  'worker.dashboard.welcome': 'Xin chào',
  'worker.dashboard.welcome.veteran':
    'Bạn đã hoàn thành {count} ca. Tiếp tục giữ phong độ nhé!',
  'worker.dashboard.welcome.newcomer': 'Sẵn sàng cho ca làm đầu tiên?',
  'worker.dashboard.cancelQuota': 'Hạn mức huỷ tuần',
  'worker.dashboard.cancelQuota.weekHint': 'còn lại',
  'worker.dashboard.reputationCurrent':
    'Điểm uy tín hiện tại của bạn: {score} / 100.',
  'worker.dashboard.quotaModal.intro':
    'Mỗi người lao động có hạn mức huỷ ca trong 7 ngày và 30 ngày gần nhất. Vượt hạn mức sẽ bị chặn huỷ tạm thời.',
  'worker.dashboard.quotaModal.bonus':
    'Điểm uy tín cao giúp bạn được nâng hạn mức: ≥80 → +1 tuần / +2 tháng, ≥95 → +2 tuần / +4 tháng.',

  'worker.dashboard.incomeModal.totalLabel': 'Tổng thu nhập đến nay',
  'worker.dashboard.incomeModal.completedCount':
    'Từ {count} ca đã hoàn thành và đã thanh toán.',
  'worker.dashboard.incomeModal.recentTitle': 'Ca gần đây nhất',
  'worker.dashboard.incomeModal.empty':
    'Bạn chưa có thu nhập nào. Hoàn thành ca làm đầu tiên để xem chi tiết.',
  'worker.dashboard.incomeModal.disclaimer':
    'Thu nhập được tính từ các ca đã hoàn thành và đã thanh toán trong bản MVP. Mọi giao dịch đều giả lập.',
  'worker.dashboard.completedModal.totalLabel': 'Tổng số ca đã hoàn thành',
  'worker.dashboard.completedModal.recentTitle':
    'Hiển thị {shown} ca gần nhất trong tổng số {total} ca đã hoàn thành',
  'worker.dashboard.completedModal.empty':
    'Bạn chưa hoàn thành ca nào. Bấm "Tìm ca làm" để bắt đầu.',
  'worker.dashboard.completedModal.confirmedBadge': 'Đã xác nhận',
  'worker.dashboard.completedModal.noRating': 'Chưa có đánh giá',
  'worker.dashboard.completedModal.legacyNote':
    'Còn {count} ca cũ hơn không có dữ liệu chi tiết trong bản MVP.',

  // Phase 9H + 9I - richer worker stat-card detail modals.
  'worker.dashboard.reputationModal.currentLabel': 'Điểm uy tín hiện tại',
  'worker.dashboard.reputationModal.bandGood':
    'Điểm tốt - bạn được ưu tiên xét duyệt và mở rộng hạn mức huỷ ca.',
  'worker.dashboard.reputationModal.bandWarn':
    'Điểm trung bình - vẫn ứng tuyển được, nhưng hãy giữ phong độ để tăng điểm.',
  'worker.dashboard.reputationModal.bandBad':
    'Điểm thấp - hiện tại bạn tạm thời không thể ứng tuyển ca mới (cần ≥ 50).',
  'worker.dashboard.reputationModal.completedLabel': 'Ca đã hoàn thành',
  'worker.dashboard.reputationModal.ratingsLabel': 'Đánh giá đã nhận',
  'worker.dashboard.reputationModal.recentTitle': 'Lịch sử cộng/trừ điểm gần đây',
  'worker.dashboard.reputationModal.timelineNote':
    'Dữ liệu mô phỏng trong MVP. Trong hệ thống thật, điểm uy tín tự động cập nhật từ điểm danh, đánh giá, huỷ ca và tranh chấp.',
  'worker.dashboard.reputationModal.noHistory':
    'Chưa có sự kiện nào ảnh hưởng đến điểm uy tín. Hoàn thành ca để cộng +5 điểm cho mỗi ca.',
  'worker.dashboard.reputationModal.eventCompleted':
    '+5 Hoàn thành ca đúng cam kết',
  'worker.dashboard.reputationModal.eventLateCancel':
    '−10 Huỷ ca trong vòng 24 giờ',
  'worker.dashboard.reputationModal.eventNoShow':
    '−20 Vắng mặt không báo trước (×{count})',
  'worker.dashboard.reputationModal.eventAdminAdjust':
    'Quản trị viên điều chỉnh điểm: {old} → {new}',
  'worker.dashboard.reputationModal.eventAdminBy': 'Điều chỉnh bởi quản trị viên',
  'worker.dashboard.reputationModal.adminBadge': 'Admin',
  'worker.dashboard.reputationModal.baseLabel': 'Điểm khởi tạo (MVP)',
  'worker.dashboard.reputationModal.baseSublabel':
    'Mọi người lao động bắt đầu với 100 điểm, sau đó cộng/trừ theo sự kiện.',
  'worker.dashboard.reputationModal.lateCancel': 'Huỷ trễ',
  'worker.dashboard.reputationModal.onTimeCancel': 'Huỷ đúng hạn',
  'worker.dashboard.quotaModal.recentTitle': 'Lịch sử huỷ gần đây',
  'worker.dashboard.quotaModal.empty':
    'Bạn chưa huỷ ca nào trong khoảng thời gian gần đây.',
  'worker.dashboard.quotaModal.unknownShift': 'Ca làm (không còn dữ liệu)',
  'worker.dashboard.stats.completedShifts': 'Ca đã hoàn thành',
  'worker.dashboard.stats.totalEarnings': 'Tổng thu nhập',
  'worker.dashboard.stats.reputationScore': 'Điểm uy tín',
  'worker.dashboard.stats.avgRating': 'Đánh giá trung bình',
  'worker.dashboard.upcomingShifts': 'Ca làm sắp tới',
  'worker.dashboard.appliedShifts': 'Đơn đã ứng tuyển',
  'worker.dashboard.noUpcomingShifts': 'Bạn chưa có ca làm nào sắp tới.',
  'worker.dashboard.noUpcomingShifts.hint':
    'Tìm ca làm phù hợp với lịch của bạn và ứng tuyển trực tiếp trên trang.',
  'worker.dashboard.noApplications': 'Bạn chưa ứng tuyển ca làm nào.',
  'worker.dashboard.noApplications.hint':
    'Khi bạn ứng tuyển một ca, đơn của bạn sẽ hiển thị ở đây trong khi chờ duyệt.',
  'worker.dashboard.restricted':
    'Tài khoản bị hạn chế do điểm uy tín dưới 50. Hãy hoàn thành các ca làm để tăng điểm.',

  // -------------------------------------------------------------------------
  // Employer dashboard
  // -------------------------------------------------------------------------
  'employer.dashboard.title': 'Tổng quan nhà tuyển dụng',
  'employer.dashboard.welcome.active':
    'Bạn đang có {count} ca làm hoạt động. Theo dõi trạng thái và đơn ứng tuyển bên dưới.',
  'employer.dashboard.welcome.idle':
    'Chưa có ca làm nào hoạt động. Đăng ca mới để bắt đầu nhận đơn ứng tuyển.',
  'employer.dashboard.stats.postedShifts': 'Ca đã đăng',
  'employer.dashboard.stats.activeShifts': 'Ca đang hoạt động',
  'employer.dashboard.stats.completedShifts': 'Ca đã hoàn thành',
  'employer.dashboard.stats.totalDeposited': 'TỔNG TIỀN CÔNG CHỜ THANH TOÁN',
  'employer.dashboard.stats.totalPaidOut': 'TỔNG TIỀN CÔNG ĐÃ THANH TOÁN',
  'employer.dashboard.stats.avgRating': 'Đánh giá trung bình đã cho',
  'employer.dashboard.stats.boostCredits': 'Lượt boost còn lại',
  'employer.dashboard.upcomingShifts': 'Ca làm sắp tới',
  'employer.dashboard.noShifts': 'Bạn chưa đăng ca làm nào.',
  'employer.dashboard.noShifts.hint':
    'Đăng ca mới chỉ mất vài phút. Hệ thống sẽ tự động giữ khoản đảm bảo thanh toán và xử lý đơn ứng tuyển.',
  'employer.dashboard.applicants': 'Đơn chờ duyệt',
  'employer.dashboard.pendingApps': 'Đơn ứng tuyển chờ duyệt ({count})',

  'employer.payments.title': 'Tóm tắt thanh toán',
  'employer.payments.intro':
    'Tóm tắt khoản đảm bảo thanh toán và đã thanh toán cho các ca làm của bạn.',
  'employer.payments.disclaimer':
    'Tất cả thanh toán trong MVP đều giả lập. Không có giao dịch thật xảy ra.',
  'employer.payments.recentTitle': 'Ca đã thanh toán gần đây',
  'employer.payments.empty':
    'Chưa có ca nào hoàn thành. Khi worker hoàn thành ca, khoản đảm bảo thanh toán sẽ chuyển sang đã thanh toán.',

  // Phase 9H - employer stat-tile detail modals.
  'employer.detail.positionsLabel': 'vị trí đã duyệt',
  'employer.detail.truncated':
    'Đang hiển thị 12 ca gần nhất. Còn {count} ca cũ hơn - xem trong lịch.',
  'employer.detail.posted.title': 'Tất cả ca đã đăng',
  'employer.detail.posted.intro':
    'Toàn bộ ca làm bạn đã đăng, gồm cả nháp, đã đăng, đã đầy, đã hoàn thành và đã huỷ.',
  'employer.detail.posted.empty':
    'Bạn chưa đăng ca nào. Bấm "Đăng ca mới" để bắt đầu.',
  'employer.detail.active.title': 'Ca đang hoạt động',
  'employer.detail.active.intro':
    'Ca đang nhận ứng tuyển hoặc đang trong tiến độ thực hiện.',
  'employer.detail.active.empty':
    'Hiện không có ca nào đang hoạt động.',
  'employer.detail.completed.title': 'Ca đã hoàn thành',
  'employer.detail.completed.intro':
    'Ca đã được người lao động hoàn thành và bạn đã xác nhận thanh toán.',
  'employer.detail.completed.empty':
    'Bạn chưa có ca nào hoàn thành.',
  'employer.detail.pending.title': 'Đơn ứng tuyển chờ duyệt',
  'employer.detail.pending.intro':
    'Người lao động đã gửi đơn và đang chờ bạn duyệt hoặc từ chối.',
  'employer.detail.pending.empty':
    'Hiện không có đơn nào chờ duyệt.',
  'employer.detail.pending.repBadge': 'Uy tín {score}/100',
  'employer.detail.pending.completedShifts':
    '{count} ca đã hoàn thành',
  'employer.applicant.viewProfile': 'Xem hồ sơ',
  'employer.applicant.fullProfile': 'Hồ sơ người lao động',
  'employer.applicant.completedShifts': 'Ca hoàn thành',
  'employer.applicant.avgRating': 'Điểm đánh giá',
  'employer.applicant.noShows': 'Vắng mặt',
  'employer.applicant.cancellations': 'Lần huỷ',
  'employer.applicant.skills': 'Kỹ năng',
  'employer.applicant.preferredJobs': 'Loại công việc ưa thích',
  'employer.applicant.preferredLocations': 'Khu vực ưa thích',
  'employer.applicant.ratingHistory': 'Lịch sử đánh giá',
  'employer.applicant.bio': 'Giới thiệu',
  'employer.applicant.noBio': 'Người lao động chưa thêm giới thiệu.',

  // -------------------------------------------------------------------------
  // Admin dashboard
  // -------------------------------------------------------------------------
  'admin.dashboard.title': 'Tổng quan quản trị',
  'admin.dashboard.eyebrow': 'Tổng quan admin',
  'admin.dashboard.subtitle':
    'Theo dõi người dùng, ca làm, tranh chấp và các điều chỉnh thủ công. Override chỉ dùng khi cần xử lý ngoại lệ.',
  'admin.dashboard.badge': 'Chế độ admin',
  'admin.dashboard.tabs.users': 'Người dùng',
  'admin.dashboard.tabs.shifts': 'Ca làm',
  'admin.dashboard.tabs.disputes': 'Tranh chấp',
  'admin.dashboard.tabs.verifications': 'Xác minh',
  'admin.dashboard.tabs.analytics': 'Thống kê',
  'admin.analytics.totalEmployers': 'Tổng nhà tuyển dụng',
  'admin.analytics.totalWorkers': 'Tổng người lao động',
  'admin.analytics.totalShifts': 'Tổng ca đã đăng',
  'admin.analytics.completedShifts': 'Ca đã hoàn thành',
  'admin.analytics.activeDisputes': 'Tranh chấp đang mở',

  // -------------------------------------------------------------------------
  // Shift listing / detail
  // -------------------------------------------------------------------------
  'shifts.listing.title': 'Tìm ca làm',
  'shifts.listing.eyebrow': 'Khám phá ca làm',
  'shifts.listing.subtitle':
    'Tìm ca làm ngắn hạn phù hợp với lịch của bạn. Hệ thống chỉ hiển thị ca đã được nhà tuyển dụng đảm bảo thanh toán.',
  'shifts.listing.matchSuffix': 'ca phù hợp',
  'shifts.listing.empty': 'Không tìm thấy ca làm phù hợp.',
  'shifts.listing.emptyHint': 'Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm.',
  'shifts.detail.employer': 'Nhà tuyển dụng',
  'shifts.detail.positions': 'Số lượng cần',
  'shifts.detail.positionsFilled': 'Đã có người',
  'shifts.detail.positionsLeft': 'Còn trống',
  'shifts.detail.wage': 'Lương theo giờ',
  'shifts.detail.depositStatus': 'Trạng thái đảm bảo thanh toán',
  'shifts.detail.oldNotificationNote':
    'Thông báo này liên quan đến một ca đã kết thúc/hết hạn. Trạng thái hiển thị là trạng thái hiện tại của ca.',
  'shifts.detail.requirements': 'Yêu cầu',
  'shifts.detail.fullyBooked': 'Ca này đã đủ người.',
  'shifts.detail.notPublished': 'Ca làm này chưa được đăng công khai.',
  'shifts.deposit.title': 'Đảm bảo thanh toán trước',
  'shifts.new.subtitle':
    'Hoàn thành thông tin ca làm. Hệ thống sẽ tự động tính khoản đảm bảo thanh toán dựa trên độ uy tín nhà tuyển dụng.',
  'shifts.deposit.amount': 'Số dư tuyển dụng cần đảm bảo',
  'shifts.deposit.description':
    'Nhà tuyển dụng cần thanh toán trước toàn bộ tiền công vào ví doanh nghiệp trước khi ca được đăng công khai.',
  'shifts.deposit.success': 'Đảm bảo thanh toán thành công! Ca làm đã được đăng.',

  // -------------------------------------------------------------------------
  // Reputation
  // -------------------------------------------------------------------------
  'reputation.title': 'Điểm uy tín',
  'reputation.score': 'Điểm hiện tại',
  'reputation.rules.title': 'Quy tắc tính điểm',
  'reputation.rules.completed': '+5 điểm khi hoàn thành ca làm được xác nhận.',
  'reputation.rules.noShow': '-20 điểm khi vắng mặt không báo trước.',
  'reputation.rules.lateCancel': '-10 điểm khi huỷ ca trong vòng 24 giờ trước giờ bắt đầu.',
  'reputation.rules.adminAdjust': 'Quản trị viên có thể điều chỉnh điểm với lý do cụ thể.',
  'reputation.restricted.title': 'Tài khoản bị hạn chế',
  'reputation.restricted.desc':
    'Điểm uy tín của bạn dưới 50. Bạn không thể ứng tuyển ca mới cho đến khi điểm tăng lên.',
  'reputation.noRatings': 'Chưa có đánh giá nào.',
  'rating.submitted': 'Đã gửi đánh giá thành công.',

  // -------------------------------------------------------------------------
  // Common UI messages
  // -------------------------------------------------------------------------
  'common.loading': 'Đang tải...',
  'common.saving': 'Đang lưu...',
  'common.success': 'Thành công!',
  'common.error': 'Đã có lỗi xảy ra.',
  'common.confirm': 'Xác nhận',
  'common.cancel': 'Huỷ',
  'common.yes': 'Có',
  'common.no': 'Không',
  'common.notFound': 'Không tìm thấy.',
  'common.noData': 'Chưa có dữ liệu.',
  'common.seeAll': 'Xem tất cả',
  'common.readMore': 'Xem thêm',
  'common.required': '(bắt buộc)',
  'common.optional': '(tuỳ chọn)',
  'common.currency': 'đ',
  'common.perHour': '/giờ',
  'common.hours': 'giờ',
  'common.positions': 'người',
  'common.stars': 'sao',
  'common.reviews': 'đánh giá',
  'common.sessionExpired': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'common.suspended': 'Tài khoản đã bị tạm khoá.',
  'common.restoredSeedData': 'Đã khôi phục dữ liệu mẫu.',
  'common.pageNotFound': 'Trang không tồn tại.',
  'common.backToHome': 'Về trang chủ',

  // -------------------------------------------------------------------------
  // Help guides (Phase 9F)
  // -------------------------------------------------------------------------
  'help.btn.label': 'Hướng dẫn sử dụng',
  'help.btn.aria': 'Mở hướng dẫn sử dụng trang này',
  'help.btn.close': 'Đã hiểu',

  'help.workerDashboard.title': 'Hướng dẫn - Tổng quan người lao động',
  'help.workerDashboard.intro':
    'Đây là trang tổng quan các hoạt động của bạn trên CaLẻ.',
  'help.workerDashboard.item1':
    'Bấm vào ô "Điểm uy tín" để xem chi tiết cách điểm được cộng/trừ.',
  'help.workerDashboard.item2':
    'Bấm vào ô "Hạn mức huỷ tuần" để xem hạn mức huỷ ca theo tuần và tháng.',
  'help.workerDashboard.item3':
    'Phần "Ca làm sắp tới" cho phép bạn check-in/check-out đúng giờ.',
  'help.workerDashboard.item4':
    'Đơn bị từ chối gần đây hiện kèm lý do từ nhà tuyển dụng.',

  'help.workerSchedule.title': 'Hướng dẫn - Lịch cá nhân',
  'help.workerSchedule.intro':
    'Đánh dấu thời gian bận để hệ thống không cho ứng tuyển trùng giờ.',
  'help.workerSchedule.item1':
    'Bấm vào ô trống trong tuần/ngày để thêm khung giờ bận.',
  'help.workerSchedule.item2':
    'Ca làm đã được duyệt cũng tự động tính là thời gian bận.',
  'help.workerSchedule.item3':
    'Bạn không thể tạo lịch cá nhân trùng giờ với ca đã được duyệt.',
  'help.workerSchedule.item4':
    'Bấm vào ô lịch hiện có để chỉnh sửa hoặc xoá.',

  'help.employerDashboard.title': 'Hướng dẫn - Tổng quan nhà tuyển dụng',
  'help.employerDashboard.intro':
    'Theo dõi ca làm, đơn ứng tuyển và thanh toán giả lập của bạn.',
  'help.employerDashboard.item1':
    'Bấm "Đăng ca mới" để tạo ca và đảm bảo thanh toán theo mức tin cậy.',
  'help.employerDashboard.item2':
    'Các ô số liệu có thể bấm để cuộn nhanh đến phần tương ứng.',
  'help.employerDashboard.item3':
    'Đơn ứng tuyển chờ duyệt nằm dưới phần "Ca đang hoạt động".',
  'help.employerDashboard.item4':
    'Bấm "Xem lịch tuyển dụng" để xem lịch ca theo tuần.',

  'help.employerSchedule.title': 'Hướng dẫn - Lịch tuyển dụng',
  'help.employerSchedule.intro':
    'Xem các ca làm bạn đã đăng theo dạng lịch tuần / ngày / agenda.',
  'help.employerSchedule.item1':
    'Bấm vào ca trên lịch để vào trang quản lý chi tiết.',
  'help.employerSchedule.item2':
    'Trạng thái ca tự cập nhật theo thời gian, khoản đảm bảo thanh toán và đơn ứng tuyển.',
  'help.employerSchedule.item3':
    'Bấm "Tuỳ chỉnh khung giờ" để mở rộng dải giờ hiển thị.',

  'help.shiftCreate.title': 'Hướng dẫn - Đăng ca mới',
  'help.shiftCreate.intro':
    'Hoàn thành thông tin ca làm và mô phỏng đảm bảo thanh toán theo mức tin cậy.',
  'help.shiftCreate.item1':
    'Lương theo giờ nhập số nguyên - hệ thống tự đọc thành chữ Việt.',
  'help.shiftCreate.item2':
    'Mọi nhà tuyển dụng đều thanh toán trước 100% tổng tiền công. Cấp độ tin cậy ảnh hưởng đến độ ưu tiên hiển thị và phí dịch vụ trong tương lai, không ảnh hưởng đến tỷ lệ đảm bảo thanh toán.',
  'help.shiftCreate.item3':
    'Bấm "Xác nhận đã thanh toán" để hoàn tất đảm bảo thanh toán - không có giao dịch thật.',
  'help.shiftCreate.item4':
    'Sau khi hoàn tất đảm bảo thanh toán, ca sẽ chuyển sang trạng thái "Đã đăng" công khai.',

  'help.adminDashboard.title': 'Hướng dẫn - Tổng quan quản trị',
  'help.adminDashboard.intro':
    'Theo dõi người dùng, ca làm, tranh chấp và override khẩn cấp.',
  'help.adminDashboard.item1':
    'Bấm vào ô số liệu để chuyển nhanh sang tab tương ứng.',
  'help.adminDashboard.item2':
    'Override escrow chỉ dùng khi cần xử lý ngoại lệ - đã có ghi chú.',
  'help.adminDashboard.item3':
    'Điểm uy tín có thể điều chỉnh trực tiếp trong tab Người dùng.',
  'help.adminDashboard.item4':
    'Trạng thái ca tự cập nhật - thời điểm cuối hiển thị trên tab Ca làm.',

  // -------------------------------------------------------------------------
  // Phase 9Y - richer help content + /user-guide CTA on every dashboard.
  //
  // Pattern: `help.<surface>.section.<sectionKey>.heading` and
  // `help.<surface>.section.<sectionKey>.itemN`. Five surfaces upgraded
  // (worker dashboard, worker schedule, employer dashboard, employer
  // schedule, admin dashboard). The lighter flat-`item1..item4` keys
  // above are preserved for `/employer/shifts/new` and any other future
  // single-purpose surface that doesn't need grouped sections.
  // -------------------------------------------------------------------------
  'help.viewFullGuide': 'Xem hướng dẫn chi tiết',

  // Worker dashboard sections
  'help.workerDashboard.section.purpose.heading': 'Trang này dùng để',
  'help.workerDashboard.section.purpose.item1':
    'Trang Tổng quan hiển thị toàn bộ hoạt động của bạn - ca sắp tới, đơn ứng tuyển, điểm uy tín, hạn mức huỷ và thông báo.',
  'help.workerDashboard.section.numbers.heading': 'Các con số / trạng thái quan trọng',
  'help.workerDashboard.section.numbers.item1':
    'Điểm uy tín 0–100. Bắt đầu 100. Mỗi ca hoàn thành +5. Vắng mặt không báo trước −20. Huỷ trong 24 giờ −10. Dưới 50 bị hạn chế ứng tuyển.',
  'help.workerDashboard.section.numbers.item2':
    'Hạn mức huỷ tuần: 3 lượt mặc định. Đạt điểm uy tín cao thì được nâng (4–5 lượt/tuần).',
  'help.workerDashboard.section.numbers.item3':
    'Tổng thu nhập: tổng tiền của các ca đã hoàn thành và đã thanh toán (mô phỏng MVP).',
  'help.workerDashboard.section.numbers.item4':
    'Ca đã hoàn thành: số ca có trạng thái "Đã xác nhận".',
  'help.workerDashboard.section.actions.heading': 'Thao tác chính',
  'help.workerDashboard.section.actions.item1':
    'Bấm ô "Điểm uy tín" để xem dòng thời gian cộng/trừ điểm và lịch sử quản trị viên điều chỉnh (nếu có).',
  'help.workerDashboard.section.actions.item2':
    'Bấm ô "Hạn mức huỷ tuần" để xem mức sử dụng trong 7 ngày và 30 ngày kèm điểm uy tín hiện tại.',
  'help.workerDashboard.section.actions.item3':
    'Trong "Ca làm sắp tới", đến giờ ca thì bấm "Check-in", kết thúc ca bấm "Check-out".',
  'help.workerDashboard.section.actions.item4':
    'Đơn bị từ chối gần đây hiện kèm lý do - đọc kỹ trước khi ứng tuyển ca mới.',
  'help.workerDashboard.section.mistakes.heading': 'Lỗi thường gặp',
  'help.workerDashboard.section.mistakes.item1':
    'Không thể ứng tuyển nếu chưa xác minh số điện thoại - vào Hồ sơ để bật xác minh.',
  'help.workerDashboard.section.mistakes.item2':
    'Không thể ứng tuyển ca trùng lịch cá nhân hoặc trùng ca đã duyệt - kiểm tra Lịch cá nhân trước.',
  'help.workerDashboard.section.mistakes.item3':
    'Huỷ ca trong vòng 3 giờ phải được nhà tuyển dụng duyệt - đơn vẫn giữ chỗ cho tới lúc đó.',

  // Worker schedule sections
  'help.workerSchedule.section.purpose.heading': 'Trang này dùng để',
  'help.workerSchedule.section.purpose.item1':
    'Đánh dấu thời gian bận để tránh ứng tuyển trùng giờ. Có thể là giờ học, ca làm khác, hoặc việc cá nhân.',
  'help.workerSchedule.section.numbers.heading': 'Các con số / trạng thái quan trọng',
  'help.workerSchedule.section.numbers.item1':
    'Mỗi khung bận có ngày + giờ bắt đầu + giờ kết thúc. Hệ thống không cho ứng tuyển ca trùng giờ với khung bận trong cùng ngày.',
  'help.workerSchedule.section.numbers.item2':
    'Ca làm đã được duyệt cũng tự động tính là khung bận.',
  'help.workerSchedule.section.actions.heading': 'Thao tác chính',
  'help.workerSchedule.section.actions.item1':
    'Bấm vào ô trống trong tuần/ngày để thêm khung bận với giờ tự điền.',
  'help.workerSchedule.section.actions.item2':
    'Bấm vào khung bận hiện có để chỉnh sửa hoặc xoá.',
  'help.workerSchedule.section.actions.item3':
    'Bấm "Tuỳ chỉnh khung giờ" để thay đổi dải giờ hiển thị (mặc định 07:00–21:00, 120 phút/slot).',
  'help.workerSchedule.section.mistakes.heading': 'Lỗi thường gặp',
  'help.workerSchedule.section.mistakes.item1':
    'Không thể tạo khung bận trùng giờ với ca đã được duyệt - sẽ báo lỗi.',
  'help.workerSchedule.section.mistakes.item2':
    'Ngày phải nhập theo dd/mm/yyyy. Giờ phải nhập 24 giờ HH:mm.',

  // Employer dashboard sections
  'help.employerDashboard.section.purpose.heading': 'Trang này dùng để',
  'help.employerDashboard.section.purpose.item1':
    'Trang Tổng quan hiển thị toàn bộ ca bạn đã đăng - ca đang tuyển, đơn chờ duyệt, ca đã hoàn thành và thanh toán giả lập.',
  'help.employerDashboard.section.numbers.heading': 'Các con số / trạng thái quan trọng',
  'help.employerDashboard.section.numbers.item1':
    'Ca đang hoạt động: ca có trạng thái "Đang tuyển", "Đã đủ người", "Đang diễn ra", "Chờ xác nhận".',
  'help.employerDashboard.section.numbers.item2':
    'Đơn chờ duyệt: số đơn ứng tuyển ở trạng thái "Chờ duyệt" trên các ca của bạn.',
  'help.employerDashboard.section.numbers.item3':
    'Tổng đã đảm bảo thanh toán / đã thanh toán: tổng khoản đảm bảo thanh toán và tổng tiền đã giải ngân (mô phỏng MVP).',
  'help.employerDashboard.section.numbers.item4':
    'Lượt boost: 1 lượt được tặng mỗi khi đánh dấu vắng mặt; dùng để đẩy ca lên đầu danh sách.',
  'help.employerDashboard.section.actions.heading': 'Thao tác chính',
  'help.employerDashboard.section.actions.item1':
    'Bấm "Đăng ca mới" để tạo ca và mô phỏng đảm bảo thanh toán.',
  'help.employerDashboard.section.actions.item2':
    'Bấm vào ô số liệu để xem danh sách chi tiết tương ứng (ca đã đăng / đơn chờ duyệt / thanh toán).',
  'help.employerDashboard.section.actions.item3':
    'Trong "Đơn chờ duyệt", bấm vào người lao động để xem hồ sơ trước khi duyệt.',
  'help.employerDashboard.section.actions.item4':
    'Bấm "Xem lịch tuyển dụng" để xem các ca theo tuần.',
  'help.employerDashboard.section.mistakes.heading': 'Lỗi thường gặp',
  'help.employerDashboard.section.mistakes.item1':
    'Ca chỉ công khai sau khi bấm "Xác nhận đã thanh toán" (đảm bảo thanh toán trước) - trước đó ca ở trạng thái "Bản nháp".',
  'help.employerDashboard.section.mistakes.item2':
    'Từ chối đơn bắt buộc nhập lý do - người lao động sẽ thấy lý do trên Tổng quan của họ.',
  'help.employerDashboard.section.mistakes.item3':
    'Không thể huỷ ca trong vòng 6 giờ trước giờ bắt đầu nếu đã có người ứng tuyển hoặc được duyệt.',

  // Employer schedule sections
  'help.employerSchedule.section.purpose.heading': 'Trang này dùng để',
  'help.employerSchedule.section.purpose.item1':
    'Xem các ca đã đăng theo tuần để dễ theo dõi lịch tuyển dụng.',
  'help.employerSchedule.section.numbers.heading': 'Các con số / trạng thái quan trọng',
  'help.employerSchedule.section.numbers.item1':
    'Mỗi ca trên lịch có chip màu theo trạng thái: xanh (Đang tuyển), vàng (Đã đủ người / Chờ xác nhận), xanh lá (Đã hoàn thành), đỏ gạch (Đã huỷ / Hết hạn).',
  'help.employerSchedule.section.numbers.item2':
    'Số người trên chip hiển thị filled/total - ví dụ 2/3 nghĩa là đã có 2 trong 3 vị trí.',
  'help.employerSchedule.section.actions.heading': 'Thao tác chính',
  'help.employerSchedule.section.actions.item1':
    'Bấm vào ca trên lịch để vào trang quản lý chi tiết.',
  'help.employerSchedule.section.actions.item2':
    'Bấm "◀ Tuần trước" / "Tuần sau ▶" để di chuyển. "Tuần này" đưa về tuần hiện tại.',
  'help.employerSchedule.section.actions.item3':
    'Bấm "Tuỳ chỉnh khung giờ" để thay đổi dải giờ hiển thị.',
  'help.employerSchedule.section.mistakes.heading': 'Lỗi thường gặp',
  'help.employerSchedule.section.mistakes.item1':
    'Trạng thái ca tự cập nhật theo thời gian thật - không cần thao tác thủ công ở đây.',

  // Admin dashboard sections
  'help.adminDashboard.section.purpose.heading': 'Trang này dùng để',
  'help.adminDashboard.section.purpose.item1':
    'Trang quản trị toàn hệ thống - theo dõi người dùng, ca làm, tranh chấp và xử lý ngoại lệ.',
  'help.adminDashboard.section.numbers.heading': 'Các con số / trạng thái quan trọng',
  'help.adminDashboard.section.numbers.item1':
    'Tổng người lao động / nhà tuyển dụng / ca: số liệu cộng dồn từ toàn bộ dữ liệu hệ thống.',
  'help.adminDashboard.section.numbers.item2':
    'Ca tranh chấp: ca có "Trạng thái thanh toán" = "Đang tranh chấp".',
  'help.adminDashboard.section.numbers.item3':
    'Tranh chấp đang mở: số tranh chấp ở trạng thái "Đang xem xét".',
  'help.adminDashboard.section.actions.heading': 'Thao tác chính',
  'help.adminDashboard.section.actions.item1':
    'Bấm vào ô số liệu để chuyển nhanh sang tab tương ứng (ví dụ "Workers" → tab Người dùng đã lọc sẵn).',
  'help.adminDashboard.section.actions.item2':
    'Trong tab "Người dùng" bấm "Điều chỉnh điểm uy tín" để gán điểm 0–100 với lý do.',
  'help.adminDashboard.section.actions.item3':
    'Trong tab "Ca làm" bấm "Override (khẩn cấp)" để thay đổi trạng thái thanh toán khi xử lý ngoại lệ.',
  'help.adminDashboard.section.actions.item4':
    'Trong tab "Tranh chấp" bấm "Giải quyết" để chọn "Thanh toán" hoặc "Hoàn tiền" theo hồ sơ.',
  'help.adminDashboard.section.mistakes.heading': 'Lỗi thường gặp',
  'help.adminDashboard.section.mistakes.item1':
    'Override khẩn cấp chỉ dùng khi cần thiết - luôn ghi rõ lý do, đã có nhật ký.',
  'help.adminDashboard.section.mistakes.item2':
    'Không thể tự khoá tài khoản admin của chính bạn.',
  'help.adminDashboard.section.mistakes.item3':
    'Không thể khoá quản trị viên cuối cùng đang hoạt động.',

  // -------------------------------------------------------------------------
  // Phase 9Y - empty-state copy upgrades + HelpHint hint strings
  // -------------------------------------------------------------------------
  // Worker dashboard empty states
  'worker.dashboard.empty.applications.title':
    'Bạn chưa ứng tuyển ca nào.',
  'worker.dashboard.empty.applications.description':
    'Khi bạn ứng tuyển một ca, đơn của bạn sẽ hiển thị ở đây trong khi chờ nhà tuyển dụng duyệt.',
  'worker.dashboard.empty.applications.cta': 'Khám phá ca làm',
  'worker.dashboard.empty.completed.title':
    'Bạn chưa có ca hoàn thành nào.',
  'worker.dashboard.empty.completed.description':
    'Hoàn thành ca đầu tiên để xem chi tiết tại đây.',
  'worker.dashboard.empty.completed.cta': 'Tìm ca làm',
  'worker.dashboard.empty.income.title': 'Bạn chưa có thu nhập.',
  'worker.dashboard.empty.income.description':
    'Hoàn thành các ca làm và đợi nhà tuyển dụng xác nhận để nhận thanh toán (giả lập trong MVP).',
  'worker.dashboard.empty.income.cta': 'Tìm ca làm ngay',
  'worker.dashboard.empty.upcoming.descriptionRich':
    'Vào "Tìm ca làm" để xem các ca đang tuyển và ứng tuyển ca đầu tiên. Hệ thống chỉ hiện các ca đã được nhà tuyển dụng đảm bảo thanh toán.',

  // Employer dashboard empty states
  'employer.dashboard.empty.upcoming.descriptionRich':
    'Bấm "Đăng ca mới" để tạo ca và mô phỏng đảm bảo thanh toán. Ca chỉ công khai sau khi đảm bảo thanh toán thành công.',
  'employer.dashboard.empty.pending.title':
    'Chưa có đơn ứng tuyển nào chờ duyệt.',
  'employer.dashboard.empty.pending.description':
    'Đơn ứng tuyển mới sẽ hiển thị ở đây. Bạn có thể kiểm tra mô tả ca, lương, thời gian để thu hút thêm ứng viên.',
  'employer.dashboard.empty.pending.cta': 'Đăng ca mới',

  // Employer manage shift empty state
  'employer.manageShift.empty.applicants.title':
    'Chưa có ai ứng tuyển ca này.',
  'employer.manageShift.empty.applicants.description':
    'Hãy kiểm tra tiêu đề, mô tả, lương và yêu cầu - ca rõ ràng và mức lương cạnh tranh thường nhận đơn nhanh hơn.',

  // HelpPopover descriptions - Phase 9Y-Fix-3.
  // Now rendered inside each stat detail modal's title slot, not on
  // the dashboard tile. Wording trimmed to the canonical phrasing
  // requested by the Phase 9Y-Fix-3 spec.
  'hint.worker.reputation':
    'Điểm phản ánh độ tin cậy của bạn dựa trên lịch sử nhận ca, hoàn thành ca và huỷ ca.',
  'hint.worker.cancelQuota':
    'Số lần bạn còn có thể huỷ ca trong tuần theo quy định điểm uy tín.',
  'hint.worker.totalEarnings':
    'Tổng tiền công từ các ca đã hoàn thành và được xác nhận thanh toán.',
  'hint.worker.completedShifts':
    'Số ca bạn đã hoàn thành và được xác nhận trên hệ thống.',

  // Employer stat modal descriptions
  'hint.employer.activeShifts':
    'Các ca đã đăng, đã đảm bảo thanh toán và đang trong quá trình tuyển hoặc làm việc.',
  'hint.employer.postedShifts':
    'Tổng số ca bạn đã tạo trên hệ thống, gồm cả nháp, đang tuyển, đã đầy, đã hoàn thành và đã huỷ.',
  'hint.employer.completedShifts':
    'Ca đã được xác nhận hoàn thành sau khi người lao động check-in/check-out và bạn xác nhận.',
  'hint.employer.totalDeposited':
    'Tổng tiền công của các ca đã hoàn thành hoặc đang chờ doanh nghiệp xác nhận thanh toán.',
  'hint.employer.totalPaidOut':
    'Tổng tiền công đã được doanh nghiệp xác nhận là đã thanh toán cho người lao động.',
  'hint.employer.pendingApps':
    'Số đơn ứng tuyển đang chờ bạn duyệt hoặc từ chối.',

  // HelpPopover descriptions - employer manage shift applicant statuses
  'hint.employer.statusApproved':
    'Bạn đã chấp nhận ứng viên này. Họ sẽ check-in khi đến giờ ca.',
  'hint.employer.statusCompleted':
    'Bạn đã xác nhận ứng viên hoàn thành ca này. Tiền công đã được giải ngân (mô phỏng).',

  // HelpPopover description - admin override button
  'hint.admin.override':
    'Chỉ dùng khi cần xử lý ngoại lệ. Thao tác này có thể ảnh hưởng trực tiếp đến trạng thái ca hoặc người dùng. Mọi lần override đều được ghi vào nhật ký.',

  // -------------------------------------------------------------------------
  // Phase 6 - employer types
  // -------------------------------------------------------------------------
  'employerType.individual': 'Cá nhân / Freelance',
  'employerType.business': 'Doanh nghiệp',
  'employerType.individual.hint':
    'Nhà tuyển dụng cá nhân, không yêu cầu giấy phép kinh doanh.',
  'employerType.business.hint':
    'Doanh nghiệp đăng ký, có thể được xác minh để tăng độ uy tín.',

  // -------------------------------------------------------------------------
  // Phase 6 - deposit ratio explainer
  //
  // Phase 10C-Stab-1 Batch 3: every employer deposits 100% tiền công.
  // Trust tier still matters for visibility / priority / fees in future.
  // -------------------------------------------------------------------------
  'deposit.trust.title': 'Đảm bảo thanh toán 100% tiền công',
  'deposit.trust.low':
    'Độ uy tín: Thấp. Nhà tuyển dụng mới hoặc chưa xác minh. Đảm bảo thanh toán 100% tiền công; cấp độ tin cậy vẫn ảnh hưởng đến độ ưu tiên hiển thị và phí dịch vụ.',
  'deposit.trust.medium':
    'Độ uy tín: Trung bình. Đã xác minh hoặc đã hoàn thành ít nhất 3 ca. Đảm bảo thanh toán 100% tiền công; cấp độ tin cậy ảnh hưởng đến độ ưu tiên hiển thị và phí dịch vụ.',
  'deposit.trust.high':
    'Độ uy tín: Cao. Đã xác minh và hoàn thành ít nhất 5 ca. Đảm bảo thanh toán 100% tiền công; cấp độ tin cậy ảnh hưởng đến độ ưu tiên hiển thị và phí dịch vụ.',
  'deposit.trust.label.low': 'Thấp',
  'deposit.trust.label.medium': 'Trung bình',
  'deposit.trust.label.high': 'Cao',
  'deposit.trust.ratio':
    'Bạn cần thanh toán trước 100% tổng tiền công trước khi đăng ca. Cấp độ tin cậy ảnh hưởng đến độ ưu tiên hiển thị và phí dịch vụ trong tương lai.',
  'deposit.breakdown.fullWage': 'Tổng tiền lương',
  'deposit.breakdown.trust': 'Độ uy tín',
  'deposit.breakdown.ratio': 'Tỷ lệ đảm bảo thanh toán',
  'deposit.confirmPaid': 'Mô phỏng đảm bảo thanh toán',

  // -------------------------------------------------------------------------
  // Phase 6 - rejection reason dialog
  // -------------------------------------------------------------------------
  'reject.dialog.title': 'Từ chối đơn ứng tuyển',
  'reject.dialog.intro':
    'Bạn sắp từ chối đơn ứng tuyển của {worker} cho ca "{shift}". Vui lòng cho biết lý do để người lao động hiểu rõ.',
  'reject.dialog.reasonLabel': 'Lý do từ chối',
  'reject.dialog.reasonPlaceholder':
    'Ví dụ: Không phù hợp kinh nghiệm, đã đủ người, lịch không khớp...',
  'reject.dialog.confirm': 'Xác nhận từ chối',
  'reject.error.reasonRequired': 'Vui lòng nhập lý do từ chối.',

  // -------------------------------------------------------------------------
  // Phase 6 - worker dashboard additions
  // -------------------------------------------------------------------------
  'worker.dashboard.recentlyRejected': 'Đơn bị từ chối gần đây',
  'worker.dashboard.rejectionReasonLabel': 'Lý do từ chối',
  'worker.dashboard.feedbackPending': 'Đánh giá nhà tuyển dụng',
  'worker.dashboard.feedbackBtn': 'Gửi đánh giá',
  'worker.dashboard.reputationHint.title': 'Cách cải thiện điểm uy tín',
  'worker.dashboard.reputationHint.gain':
    'Hoàn thành ca đúng cam kết giúp cải thiện điểm uy tín (+5 điểm mỗi ca).',
  'worker.dashboard.reputationHint.lose':
    'Vắng mặt hoặc huỷ sát giờ có thể làm giảm điểm (−20 hoặc −10 điểm).',

  // -------------------------------------------------------------------------
  // Phase 6 - employer feedback (worker → employer)
  // -------------------------------------------------------------------------
  'employerFeedback.title': 'Đánh giá từ người lao động',
  'employerFeedback.empty': 'Chưa có đánh giá nào từ người lao động.',
  // Phase 9I - employer trust signals + profile-page worker feedback panel.
  'employer.trust.noReviews':
    'Chưa có đánh giá nào - đây có thể là nhà tuyển dụng mới.',
  'employer.trust.viewProfile': 'Xem hồ sơ',
  'employer.profile.workerFeedback.title': 'Đánh giá từ người lao động',
  'employer.profile.workerFeedback.intro':
    'Phản hồi từ những người đã hoàn thành ca làm cho doanh nghiệp của bạn.',
  'employerFeedback.formIntro':
    'Đánh giá nhà tuyển dụng giúp cộng đồng người lao động yên tâm hơn khi ứng tuyển.',
  'employerFeedback.tagsLabel': 'Đánh giá nhanh (tuỳ chọn)',
  'employerFeedback.commentLabel': 'Nhận xét (tuỳ chọn)',
  'employerFeedback.commentPlaceholder':
    'Chia sẻ trải nghiệm làm việc với nhà tuyển dụng...',
  'employerFeedback.tag.PaidOnTime': 'Trả lương đúng cam kết',
  'employerFeedback.tag.GoodEnvironment': 'Môi trường tốt',
  'employerFeedback.tag.ClearCommunication': 'Giao tiếp rõ ràng',
  'employerFeedback.tag.AccurateDescription': 'Công việc đúng mô tả',

  // CORE-STABILITY-7 Part 6 - review sorting + report flow.
  'review.sort.newest': 'Mới nhất',
  'review.sort.oldest': 'Cũ nhất',
  'review.sort.highest': 'Điểm cao nhất',
  'review.sort.lowest': 'Điểm thấp nhất',
  'review.sort.withComment': 'Có nhận xét',
  'review.summary.count': 'đánh giá',
  'review.report.button': 'Báo cáo đánh giá',
  'review.report.underReview': 'Đang được xem xét',
  'review.report.success': 'Đã gửi báo cáo. Quản trị viên sẽ xem xét.',
  'review.report.error.reasonRequired': 'Vui lòng nhập lý do báo cáo.',
  'review.report.error.already': 'Bạn đã báo cáo đánh giá này rồi.',
  'review.report.modal.title': 'Báo cáo đánh giá',
  'review.report.modal.body':
    'Báo cáo một đánh giá không xoá đánh giá đó. Quản trị viên sẽ xem xét nội dung bạn báo cáo.',
  'review.report.modal.reasonLabel': 'Lý do báo cáo',
  'review.report.modal.reasonPlaceholder':
    'Ví dụ: Nội dung sai sự thật, xúc phạm, spam...',
  'review.report.modal.noteLabel': 'Ghi chú thêm (tuỳ chọn)',
  'review.report.modal.notePlaceholder': 'Bằng chứng hoặc giải thích thêm...',
  'review.report.modal.submit': 'Gửi báo cáo',
  // CORE-STABILITY-7 Part 6 - admin reported-reviews visibility.
  'admin.reportedReviews.title': 'Đánh giá bị báo cáo',
  'admin.reportedReviews.reason': 'Lý do',
  'admin.reportedReviews.note': 'Ghi chú',
  'admin.reportedReviews.reporter': 'Người báo cáo',
  'admin.reportedReviews.markReviewed': 'Đã xem xét',
  'admin.reportedReviews.dismiss': 'Bỏ qua',

  // -------------------------------------------------------------------------
  // Phase 7 - admin shifts panel polish
  // -------------------------------------------------------------------------
  'admin.shifts.autoNote':
    'Trạng thái ca được hệ thống tự động cập nhật theo thời gian, đặt cọc và tiến độ ứng tuyển. Override chỉ dùng khi cần xử lý ngoại lệ.',
  'admin.shifts.lastSync': 'Đồng bộ trạng thái lần cuối: {when}',
  'admin.shifts.override': 'Override (khẩn cấp)',

  // -------------------------------------------------------------------------
  // Phase 7 - employer schedule
  // -------------------------------------------------------------------------
  'employerSchedule.page.title': 'Lịch tuyển dụng',
  'employerSchedule.page.subtitle':
    'Xem các ca làm bạn đã đăng theo tuần. Bấm vào ca để vào trang quản lý.',
  'employerSchedule.empty.weekHint':
    'Không có ca làm trong tuần này. Bấm "Đăng ca cần tuyển" để thêm ca mới.',
  'employer.dashboard.viewSchedule': 'Xem lịch tuyển dụng',

  // -------------------------------------------------------------------------
  // Phase 8 - calendar shell (worker + employer)
  // -------------------------------------------------------------------------
  'calendar.view.day': 'Ngày',
  'calendar.view.week': 'Tuần',
  'calendar.view.agenda': 'Agenda',
  'calendar.today': 'Hôm nay',
  'calendar.prev': 'Trước',
  'calendar.next': 'Sau',
  'calendar.miniMonth.aria.prev': 'Tháng trước',
  'calendar.miniMonth.aria.next': 'Tháng sau',
  'calendar.legend.title': 'Chú giải',
  'calendar.legend.worker.personalBusy': 'Lịch bận',
  'calendar.legend.worker.availableSlot': 'Lịch rảnh',
  'calendar.legend.worker.approvedShift': 'Ca đã duyệt / đang làm',
  'calendar.legend.worker.pendingShift': 'Ca đang chờ duyệt',
  'calendar.legend.employer.published': 'Đã đăng',
  'calendar.legend.employer.fullyBooked': 'Đã đủ vị trí',
  'calendar.legend.employer.awaiting': 'Chờ xác nhận',
  'calendar.legend.employer.completed': 'Đã hoàn thành',
  'calendar.legend.employer.cancelled': 'Đã huỷ',
  'calendar.legend.employer.expired': 'Đã quá hạn',
  'calendar.empty.worker': 'Không có lịch bận hoặc ca làm trong khoảng thời gian này.',
  'calendar.empty.employer': 'Bạn chưa đăng ca làm nào trong khoảng thời gian này.',

  // -------------------------------------------------------------------------
  // Phase 10A-Fix-3 - registration employer-type, posting readiness,
  // workplace imagery
  // -------------------------------------------------------------------------
  'auth.register.employerType.label': 'Loại tài khoản nhà tuyển dụng',
  'auth.register.employerType.intro':
    'Loại tài khoản này quyết định giấy tờ cần xác minh và quy định đảm bảo thanh toán. Bạn không thể tự đổi sau khi đã chọn - nếu cần thay đổi, hãy gửi yêu cầu để quản trị viên xét duyệt.',
  'auth.register.employerType.required':
    'Vui lòng chọn loại tài khoản nhà tuyển dụng.',
  'employerType10A.Individual': 'Cá nhân thuê ngắn hạn',
  'employerType10A.HouseholdBusiness': 'Hộ kinh doanh',
  'employerType10A.Company': 'Doanh nghiệp',
  'employerType10A.AgencyEvent': 'Agency / Sự kiện',
  'employerType10A.Individual.hint':
    'Không cần giấy phép kinh doanh. Bạn cần xác minh danh tính người thuê, địa điểm làm việc và đảm bảo thanh toán 100% tiền công.',
  'employerType10A.HouseholdBusiness.hint':
    'Hộ kinh doanh: nộp CCCD đại diện + giấy phép hộ kinh doanh + ảnh mặt tiền.',
  'employerType10A.Company.hint':
    'Doanh nghiệp: nộp giấy phép kinh doanh + mã số thuế + ảnh chi nhánh hoặc địa chỉ.',
  'employerType10A.AgencyEvent.hint':
    'Agency / Sự kiện: nộp giấy phép kinh doanh + hợp đồng / xác nhận sự kiện + ảnh địa điểm.',

  // UI-REFRESH Batch 3 - multi-section create-shift form headings.
  'shiftForm.section.basics': 'Thông tin ca làm',
  'shiftForm.section.details': 'Mô tả và yêu cầu',
  'shiftForm.section.deposit': 'Đặt cọc',

  'form.workplaceSection.title': 'Ảnh địa điểm và liên hệ tại nơi làm việc',
  'form.workplaceSection.intro':
    'Ảnh giúp người lao động nhận biết nơi làm việc thật trước khi nhận ca. Trong bản MVP, bạn chỉ cần điền tên file mô phỏng (ví dụ: "mat-tien-quan-pho-ha.jpg").',
  // Supabase/production: chưa hỗ trợ tải ảnh thật → không hiển thị trường ảnh giả.
  'form.workplaceSection.title.supabase': 'Liên hệ tại nơi làm việc',
  'form.workplaceSection.intro.supabase':
    'Cung cấp thông tin liên hệ tại nơi làm việc để người lao động dễ tìm và trao đổi khi tới ca.',
  'form.workplaceImageLabel': 'Ảnh địa điểm / khu vực làm việc',
  'form.workplaceImageLabel.placeholder': 'mat-tien-quan-pho-ha.jpg',
  'form.workplaceImageLabel.hint':
    'Tên file ảnh (mô phỏng). Người lao động sẽ thấy nhãn này trên trang chi tiết ca làm.',
  'form.workplaceNotes': 'Ghi chú về địa điểm',
  'form.workplaceNotes.placeholder':
    'Ví dụ: Vào cổng phía sau, có chỗ để xe miễn phí.',
  'form.onSiteContactName': 'Người phụ trách tại chỗ',
  'form.onSiteContactPhone': 'SĐT người phụ trách tại chỗ',
  'form.requiresVerifiedDocumentOnArrival':
    'Yêu cầu mang giấy tờ tuỳ thân đã xác minh khi tới làm.',
  'error.workplaceImage.required':
    'Cần thêm ảnh địa điểm / khu vực làm việc cho ca này.',

  'posting.readiness.title': 'Yêu cầu trước khi đăng ca',
  'posting.readiness.intro':
    'Bạn cần hoàn tất xác minh nhà tuyển dụng trước khi đăng ca.',
  'posting.readiness.allClear':
    'Tất cả yêu cầu đã được đáp ứng. Bạn có thể đăng ca.',
  'posting.readiness.cta.profile': 'Mở hồ sơ nhà tuyển dụng',
  'posting.readiness.checklist.type': 'Đã chọn loại tài khoản',
  'posting.readiness.checklist.id': 'CCCD đại diện đã được duyệt',
  'posting.readiness.checklist.business':
    'Giấy phép kinh doanh hoặc mã số thuế đã được duyệt',
  'posting.readiness.checklist.workplaceProof':
    'Ảnh mặt tiền / nơi làm việc đã được duyệt trên hồ sơ',
  'posting.readiness.checklist.workplaceImage':
    'Đã có ảnh địa điểm cho ca này',
  'posting.readiness.checklist.event':
    'Hợp đồng / xác nhận sự kiện đã được duyệt',
  'posting.readiness.depositLocked':
    'Hệ thống chỉ mở bước đảm bảo thanh toán khi bạn đã hoàn tất các yêu cầu trên.',
  'posting.readiness.individualNote':
    'Với tài khoản cá nhân thuê ngắn hạn, hệ thống yêu cầu đảm bảo thanh toán 100% tiền công.',

  'shifts.detail.workplace.title': 'Ảnh địa điểm / khu vực làm việc',
  'shifts.detail.workplace.empty':
    'Nhà tuyển dụng chưa cung cấp ảnh địa điểm cho ca này.',
  'shifts.detail.workplace.notes': 'Ghi chú từ nhà tuyển dụng',
  'shifts.detail.onSiteContact': 'Người phụ trách tại chỗ',
  'shifts.detail.requiresVerifiedDocument':
    'Vui lòng mang giấy tờ tuỳ thân đã xác minh khi tới ca làm.',

  'employer.profile.publicPhotos.title': 'Ảnh địa điểm đã xác minh',
  'employer.profile.publicPhotos.empty':
    'Chưa có ảnh địa điểm làm việc đã xác minh.',
  'employer.profile.firstSet.legacy':
    'Chỉ áp dụng cho tài khoản cũ chưa có loại tài khoản. Tài khoản đăng ký mới đã có loại tài khoản từ bước đăng ký.',

  // Phase 10C-Stab-1 Batch 2 - Wage validation copy.
  'shiftForm.wage.recommendedMin.title': 'Mức khuyến nghị tối thiểu',
  'shiftForm.wage.recommendedMin.warning':
    'Mức lương bạn đặt thấp hơn mức khuyến nghị tối thiểu cho loại công việc này. Bạn có thể tiếp tục, nhưng nên cân nhắc tăng để thu hút người lao động.',
  'shiftForm.wage.recommendedMin.disclaimer':
    'Đây là mức khuyến nghị nội bộ - không phải mức lương tối thiểu pháp lý.',
  'shiftForm.wage.recommendedMin.acknowledge':
    'Tôi hiểu và muốn tiếp tục với mức lương này',
  'shiftForm.customJobType.label': 'Tên loại công việc tuỳ chỉnh',
  'shiftForm.customJobType.placeholder': 'Ví dụ: Hỗ trợ chuyển nhà',
  'shiftForm.customJobType.hint':
    'Bắt buộc khi chọn loại công việc "Khác".',
  'shiftForm.customJobType.required':
    'Vui lòng nhập tên loại công việc khi chọn "Khác".',

  // Phase 10C-Stab-1 Batch 2 - admin snapshot dev utility.
  'admin.snapshot.section.title': 'Tiện ích nhà phát triển: snapshot dữ liệu mock',
  'admin.snapshot.section.intro':
    'Bản MVP lưu mọi thứ trong localStorage trên trình duyệt hiện tại. Tải xuống snapshot để chia sẻ dữ liệu mẫu giữa các trình duyệt hoặc thiết bị, sau đó nạp lại bằng nút bên dưới.',
  'admin.snapshot.export.button': 'Tải snapshot mock data',
  'admin.snapshot.import.button': 'Nạp snapshot mock data',
  'admin.snapshot.import.success': 'Đã nạp snapshot, đang tải lại trang…',
  'admin.snapshot.export.success': 'Đã tải xuống snapshot mock data',
  'admin.snapshot.import.error.INVALID_JSON':
    'Tệp snapshot không phải JSON hợp lệ.',
  'admin.snapshot.import.error.VERSION_MISMATCH':
    'Phiên bản snapshot không khớp phiên bản hiện tại của ứng dụng.',
  'admin.snapshot.import.error.INVALID_PAYLOAD':
    'Snapshot không có cấu trúc hợp lệ.',

  // Phase 10C-Stab-1 Batch 2 - repost cancelled/expired shift.
  'employer.repost.button': 'Đăng lại từ ca này',
  'employer.repost.banner.title': 'Ca này đã kết thúc hoặc đã huỷ',
  'employer.repost.banner.body':
    'Bạn có thể tạo một ca mới với cùng thông tin để đăng lại.',
  'employer.repost.timeline.created':
    'Nhà tuyển dụng đã tạo ca mới dựa trên ca này',
  'employer.repost.timeline.fromSource':
    'Tạo lại từ ca cũ',
  'shift.timeline.title': 'Lịch sử ca làm',
  'shift.timeline.empty': 'Chưa có sự kiện nào.',
  'shift.timeline.kind.CreatedFromRepost': 'Đã tạo ca mới từ ca này',
  'shift.timeline.kind.EmployerCancelled': 'Nhà tuyển dụng đã huỷ ca',
  'shift.timeline.kind.AutoExpired': 'Hệ thống đã chuyển sang đã hết hạn',
  'shift.timeline.kind.Reposted': 'Tạo lại từ ca cũ',
  // Phase 10C-Stab-1 Batch 4B - additional timeline kinds emitted by
  // the store actions (apply / approve / check-in / mark-present /
  // mark-absent / check-out / dispute / wage-release / etc.).
  'shift.timeline.kind.ShiftPublished': 'Ca đã được đăng',
  'shift.timeline.kind.DepositHeld': 'Đã giữ cọc',
  'shift.timeline.kind.WorkerApplied': 'Người lao động đã ứng tuyển',
  'shift.timeline.kind.EmployerApprovedApplicant': 'Nhà tuyển dụng đã duyệt người lao động',
  'shift.timeline.kind.WorkerCheckedIn': 'Người lao động đã check-in',
  'shift.timeline.kind.EmployerMarkedPresent': 'Nhà tuyển dụng xác nhận có mặt',
  'shift.timeline.kind.EmployerMarkedAbsent': 'Nhà tuyển dụng đánh dấu vắng mặt',
  'shift.timeline.kind.WorkerCheckedOut': 'Người lao động đã check-out',
  'shift.timeline.kind.EmployerOpenedDispute': 'Nhà tuyển dụng mở khiếu nại',
  'shift.timeline.kind.WorkerOpenedDispute': 'Người lao động mở khiếu nại',
  'shift.timeline.kind.WorkerRespondedToDispute': 'Người lao động phản hồi khiếu nại',
  'shift.timeline.kind.EmployerRespondedToDispute': 'Nhà tuyển dụng phản hồi khiếu nại',
  'shift.timeline.kind.AdminRequestedEvidence': 'Quản trị viên yêu cầu bổ sung bằng chứng',
  'shift.timeline.kind.AdminResolvedDispute': 'Quản trị viên đã giải quyết khiếu nại',
  'shift.timeline.kind.WageReleased': 'Đã giải ngân tiền công',
  'shift.timeline.kind.WageRefunded': 'Đã hoàn cọc',
  'feedback.repost.success': 'Đang chuyển sang biểu mẫu',
  'feedback.repost.success.desc':
    'Vui lòng chỉnh sửa ca mới và chọn ngày giờ trước khi đảm bảo thanh toán.',

  // Phase 10C-Stab-1 Batch 2 - employer verification gate.
  'shift.create.error.EMPLOYER_NOT_VERIFIED':
    'Bạn cần hoàn tất xác minh tài khoản trước khi đăng ca công khai.',
  'shift.create.error.EMPLOYER_TYPE_REQUIRED':
    'Bạn cần chọn loại tài khoản nhà tuyển dụng trước khi đăng ca.',
  'shift.create.error.PAST_SHIFT':
    'Không thể đăng ca trong quá khứ. Vui lòng chọn ngày/giờ trong tương lai.',
  'shift.create.error.INSUFFICIENT_BALANCE':
    'Số dư ví không đủ để đặt cọc. Vui lòng nạp thêm tiền.',
  // CORE-STABILITY-8 Part 2 - required on-site contact for publish.
  'shift.create.error.CONTACT_PERSON_REQUIRED':
    'Vui lòng nhập người phụ trách tại chỗ.',
  'shift.create.error.CONTACT_PHONE_REQUIRED':
    'Vui lòng nhập số điện thoại người phụ trách.',
  // CORE-STABILITY-8 Part 1 - draft save.
  'shiftForm.saveDraft': 'Lưu nháp',
  'shiftForm.saveDraft.success':
    'Đã lưu bản nháp. Bạn có thể tiếp tục chỉnh sửa sau ở mục "Bản nháp đã lưu".',
  'shiftForm.draft.section.title': 'Bản nháp đã lưu',
  'shiftForm.draft.section.intro':
    'Bản nháp là biểu mẫu đã lưu - chưa được đăng, người lao động không thấy. Tiếp tục chỉnh sửa rồi đảm bảo thanh toán để đăng ca.',
  'shiftForm.draft.untitled': '(Chưa có tiêu đề)',
  'shiftForm.draft.noDate': 'Chưa chọn ngày giờ',
  'shiftForm.draft.savedAt': 'Lưu lúc',
  'shiftForm.draft.continue': 'Tiếp tục chỉnh sửa',
  'shiftForm.draft.delete': 'Xóa bản nháp',
  'shiftForm.draft.deleted': 'Đã xóa bản nháp.',
  // CORE-STABILITY-8 Part 5 - understaffed policy setting.
  'employer.understaffed.title': 'Chính sách khi không đủ người',
  'employer.understaffed.intro':
    'Chọn cách xử lý khi ca làm không đủ số người được duyệt trước giờ bắt đầu.',
  'employer.understaffed.runWithApproved': 'Vẫn chạy với số người đã duyệt',
  'employer.understaffed.runWithApproved.hint':
    'Ca vẫn diễn ra với những người đã được duyệt. Khoản đảm bảo thanh toán của các vị trí không dùng sẽ được hoàn lại khi ca kết thúc.',
  'employer.understaffed.requireFull': 'Chỉ chạy khi đủ số người',
  'employer.understaffed.requireFull.hint':
    'Nếu chưa đủ người trước giờ bắt đầu, ca sẽ tự hủy, hoàn lại toàn bộ khoản đảm bảo thanh toán và thông báo cho người đã được duyệt.',
  // CORE-STABILITY-7 Part 2 - insufficient-balance draft modal.
  'deposit.insufficient.title': 'Số dư ví không đủ để đặt cọc',
  'deposit.insufficient.body':
    'Số dư ví của bạn không đủ để đặt cọc cho ca này. Bạn có muốn nạp tiền vào ví không? Bản nháp ca làm vẫn được giữ nguyên.',
  'deposit.insufficient.required': 'Cần đặt cọc',
  'deposit.insufficient.balance': 'Số dư hiện tại',
  'deposit.insufficient.shortfall': 'Còn thiếu',
  'deposit.insufficient.draftNote':
    'Ca làm đang ở dạng nháp, chưa được công bố và người lao động chưa thấy. Bạn có thể nạp tiền rồi xác nhận lại mà không cần nhập lại.',
  'deposit.insufficient.topUpNow': 'Nạp tiền ngay',
  'deposit.insufficient.saveDraft': 'Lưu nháp',
  'deposit.insufficient.backToEdit': 'Quay lại chỉnh sửa',
  'deposit.insufficient.savedDraft':
    'Đã lưu bản nháp ca làm. Bạn có thể nạp tiền và đặt cọc sau.',
  'shift.create.error.NOT_FOUND':
    'Không tìm thấy ca làm hoặc ca không ở trạng thái chờ đặt cọc.',
  'shift.requiresEmployerVerification.banner':
    'Ca này cần xác minh nhà tuyển dụng. Bạn có thể vẫn xem thông tin, nhưng nên kiểm tra kỹ trước khi ứng tuyển.',

  // Phase 10C-Stab-1 Batch 2 - check-in/out canonical UI copy.
  'lifecycle.btn.workerCheckIn': 'Tôi đã có mặt',
  'lifecycle.btn.employerMarkPresent': 'Xác nhận có mặt',
  'lifecycle.btn.employerMarkAbsent': 'Đánh dấu vắng mặt',
  'lifecycle.btn.workerCheckOut': 'Check-out & hoàn tất checklist',
  'lifecycle.mismatch.workerOnly':
    'Người lao động đã check-in nhưng nhà tuyển dụng chưa xác nhận. Hãy chờ nhà tuyển dụng xác nhận có mặt.',
  'lifecycle.mismatch.employerOnly':
    'Nhà tuyển dụng đã xác nhận bạn có mặt. Vui lòng tự check-in để bắt đầu ca.',
  // Phase 10C-Stab-1 Batch 3 D - worker-facing mismatch warning.
  'lifecycle.mismatch.workerNotCheckedIn':
    'Nhà tuyển dụng đã xác nhận bạn có mặt. Nếu bạn đã bắt đầu làm, hãy check-in để ghi nhận.',
  // CORE-STABILITY-9 Part 1 - role-aware attendance copy. The SAME
  // event reads differently for worker / employer / admin so an
  // employer page never shows worker-perspective text and vice-versa.
  // Worker side:
  'attendance.copy.worker.WorkerCheckedInEarly':
    'Bạn đã check-in. Vui lòng chờ đến giờ bắt đầu ca.',
  'attendance.copy.worker.WorkerCheckedInInProgress':
    'Bạn đã check-in. Hãy hoàn thành ca và check-out sau khi ca kết thúc.',
  'attendance.copy.worker.EmployerMarkedPresentOnly':
    'Nhà tuyển dụng đã xác nhận bạn có mặt. Vui lòng tự check-in để ghi nhận thời điểm bắt đầu.',
  'attendance.copy.worker.BothConfirmedPresent':
    'Hai bên đã xác nhận có mặt. Hãy hoàn thành ca và check-out sau khi ca kết thúc.',
  'attendance.copy.worker.AwaitingCheckout':
    'Ca đã kết thúc. Vui lòng check-out để gửi bàn giao.',
  // Employer side:
  'attendance.copy.employer.WorkerCheckedInEarly':
    'Người lao động đã check-in. Vui lòng xác nhận có mặt nếu đúng.',
  'attendance.copy.employer.WorkerCheckedInInProgress':
    'Người lao động đã check-in. Vui lòng xác nhận có mặt nếu đúng.',
  'attendance.copy.employer.EmployerMarkedPresentOnly':
    'Bạn đã xác nhận người lao động có mặt. Đang chờ người lao động tự check-in để ghi nhận thời điểm bắt đầu.',
  'attendance.copy.employer.BothConfirmedPresent':
    'Hai bên đã xác nhận có mặt. Đợi đến hết ca để người lao động check-out.',
  'attendance.copy.employer.AwaitingCheckout':
    'Ca đã kết thúc. Đang chờ người lao động check-out.',
  // Admin side (neutral):
  'attendance.copy.admin.WorkerCheckedInEarly':
    'Người lao động đã tự check-in.',
  'attendance.copy.admin.WorkerCheckedInInProgress':
    'Người lao động đã tự check-in.',
  'attendance.copy.admin.EmployerMarkedPresentOnly':
    'Nhà tuyển dụng đã xác nhận có mặt.',
  'attendance.copy.admin.BothConfirmedPresent':
    'Hai bên đã xác nhận có mặt.',
  'attendance.copy.admin.AwaitingCheckout':
    'Ca đã kết thúc, đang chờ người lao động check-out.',
  // CORE-STABILITY-9 Part 4 - skill progression.
  'skill.highlight.title': 'Kỹ năng nổi bật',
  'skill.explain':
    'Kỹ năng tăng khi bạn hoàn thành ca tốt và nhận đánh giá tích cực.',
  // PRODUCT-UX-FIX-BACKEND-PREP-1 Part 2 - skill section copy.
  'skill.section.title': 'Kỹ năng của bạn',
  'skill.section.intro':
    'Kỹ năng sẽ tăng khi bạn hoàn thành ca tốt và nhận đánh giá tích cực.',
  'skill.section.footnote':
    'Điểm kỹ năng tách riêng với điểm uy tín tổng. Nhà tuyển dụng xem cấp kỹ năng phù hợp với loại ca khi duyệt.',
  'skill.level': 'Cấp độ',
  'skill.xp': 'Điểm kinh nghiệm',
  'skill.levelProgress': 'Tiến độ lên cấp',
  'skill.dashboard.title': 'Kỹ năng của bạn',
  // CORE-STABILITY-9 Part 5 + PRODUCT-UX-FIX-BACKEND-PREP-1 Part 1 -
  // availability/busy blocks. The dialog now frames both kinds as a
  // single "lịch trình" with two choices rather than only "lịch bận".
  'schedule.kind.label': 'Loại lịch trình',
  'schedule.kind.busy': 'Lịch bận',
  'schedule.kind.available': 'Lịch rảnh',
  'schedule.kind.busyHint':
    'Khung giờ bận sẽ chặn ứng tuyển trùng giờ.',
  'schedule.kind.availableHint':
    'Khung giờ rảnh giúp gợi ý ca làm phù hợp với lịch của bạn - không chặn ứng tuyển.',
  // Combined helper shown above the choice so the worker understands
  // both options at a glance.
  'schedule.kind.helper':
    'Bạn có thể thêm khoảng thời gian rảnh để hệ thống gợi ý ca phù hợp, hoặc thêm lịch bận để tránh trùng lịch.',
  'schedule.event.availableLabel': 'Lịch rảnh',
  'schedule.event.busyLabel': 'Lịch bận',
  'availability.suggest.title': 'Ca làm phù hợp',
  'availability.suggest.subtitle':
    'Gợi ý theo lịch rảnh và kỹ năng của bạn.',
  'availability.suggest.empty':
    'Chưa có ca làm phù hợp. Thêm khung giờ rảnh trong lịch cá nhân để nhận gợi ý.',
  'availability.suggest.viewAll': 'Xem tất cả ca làm',
  'availability.match.veryGood': 'Rất phù hợp',
  'availability.match.good': 'Phù hợp',
  'availability.match.consider': 'Cần cân nhắc',
  'availability.fitsAvailability': 'Khớp lịch rảnh',
  'availability.filter.label': 'Sắp xếp',
  'availability.filter.default': 'Mặc định',
  'availability.filter.byAvailability': 'Phù hợp lịch rảnh',
  'lifecycle.checkIn.outsideWindow':
    'Hiện chưa đến giờ check-in. Bạn có thể check-in trong khoảng 15 phút trước giờ bắt đầu.',
  'lifecycle.checkOut.outsideWindow':
    'Bạn chỉ có thể check-out sau khi ca kết thúc.',
  'lifecycle.toast.markPresent.success': 'Đã xác nhận người lao động có mặt',

  // CORE-STABILITY-7 Part 5 - attendance flexibility (absent dimming +
  // late-arrival correction).
  'attendance.absentDisabled.checkedIn':
    'Người lao động đã check-in. Chỉ đánh dấu vắng mặt nếu có tranh chấp.',
  // P0 attendance — lỗi từ RPC Supabase (thời gian server).
  'attendance.error.checkInWindow':
    'Chưa tới hoặc đã quá giờ check-in. Chỉ check-in được quanh giờ bắt đầu ca.',
  'attendance.error.markPresentWindow':
    'Ngoài khoảng thời gian xác nhận có mặt cho ca này.',
  'attendance.error.checkoutWindow':
    'Chỉ check-out được sau khi ca kết thúc.',
  'attendance.error.checkoutRequiresCheckin':
    'Bạn cần tự check-in trước khi check-out.',
  'attendance.error.shiftNotEnded': 'Ca chưa kết thúc nên chưa thể xác nhận hoàn thành.',
  'attendance.error.evidenceFilename': 'Tên tệp minh chứng không hợp lệ.',
  'attendance.error.evidenceInvalid': 'Dữ liệu minh chứng không hợp lệ.',
  'attendance.error.notOwner': 'Bạn không có quyền thao tác trên đơn/ca này.',
  'attendance.error.notEmployer': 'Chỉ nhà tuyển dụng sở hữu ca mới thực hiện được thao tác này.',
  'attendance.error.noShowTooEarly':
    'Chỉ đánh dấu vắng mặt được sau giờ bắt đầu ca 15 phút.',
  'attendance.markNoShow.confirm':
    'Đánh dấu người lao động này VẮNG MẶT? Thao tác không hoàn tác được: người này không nhận tiền công, phần cọc tương ứng sẽ được hoàn về ví của bạn khi ca chốt.',
  'feedback.applicant.markNoShow.success.descReal':
    'Phần cọc của vị trí này sẽ được hoàn về ví khi ca chốt.',
  'wallet.error.depositTooLow':
    'Không thể tăng giờ làm / số vị trí vượt quá tiền cọc đã giữ. Hãy huỷ ca và đăng ca mới.',
  'wallet.error.depositNotHeld':
    'Tiền cọc của ca này đã được chốt, không thể trả thêm tiền công. Vui lòng liên hệ hỗ trợ.',
  'attendance.revert.button': 'Đến muộn - chuyển sang có mặt',
  'attendance.revert.title': 'Chuyển sang có mặt (đến muộn)',
  'attendance.revert.body':
    'Người lao động đã đến muộn? Bạn có thể chuyển trạng thái từ vắng mặt sang có mặt. Điểm uy tín của người lao động sẽ được hoàn lại và ca tiếp tục bình thường.',
  'attendance.revert.reasonLabel': 'Lý do chuyển trạng thái',
  'attendance.revert.reasonPlaceholder': 'Ví dụ: người lao động đến muộn 20 phút do kẹt xe.',
  'attendance.revert.confirm': 'Xác nhận có mặt',
  'attendance.revert.success': 'Đã chuyển người lao động sang có mặt.',
  'attendance.revert.error.reasonRequired': 'Vui lòng nhập lý do.',
  'attendance.revert.error.disputeOpen':
    'Ca này đang có khiếu nại. Vui lòng để quản trị viên xử lý trước khi thay đổi trạng thái.',

  // Phase 10C-Stab-1 Batch 2 - schedule overlap deep-link copy.
  'apply.error.CONFLICT.detailed':
    'Bạn đã có ca làm trùng giờ: "{title}" ngày {date}, {startTime}–{endTime}.',
  'apply.error.CONFLICT.cta': 'Xem lịch cá nhân',

  // Phase 10C-Stab-1 Batch 2 - checklist transparency.
  'checklist.heading.full': 'Chi tiết checklist',
  'checklist.heading.template': 'Mục checklist',
  'checklist.row.checked': 'Đã tích',
  'checklist.row.unchecked': 'Chưa tích',
  'checklist.row.notSubmitted': 'Người lao động chưa gửi checklist này',

  // Phase 10C-Stab-1 Batch 2 - dispute tracking copy fixes.
  'worker.dispute.statusLine.byWorker':
    'Bạn đã khiếu nại ca này. Quản trị viên đang xử lý - tiền công đang được giữ lại.',
  'worker.dispute.statusLine.byEmployer':
    'Nhà tuyển dụng đang khiếu nại ca này. Quản trị viên đang xem xét - tiền công đang được giữ lại.',
  'worker.dispute.respondButton': 'Phản hồi khiếu nại / Bổ sung bằng chứng',
  'worker.dispute.employerStatement.title': 'Khiếu nại của nhà tuyển dụng',
  'worker.dispute.employerStatement.category': 'Loại',
  'worker.dispute.employerStatement.reason': 'Lý do',
  'worker.dispute.employerStatement.evidenceDescription': 'Mô tả bằng chứng',
  'worker.dispute.employerStatement.evidenceFile': 'Tệp đính kèm',
  'worker.dispute.employerStatement.empty': 'Không có',
  'employer.dispute.statusLine.byEmployer':
    'Bạn đã khiếu nại ca này. Quản trị viên đang xử lý - tiền công đang được giữ lại.',
  'employer.dispute.statusLine.byWorker':
    'Người lao động đang khiếu nại ca này. Quản trị viên đang xem xét - tiền công đang được giữ lại.',
  // Phase 10C-Stab-1 Batch 3 E - symmetric response affordance for the
  // employer side of a worker-initiated dispute.
  'employer.dispute.respondButton': 'Phản hồi khiếu nại / Bổ sung bằng chứng',
  'employer.dispute.workerStatement.title': 'Khiếu nại của người lao động',

  // Phase 10C-Stab-1 Batch 3 E - DisputeResponseDialog (worker /
  // employer follow-up statements appended to an existing dispute).
  'dispute.response.dialog.title': 'Phản hồi khiếu nại',
  'dispute.response.dialog.intro':
    'Hãy mô tả phản hồi của bạn và bổ sung bằng chứng nếu có. Phản hồi sẽ được đính kèm vào hồ sơ khiếu nại để quản trị viên xem xét.',
  'dispute.response.dialog.reason.label': 'Phản hồi / lời khai',
  'dispute.response.dialog.reason.placeholder':
    'Ví dụ: Tôi đã làm đầy đủ thời gian và bàn giao cho quản lý ca lúc 22:05.',
  'dispute.response.dialog.evidenceDescription.label': 'Mô tả bằng chứng (nếu có)',
  'dispute.response.dialog.evidenceDescription.placeholder':
    'Ví dụ: ảnh checklist sau ca, tin nhắn bàn giao với quản lý ca…',
  'dispute.response.dialog.evidenceFileName.label': 'Tên tệp bằng chứng (nếu có)',
  'dispute.response.dialog.evidenceFileName.placeholder': 'evidence-2026-05-25.jpg',
  'dispute.response.dialog.evidenceFileName.hint':
    'Bản MVP không tải tệp thật - chỉ ghi lại tên tệp để quản trị viên đối chiếu.',
  'dispute.response.feedback.success': 'Đã gửi phản hồi khiếu nại',
  'dispute.response.feedback.success.desc':
    'Phản hồi của bạn đã được đính kèm vào hồ sơ khiếu nại.',

  // Phase 10C-Stab-1 Batch 2 - evidence education improvements.
  'evidence.examples.checklist.title': 'Ví dụ checklist',
  'evidence.examples.checklist.item1': 'Đã làm đủ thời gian theo cam kết.',
  'evidence.examples.checklist.item2': 'Đã hoàn thành đầu việc chính.',
  'evidence.examples.checklist.item3': 'Đã bàn giao cho người phụ trách.',
  'evidence.examples.photo.title': 'Ví dụ ảnh bàn giao',
  'evidence.examples.photo.item1': 'Khu vực làm việc sau khi hoàn thành.',
  'evidence.examples.photo.item2': 'Sản phẩm hoặc khu vực đã được đóng gói.',
  'evidence.examples.photo.item3': 'Booth sự kiện sau khi setup xong.',
  'evidence.examples.photo.item4': 'Bàn giao dụng cụ hoặc hàng hoá cho người phụ trách.',
  'evidence.privacy.warning.detailed':
    'Không chụp mặt khách hàng nếu chưa được phép. Không chụp giấy tờ cá nhân, hoá đơn, mã đơn, thông tin nhạy cảm hoặc hàng hoá bảo mật.',

  // -------------------------------------------------------------------------
  // Phase 10C - Evidence requirement labels, helpers, and copy
  // -------------------------------------------------------------------------
  'evidence.requirement.None': 'Không cần bằng chứng',
  'evidence.requirement.ChecklistOnly': 'Chỉ cần checklist hoàn thành',
  'evidence.requirement.OptionalPhoto': 'Có thể đính kèm ảnh bàn giao',
  'evidence.requirement.RequiredPhoto': 'Bắt buộc đính kèm ảnh bàn giao',
  'evidence.requirement.RequiredHandoverChecklist':
    'Bắt buộc checklist + ghi chú bàn giao',

  'evidence.helper.None': 'Phù hợp công việc nhẹ, không cần bàn giao.',
  'evidence.helper.ChecklistOnly':
    'Người lao động xác nhận đã hoàn thành các mục.',
  'evidence.helper.OptionalPhoto':
    'Khuyến khích ảnh để minh chứng nếu cần.',
  'evidence.helper.RequiredPhoto':
    'Bắt buộc gửi ảnh khi check-out.',
  'evidence.helper.RequiredHandoverChecklist':
    'Cần đầy đủ checklist và ghi chú bàn giao.',

  'evidence.privacy.warning':
    'Không yêu cầu chụp khách hàng, giấy tờ cá nhân, hoá đơn nhạy cảm, hàng hoá bảo mật hay không gian riêng tư.',
  'evidence.suggestedChip': 'Hệ thống đề xuất',

  'error.evidence.tooLowForHighRisk':
    'Công việc rủi ro cao yêu cầu mức bằng chứng cao hơn.',
  'error.evidence.checklistIncomplete':
    'Vui lòng tích đầy đủ các mục trước khi gửi.',
  'error.evidence.photoRequired':
    'Vui lòng đính kèm tên tệp ảnh bàn giao.',
  'error.evidence.noteRequired':
    'Vui lòng nhập ghi chú bàn giao.',
  'error.evidence.tooLong':
    'Nội dung quá dài, vui lòng rút gọn.',

  // Phase 10C - ShiftForm picker section
  'shiftForm.evidence.section.title': 'Bằng chứng sau ca',
  'shiftForm.evidence.section.intro':
    'Chọn mức bằng chứng người lao động cần gửi khi check-out. Hệ thống đã đề xuất một mức theo loại công việc - bạn có thể giữ nguyên hoặc đổi sang mức khác.',
  'shiftForm.evidence.highRiskNote':
    'Công việc rủi ro cao chỉ cho phép mức “Bắt buộc checklist + ghi chú bàn giao” trở lên.',
  'help.evidence.title': 'Cách chọn mức bằng chứng',
  'help.evidence.description':
    'Bạn có thể chọn 1 trong 5 mức bằng chứng sau ca. Mức cao hơn yêu cầu người lao động gửi nhiều minh chứng hơn (checklist, ảnh bàn giao, ghi chú), giúp giảm tranh chấp nhưng tăng công sức cho cả hai bên. Việc làm rủi ro thấp như phát tờ rơi thường chỉ cần checklist; việc tiền mặt hoặc kho hàng nên yêu cầu ảnh bàn giao và ghi chú đầy đủ. Hệ thống đã đề xuất một mức phù hợp dựa trên loại công việc bạn chọn - bạn có thể giữ nguyên hoặc đổi sang mức khác.',

  // Phase 10C - Worker shift detail "Quy trình thanh toán & bằng chứng" card
  'shifts.detail.paymentEvidence.title': 'Quy trình thanh toán & bằng chứng',
  'shifts.detail.paymentEvidence.intro':
    'Sau khi bạn hoàn thành ca, nhà tuyển dụng sẽ xác nhận và tiền công được chuyển cho bạn. Mỗi ca có thể yêu cầu mức bằng chứng khác nhau tuỳ độ rủi ro công việc - không phải ca nào cũng cần ảnh bàn giao.',
  'shifts.detail.paymentEvidence.confirmRule':
    'Sau khi bạn check-out, nhà tuyển dụng có tối đa 12 giờ để xác nhận hoặc khiếu nại.',
  'shifts.detail.paymentEvidence.autoReleaseRule':
    'Nếu nhà tuyển dụng không thao tác trong 12 giờ, hệ thống sẽ tự động giải ngân tiền công.',
  'shifts.detail.paymentEvidence.evidenceLabel': 'Mức bằng chứng cho ca này',
  'shifts.detail.paymentEvidence.required.title':
    'Ca này yêu cầu bằng chứng bàn giao',
  'shifts.detail.paymentEvidence.required.body':
    'Hãy chuẩn bị thực hiện đầy đủ checklist và đính kèm ảnh bàn giao khi check-out để được thanh toán nhanh.',
  'shifts.detail.paymentEvidence.fallback':
    'Không tìm thấy thông tin yêu cầu bằng chứng cho ca này. Vui lòng tải lại trang hoặc liên hệ hỗ trợ.',
  'shifts.detail.paymentEvidence.prepare.None':
    'Bạn chỉ cần thông báo nhà tuyển dụng khi hoàn thành công việc.',
  'shifts.detail.paymentEvidence.prepare.ChecklistOnly':
    'Bạn cần tích đầy đủ các mục checklist hoàn thành khi check-out.',
  'shifts.detail.paymentEvidence.prepare.OptionalPhoto':
    'Bạn có thể đính kèm ảnh bàn giao nếu thấy cần thiết - không bắt buộc.',
  'shifts.detail.paymentEvidence.prepare.RequiredPhoto':
    'Bạn cần đính kèm ảnh bàn giao khu vực làm việc khi check-out.',
  'shifts.detail.paymentEvidence.prepare.RequiredHandoverChecklist':
    'Bạn cần tích đầy đủ checklist và viết ghi chú bàn giao đầy đủ khi check-out.',
  'help.paymentEvidence.title': 'Khi nào cần bằng chứng?',
  'help.paymentEvidence.description':
    'Mức bằng chứng tuỳ thuộc độ rủi ro công việc. Việc nhẹ như phát tờ rơi hoặc hỗ trợ sự kiện thường chỉ cần checklist hoàn thành. Việc liên quan tiền mặt, kho hàng hoặc bàn giao thường yêu cầu ảnh bàn giao và ghi chú để hai bên cùng yên tâm. Sau khi bạn check-out, nhà tuyển dụng có 12 giờ để xác nhận hoặc khiếu nại; nếu không thao tác, hệ thống tự động giải ngân tiền công cho bạn. Bằng chứng chỉ là minh chứng công việc - đừng chụp khách hàng, giấy tờ cá nhân, hoá đơn nhạy cảm hay hàng hoá bảo mật.',

  // Phase 10C - Worker check-out dialog
  'checkout.dialog.title': 'Hoàn tất ca làm',
  'checkout.dialog.intro':
    'Hãy xác nhận các mục bên dưới trước khi check-out. Sau khi gửi, nhà tuyển dụng có 12 giờ để xác nhận hoặc khiếu nại - nếu không thao tác, hệ thống tự động giải ngân tiền công cho bạn.',
  'checkout.dialog.checklist.title': 'Checklist hoàn thành',
  'checkout.dialog.checklist.empty':
    'Ca này không yêu cầu checklist riêng - bạn có thể bỏ qua.',
  'checkout.dialog.note.label': 'Ghi chú bàn giao',
  'checkout.dialog.note.placeholder':
    'Ví dụ: đã bàn giao khu vực, dụng cụ và lượt khách cuối.',
  'checkout.dialog.note.hintRequired':
    'Bắt buộc - vui lòng mô tả phần bàn giao của bạn (≤1000 ký tự).',
  'checkout.dialog.note.hintOptional':
    'Tuỳ chọn - bạn có thể để trống nếu không có gì cần ghi chú (≤1000 ký tự).',
  'checkout.dialog.evidenceFile.label': 'Tên tệp ảnh bàn giao',
  'checkout.dialog.evidenceFile.placeholder':
    'Ví dụ: handover-2025-01-15.jpg',
  'checkout.dialog.evidenceFile.hintRequired':
    'Bắt buộc - nhập tên tệp ảnh bàn giao bạn đã chụp (bản MVP không tải tệp thật).',
  'checkout.dialog.evidenceFile.hintOptional':
    'Tuỳ chọn - bạn có thể đính kèm tên tệp ảnh nếu thấy cần thiết (bản MVP không tải tệp thật).',
  'checkout.dialog.submit': 'Hoàn tất ca làm',
  'checkout.dialog.cancel': 'Đóng',
  'feedback.checkOut.success.desc':
    'Nhà tuyển dụng có 12 giờ để xác nhận hoặc khiếu nại; nếu không thao tác, hệ thống tự động giải ngân tiền công cho bạn.',
  'help.checkout.title': 'Vì sao cần bằng chứng?',
  'help.checkout.description':
    'Bằng chứng giúp nhà tuyển dụng xác nhận ca nhanh hơn và tránh hiểu lầm. Hệ thống chỉ yêu cầu các mục thực sự cần thiết theo loại công việc - bạn không cần chuẩn bị quá nhiều. Đừng chụp khách hàng, giấy tờ cá nhân, hoá đơn nhạy cảm hay hàng hoá bảo mật. Sau khi bạn gửi, nhà tuyển dụng có 12 giờ để xác nhận hoặc khiếu nại; nếu không thao tác, hệ thống tự động giải ngân tiền công cho bạn.',

  // Phase 10C - Employer confirmation panel + AutoReleaseCountdown
  'employer.confirm.panel.title': 'Xác nhận hoàn thành ca',
  'employer.confirm.panel.intro':
    'Người lao động đã check-out. Bạn có thể xác nhận hoàn thành để giải ngân tiền công, hoặc khiếu nại nếu phát hiện vấn đề.',
  'employer.confirm.checkOutAt': 'Thời điểm check-out',
  'employer.confirm.checklist.title': 'Checklist hoàn thành',
  'employer.confirm.checklist.complete': 'Đã tích đầy đủ {n} mục',
  'employer.confirm.checklist.incomplete': 'Còn {n} mục chưa tích trên tổng số {total}',
  'employer.confirm.checklist.empty': 'Ca này không yêu cầu checklist.',
  'employer.confirm.note.title': 'Ghi chú bàn giao của người lao động',
  'employer.confirm.note.empty': 'Người lao động không gửi ghi chú bàn giao.',
  'employer.confirm.evidenceFile.title': 'Tệp ảnh bàn giao',
  'employer.confirm.evidenceFile.empty': 'Người lao động không gửi tệp bằng chứng.',
  'employer.confirm.countdown.label': 'Thời gian còn lại để xác nhận hoặc khiếu nại',
  'employer.confirm.countdown.warning':
    'Nếu bạn không xác nhận hoặc khiếu nại trong 12 giờ, hệ thống sẽ tự động giải ngân tiền công.',
  'employer.confirm.countdown.expired':
    'Đã hết thời gian - hệ thống sẽ tự động giải ngân tiền công ở lần đồng bộ kế tiếp.',
  'employer.confirm.btn.confirm': 'Xác nhận hoàn thành',
  'employer.confirm.btn.dispute': 'Khiếu nại',
  'help.autoRelease.title': 'Đếm ngược 12 giờ',
  'help.autoRelease.description':
    'Đếm ngược cho biết bạn còn bao nhiêu thời gian để xác nhận hoặc khiếu nại trước khi hệ thống tự động giải ngân tiền công cho người lao động. Đồng hồ tính từ lúc người lao động check-out. Khi đếm ngược về 00:00:00, hệ thống sẽ tự động xác nhận hoàn thành ở lần đồng bộ kế tiếp; nếu bạn đã khiếu nại, đếm ngược không có hiệu lực và quản trị viên sẽ xử lý.',

  // Phase 10C - Employer DisputeDialog
  'dispute.dialog.title': 'Khiếu nại ca làm',
  'dispute.dialog.intro':
    'Vui lòng cung cấp đầy đủ thông tin để quản trị viên có thể xem xét khiếu nại của bạn. Tiền công sẽ được giữ lại cho đến khi có kết luận.',
  'dispute.dialog.category.label': 'Loại khiếu nại',
  'dispute.dialog.category.placeholder': '- Chọn loại khiếu nại -',
  'dispute.dialog.reason.label': 'Lý do cụ thể',
  'dispute.dialog.reason.placeholder':
    'Mô tả ngắn gọn vì sao bạn khiếu nại ca làm này.',
  'dispute.dialog.reason.hint': 'Bắt buộc - 1 đến 1000 ký tự.',
  'dispute.dialog.evidenceDescription.label': 'Mô tả bằng chứng',
  'dispute.dialog.evidenceDescription.placeholder':
    'Ví dụ: ảnh khu vực còn rác, ghi âm cuộc gọi, log hệ thống.',
  'dispute.dialog.evidenceDescription.hint': 'Bắt buộc - tối đa 2000 ký tự.',
  'dispute.dialog.evidenceFile.label': 'Tệp đính kèm (tuỳ chọn)',
  'dispute.dialog.evidenceFile.placeholder': 'Ví dụ: photo-2025-01-15.jpg',
  'dispute.dialog.evidenceFile.hint':
    'Tuỳ chọn - chỉ ghi tên tệp (≤255 ký tự, không có ký tự "/" hoặc "\\"). Bản MVP không tải tệp thật.',
  'dispute.dialog.privacyWarning':
    'Đừng chụp khách hàng, giấy tờ cá nhân, hoá đơn nhạy cảm hay hàng hoá bảo mật.',
  'dispute.dialog.submit': 'Gửi khiếu nại',
  'dispute.dialog.cancel': 'Đóng',
  'dispute.dialog.error.categoryRequired': 'Vui lòng chọn loại khiếu nại.',
  'dispute.dialog.error.reasonRequired': 'Vui lòng nhập lý do khiếu nại.',
  'dispute.dialog.error.evidenceDescriptionRequired':
    'Vui lòng mô tả bằng chứng.',
  'dispute.dialog.error.fieldTooLong':
    'Một số trường vượt quá độ dài cho phép, vui lòng rút gọn.',
  'dispute.dialog.error.invalidFileName':
    'Tên tệp không được chứa ký tự "/" hoặc "\\".',
  'feedback.dispute.success': 'Đã gửi khiếu nại',
  'feedback.dispute.success.desc':
    'Quản trị viên sẽ xem xét và phản hồi sớm. Tiền công đang được giữ lại.',

  // Phase 10C - employer-side dispute categories (employer DisputeDialog
  // <select> labels). Worker-side categories live next to these and
  // ship in Wave 5 with the worker DisputeDialog.
  'dispute.category.NoShow': 'Người lao động không tới',
  'dispute.category.LeftEarly': 'Rời ca sớm',
  'dispute.category.ChecklistFailed': 'Checklist chưa hoàn thành',
  'dispute.category.MisrepresentedSkills': 'Khai sai kỹ năng',
  'dispute.category.BehaviorIssue': 'Vấn đề thái độ',
  'dispute.category.Damage': 'Hư hỏng tài sản',
  'dispute.category.Other': 'Khác',

  // Phase 10C Wave 5 - worker-side dispute categories (worker DisputeDialog).
  'dispute.category.WrongAddress': 'Sai địa chỉ làm việc',
  'dispute.category.UnsafeWorksite': 'Môi trường làm việc không an toàn',
  'dispute.category.EmployerNoShow': 'Nhà tuyển dụng không có mặt',
  'dispute.category.ScopeChanged': 'Nhà tuyển dụng thay đổi phạm vi công việc',
  'dispute.category.PaymentDispute': 'Vấn đề thanh toán',
  'dispute.category.AbsentDispute': 'Bị đánh vắng mặt không đúng',

  // Phase 10C Wave 5 - worker-side dispute action wiring.
  'worker.dispute.openButton': 'Khiếu nại',
  'worker.dispute.statusLine':
    'Bạn đã khiếu nại ca này. Quản trị viên đang xử lý - tiền công đang được giữ lại.',
  'worker.dispute.intro':
    'Vui lòng cho biết bạn gặp vấn đề gì với ca làm này. Tiền công sẽ được giữ lại cho đến khi quản trị viên có kết luận.',

  // Phase 10C - extended dispute statuses (Open / ResolvedReleased /
  // ResolvedRefunded already exist above).
  'dispute.status.PartialRelease': 'Thanh toán một phần',
  'dispute.status.RequestedMoreEvidence': 'Yêu cầu thêm bằng chứng',
  'dispute.status.ClosedInvalid': 'Đóng vì không hợp lệ',

  // QA-Fix-1 F - admin dispute detail + request-more-evidence.
  // UI-REFRESH Batch 4 - amount-held label on the admin dispute card.
  'admin.dispute.amountHeld': 'Tiền cọc đang giữ',
  'admin.dispute.initiatedBy': 'Người mở khiếu nại',
  'admin.dispute.initiator.worker': 'Người lao động',
  'admin.dispute.initiator.employer': 'Nhà tuyển dụng',
  'admin.dispute.category': 'Loại',
  'admin.dispute.responses': 'Phản hồi & bằng chứng',
  'admin.dispute.responses.empty': 'Chưa có phản hồi nào.',
  'admin.dispute.requestEvidence.button': 'Yêu cầu bổ sung thông tin',
  'admin.dispute.requestEvidence.target': 'Yêu cầu gửi tới',
  'admin.dispute.requestEvidence.note': 'Nội dung yêu cầu',
  'admin.dispute.requestEvidence.success': 'Đã gửi yêu cầu bổ sung thông tin',
  'admin.dispute.target.both': 'Cả hai bên',

  // -----------------------------------------------------------------
  // Phase 10C-Stab-1 Batch 4B - wallet, post-payment rating, absent
  // dispute banners.
  // -----------------------------------------------------------------
  'wallet.title': 'Ví tiền',
  'wallet.balance.label': 'Số dư hiện tại',
  'wallet.balance.empty': 'Chưa có giao dịch nào.',
  'wallet.ledger.openButton': 'Xem lịch sử giao dịch',
  'wallet.ledger.modal.title': 'Lịch sử giao dịch ví',
  'wallet.ledger.modal.close': 'Đóng',
  'wallet.ledger.recent': 'Giao dịch gần đây',
  'wallet.kind.EmployerDepositHeld': 'Đã giữ cọc ca làm',
  'wallet.kind.WorkerWageReleased': 'Đã nhận tiền công',
  'wallet.kind.EmployerUnusedRefund': 'Hoàn cọc vị trí không sử dụng',
  'wallet.kind.EmployerDisputeRefund': 'Hoàn cọc sau khiếu nại',
  'wallet.kind.EmployerPartialRefund': 'Hoàn cọc một phần',
  'wallet.kind.WorkerPartialRelease': 'Nhận thanh toán một phần',
  'wallet.kind.EmployerCancellationPenalty': 'Phí huỷ ca',
  'wallet.kind.UserTopUp': 'Nạp tiền vào ví',
  'wallet.topUp.button': 'Nạp tiền vào ví',
  'wallet.topUp.modal.title': 'Nạp tiền vào ví (demo)',
  'wallet.topUp.modal.label': 'Số tiền muốn nạp (đồng)',
  'wallet.topUp.modal.placeholder': 'Ví dụ: 200.000',
  'wallet.topUp.modal.submit': 'Xác nhận nạp',
  'wallet.topUp.modal.cancel': 'Đóng',
  'wallet.topUp.error.required': 'Vui lòng nhập số tiền.',
  'wallet.topUp.error.invalid': 'Số tiền không hợp lệ. Chỉ nhập số dương.',
  'wallet.topUp.error.tooLarge': 'Số tiền vượt quá giới hạn nạp demo (tối đa 50.000.000đ).',
  'wallet.topUp.success': 'Đã nạp tiền vào ví (demo)',
  'wallet.topUp.success.desc': 'Số dư ví của bạn đã được cập nhật.',

  // CORE-STABILITY-6 Part 3 - wallet withdrawal (demo).
  'wallet.kind.UserWithdrawal': 'Rút tiền khỏi ví',
  'wallet.withdraw.button': 'Rút tiền',
  'wallet.withdraw.modal.title': 'Rút tiền khỏi ví (demo)',
  'wallet.withdraw.modal.label': 'Số tiền muốn rút (đồng)',
  'wallet.withdraw.modal.placeholder': 'Ví dụ: 100.000',
  'wallet.withdraw.modal.noteLabel': 'Ghi chú / số tài khoản (tuỳ chọn)',
  'wallet.withdraw.modal.notePlaceholder': 'Ví dụ: Vietcombank • 0123456789',
  'wallet.withdraw.modal.available': 'Số dư khả dụng',
  'wallet.withdraw.modal.submit': 'Xác nhận rút',
  'wallet.withdraw.modal.cancel': 'Đóng',
  'wallet.withdraw.error.required': 'Vui lòng nhập số tiền.',
  'wallet.withdraw.error.invalid': 'Số tiền không hợp lệ. Chỉ nhập số dương.',
  'wallet.withdraw.error.insufficient': 'Số dư không đủ để rút tiền.',
  'wallet.withdraw.success': 'Đã rút tiền khỏi ví (demo)',

  // Rút tiền THẬT về tài khoản ngân hàng (PayOS Kênh chi) — chế độ supabase.
  'wallet.kind.UserWithdrawalReversed': 'Hoàn tiền rút không thành công',
  'wallet.withdraw.real.title': 'Rút tiền về tài khoản ngân hàng',
  'wallet.withdraw.real.bank': 'Ngân hàng',
  'wallet.withdraw.real.bankPlaceholder': 'Chọn ngân hàng',
  'wallet.withdraw.real.account': 'Số tài khoản',
  'wallet.withdraw.real.accountName': 'Tên chủ tài khoản (viết hoa, không dấu)',
  'wallet.withdraw.real.accountNamePlaceholder': 'Ví dụ: NGUYEN VAN A',
  'wallet.withdraw.real.note':
    'Tiền được chuyển thật qua PayOS về đúng tài khoản bạn nhập. Kiểm tra kỹ ngân hàng và số tài khoản — chuyển nhầm không lấy lại được.',
  'wallet.withdraw.real.submit': 'Rút tiền',
  'wallet.withdraw.real.error.min': 'Số tiền rút tối thiểu là 2.000 đ.',
  'wallet.withdraw.real.error.bank': 'Vui lòng chọn ngân hàng.',
  'wallet.withdraw.real.error.account': 'Số tài khoản không hợp lệ (chỉ gồm chữ số).',
  'wallet.withdraw.real.error.rejected':
    'PayOS từ chối lệnh rút. Số tiền đã được hoàn lại vào ví của bạn.',
  'wallet.withdraw.real.error.generic': 'Không rút được tiền. Vui lòng thử lại.',
  'wallet.withdraw.real.success': 'Đã chuyển tiền về tài khoản của bạn',
  'wallet.withdraw.real.processing':
    'Lệnh rút đang được xử lý. Tiền thường về tài khoản sau vài phút.',
  'wallet.withdraw.real.history': 'Lệnh rút gần đây',
  'wallet.withdraw.real.check': 'Kiểm tra',
  'wallet.withdraw.real.status.PENDING': 'Đang gửi',
  'wallet.withdraw.real.status.PROCESSING': 'Đang xử lý',
  'wallet.withdraw.real.status.SUCCEEDED': 'Thành công',
  'wallet.withdraw.real.status.FAILED': 'Thất bại — đã hoàn vào ví',
  'wallet.withdraw.real.status.CANCELLED': 'Đã huỷ',

  'wallet.income.note':
    'Số dư ví là nguồn chính. "Tổng thu nhập" là tổng tiền công đã nhận tích luỹ.',

  'worker.absentDispute.banner.title':
    'Bạn đã bị đánh dấu vắng mặt cho ca này.',
  'worker.absentDispute.banner.body':
    'Tiền công đang được giữ lại. Nếu bạn cho rằng việc đánh dấu là không đúng, hãy gửi khiếu nại để quản trị viên xem xét.',
  'worker.absentDispute.banner.button': 'Khiếu nại vắng mặt',

  'worker.postPaymentRating.banner.title':
    'Bạn đã nhận lương. Hãy đánh giá nhà tuyển dụng để hoàn tất ca.',
  'worker.postPaymentRating.banner.body':
    'Đánh giá giúp các bạn làm khác có thông tin trước khi nhận ca.',
  'worker.postPaymentRating.banner.button': 'Đánh giá ngay',

  // -------------------------------------------------------------------------
  // checkpoint-readiness-phase-1 (Task 4.1) - About page + Partners content.
  // Static brand copy moved out of the page/component into the dictionary so
  // NavBar/MobileNav/Footer-style single-source consistency also applies to
  // /about. Wording is intentionally soft ("hướng tới", "được xây dựng để",
  // "mong muốn", "định hướng") and makes NO unverified/strong claims (R5.2/
  // R5.3). All partner groups are presented as potential/directional only
  // (R6.2/R6.3/R6.4) - no real brand names or logos.
  // -------------------------------------------------------------------------
  'about.intro':
    'CaLẻ là sản phẩm của CaLedo Tech - đội ngũ Việt Nam mong muốn xây dựng một nền tảng kết nối ca làm ngắn hạn cho người lao động linh hoạt và nhà tuyển dụng địa phương.',

  'about.vision.title': 'Tầm nhìn',
  'about.vision.body':
    'CaLẻ hướng tới một thị trường ca làm ngắn hạn nơi mỗi giờ làm việc đều minh bạch và đáng tin. Chúng tôi mong muốn người lao động linh hoạt và nhà tuyển dụng địa phương có thể tìm thấy nhau một cách rõ ràng về giờ giấc, mức lương và kỳ vọng - thay vì dựa vào các kênh tin nhắn rời rạc.',

  'about.mission.title': 'Sứ mệnh',
  'about.mission.body':
    'CaLẻ được xây dựng để giúp người lao động nhận ca minh bạch về giờ giấc, mức lương, địa điểm, và giúp nhà tuyển dụng tìm được người phù hợp một cách an toàn. Chúng tôi mong muốn giảm bớt rủi ro cho cả hai phía trong mỗi ca làm ngắn hạn.',

  'about.values.title': 'Giá trị cốt lõi',
  'about.values.item.transparency':
    'Minh bạch: thông tin ca làm, mức lương và kỳ vọng được nêu rõ trước khi nhận ca.',
  'about.values.item.twoWayTrust':
    'Tin cậy hai chiều: cả người lao động và nhà tuyển dụng đều có hồ sơ và điểm uy tín.',
  'about.values.item.safety':
    'An toàn: quy trình huỷ ca, xác minh và xử lý tranh chấp được thiết kế để bảo vệ cả hai bên.',
  'about.values.item.userCentric':
    'Lấy người dùng làm trung tâm: hỗ trợ tiếng Việt, phù hợp với nhịp làm việc linh hoạt tại Việt Nam.',

  'about.trust.title': 'Cách chúng tôi xây dựng niềm tin',
  'about.trust.item.payment':
    'Đảm bảo thanh toán trước khi ca được công khai để đảm bảo người lao động nhận đúng tiền công.',
  'about.trust.item.reputation':
    'Điểm uy tín hai chiều: cả người lao động và nhà tuyển dụng đều có hồ sơ minh bạch.',
  'about.trust.item.cancellation':
    'Quy trình huỷ ca rõ ràng để hạn chế rủi ro cho cả hai bên.',
  'about.trust.item.support':
    'Hỗ trợ tiếng Việt từ đội ngũ tại Hà Nội.',

  'about.team.title': 'Đội ngũ sáng lập',
  'about.team.body':
    'CaLẻ được phát triển bởi CaLedo Tech - một đội ngũ tại Việt Nam mong muốn đưa các công cụ làm việc ngắn hạn đến gần hơn với thị trường lao động trong nước. Chúng tôi đặc biệt hướng tới các bạn cần ca linh hoạt theo lịch học hoặc lịch cá nhân, và các chủ quán/cửa hàng cần người lao động bù trong giờ cao điểm.',

  'about.version.title': 'Phiên bản hiện tại',
  'about.version.body':
    'Đây là phiên bản dùng thử. Mọi giao dịch tiền tệ trên ứng dụng đều là mô phỏng - chưa kết nối với hệ thống thanh toán thực. Khi sản phẩm chính thức ra mắt, chúng tôi sẽ thông báo trước cho người dùng đã đăng ký.',

  // About > Partners (R6). The intro states plainly that CaLẻ has no
  // established partnerships yet; the badge marks every group as
  // potential/directional. Group names are generic categories only.
  'about.partners.title': 'Đối tác tiềm năng & định hướng hợp tác',
  'about.partners.intro':
    'CaLẻ đang trong giai đoạn đầu và chưa xác lập quan hệ đối tác chính thức. Các nhóm dưới đây là những hướng hợp tác mà chúng tôi mong muốn xây dựng trong tương lai.',
  'about.partners.disclaimerEmphasis': 'chưa xác lập quan hệ đối tác chính thức',
  'about.partners.empty': 'Nội dung đang được cập nhật.',
  'about.partners.badge.directional': 'Đối tác tiềm năng / định hướng',
  'about.partners.group.universities':
    'Trường đại học & phòng công tác sinh viên',
  'about.partners.group.fnb': 'Nhà hàng, quán café & chuỗi F&B',
  'about.partners.group.events': 'Đơn vị tổ chức sự kiện',
  'about.partners.group.weddings': 'Dịch vụ tiệc cưới',
  'about.partners.group.payments': 'Cổng thanh toán',
  'about.partners.group.seasonal': 'Doanh nghiệp thời vụ',
  'about.partners.group.verification': 'Đối tác xác minh & an toàn',
};

// ---------------------------------------------------------------------------
// Lookup helper
// ---------------------------------------------------------------------------

/**
 * Look up a Vietnamese string by key.
 *
 * Falls back to the key itself so the UI never renders `undefined`. In
 * development, an unknown key triggers a `console.warn` so missing
 * translations are caught early.
 */
export function t(key: string): string {
  const value = vi[key];
  if (value === undefined) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[i18n] missing key: "${key}"`);
    }
    return key;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Typed helper maps for status → label lookups
// ---------------------------------------------------------------------------

import type {
  ApplicationStatus,
  DisputeStatus,
  EscrowStatus,
  NotificationKind,
  ShiftStatus,
} from '@/types';

export function shiftStatusLabel(status: ShiftStatus): string {
  return t(`shift.status.${status}`);
}

export function escrowLabel(status: EscrowStatus): string {
  return t(`escrow.${status}`);
}

export function applicationStatusLabel(status: ApplicationStatus): string {
  return t(`application.status.${status}`);
}

export function disputeStatusLabel(status: DisputeStatus): string {
  return t(`dispute.status.${status}`);
}

export function notificationKindLabel(kind: NotificationKind): string {
  return t(`notification.kind.${kind}`);
}

// ---------------------------------------------------------------------------
// Phase 10C - Evidence label + checklist template helpers
// ---------------------------------------------------------------------------

import type { EvidenceRequirement } from '@/types';

/**
 * Vietnamese display labels for every `EvidenceRequirement` literal.
 * Each label is 1–80 characters, contains at least one diacritic, and
 * is not an English fallback (Requirement 1.7).
 *
 * Backed by the `evidence.requirement.*` keys above so consumers can
 * either read this map directly or call `t('evidence.requirement.<lit>')`
 * - both routes return the same string.
 */
export const EVIDENCE_REQUIREMENT_LABELS: Record<EvidenceRequirement, string> = {
  None: t('evidence.requirement.None'),
  ChecklistOnly: t('evidence.requirement.ChecklistOnly'),
  OptionalPhoto: t('evidence.requirement.OptionalPhoto'),
  RequiredPhoto: t('evidence.requirement.RequiredPhoto'),
  RequiredHandoverChecklist: t('evidence.requirement.RequiredHandoverChecklist'),
};

export function evidenceRequirementLabel(
  requirement: EvidenceRequirement,
): string {
  return EVIDENCE_REQUIREMENT_LABELS[requirement];
}

/**
 * Static Vietnamese checklist template per `EvidenceRequirement`. The
 * worker `CheckoutDialog` renders one tickable row per entry; the
 * length of the array drives the validator's "every visible item
 * ticked" rule.
 *
 * `'None'` carries no checklist rows; `'OptionalPhoto'` and
 * `'ChecklistOnly'` share a 2-row template; `'RequiredPhoto'` adds
 * one photo-handover row; `'RequiredHandoverChecklist'` adds a
 * handover-note row.
 */
export const CHECKOUT_CHECKLIST_ITEMS_VI: Record<EvidenceRequirement, string[]> = {
  None: [],
  ChecklistOnly: [
    'Đã hoàn thành công việc theo mô tả ca làm.',
    'Đã thông báo nhà tuyển dụng kết quả ca làm.',
  ],
  OptionalPhoto: [
    'Đã hoàn thành công việc theo mô tả ca làm.',
    'Đã thông báo nhà tuyển dụng kết quả ca làm.',
  ],
  RequiredPhoto: [
    'Đã hoàn thành công việc theo mô tả ca làm.',
    'Đã chụp ảnh bàn giao khu vực làm việc.',
    'Đã thông báo nhà tuyển dụng kết quả ca làm.',
  ],
  RequiredHandoverChecklist: [
    'Đã hoàn thành công việc theo mô tả ca làm.',
    'Đã bàn giao khu vực và dụng cụ.',
    'Đã viết ghi chú bàn giao đầy đủ.',
  ],
};
