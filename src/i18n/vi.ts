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
  'site.name': 'CaLẻ / ShiftNow',
  'site.tagline': 'Nền tảng ca làm ngắn hạn tại Việt Nam',
  'site.description':
    'Kết nối nhà tuyển dụng cần người làm tạm thời với sinh viên và người tìm việc linh hoạt.',

  // -------------------------------------------------------------------------
  // Roles
  // -------------------------------------------------------------------------
  'role.worker': 'Người làm',
  'role.employer': 'Nhà tuyển dụng',
  'role.admin': 'Quản trị viên',

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  'nav.home': 'Trang chủ',
  'nav.shifts': 'Tìm ca làm',
  'nav.dashboard': 'Bảng điều khiển',
  'nav.profile': 'Hồ sơ',
  'nav.login': 'Đăng nhập',
  'nav.register': 'Đăng ký',
  'nav.logout': 'Đăng xuất',
  'nav.postShift': 'Đăng ca tuyển',
  'nav.notifications': 'Thông báo',
  'nav.admin': 'Quản trị',
  'nav.schedule': 'Lịch cá nhân',
  'nav.employerSchedule': 'Lịch tuyển dụng',

  // -------------------------------------------------------------------------
  // Buttons
  // -------------------------------------------------------------------------
  'btn.apply': 'Ứng tuyển',
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
  'btn.confirmCompletion': 'Xác nhận hoàn thành',
  'btn.reportIssue': 'Báo cáo vấn đề',
  'btn.deposit': 'Mô phỏng đặt cọc',
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

  // -------------------------------------------------------------------------
  // Escrow / payment statuses
  // -------------------------------------------------------------------------
  'escrow.PendingDeposit': 'Chờ đặt cọc',
  'escrow.Deposited': 'Đã đặt cọc',
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
  'application.status.CancelledByWorker': 'Người làm đã huỷ',
  'application.status.CancellationRequested': 'Yêu cầu huỷ',
  'application.status.NoShow': 'Vắng mặt',
  'application.status.CheckedIn': 'Đã check-in',
  'application.status.CheckedOut': 'Đã check-out',
  'application.status.Confirmed': 'Đã xác nhận',

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
  'notification.kind.WorkerCancelled': 'Người làm đã huỷ',
  'notification.kind.CancellationRequested': 'Yêu cầu huỷ',
  'notification.kind.CancellationApproved': 'Yêu cầu huỷ được chấp nhận',
  'notification.kind.CancellationRejected': 'Yêu cầu huỷ bị từ chối',
  'notification.kind.ReputationAdjusted': 'Điều chỉnh điểm uy tín',
  'notification.kind.EmployerFeedbackReceived': 'Đánh giá từ người làm',
  'notification.kind.DisputeResolved': 'Tranh chấp đã giải quyết',

  // -------------------------------------------------------------------------
  // Verification statuses
  // -------------------------------------------------------------------------
  'verification.phone': 'Đã xác minh SĐT',
  'verification.id': 'Đã xác minh CMND/CCCD',
  'verification.student': 'Đã xác minh thẻ sinh viên',
  'verification.none': 'Chưa xác minh',
  'verification.notVerified': 'Chưa xác minh số điện thoại',
  'verification.required': 'Bạn cần xác minh số điện thoại trước khi ứng tuyển.',

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
  'form.hourlyWage': 'Lương theo giờ (₫)',
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
  'error.date.invalid': 'Ngày không hợp lệ.',
  'error.date.past': 'Ngày làm phải là ngày trong tương lai.',
  'error.time.invalid': 'Giờ không hợp lệ (định dạng HH:mm).',
  'error.time.endBeforeStart': 'Giờ kết thúc phải sau giờ bắt đầu.',
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
  'apply.error.WORKER_NOT_FOUND': 'Không tìm thấy tài khoản người làm.',
  'apply.error.NOT_PUBLISHED': 'Ca làm này chưa được đăng công khai.',

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
  'admin.error.NOT_A_WORKER': 'Tài khoản này không phải là người làm.',
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
  'admin.user.sortBy.reputation': 'Sắp xếp theo điểm uy tín ↓',
  'admin.user.currentScore': 'Điểm hiện tại',
  'admin.user.newScore': 'Điểm uy tín mới',
  'admin.user.scoreOutOfRange': 'Điểm uy tín phải là số nguyên từ 0 đến 100.',

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
  'cancel.request.employerHeading': 'Người làm yêu cầu huỷ ca',
  'cancel.request.employerHint':
    'Vì ca bắt đầu trong vòng 3 giờ, người làm cần bạn duyệt trước khi huỷ có hiệu lực.',

  // -------------------------------------------------------------------------
  // Worker personal schedule (Phase 5)
  // -------------------------------------------------------------------------
  'schedule.page.title': 'Lịch cá nhân',
  'schedule.page.subtitle':
    'Đánh dấu thời gian bận như giờ học, ca làm khác, việc cá nhân để tránh ứng tuyển trùng giờ.',
  'schedule.page.approvedShiftsNote':
    'Ca làm đã được duyệt cũng được tính là thời gian bận khi ứng tuyển.',
  'schedule.empty.title': 'Bạn chưa có lịch cá nhân.',
  'schedule.empty.description':
    'Thêm các khung giờ bạn không thể nhận ca để hệ thống chặn ứng tuyển trùng giờ.',
  'schedule.btn.add': 'Thêm lịch bận',
  'schedule.btn.confirmDelete': 'Xác nhận xoá',
  'schedule.dialog.addTitle': 'Thêm khung giờ bận',
  'schedule.dialog.editTitle': 'Cập nhật khung giờ bận',
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

  // Phase 5B — weekly timetable view
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
  'schedule.list.title': 'Tất cả lịch bận',
  'schedule.event.lockedLabel': 'Ca đã duyệt',
  'schedule.event.personalLabel': 'Lịch cá nhân',
  'schedule.empty.weekHint':
    'Không có lịch bận trong tuần này. Bấm vào ô trống để thêm.',

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
  'shift.error.TOO_LATE':
    'Không thể thực hiện thao tác này trong vòng 24 giờ trước khi ca bắt đầu.',
  'shift.cancelled.banner':
    'Ca làm này đã bị huỷ. Người làm có liên quan đã được thông báo.',
  'application.error.APPLICATION_NOT_FOUND': 'Không tìm thấy đơn ứng tuyển.',
  'application.error.WRONG_STATUS': 'Trạng thái đơn ứng tuyển không phù hợp.',

  // -------------------------------------------------------------------------
  // Landing page
  // -------------------------------------------------------------------------
  'landing.hero.badge': 'Sinh viên · Linh hoạt · Tin cậy',
  'landing.hero.title': 'Việc làm thêm ngắn hạn',
  'landing.hero.titleAccent': 'cho mọi sinh viên',
  'landing.hero.subtitle':
    'Nền tảng kết nối nhà tuyển dụng với sinh viên và người tìm việc linh hoạt tại Việt Nam. Đặt cọc minh bạch, đánh giá hai chiều, không cần ứng dụng tải về.',
  'landing.hero.trustHint':
    'Miễn phí đăng ký · Người làm không đặt cọc · Toàn bộ thanh toán giả lập trong MVP.',

  'landing.hero.featured.badge': 'Việc đang nổi bật',
  'landing.hero.featured.statusBadge': 'Đang tuyển',
  'landing.hero.featured.viewCta': 'Xem chi tiết',
  'landing.hero.featured.exploreCta': 'Khám phá ca làm',
  'landing.hero.featured.exploreAria': 'Khám phá ca làm trên CaLẻ / ShiftNow',
  'landing.hero.featured.fallbackTitle': 'Khám phá ca làm phù hợp',
  'landing.hero.featured.fallbackHint':
    'Hệ thống đang cập nhật ca làm. Bấm để xem danh sách đầy đủ.',
  'landing.hero.featured.repLabel': 'Điểm uy tín',
  'landing.hero.featured.repHint': '/ 100 — đáng tin cậy',
  'landing.hero.featured.upcomingLabel': 'Sắp diễn ra',
  'landing.hero.featured.upcomingDay': 'Thứ Bảy, 24/05',
  'landing.hero.featured.upcomingTime': 'Ca 14:00 – 18:00',
  'landing.cta.employer': 'Đăng ca cần tuyển',
  'landing.cta.worker': 'Tìm ca làm ngay',
  'landing.cta.registerEmployer': 'Đăng ký Nhà tuyển dụng',
  'landing.cta.registerWorker': 'Đăng ký Người làm',

  'landing.trust.escrow': 'Tiền giữ ký quỹ minh bạch',
  'landing.trust.noDeposit': 'Người làm không đặt cọc',
  'landing.trust.reputation': 'Hệ thống điểm uy tín',
  'landing.trust.schedule': 'Lịch cá nhân & lịch tuyển dụng',

  'landing.employer.title': 'Dành cho Nhà tuyển dụng',
  'landing.employer.lead':
    'Đăng ca, đặt cọc minh bạch, duyệt người làm và xác nhận hoàn thành — tất cả trên một nền tảng.',
  'landing.employer.benefit1': 'Tìm người nhanh',
  'landing.employer.benefit1.desc': 'Đăng ca và nhận đơn ứng tuyển trong vài giờ.',
  'landing.employer.benefit2': 'Thanh toán an toàn',
  'landing.employer.benefit2.desc': 'Tiền được giữ trong hệ thống, chỉ giải ngân khi hoàn thành.',
  'landing.employer.benefit3': 'Đánh giá uy tín',
  'landing.employer.benefit3.desc': 'Xem điểm uy tín và lịch sử làm việc của người làm.',

  'landing.worker.title': 'Dành cho Người làm',
  'landing.worker.lead':
    'Tìm ca làm phù hợp, ứng tuyển nhanh, nhận tiền sau khi hoàn thành — và xây dựng điểm uy tín cá nhân.',
  'landing.worker.benefit1': 'Làm linh hoạt',
  'landing.worker.benefit1.desc': 'Chọn ca theo lịch của bạn, không ràng buộc.',
  'landing.worker.benefit2': 'Nhận tiền nhanh',
  'landing.worker.benefit2.desc': 'Tiền công được chuyển ngay sau khi ca được xác nhận.',
  'landing.worker.benefit3': 'Không cần đặt cọc',
  'landing.worker.benefit3.desc': 'Người làm không cần đặt cọc bất kỳ khoản tiền nào.',

  'landing.howItWorks.title': 'Cách hoạt động',
  'landing.howItWorks.lead':
    'Quy trình ngắn gọn cho cả hai phía. Mọi bước đều có thông báo và trạng thái rõ ràng.',
  'landing.howItWorks.employer.step1': 'Đăng ca làm với đầy đủ thông tin',
  'landing.howItWorks.employer.step2': 'Đặt cọc tiền lương vào hệ thống',
  'landing.howItWorks.employer.step3': 'Duyệt người làm và xác nhận hoàn thành',
  'landing.howItWorks.worker.step1': 'Tạo hồ sơ và xác minh số điện thoại',
  'landing.howItWorks.worker.step2': 'Tìm và ứng tuyển ca làm phù hợp',
  'landing.howItWorks.worker.step3': 'Làm việc, check-in/out và nhận tiền',

  'landing.finalCta.title': 'Bắt đầu ngay hôm nay',
  'landing.finalCta.subtitle': 'Đăng ký miễn phí, không cần đặt cọc.',

  // -------------------------------------------------------------------------
  // Auth pages
  // -------------------------------------------------------------------------
  'auth.login.title': 'Đăng nhập',
  'auth.login.subtitle': 'Chào mừng bạn quay lại CaLẻ / ShiftNow',
  'auth.login.noAccount': 'Chưa có tài khoản?',
  'auth.register.title': 'Đăng ký tài khoản',
  'auth.register.subtitle': 'Tham gia CaLẻ / ShiftNow ngay hôm nay',
  'auth.register.hasAccount': 'Đã có tài khoản?',
  'auth.register.selectRole': 'Bạn muốn đăng ký với vai trò nào?',
  'auth.register.asWorker': 'Tôi muốn tìm ca làm',
  'auth.register.asEmployer': 'Tôi cần tuyển người làm',

  // Auth side panel (Phase 9 visual polish)
  'auth.side.welcome': 'Chào mừng quay lại',
  'auth.side.welcome.desc':
    'Đăng nhập để tiếp tục quản lý ca làm, đơn ứng tuyển và lịch cá nhân của bạn.',
  'auth.side.join': 'Tham gia CaLẻ / ShiftNow',
  'auth.side.join.desc':
    'Tạo tài khoản miễn phí trong vài phút. Phù hợp cho cả sinh viên tìm việc lẫn quán/sự kiện cần người làm linh hoạt.',
  'auth.side.benefit1': 'Thanh toán minh bạch',
  'auth.side.benefit1.desc': 'Nhà tuyển dụng đặt cọc trước, tiền chỉ giải ngân khi hoàn thành.',
  'auth.side.benefit2': 'Không phí ẩn',
  'auth.side.benefit2.desc': 'Người làm không đặt cọc. Đăng ký miễn phí.',
  'auth.side.benefit3': 'Điểm uy tín hai chiều',
  'auth.side.benefit3.desc': 'Đánh giá hai chiều giúp xây dựng cộng đồng tin cậy.',
  'auth.side.disclaimer':
    'Phiên bản MVP — toàn bộ thanh toán & xác minh đều giả lập, không có giao dịch thật.',

  // -------------------------------------------------------------------------
  // Worker dashboard
  // -------------------------------------------------------------------------
  'worker.dashboard.title': 'Bảng điều khiển',
  'worker.dashboard.welcome': 'Xin chào',
  'worker.dashboard.welcome.veteran':
    'Bạn đã hoàn thành {count} ca. Tiếp tục giữ phong độ nhé!',
  'worker.dashboard.welcome.newcomer': 'Sẵn sàng cho ca làm đầu tiên?',
  'worker.dashboard.cancelQuota': 'Hạn mức huỷ tuần',
  'worker.dashboard.cancelQuota.weekHint': 'còn lại',
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
  'employer.dashboard.title': 'Bảng điều khiển',
  'employer.dashboard.welcome.active':
    'Bạn đang có {count} ca làm hoạt động. Theo dõi trạng thái và đơn ứng tuyển bên dưới.',
  'employer.dashboard.welcome.idle':
    'Chưa có ca làm nào hoạt động. Đăng ca mới để bắt đầu nhận đơn ứng tuyển.',
  'employer.dashboard.stats.postedShifts': 'Ca đã đăng',
  'employer.dashboard.stats.activeShifts': 'Ca đang hoạt động',
  'employer.dashboard.stats.completedShifts': 'Ca đã hoàn thành',
  'employer.dashboard.stats.totalDeposited': 'Tổng đã đặt cọc',
  'employer.dashboard.stats.totalPaidOut': 'Tổng đã thanh toán',
  'employer.dashboard.stats.avgRating': 'Đánh giá trung bình đã cho',
  'employer.dashboard.stats.boostCredits': 'Lượt boost còn lại',
  'employer.dashboard.upcomingShifts': 'Ca làm sắp tới',
  'employer.dashboard.noShifts': 'Bạn chưa đăng ca làm nào.',
  'employer.dashboard.noShifts.hint':
    'Đăng ca mới chỉ mất vài phút. Hệ thống sẽ tự động giữ tiền đặt cọc và xử lý đơn ứng tuyển.',
  'employer.dashboard.applicants': 'Đơn chờ duyệt',
  'employer.dashboard.pendingApps': 'Đơn ứng tuyển chờ duyệt ({count})',
  'employer.applicant.viewProfile': 'Xem hồ sơ',
  'employer.applicant.fullProfile': 'Hồ sơ người làm',
  'employer.applicant.completedShifts': 'Ca hoàn thành',
  'employer.applicant.avgRating': 'Điểm đánh giá',
  'employer.applicant.noShows': 'Vắng mặt',
  'employer.applicant.cancellations': 'Lần huỷ',
  'employer.applicant.skills': 'Kỹ năng',
  'employer.applicant.preferredJobs': 'Loại công việc ưa thích',
  'employer.applicant.preferredLocations': 'Khu vực ưa thích',
  'employer.applicant.ratingHistory': 'Lịch sử đánh giá',
  'employer.applicant.bio': 'Giới thiệu',
  'employer.applicant.noBio': 'Người làm chưa thêm giới thiệu.',

  // -------------------------------------------------------------------------
  // Admin dashboard
  // -------------------------------------------------------------------------
  'admin.dashboard.title': 'Quản trị hệ thống',
  'admin.dashboard.eyebrow': 'Bảng điều khiển admin',
  'admin.dashboard.subtitle':
    'Theo dõi người dùng, ca làm, tranh chấp và các điều chỉnh thủ công. Override chỉ dùng khi cần xử lý ngoại lệ.',
  'admin.dashboard.badge': 'Chế độ admin',
  'admin.dashboard.tabs.users': 'Người dùng',
  'admin.dashboard.tabs.shifts': 'Ca làm',
  'admin.dashboard.tabs.disputes': 'Tranh chấp',
  'admin.dashboard.tabs.analytics': 'Thống kê',
  'admin.analytics.totalEmployers': 'Tổng nhà tuyển dụng',
  'admin.analytics.totalWorkers': 'Tổng người làm',
  'admin.analytics.totalShifts': 'Tổng ca đã đăng',
  'admin.analytics.completedShifts': 'Ca đã hoàn thành',
  'admin.analytics.activeDisputes': 'Tranh chấp đang mở',

  // -------------------------------------------------------------------------
  // Shift listing / detail
  // -------------------------------------------------------------------------
  'shifts.listing.title': 'Tìm ca làm',
  'shifts.listing.eyebrow': 'Khám phá ca làm',
  'shifts.listing.subtitle':
    'Tìm ca làm ngắn hạn phù hợp với lịch của bạn. Hệ thống chỉ hiển thị ca đã được nhà tuyển dụng đặt cọc.',
  'shifts.listing.matchSuffix': 'ca phù hợp',
  'shifts.listing.empty': 'Không tìm thấy ca làm phù hợp.',
  'shifts.listing.emptyHint': 'Thử thay đổi bộ lọc hoặc từ khoá tìm kiếm.',
  'shifts.detail.employer': 'Nhà tuyển dụng',
  'shifts.detail.positions': 'Số lượng cần',
  'shifts.detail.positionsFilled': 'Đã có người',
  'shifts.detail.positionsLeft': 'Còn trống',
  'shifts.detail.wage': 'Lương theo giờ',
  'shifts.detail.depositStatus': 'Trạng thái đặt cọc',
  'shifts.detail.requirements': 'Yêu cầu',
  'shifts.detail.fullyBooked': 'Ca này đã đủ người.',
  'shifts.detail.notPublished': 'Ca làm này chưa được đăng công khai.',
  'shifts.deposit.title': 'Mô phỏng đặt cọc',
  'shifts.new.subtitle':
    'Hoàn thành thông tin ca làm. Hệ thống sẽ tự động tính số tiền đặt cọc dựa trên độ uy tín nhà tuyển dụng.',
  'shifts.deposit.amount': 'Số tiền đặt cọc',
  'shifts.deposit.description':
    'Nhà tuyển dụng cần đặt cọc toàn bộ tiền lương trước khi ca được đăng công khai.',
  'shifts.deposit.success': 'Đặt cọc thành công! Ca làm đã được đăng.',

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
  'common.currency': '₫',
  'common.perHour': '/giờ',
  'common.hours': 'giờ',
  'common.positions': 'người',
  'common.stars': 'sao',
  'common.sessionExpired': 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'common.suspended': 'Tài khoản đã bị tạm khoá.',
  'common.restoredSeedData': 'Đã khôi phục dữ liệu mẫu.',
  'common.pageNotFound': 'Trang không tồn tại.',
  'common.backToHome': 'Về trang chủ',

  // -------------------------------------------------------------------------
  // Phase 6 — employer types
  // -------------------------------------------------------------------------
  'employerType.individual': 'Cá nhân / Freelance',
  'employerType.business': 'Doanh nghiệp',
  'employerType.individual.hint':
    'Nhà tuyển dụng cá nhân, không yêu cầu giấy phép kinh doanh.',
  'employerType.business.hint':
    'Doanh nghiệp đăng ký, có thể được xác minh để tăng độ uy tín.',

  // -------------------------------------------------------------------------
  // Phase 6 — deposit ratio explainer
  // -------------------------------------------------------------------------
  'deposit.trust.title': 'Tỷ lệ đặt cọc theo độ uy tín',
  'deposit.trust.low':
    'Độ uy tín: Thấp. Nhà tuyển dụng mới hoặc chưa xác minh.',
  'deposit.trust.medium':
    'Độ uy tín: Trung bình. Đã xác minh hoặc đã hoàn thành ít nhất 3 ca.',
  'deposit.trust.high':
    'Độ uy tín: Cao. Đã xác minh và hoàn thành ít nhất 5 ca.',
  'deposit.trust.label.low': 'Thấp',
  'deposit.trust.label.medium': 'Trung bình',
  'deposit.trust.label.high': 'Cao',
  'deposit.trust.ratio':
    'Bạn cần đặt cọc {percent}% tổng tiền lương trước khi đăng ca.',
  'deposit.breakdown.fullWage': 'Tổng tiền lương',
  'deposit.breakdown.trust': 'Độ uy tín',
  'deposit.breakdown.ratio': 'Tỷ lệ đặt cọc',
  'deposit.confirmPaid': 'Xác nhận đã thanh toán',

  // -------------------------------------------------------------------------
  // Phase 6 — rejection reason dialog
  // -------------------------------------------------------------------------
  'reject.dialog.title': 'Từ chối đơn ứng tuyển',
  'reject.dialog.intro':
    'Bạn sắp từ chối đơn ứng tuyển của {worker} cho ca "{shift}". Vui lòng cho biết lý do để người làm hiểu rõ.',
  'reject.dialog.reasonLabel': 'Lý do từ chối',
  'reject.dialog.reasonPlaceholder':
    'Ví dụ: Không phù hợp kinh nghiệm, đã đủ người, lịch không khớp...',
  'reject.dialog.confirm': 'Xác nhận từ chối',
  'reject.error.reasonRequired': 'Vui lòng nhập lý do từ chối.',

  // -------------------------------------------------------------------------
  // Phase 6 — worker dashboard additions
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
  // Phase 6 — employer feedback (worker → employer)
  // -------------------------------------------------------------------------
  'employerFeedback.title': 'Đánh giá từ người làm',
  'employerFeedback.empty': 'Chưa có đánh giá nào từ người làm.',
  'employerFeedback.formIntro':
    'Đánh giá nhà tuyển dụng giúp cộng đồng người làm yên tâm hơn khi ứng tuyển.',
  'employerFeedback.tagsLabel': 'Đánh giá nhanh (tuỳ chọn)',
  'employerFeedback.commentLabel': 'Nhận xét (tuỳ chọn)',
  'employerFeedback.commentPlaceholder':
    'Chia sẻ trải nghiệm làm việc với nhà tuyển dụng...',
  'employerFeedback.tag.PaidOnTime': 'Trả lương đúng cam kết',
  'employerFeedback.tag.GoodEnvironment': 'Môi trường tốt',
  'employerFeedback.tag.ClearCommunication': 'Giao tiếp rõ ràng',
  'employerFeedback.tag.AccurateDescription': 'Công việc đúng mô tả',

  // -------------------------------------------------------------------------
  // Phase 7 — admin shifts panel polish
  // -------------------------------------------------------------------------
  'admin.shifts.autoNote':
    'Trạng thái ca được hệ thống tự động cập nhật theo thời gian, đặt cọc và tiến độ ứng tuyển. Override chỉ dùng khi cần xử lý ngoại lệ.',
  'admin.shifts.lastSync': 'Đồng bộ trạng thái lần cuối: {when}',
  'admin.shifts.override': 'Override (khẩn cấp)',

  // -------------------------------------------------------------------------
  // Phase 7 — employer schedule
  // -------------------------------------------------------------------------
  'employerSchedule.page.title': 'Lịch tuyển dụng',
  'employerSchedule.page.subtitle':
    'Xem các ca làm bạn đã đăng theo tuần. Bấm vào ca để vào trang quản lý.',
  'employerSchedule.empty.weekHint':
    'Không có ca làm trong tuần này. Bấm "Đăng ca cần tuyển" để thêm ca mới.',
  'employer.dashboard.viewSchedule': 'Xem lịch tuyển dụng',

  // -------------------------------------------------------------------------
  // Phase 8 — calendar shell (worker + employer)
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
  'calendar.legend.worker.personalBusy': 'Lịch bận cá nhân',
  'calendar.legend.worker.approvedShift': 'Ca đã duyệt',
  'calendar.legend.worker.pendingShift': 'Ca đang chờ duyệt',
  'calendar.legend.employer.published': 'Đã đăng',
  'calendar.legend.employer.fullyBooked': 'Đã đủ vị trí',
  'calendar.legend.employer.awaiting': 'Chờ xác nhận',
  'calendar.legend.employer.completed': 'Đã hoàn thành',
  'calendar.legend.employer.cancelled': 'Đã huỷ',
  'calendar.legend.employer.expired': 'Đã quá hạn',
  'calendar.empty.worker': 'Không có lịch bận hoặc ca làm trong khoảng thời gian này.',
  'calendar.empty.employer': 'Bạn chưa đăng ca làm nào trong khoảng thời gian này.',
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
