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
  'Tiền của bạn đi đâu?': 'Where does your money go?',
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
  'Đã giữ từ ví': 'Held from wallet',
  'Đã check-out · chờ xác nhận': 'Checked out · awaiting confirmation',
  'Hoàn thành · tiền đã về ví': 'Completed · paid to your wallet',
  'Đã xác minh SĐT': 'Phone verified',
  'Minh hoạ giao diện quản lý ca — tên và số liệu là ví dụ.':
    'Illustration of the shift management screen — names and numbers are examples.',
  'Phụ bếp quán lẩu': 'Hotpot kitchen helper',
  'Tiền công cả ca': 'Wages for the whole shift',
  'Minh hoạ giao diện người lao động — số liệu là ví dụ.':
    'Illustration of the worker screen — numbers are examples.',

  // --- / (trang chủ — biên nhận ca, 02/10) ----------------------------------------------
  'Ca đủ người, không ai vắng': 'Fully staffed, no no-shows',
  'Hoàn lại và hỗ trợ': 'Refunds and support',
  'Giữ trước tiền công': 'Wages held upfront',
  'Khi đăng ca, tiền công cộng phí 10% được giữ từ ví nhà tuyển dụng. Ca chỉ hiện cho người lao động khi đã giữ đủ.':
    'When a shift is posted, the wages plus the 10% fee are held from the employer’s wallet. Workers only see the shift once the full amount is held.',
  'Khi đăng ca, tiền công được giữ từ ví nhà tuyển dụng (mô phỏng). Ca chỉ hiện cho người lao động khi đã giữ đủ.':
    'When a shift is posted, the wages are held from the employer’s wallet (simulated). Workers only see the shift once the full amount is held.',
  'Ca nào bạn thấy cũng đã có tiền công giữ sẵn.': 'Every shift you see already has its wages held.',
  'Check-in hiện là ghi nhận trên ứng dụng, chưa dùng GPS hay mã QR.':
    'Check-in is currently recorded in the app; it does not use GPS or QR codes yet.',
  'Nhận đúng số tiền đã thấy trên ca.': 'Get exactly the amount shown on the shift.',
  'Chỉ trả cho người đã làm và đã được xác nhận.': 'Pay only for people who worked and were confirmed.',
  'Người vắng mặt hoặc vị trí không ai nhận: tiền công và phí của phần đó hoàn về ví nhà tuyển dụng. Có vấn đề sau ca thì liên hệ đội hỗ trợ CaLẻ qua trang Hỗ trợ.':
    'A no-show or an unfilled spot: the wages and fee for that part return to the employer’s wallet. If something goes wrong after a shift, contact the CaLẻ support team via the Support page.',
  'Người vắng mặt hoặc vị trí không ai nhận: phần tiền đó hoàn về ví nhà tuyển dụng (mô phỏng). Có vấn đề sau ca thì liên hệ đội hỗ trợ CaLẻ qua trang Hỗ trợ.':
    'A no-show or an unfilled spot: that part of the money returns to the employer’s wallet (simulated). If something goes wrong after a shift, contact the CaLẻ support team via the Support page.',
  'Chưa được trả đúng thì liên hệ đội hỗ trợ CaLẻ.': 'Not paid correctly? Contact the CaLẻ support team.',
  'Đánh dấu vắng mặt, không trả cho phần không ai làm.': 'Mark no-shows and pay nothing for work nobody did.',
  'Tìm ca gần bạn, làm vài giờ, không mất phí.': 'Find shifts near you, work a few hours, pay no fees.',
  'Đăng ca theo giờ, duyệt từng người, trả cho người đã làm.':
    'Post hourly shifts, approve each person, pay only for those who worked.',
  'CaLẻ giữ trước tiền công của mỗi ca, theo dõi ca tới lúc xong và chỉ trả cho người đã làm.':
    'CaLẻ holds every shift’s wages upfront, tracks the shift until it is done and pays only the people who worked.',
  'CaLẻ giữ trước tiền công của mỗi ca (mô phỏng), theo dõi ca tới lúc xong và chỉ trả cho người đã làm.':
    'CaLẻ holds every shift’s wages upfront (simulated), tracks the shift until it is done and pays only the people who worked.',
  'Minh hoạ: tên và số liệu là ví dụ. Bấm từng dòng để xem giải thích.':
    'Illustration: names and numbers are examples. Tap a line to see what it means.',
  'Tiền của một ca đi về đâu?': 'Where does the money for a shift go?',
  'Phía người lao động': 'For workers',
  'Phía nhà tuyển dụng': 'For employers',
  'Số điện thoại được xác minh trước khi ứng tuyển': 'Phone number verified before applying',
  'Số điện thoại được xác minh trước khi ứng tuyển (mô phỏng)': 'Phone number verified before applying (simulated)',
  'Hai bên đánh giá nhau sau mỗi ca': 'Both sides rate each other after every shift',
  'Có vấn đề sau ca: liên hệ đội hỗ trợ CaLẻ': 'A problem after a shift? Contact the CaLẻ support team',
  'Bắt đầu từ phía của bạn': 'Start from your side',
  'Giữ trước khi đăng ca': 'Held when the shift is posted',
  'Từ ví nhà tuyển dụng: tiền công + phí 10%': 'From the employer’s wallet: wages + 10% fee',
  'Từ ví nhà tuyển dụng: tiền công (mô phỏng)': 'From the employer’s wallet: wages (simulated)',
  'Trả người lao động': 'Paid to the worker',
  'Khi ca được xác nhận, không trừ phí': 'When the shift is confirmed, no fee deducted',
  'Khi ca được xác nhận, không trừ phí (mô phỏng)':
    'When the shift is confirmed, no fee deducted (simulated)',
  'Phí CaLẻ': 'CaLẻ fee',
  '10% tiền công, nhà tuyển dụng trả': '10% of wages, paid by the employer',
  'Bản demo chưa thu phí': 'The demo charges no fee',
  'Hoàn về nhà tuyển dụng': 'Refunded to the employer',
  'Đối soát': 'Reconciliation',
  'Chốt sổ khi ca hoàn thành': 'Settled when the shift is completed',
  'Tiền của ca này đi đâu?': 'Where did this shift’s money go?',
  'Đăng ca miễn phí. Tiền giữ trước nằm trên CaLẻ tới khi ca xong.':
    'Posting is free. The held money stays on CaLẻ until the shift is done.',
  'Làm xong, được trả': 'Work done, pay received',
  'Nhà tuyển dụng duyệt từng người. Đến giờ, người lao động check-in trên điện thoại và nhà tuyển dụng xác nhận có mặt. Sau check-out, nhà tuyển dụng xác nhận hoàn thành; nếu không thao tác, hệ thống tự xác nhận sau 24 giờ kể từ giờ kết thúc ca và trả đủ tiền công vào ví người lao động. Tiền trong ví rút được về tài khoản ngân hàng.':
    'The employer approves each person. At start time the worker checks in on their phone and the employer confirms they are there. After check-out the employer confirms the shift is done; if they do nothing, the system confirms 24 hours after the shift ends and pays the full wages into the worker’s wallet. Money in the wallet can be withdrawn to a bank account.',
  'Nhà tuyển dụng duyệt từng người. Đến giờ, người lao động check-in trên điện thoại và nhà tuyển dụng xác nhận có mặt. Sau check-out, nhà tuyển dụng xác nhận hoàn thành; nếu không thao tác, ca tự được xác nhận sau 12 giờ và tiền công được ghi đủ vào ví người lao động (mô phỏng).':
    'The employer approves each person. At start time the worker checks in on their phone and the employer confirms they are there. After check-out the employer confirms the shift is done; if they do nothing, the shift is confirmed automatically after 12 hours and the full wages are recorded in the worker’s wallet (simulated).',
  'Phí là 10% tiền công, do nhà tuyển dụng trả và chỉ tính trên phần ca có người làm. Người lao động không mất phí.':
    'The fee is 10% of wages, paid by the employer and charged only on the part of the shift that was worked. Workers pay no fee.',
  'Bản demo chưa thu phí ai. Khi chạy thật, phí là 10% tiền công, do nhà tuyển dụng trả; người lao động không mất phí.':
    'The demo charges no one. In the live service the fee is 10% of wages, paid by the employer; workers pay no fee.',
  'Nhận đủ tiền công, không bị trừ phí.': 'Get the full wages, with no fee deducted.',
  'Chỉ trả phí trên phần ca có người làm.': 'Pay the fee only on the part of the shift that was worked.',
  'Đăng ca miễn phí; bản demo chưa thu phí.': 'Posting is free; the demo charges no fees.',
  'Mỗi đồng giữ trước chỉ đi về một trong ba nơi: người lao động, phí CaLẻ, hoặc hoàn lại nhà tuyển dụng. Cả hai bên cùng thấy từng dòng.':
    'Every đồng held goes to just one of three places: the worker, the CaLẻ fee, or back to the employer. Both sides see every line.',
  'Phụ bếp': 'Kitchen helper',
  'Ca làm cho nhiều loại việc': 'Shifts for many kinds of work',
  'Tiệc cưới, hội nghị, sự kiện cuối tuần': 'Weddings, conferences, weekend events',
  'Sơ chế, rửa dọn, hỗ trợ bếp chính': 'Prep, washing up, helping the head cook',
  'Xem bảng giá': 'See pricing',
  'Quán ăn, quán cà phê, nhà hàng': 'Eateries, cafés, restaurants',
  'Kiểm hàng, đóng gói, sắp xếp kho': 'Checking stock, packing, organising the warehouse',
  // Ca mẫu + câu mẫu cho minh hoạ landing (landingSamples.ts)
  'Pha chế quán cà phê': 'Café barista',
  'Kiểm hàng kho': 'Warehouse stock check',
  'Hỗ trợ sự kiện ra mắt': 'Product launch event support',
  'Thu ngân siêu thị mini': 'Mini-mart cashier',
  'Phát tờ rơi khai trương': 'Grand opening flyer distribution',
  'Phục vụ nhà hàng buffet': 'Buffet restaurant waiting staff',
  'Thứ 2': 'Mon',
  'Thứ 3': 'Tue',
  'Thứ 4': 'Wed',
  'Thứ 5': 'Thu',
  'Thứ 6': 'Fri',
  'Thứ 7': 'Sat',
  'Chủ nhật': 'Sun',
  '1 người': '1 person',
  '{n} người': '{n} people',
  'Đã trả cho 1 người': 'Paid 1 person',
  'Đã trả cho {n} người': 'Paid {n} people',
  'Hôm nay · {time}': 'Today · {time}',
  '{wage}/giờ · {hours} giờ': '{wage}/hour · {hours} hours',
  'Đang làm · kết thúc lúc {end}': 'Working · ends at {end}',
  // --- Trang chủ: vòng thẻ loại việc (homeJobs.ts, JobRing.tsx) --------- -------------------
  'Từ quán ăn, quán cà phê tới sự kiện và kho hàng: những việc cần thêm người trong vài giờ. Mỗi ca ghi rõ giờ làm, tổng tiền và yêu cầu.':
    'From restaurants and cafés to events and warehouses: work that needs extra hands for a few hours. Every shift lists its hours, total pay and requirements.',
  'Xem chi tiết': 'See details',
  // --- Trang chủ: số ca đang mở (OpenShiftCount.tsx) ---
  '1 ca đang tuyển': '1 open shift',
  '{n} ca đang tuyển': '{n} open shifts',
  '1 ca gấp trong {h} giờ tới': '1 urgent shift in the next {h} hours',
  '{n} ca gấp trong {h} giờ tới': '{n} urgent shifts in the next {h} hours',
  '(dữ liệu demo)': '(demo data)',
  'Xem ca': 'See shifts',
  // --- Trang chủ: Vì sao CaLẻ ra đời? (whyData.ts) ---
  'Vì sao CaLẻ ra đời?': 'Why was CaLẻ started?',
  'Quán cần người làm vài giờ lúc đông khách, sinh viên cần việc theo lịch học. Nhưng hai bên vẫn tìm nhau qua bài đăng trong các hội nhóm: hứa trả miệng, thiếu thông tin, có chuyện thì không ai đứng giữa. CaLẻ ra đời để thay cách làm đó.':
    'Shops need people for a few busy hours; students need work that fits their timetable. Yet the two sides still find each other through posts in social media groups: verbal promises to pay, missing details, and no one in the middle when something goes wrong. CaLẻ was started to change that.',
  '2,53 triệu': '2.53 million',
  'sinh viên đại học trên cả nước': 'university students nationwide',
  'Bộ GD&ĐT, năm học 2025–2026 (qua báo Giáo dục & Thời đại)':
    'Ministry of Education and Training, 2025–2026 school year (via Giáo dục & Thời đại)',
  '329.500': '329,500',
  'cửa hàng ăn uống trên cả nước': 'food and drink outlets nationwide',
  'iPOS.vn và Nestlé Professional, báo cáo năm 2025': 'iPOS.vn and Nestlé Professional, 2025 report',
  '61,7%': '61.7%',
  'người đang đi làm ở Việt Nam làm việc phi chính thức': 'of employed people in Vietnam work informally',
  'Cục Thống kê, quý II/2026': 'National Statistics Office, Q2 2026',
  '1,4 triệu': '1.4 million',
  'thanh niên 15–24 tuổi không có việc làm, không đi học hay đào tạo':
    'young people aged 15–24 not in work, education or training',
  'Nguồn: {source}': 'Source: {source}',
  '(mở trang mới)': '(opens in a new tab)',
  'Tuyển qua hội nhóm': 'Through groups',
  'Trên CaLẻ': 'On CaLẻ',
  'Tiền công': 'Wages',
  'Hứa trả miệng, không ai giữ tiền.': 'A verbal promise to pay, with no one holding the money.',
  'Tiền công được giữ trước khi ca hiện ra.': 'Wages are held before the shift is listed.',
  'Tiền công được giữ trước khi ca hiện ra (mô phỏng).': 'Wages are held before the shift is listed (simulated).',
  'Thông tin ca': 'Shift details',
  'Bài đăng hay thiếu giờ làm, địa chỉ hoặc tổng tiền.': 'Posts often leave out the hours, the address or the total pay.',
  'Mỗi ca ghi rõ giờ, địa điểm, tổng tiền và yêu cầu.': 'Every shift lists the hours, place, total pay and requirements.',
  'Người không đến': 'No-shows',
  'Nhận lời rồi không đến, quán thiếu người giờ cao điểm.':
    'People agree and then don’t turn up, leaving the shop short at peak time.',
  'Đánh dấu vắng mặt, phần tiền của vị trí đó hoàn về ví nhà tuyển dụng.':
    'Mark them absent; the money for that spot goes back to the employer’s wallet.',
  'Đánh dấu vắng mặt, phần tiền của vị trí đó hoàn về ví nhà tuyển dụng (mô phỏng).':
    'Mark them absent; the money for that spot goes back to the employer’s wallet (simulated).',
  'Ai đã đến': 'Who showed up',
  'Chủ quán khó biết ai đã đến, đến lúc nào.': 'Owners can’t easily tell who came and when.',
  'Check-in, check-out ngay trên điện thoại.': 'Check-in and check-out right on the phone.',
  'Đánh giá': 'Reviews',
  'Khó biết quán hay người làm có đáng tin không.': 'Hard to tell whether a shop or a worker can be trusted.',
  'Hai bên đánh giá nhau sau mỗi ca; đánh giá hiện trên trang ca.':
    'Both sides rate each other after every shift; reviews show on the shift page.',
  'Công an nhiều lần cảnh báo chiêu đăng tin tuyển "việc làm thêm" để lừa sinh viên.':
    'Police have repeatedly warned about fake "part-time job" posts used to scam students.',
  'Nguồn: VTV, 01/08/2026': 'Source: VTV, 1 Aug 2026',
  // --- Trang chủ: sơ đồ dòng tiền (MoneyFlowDiagram.tsx) ---
  'Ví nhà tuyển dụng': 'Employer wallet',
  'Đăng ca': 'Posting the shift',
  'CaLẻ giữ tiền': 'CaLẻ holds the money',
  'Tiền công + 10% phí': 'Wages + 10% fee',
  'Tiền công (mô phỏng)': 'Wages (simulated)',
  'Người lao động': 'Workers',
  'Người đã làm và được xác nhận': 'Those who worked and were confirmed',
  '10% phần ca có người làm': '10% of the part that was worked',
  'Hoàn về ví nhà tuyển dụng': 'Back to the employer wallet',
  'Phần của người vắng mặt': 'The share of the no-show',
  'Ví dụ: ca 2 người × 4 giờ × 45.000 đ, một người vắng mặt.':
    'Example: a shift for 2 people × 4 hours × 45,000 đ, with one no-show.',
  'Ví dụ: ca 2 người × 4 giờ × 45.000 đ, một người vắng mặt (mô phỏng).':
    'Example: a shift for 2 people × 4 hours × 45,000 đ, with one no-show (simulated).',
  'Xem lại': 'Replay',
  // --- Trang chủ: CaLẻ làm được gì? (featureData.ts) ---
  'CaLẻ làm được gì?': 'What can CaLẻ do?',
  'Những gì đã chạy hôm nay, và những gì nhóm đang làm tiếp.': 'What already works today, and what the team is building next.',
  'Đã có': 'Available now',
  'Sắp có': 'Coming soon',
  'Cập nhật: {month}': 'Updated: {month}',
  'Đăng ca theo giờ; ca chỉ hiện khi tiền công đã được giữ đủ (nạp qua PayOS).': 'Post hourly shifts; a shift is only listed once its wages are fully held (top-ups via PayOS).',
  'Đăng ca theo giờ; ca chỉ hiện khi tiền công đã được giữ đủ (mô phỏng).': 'Post hourly shifts; a shift is only listed once its wages are fully held (simulated).',
  'Tìm ca, lọc theo loại việc, khu vực, ngày và mức lương; cảnh báo khi trùng lịch.': 'Find shifts and filter by job type, area, date and pay, with a warning when shifts clash.',
  'Xác thực số điện thoại trước khi ứng tuyển.': 'Phone number verification before applying.',
  'Xác thực số điện thoại trước khi ứng tuyển (mô phỏng).': 'Phone number verification before applying (simulated).',
  'Nhà tuyển dụng duyệt từng người ứng tuyển.': 'Employers approve each applicant individually.',
  'Check-in, check-out ngay trên điện thoại; nhà tuyển dụng xác nhận có mặt.': 'Check in and out right on the phone; the employer confirms attendance.',
  'Tiền công tự vào ví khi ca được xác nhận; không ai bấm thì tự chốt sau 24 giờ.': 'Wages go to the wallet automatically once the shift is confirmed; if nobody does, it settles after 24 hours.',
  'Tiền công tự vào ví khi ca được xác nhận; không ai bấm thì tự chốt sau 12 giờ (mô phỏng).': 'Wages go to the wallet automatically once the shift is confirmed; if nobody does, it settles after 12 hours (simulated).',
  'Ví: nạp tiền và rút về tài khoản ngân hàng.': 'Wallet: top up and withdraw to a bank account.',
  'Ví: nạp tiền và rút về tài khoản ngân hàng (mô phỏng).': 'Wallet: top up and withdraw to a bank account (simulated).',
  'Hai bên đánh giá nhau sau mỗi ca.': 'Both sides rate each other after every shift.',
  'Song ngữ Việt – Anh, giao diện sáng và tối.': 'Vietnamese and English, light and dark themes.',
  'Nhắn tin giữa người lao động và nhà tuyển dụng sau khi đơn được duyệt.': 'Messaging between worker and employer once an application is approved.',
  'Thông báo trong ứng dụng cho từng bước của ca.': 'In-app notifications for every step of a shift.',
  'Điểm uy tín và lịch cá nhân để nhận ca hợp giờ.': 'Reputation scores and a personal calendar to pick shifts that fit.',
  // --- Minh hoạ: ca không suôn sẻ (huỷ / vắng mặt / không được chọn, 03/10) ---
  'Ca bị huỷ trước giờ làm, không ai làm': 'The shift was cancelled before it started; nobody worked',
  'Chỉ trả cho người đã làm': 'Paid only to those who worked',
  'Ca bị huỷ thì không thu phí': 'No fee when a shift is cancelled',
  'Ca bị huỷ: hoàn đủ tiền đã giữ': 'Shift cancelled: everything held is refunded',
  '{n} người vắng mặt: hoàn phần của người đó': '{n} no-show: their share is refunded',
  'Hoàn {amount} về ví · {n} người vắng mặt': '{amount} back to the wallet · {n} no-show',
  'Đã ứng tuyển · chờ nhà tuyển dụng duyệt': 'Applied · waiting for the employer',
  'Nhà tuyển dụng đã chọn đủ người · xem ca khác': 'The employer has filled the shift · try another one',
  // --- Bằng chứng xã hội (proofData.ts) ---
  'Từ những ca đã chạy thử': 'From our pilot shifts',
  'Ảnh nhóm CaLẻ tự chụp ở các quán đã dùng thử, và lời của người đã làm ca, đã đăng ca.':
    'Photos the CaLẻ team took at the places that tried it, and words from people who worked or posted shifts.',
  'Ảnh và lời chia sẻ chỉ được đăng khi người trong ảnh, người nói đã đồng ý.':
    'Photos and quotes are only published with the consent of the people in them or quoted.',
  'Tiền công ca này': 'Wages for this shift',
  'Nhà tuyển dụng giữ sẵn trên CaLẻ trước khi ca hiện ra. Về ví của bạn khi nhà tuyển dụng xác nhận, hoặc tự động sau 24 giờ.':
    'The employer holds it on CaLẻ before the shift is listed. It goes to your wallet when the employer confirms, or automatically after 24 hours.',
  'Được giữ sẵn trước khi ca hiện ra, ghi vào ví của bạn khi ca xong (mô phỏng).':
    'Held before the shift is listed and credited to your wallet when the shift is done (simulated).',
  'Việc gồm gì': 'What the work involves',
  'Một ca thường thế nào': 'What a shift usually looks like',
  'Cần gì để làm': 'What you need',
  'Đăng ca loại này': 'Post this kind of shift',
  'Mô tả chung. Giờ làm, tiền công và yêu cầu cụ thể ghi trên từng ca.':
    'General description. The exact hours, pay and requirements are listed on each shift.',
  'Việc trước': 'Previous job',
  'Việc sau': 'Next job',
  'Tạm dừng': 'Pause',
  'Tiếp tục': 'Resume',
  'Đóng': 'Close',
  'Dọn dẹp': 'Cleaning',
  'Quán cà phê, trà sữa, quầy bar': 'Cafés, milk tea shops, bars',
  'Siêu thị mini, cửa hàng, quầy dịch vụ': 'Mini-marts, shops, service counters',
  'Khai trương, khuyến mãi, sự kiện': 'Grand openings, promotions, events',
  'Cửa hàng, sự kiện, bãi giữ xe': 'Shops, events, parking lots',
  'Nhà hàng, văn phòng, sau sự kiện': 'Restaurants, offices, after events',
  'Đón khách, ghi món, bưng bê và dọn bàn. Bạn là người khách gặp nhiều nhất trong ca.':
    'Greet guests, take orders, carry dishes and clear tables. You are the person guests see most during the shift.',
  'Ca hay vào giờ cao điểm trưa hoặc tối, mỗi ca vài giờ. Giờ cụ thể ghi trên từng ca.':
    'Shifts tend to cover the lunch or dinner rush and last a few hours. The exact hours are on each shift.',
  'Nhanh nhẹn, lịch sự, đứng lâu được. Nhiều quán không yêu cầu kinh nghiệm.':
    'Quick, polite and able to stand for long periods. Many places do not require experience.',
  'Sơ chế rau thịt, rửa dụng cụ, dọn bếp và chuyển món ra quầy theo lời bếp chính.':
    'Prep vegetables and meat, wash utensils, clean the kitchen and pass dishes to the counter as the head cook asks.',
  'Ca hay bắt đầu trước giờ mở bán để kịp sơ chế, rồi kéo qua giờ cao điểm.':
    'Shifts often start before opening to get the prep done, then run through the rush.',
  'Sạch sẽ, cẩn thận với dao và đồ nóng, làm theo hướng dẫn nhanh.':
    'Clean, careful with knives and hot food, and quick to follow instructions.',
  'Pha đồ uống theo công thức của quán, giữ quầy gọn gàng và hỗ trợ ghi món khi đông.':
    'Make drinks to the shop’s recipes, keep the counter tidy and help take orders when it gets busy.',
  'Ca sáng sớm ở quán cà phê, ca chiều tối ở quán trà sữa và quầy bar.':
    'Early mornings at cafés, afternoons and evenings at milk tea shops and bars.',
  'Nhớ công thức nhanh, tay chắc. Ca ghi rõ nếu cần kinh nghiệm pha chế.':
    'Quick to learn recipes, steady hands. A shift says so if it needs barista experience.',
  'Tính tiền, nhận thanh toán tiền mặt hoặc chuyển khoản, đóng gói hàng cho khách.':
    'Ring up purchases, take cash or bank transfers and bag items for customers.',
  'Ca hay vào cuối ngày và cuối tuần, lúc cửa hàng đông khách.':
    'Shifts tend to be late in the day and at weekends, when the shop is busy.',
  'Cẩn thận với tiền, biết dùng máy tính tiền cơ bản. Việc có tiền mặt cần bàn giao kèm ảnh cuối ca.':
    'Careful with money and able to use a basic till. Work involving cash needs a handover photo at the end of the shift.',
  'Kiểm đếm hàng nhập, đóng gói đơn, dán nhãn và xếp hàng lên kệ.':
    'Count incoming stock, pack orders, label items and stock the shelves.',
  'Ca hay vào mùa nhiều đơn hoặc ngày nhập hàng, có cả ca sáng sớm.':
    'Shifts tend to fall in busy order seasons or on delivery days, including early mornings.',
  'Sức khoẻ tốt, cẩn thận khi đếm. Một số ca cần bàn giao kèm ảnh và ghi chú.':
    'Physically fit and careful when counting. Some shifts need a handover photo and note.',
  'Đón khách, hướng dẫn chỗ ngồi, phục vụ tiệc, dựng và dọn khu vực sự kiện.':
    'Welcome guests, show them to their seats, serve at the party, and set up and clear the event area.',
  'Ca theo lịch sự kiện, hay vào cuối tuần, thường tập trung trước giờ khai mạc.':
    'Shifts follow the event schedule, often at weekends, usually with a call time before it starts.',
  'Đúng giờ, gọn gàng, mặc đồng phục theo yêu cầu ghi trên ca.':
    'Punctual, neat, and in the uniform listed on the shift.',
  'Phát tờ rơi, giới thiệu chương trình và mời khách ghé cửa hàng.':
    'Hand out flyers, explain the promotion and invite people to visit the shop.',
  'Ca thường ngắn, hay vào dịp khai trương hoặc khuyến mãi cuối tuần.':
    'Shifts are usually short, often for grand openings or weekend promotions.',
  'Tự tin, nói chuyện lịch sự, đứng ngoài trời được.': 'Confident, polite to talk to, and fine standing outdoors.',
  'Giữ trật tự, hướng dẫn khách, trông xe và báo ngay khi có sự cố.':
    'Keep order, guide guests, watch the parking area and report any incident right away.',
  'Ca theo giờ mở cửa hoặc giờ diễn ra sự kiện, có cả ca tối.':
    'Shifts follow opening hours or event times, including evenings.',
  'Đúng giờ, bình tĩnh, có trách nhiệm. Ca ghi rõ nếu cần chứng chỉ.':
    'Punctual, calm and responsible. A shift says so if it needs a certificate.',
  'Lau dọn, thu gom rác, sắp xếp lại khu vực sau giờ hoạt động hoặc sau sự kiện.':
    'Clean up, collect rubbish and put the area back in order after hours or after an event.',
  'Ca hay vào sáng sớm trước giờ mở cửa hoặc tối muộn sau khi đóng cửa.':
    'Shifts tend to be early in the morning before opening or late at night after closing.',
  'Cẩn thận, chịu khó, làm đúng danh sách việc nhà tuyển dụng ghi trên ca.':
    'Careful and hard-working, following the task list the employer puts on the shift.',
  'Nhân viên đeo tạp dề đang pha cà phê bằng phin giấy': 'A worker in an apron making pour-over coffee',
  'Nhân viên đứng quầy tính tiền có máy tính bảng': 'A worker at a checkout counter with a tablet till',
  'Bàn tay trao một tờ giấy cho người khác': 'A hand passing a sheet of paper to someone',
  'Nhân viên bảo vệ mặc áo phản quang đứng trước dãy cửa hàng': 'A security guard in a reflective vest outside a row of shops',
  'Người đội nón lá đang quét sân': 'A person in a conical hat sweeping a courtyard',
  'Lô hàng về trễ, kho dời lịch kiểm sang tuần sau.': 'The delivery came late, so the stock check moved to next week.',
  'Lý do huỷ: {reason}': 'Cancellation reason: {reason}',
  'Mưa lớn, cửa hàng lùi ngày khai trương.': 'Heavy rain, so the shop postponed its grand opening.',
  'Đã báo huỷ': 'Notified of cancellation',
  'Đã hoàn về ví': 'Refunded to wallet',
};
