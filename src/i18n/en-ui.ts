/**
 * English dictionary — đợt UI (02/10): thanh bước vòng đời (`ShiftJourney`), "còn bao
 * lâu" ở dashboard người lao động, chợ ca trống (`OpenShiftsEmpty`), nút trang vai trò.
 *
 * Gộp vào `en` / `enText` trong `en.ts` sau `enRoles`. Cùng quy ước: không ghi đè
 * câu đợt trước, tiền tệ viết `đ`; câu "(mô phỏng)" chỉ ở chế độ demo.
 */

export const enUi: Record<string, string> = {};

export const enUiText: Record<string, string> = {
  // ShiftJourney
  'Tiến trình ca': 'Shift progress',
  'Đã đăng': 'Posted',
  'Đã duyệt': 'Approved',
  'đã xong': 'done',
  'đang ở bước này': 'current step',
  'chưa tới': 'not yet',
  'ca dừng ở đây': 'the shift stopped here',

  // Dashboard người lao động: "còn bao lâu" dưới thẻ ca sắp tới
  'Bắt đầu sau {d} ngày {h} giờ': 'Starts in {d} days {h} hours',
  'Bắt đầu sau {h} giờ {m} phút': 'Starts in {h} hours {m} minutes',
  'Bắt đầu sau {m} phút': 'Starts in {m} minutes',

  // OpenShiftsEmpty
  'Khi có ca mới': 'When a new shift is posted',
  'Nhà tuyển dụng đăng ca và giữ trước đủ tiền công trên CaLẻ.':
    'The employer posts the shift and sets aside the full wages on CaLẻ.',
  'Nhà tuyển dụng đăng ca và giữ trước tiền công (mô phỏng).':
    'The employer posts the shift and sets aside the wages (simulated).',
  'Ca hiện ở đây, kèm tổng tiền cả ca, giờ làm và địa điểm.':
    'It appears here with the total pay, the hours and the location.',
  'Bạn ứng tuyển, được duyệt và đi làm; xong ca, tiền công vào ví của bạn.':
    'You apply, get approved and work the shift; afterwards the wages go into your wallet.',
  'Bạn ứng tuyển, được duyệt và đi làm; xong ca, tiền công vào ví (mô phỏng).':
    'You apply, get approved and work the shift; afterwards the wages go into your wallet (simulated).',
  'Thêm giờ rảnh của bạn': 'Add your free time',
  'Có ca hợp lịch, CaLẻ gợi ý cho bạn trước.': 'When a shift fits your schedule, CaLẻ suggests it to you first.',
  'Tạo tài khoản người lao động': 'Create a worker account',
  'Miễn phí, chỉ mất một phút.': 'It’s free and takes a minute.',
  'Cách CaLẻ hoạt động': 'How CaLẻ works',

  // RoleHomeCta (/for-workers, /for-employers khi đã đăng nhập)
  'Về trang của bạn': 'Go to your dashboard',
  'Về trang tổng quan': 'Go to overview',
};
