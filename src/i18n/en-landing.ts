/**
 * English dictionary — trang vai trò mở rộng (02/10): `/for-employers`,
 * `/for-workers` và ảnh minh hoạ giao diện (`LandingPreview`).
 *
 * Gộp vào `enText` trong `en.ts` sau `enUiText`. Câu "(mô phỏng)" chỉ hiện ở chế
 * độ demo; câu production nói đúng luồng tiền thật. Tiền tệ viết `đ`.
 * ⚠️ Bản dịch do AI viết — nhờ người đọc lại trước khi quảng bá.
 */

export const enLandingText: Record<string, string> = {
  // --- /for-employers ------------------------------------------------------------------
  'Tiền công được giữ trên CaLẻ khi đăng ca và chỉ trả cho người thật sự làm.':
    'Wages are held on CaLẻ when you post and paid only to the people who actually work.',
  'Tiền công được giữ khi đăng ca (mô phỏng) và chỉ trả cho người thật sự làm.':
    'Wages are held when you post (simulated) and paid only to the people who actually work.',
  'Đăng ca miễn phí': 'Free to post shifts',
  'Duyệt từng người': 'Approve each person',
  'Phí 10% chỉ trên phần ca có người làm': '10% fee only on the part of the shift that was worked',
  'Chưa thu phí trong giai đoạn thử nghiệm': 'No fees during the trial',
  'Từ lúc đăng ca đến lúc trả tiền': 'From posting a shift to paying for it',
  'Mỗi ca đi qua cùng một quy trình, và bạn luôn thấy ca đang ở bước nào.':
    'Every shift goes through the same steps, and you can always see which step it is at.',
  'Đăng ca và giữ tiền công': 'Post the shift and hold the wages',
  'Nhập giờ, số người, mức lương. Tiền công cộng phí được giữ từ ví; ca chỉ hiện cho người lao động khi đã giữ đủ.':
    'Enter the hours, headcount and pay. The wages plus the fee are held from your wallet; workers only see the shift once the full amount is held.',
  'Nhập giờ, số người, mức lương. Tiền công được giữ từ ví (mô phỏng); ca chỉ hiện cho người lao động khi đã giữ đủ.':
    'Enter the hours, headcount and pay. The wages are held from your wallet (simulated); workers only see the shift once the full amount is held.',
  'Duyệt người phù hợp': 'Approve the right people',
  'Xem hồ sơ, kỹ năng, đánh giá và trạng thái xác minh của từng người ứng tuyển rồi mới nhận.':
    'Check each applicant’s profile, skills, reviews and verification status before you accept them.',
  'Theo dõi ngày làm': 'Follow the work day',
  'Người lao động check-in khi đến, bạn xác nhận có mặt. Ai không đến, bạn đánh dấu vắng mặt.':
    'Workers check in when they arrive and you confirm they are present. Anyone who doesn’t show up, you mark absent.',
  'Xác nhận và trả công': 'Confirm and pay',
  'Bấm xác nhận hoàn thành là tiền công vào ví người làm. Không thao tác thì hệ thống tự chốt sau 24 giờ kể từ khi ca kết thúc.':
    'Tap confirm completion and the wages go into the worker’s wallet. If you do nothing, the system settles the shift 24 hours after it ends.',
  'Bấm xác nhận hoàn thành là tiền công được ghi vào ví người làm (mô phỏng).':
    'Tap confirm completion and the wages are recorded in the worker’s wallet (simulated).',
  'Tiền của bạn đi đâu': 'Where your money goes',
  'Ví dụ một ca có tiền công 200.000 đ. Phí 10% chỉ tính trên phần ca có người làm.':
    'Example: a shift with 200.000 đ in wages. The 10% fee only applies to the part of the shift that was worked.',
  'Ví dụ một ca có tiền công 200.000 đ. Bản demo chưa thu phí và mọi khoản tiền đều là mô phỏng.':
    'Example: a shift with 200.000 đ in wages. The demo charges no fee and all money is simulated.',
  'Khi đăng ca': 'When you post',
  'được giữ từ ví: 200.000 đ tiền công + 20.000 đ phí.': 'held from your wallet: 200.000 đ wages + 20.000 đ fee.',
  'được giữ từ ví (mô phỏng).': 'held from your wallet (simulated).',
  'Khi ca xong': 'When the shift is done',
  'vào ví người lao động. 20.000 đ còn lại là phí CaLẻ.': 'goes to the worker’s wallet. The remaining 20.000 đ is the CaLẻ fee.',
  'được ghi vào ví người lao động (mô phỏng).': 'is recorded in the worker’s wallet (simulated).',
  'Nếu không dùng hết': 'If it isn’t all used',
  'Hoàn về ví': 'Back to your wallet',
  'Vị trí trống, người vắng mặt, ca huỷ: hoàn cả tiền công lẫn phí của phần đó.':
    'Unfilled positions, no-shows, cancelled shifts: both the wages and the fee for that part are refunded.',
  'Vị trí trống, người vắng mặt, ca huỷ: hoàn phần tiền đó (mô phỏng).':
    'Unfilled positions, no-shows, cancelled shifts: that part of the money is refunded (simulated).',
  'Huỷ ca': 'Cancelling a shift',
  'Còn hơn 6 giờ nữa mới bắt đầu: bạn huỷ được.': 'More than 6 hours before the start: you can cancel.',
  'Trong vòng 6 giờ, nếu đã có người ứng tuyển: không huỷ được, để bảo vệ người lao động.':
    'Within 6 hours, if anyone has applied: you cannot cancel, to protect workers.',
  'Sau giờ bắt đầu: không huỷ được.': 'After the start time: you cannot cancel.',
  'Nạp tiền vào ví bằng chuyển khoản qua PayOS. Số dư rút về ngân hàng khi cần.':
    'Top up your wallet by bank transfer through PayOS. Withdraw the balance to your bank whenever you need.',
  'Bạn nắm được mọi thứ trong ca': 'You stay on top of every shift',
  'Không phải gọi điện hỏi từng người: thông tin nằm sẵn trên trang quản lý ca.':
    'No need to call each person: everything is on the shift management page.',
  'Hồ sơ trước khi duyệt': 'Profiles before you approve',
  'Kỹ năng, đánh giá từ nhà tuyển dụng khác và trạng thái xác minh SĐT, CCCD của từng người.':
    'Each person’s skills, reviews from other employers and phone / ID card verification status.',
  'Trạng thái ca rõ ràng': 'Clear shift status',
  'Mỗi ca có một nhãn trạng thái thống nhất ở mọi trang: đã đăng, sắp bắt đầu, đang diễn ra, chờ xác nhận, hoàn thành.':
    'Every shift has one consistent status label on every page: posted, starting soon, in progress, awaiting confirmation, completed.',
  'Ai có mặt, ai vắng': 'Who showed up, who didn’t',
  'Check-in của người lao động và xác nhận có mặt của bạn được ghi lại cho từng người.':
    'Each worker’s check-in and your presence confirmation are recorded per person.',
  'Xem các ca đã đăng theo tuần hoặc theo ngày, bấm vào là tới trang quản lý.':
    'See your posted shifts by week or by day; tap one to manage it.',
  'Đăng lại ca cũ': 'Repost an old shift',
  'Ca lặp lại hằng tuần? Tạo ca mới từ ca cũ, chỉ cần chọn lại ngày giờ.':
    'Same shift every week? Create a new one from an old shift and just pick the new date and time.',
  'Ví có lịch sử': 'A wallet with history',
  'Mỗi khoản giữ, trả, hoàn đều có một dòng trong lịch sử ví.': 'Every hold, payment and refund has its own line in the wallet history.',
  'Mỗi khoản giữ, trả, hoàn đều có một dòng trong lịch sử ví (mô phỏng).':
    'Every hold, payment and refund has its own line in the wallet history (simulated).',
  'Xem tất cả câu hỏi': 'See all questions',
  'Đăng ca có mất phí không?': 'Does posting a shift cost anything?',
  'Đăng ca và duyệt người miễn phí. Phí 10% chỉ tính trên tiền công của phần ca có người làm.':
    'Posting shifts and approving people is free. The 10% fee only applies to the wages for the part of the shift that was worked.',
  'Trong giai đoạn thử nghiệm, CaLẻ chưa thu phí và mọi giao dịch đều là mô phỏng.':
    'During the trial, CaLẻ charges no fees and all transactions are simulated.',
  'Khi bạn xác nhận hoàn thành ca, tiền công được ghi vào ví người làm (mô phỏng).':
    'When you confirm the shift is completed, the wages are recorded in the worker’s wallet (simulated).',
  'Người lao động không đến thì sao?': 'What if a worker doesn’t show up?',
  'Bạn đánh dấu vắng mặt. Người đó không nhận tiền công; phần tiền giữ cho vị trí đó, kể cả phí, hoàn về ví của bạn khi ca chốt.':
    'You mark them absent. They are not paid; the money held for that position, including the fee, returns to your wallet when the shift is settled.',
  'Bạn đánh dấu vắng mặt. Người đó không nhận tiền công; phần tiền giữ cho vị trí đó hoàn về ví của bạn (mô phỏng).':
    'You mark them absent. They are not paid; the money held for that position returns to your wallet (simulated).',
  'Tôi cần chuẩn bị gì để đăng ca?': 'What do I need before posting a shift?',
  'Xác thực số điện thoại và CCCD (quản trị viên duyệt), rồi nạp tiền vào ví để giữ tiền công khi đăng ca.':
    'Verify your phone number and ID card (approved by an administrator), then top up your wallet so the wages can be held when you post.',
  'Chọn loại tài khoản và nộp giấy tờ xác minh theo loại (mô phỏng), rồi đăng ca.':
    'Choose your account type and submit the verification documents for that type (simulated), then post your shift.',
  'Tôi có huỷ ca được không?': 'Can I cancel a shift?',
  'Được, nếu ca còn hơn 6 giờ nữa mới bắt đầu. Trong vòng 6 giờ mà đã có người ứng tuyển thì không huỷ được, để bảo vệ người lao động.':
    'Yes, if it starts in more than 6 hours. Within 6 hours, if anyone has applied, you cannot cancel, to protect workers.',

  // --- /for-workers --------------------------------------------------------------------
  'Tiền công đã được giữ sẵn trước khi ca hiện ra, làm xong là về ví.':
    'The wages are set aside before a shift is shown, and go into your wallet once you finish.',
  'Tiền công đã được giữ sẵn trước khi ca hiện ra (mô phỏng), làm xong là về ví.':
    'The wages are set aside before a shift is shown (simulated), and go into your wallet once you finish.',
  'Không mất phí': 'No fees',
  'Biết trước tổng tiền ca': 'Know the shift total up front',
  'Check-in trên điện thoại': 'Check in on your phone',
  'Từ lúc tìm ca đến lúc nhận tiền': 'From finding a shift to getting paid',
  'Bốn bước, làm hết trên điện thoại.': 'Four steps, all on your phone.',
  'Tìm ca hợp lịch': 'Find a shift that fits',
  'Mỗi ca ghi rõ tổng tiền cả ca, giờ làm, địa điểm và yêu cầu. Chỉ ca đã được giữ trước tiền công mới hiện ra.':
    'Every shift shows the total pay, the hours, the location and the requirements. Only shifts whose wages are already set aside are shown.',
  'Ứng tuyển, chờ duyệt': 'Apply and wait for approval',
  'Xác thực số điện thoại một lần, rồi ứng tuyển bằng một nút. Được duyệt, trạng thái đơn đổi ngay trên trang Tổng quan.':
    'Verify your phone number once, then apply with one tap. When you are approved, your application status updates on your Overview.',
  'Đi làm': 'Go to work',
  'Tới nơi bấm check-in, xong ca bấm check-out, ngay trên điện thoại.':
    'Tap check-in when you arrive and check-out when you finish, right on your phone.',
  'Nhận tiền': 'Get paid',
  'Nhà tuyển dụng xác nhận là tiền công vào ví CaLẻ của bạn; không ai bấm thì hệ thống tự chốt sau 24 giờ. Rút về ngân hàng khi cần.':
    'When the employer confirms, the wages go into your CaLẻ wallet; if nobody does, the system settles it after 24 hours. Withdraw to your bank when you need.',
  'Nhà tuyển dụng xác nhận là tiền công được ghi vào ví của bạn (mô phỏng).':
    'When the employer confirms, the wages are recorded in your wallet (simulated).',
  'Làm theo ca mà vẫn yên tâm': 'Shift work you can count on',
  'Những gì CaLẻ làm sẵn để bạn chỉ cần lo đi làm.': 'What CaLẻ takes care of, so you can just focus on the work.',
  'Biết trước mình được bao nhiêu': 'Know what you will earn',
  'Tổng tiền cả ca hiện ngay trên thẻ ca, kèm đơn giá và số giờ.':
    'The total pay is right on the shift card, with the hourly rate and the number of hours.',
  'Tiền công có sẵn': 'The money is already there',
  'Ca chỉ được đăng khi nhà tuyển dụng đã giữ đủ tiền công trên CaLẻ.':
    'A shift is only posted once the employer has set aside the full wages on CaLẻ.',
  'Ca chỉ được đăng khi nhà tuyển dụng đã giữ đủ tiền công (mô phỏng).':
    'A shift is only posted once the employer has set aside the full wages (simulated).',
  'Check-in ngay trên điện thoại': 'Check in right on your phone',
  'Tới nơi bấm check-in, xong ca bấm check-out. Không cần sổ chấm công.':
    'Tap check-in when you arrive and check-out when you finish. No timesheet needed.',
  'Luôn biết ca đang ở đâu': 'Always know where your shift stands',
  'Đã duyệt, sắp bắt đầu, đang diễn ra, chờ xác nhận: trạng thái hiện rõ trên trang Tổng quan.':
    'Approved, starting soon, in progress, awaiting confirmation: the status is clear on your Overview.',
  'Xem quán trước khi nhận': 'Check the place before you accept',
  'Đánh giá từ người đã làm ca ở đó hiện ngay trên trang chi tiết ca.':
    'Reviews from people who worked there are right on the shift details page.',
  'Huỷ ca có quy định rõ': 'Clear cancellation rules',
  'Còn hơn 3 giờ thì tự huỷ được; sát giờ hơn thì cần nhà tuyển dụng đồng ý.':
    'More than 3 hours ahead you can cancel yourself; closer than that, the employer needs to agree.',
  'Tiền công của bạn': 'Your pay',
  'Ví dụ một ca 4 giờ, 45.000 đ mỗi giờ.': 'Example: a 4-hour shift at 45.000 đ an hour.',
  'Trước khi ca hiện ra': 'Before the shift is shown',
  'đã được nhà tuyển dụng giữ sẵn trên CaLẻ.': 'is already set aside by the employer on CaLẻ.',
  'đã được giữ sẵn (mô phỏng).': 'is already set aside (simulated).',
  'vào ví của bạn khi nhà tuyển dụng xác nhận, hoặc tự động sau 24 giờ.':
    'goes into your wallet when the employer confirms, or automatically after 24 hours.',
  'được ghi vào ví của bạn (mô phỏng).': 'is recorded in your wallet (simulated).',
  'Phí của bạn': 'Your fees',
  'Tìm ca, ứng tuyển và nhận tiền đều không mất phí. Rút số dư về ngân hàng khi cần.':
    'Finding shifts, applying and getting paid are all free. Withdraw your balance to your bank when you need.',
  'Tìm ca và ứng tuyển không mất phí. Bản demo chưa rút được tiền thật.':
    'Finding shifts and applying are free. The demo cannot withdraw real money.',
  'Huỷ ca đã nhận': 'Cancelling an accepted shift',
  'Ca còn hơn 3 giờ nữa mới bắt đầu: bạn tự huỷ được.': 'More than 3 hours before the start: you can cancel yourself.',
  'Trong vòng 3 giờ: gửi yêu cầu huỷ, nhà tuyển dụng đồng ý thì mới huỷ; trong lúc chờ bạn vẫn giữ chỗ.':
    'Within 3 hours: send a cancellation request; it only goes through if the employer agrees, and you keep your spot meanwhile.',
  'Không đến mà không báo: bị tính vắng mặt và không nhận tiền công.':
    'Not showing up without notice counts as a no-show and you are not paid.',
  'Tôi có mất phí không?': 'Do I pay any fees?',
  'Không. Tìm ca, ứng tuyển và nhận tiền công đều miễn phí; bạn nhận đủ số tiền ghi trên ca.':
    'No. Finding shifts, applying and getting paid are free; you receive the full amount shown on the shift.',
  'Không. Tìm ca và ứng tuyển miễn phí; trong bản demo mọi khoản tiền đều là mô phỏng.':
    'No. Finding shifts and applying are free; in the demo all money is simulated.',
  'Tại sao tôi chưa ứng tuyển được?': 'Why can’t I apply yet?',
  'Bạn cần xác thực số điện thoại trước khi ứng tuyển ca đầu tiên. Một số ca có thêm yêu cầu riêng, ghi rõ trong chi tiết ca.':
    'You need to verify your phone number before your first application. Some shifts have extra requirements, listed in the shift details.',
  'Có cần kinh nghiệm không?': 'Do I need experience?',
  'Không nhất thiết. Nhiều ca phục vụ, phụ bếp, sự kiện nhận người mới; yêu cầu ghi rõ ở từng ca.':
    'Not necessarily. Many serving, kitchen-helper and event shifts take newcomers; requirements are listed on each shift.',
  'Tôi có huỷ ca đã nhận được không?': 'Can I cancel a shift I accepted?',
  'Được. Ca còn hơn 3 giờ nữa mới bắt đầu thì bạn tự huỷ; sát giờ hơn thì gửi yêu cầu và chờ nhà tuyển dụng đồng ý.':
    'Yes. More than 3 hours before the start you can cancel yourself; closer than that, send a request and wait for the employer to agree.',

  // --- LandingPreview (minh hoạ giao diện) ---------------------------------------------
  'Phục vụ tiệc cưới': 'Wedding banquet service',
  'Thứ 7 · 17:00–22:00 · 3 người': 'Sat · 17:00–22:00 · 3 people',
  'Đã giữ từ ví': 'Held from wallet',
  'Đã trả cho 3 người': 'Paid to 3 people',
  'Đang làm · kết thúc lúc 21:00': 'Working · ends at 21:00',
  'Đã check-out · chờ xác nhận': 'Checked out · awaiting confirmation',
  'Hoàn thành · tiền đã về ví': 'Completed · paid to your wallet',
  'Đã xác minh SĐT': 'Phone verified',
  'Minh hoạ giao diện quản lý ca — tên và số liệu là ví dụ.':
    'Illustration of the shift management screen — names and numbers are examples.',
  'Phụ bếp quán lẩu': 'Hotpot kitchen helper',
  'cả ca': 'for the shift',
  '45.000 đ/giờ · 4 giờ': '45.000 đ/hour · 4 hours',
  'Hôm nay · 17:00–21:00': 'Today · 17:00–21:00',
  'Minh hoạ giao diện người lao động — số liệu là ví dụ.':
    'Illustration of the worker screen — numbers are examples.',
};
