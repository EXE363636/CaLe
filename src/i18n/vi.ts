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
  'error.password.tooShort': 'Mật khẩu phải có ít nhất 8 ký tự.',
  'error.phone.invalid': 'Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam.',
  'error.date.invalid': 'Ngày không hợp lệ.',
  'error.date.past': 'Ngày làm phải là ngày trong tương lai.',
  'error.time.invalid': 'Giờ không hợp lệ (định dạng HH:mm).',
  'error.time.endBeforeStart': 'Giờ kết thúc phải sau giờ bắt đầu.',
  'error.wage.invalid': 'Lương phải là số dương.',
  'error.positions.invalid': 'Số lượng người cần phải ít nhất là 1.',
  'error.generic': 'Đã có lỗi xảy ra. Vui lòng thử lại.',

  // -------------------------------------------------------------------------
  // Apply / application errors
  // -------------------------------------------------------------------------
  'apply.error.VERIFICATION_REQUIRED': 'Bạn cần xác minh số điện thoại trước khi ứng tuyển.',
  'apply.error.REPUTATION_TOO_LOW':
    'Điểm uy tín của bạn quá thấp (dưới 50). Vui lòng hoàn thành các ca làm để tăng điểm.',
  'apply.error.CONFLICT':
    'Bạn đã có ca làm trùng giờ. Vui lòng kiểm tra lịch của bạn.',
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
  'admin.error.CANNOT_SUSPEND_SELF':
    'Bạn không thể tạm khoá chính tài khoản đang đăng nhập.',
  'admin.error.CANNOT_SUSPEND_LAST_ADMIN':
    'Không thể tạm khoá quản trị viên đang hoạt động cuối cùng.',
  'admin.user.currentAccount': 'Tài khoản hiện tại',

  // -------------------------------------------------------------------------
  // Shift / store action errors
  // -------------------------------------------------------------------------
  'shift.error.NOT_FOUND': 'Không tìm thấy ca làm.',
  'shift.error.TOO_LATE':
    'Không thể thực hiện thao tác này trong vòng 24 giờ trước khi ca bắt đầu.',
  'application.error.APPLICATION_NOT_FOUND': 'Không tìm thấy đơn ứng tuyển.',
  'application.error.WRONG_STATUS': 'Trạng thái đơn ứng tuyển không phù hợp.',

  // -------------------------------------------------------------------------
  // Landing page
  // -------------------------------------------------------------------------
  'landing.hero.title': 'Tìm người làm ngay hôm nay',
  'landing.hero.subtitle':
    'Nền tảng kết nối nhà tuyển dụng với sinh viên và người tìm việc linh hoạt tại Việt Nam.',
  'landing.cta.employer': 'Đăng ca cần tuyển',
  'landing.cta.worker': 'Tìm ca làm ngay',
  'landing.cta.registerEmployer': 'Đăng ký Nhà tuyển dụng',
  'landing.cta.registerWorker': 'Đăng ký Người làm',

  'landing.employer.title': 'Dành cho Nhà tuyển dụng',
  'landing.employer.benefit1': 'Tìm người nhanh',
  'landing.employer.benefit1.desc': 'Đăng ca và nhận đơn ứng tuyển trong vài giờ.',
  'landing.employer.benefit2': 'Thanh toán an toàn',
  'landing.employer.benefit2.desc': 'Tiền được giữ trong hệ thống, chỉ giải ngân khi hoàn thành.',
  'landing.employer.benefit3': 'Đánh giá uy tín',
  'landing.employer.benefit3.desc': 'Xem điểm uy tín và lịch sử làm việc của người làm.',

  'landing.worker.title': 'Dành cho Người làm',
  'landing.worker.benefit1': 'Làm linh hoạt',
  'landing.worker.benefit1.desc': 'Chọn ca theo lịch của bạn, không ràng buộc.',
  'landing.worker.benefit2': 'Nhận tiền nhanh',
  'landing.worker.benefit2.desc': 'Tiền công được chuyển ngay sau khi ca được xác nhận.',
  'landing.worker.benefit3': 'Không cần đặt cọc',
  'landing.worker.benefit3.desc': 'Người làm không cần đặt cọc bất kỳ khoản tiền nào.',

  'landing.howItWorks.title': 'Cách hoạt động',
  'landing.howItWorks.employer.step1': 'Đăng ca làm với đầy đủ thông tin',
  'landing.howItWorks.employer.step2': 'Đặt cọc tiền lương vào hệ thống',
  'landing.howItWorks.employer.step3': 'Duyệt người làm và xác nhận hoàn thành',
  'landing.howItWorks.worker.step1': 'Tạo hồ sơ và xác minh số điện thoại',
  'landing.howItWorks.worker.step2': 'Tìm và ứng tuyển ca làm phù hợp',
  'landing.howItWorks.worker.step3': 'Làm việc, check-in/out và nhận tiền',

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

  // -------------------------------------------------------------------------
  // Worker dashboard
  // -------------------------------------------------------------------------
  'worker.dashboard.title': 'Bảng điều khiển',
  'worker.dashboard.welcome': 'Xin chào',
  'worker.dashboard.stats.completedShifts': 'Ca đã hoàn thành',
  'worker.dashboard.stats.totalEarnings': 'Tổng thu nhập',
  'worker.dashboard.stats.reputationScore': 'Điểm uy tín',
  'worker.dashboard.stats.avgRating': 'Đánh giá trung bình',
  'worker.dashboard.upcomingShifts': 'Ca làm sắp tới',
  'worker.dashboard.appliedShifts': 'Đơn đã ứng tuyển',
  'worker.dashboard.noUpcomingShifts': 'Bạn chưa có ca làm nào sắp tới.',
  'worker.dashboard.noApplications': 'Bạn chưa ứng tuyển ca làm nào.',
  'worker.dashboard.restricted':
    'Tài khoản bị hạn chế do điểm uy tín dưới 50. Hãy hoàn thành các ca làm để tăng điểm.',

  // -------------------------------------------------------------------------
  // Employer dashboard
  // -------------------------------------------------------------------------
  'employer.dashboard.title': 'Bảng điều khiển',
  'employer.dashboard.stats.postedShifts': 'Ca đã đăng',
  'employer.dashboard.stats.completedShifts': 'Ca đã hoàn thành',
  'employer.dashboard.stats.totalDeposited': 'Tổng đã đặt cọc',
  'employer.dashboard.stats.totalPaidOut': 'Tổng đã thanh toán',
  'employer.dashboard.stats.avgRating': 'Đánh giá trung bình đã cho',
  'employer.dashboard.stats.boostCredits': 'Lượt boost còn lại',
  'employer.dashboard.upcomingShifts': 'Ca làm sắp tới',
  'employer.dashboard.noShifts': 'Bạn chưa đăng ca làm nào.',
  'employer.dashboard.applicants': 'Đơn ứng tuyển',
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
