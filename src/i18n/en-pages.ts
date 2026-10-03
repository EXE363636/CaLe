/**
 * English — đợt 2c (01/10): trang thông tin (giới thiệu, hỏi đáp, cách hoạt động,
 * an toàn, hỗ trợ, tranh chấp, điều khoản, quyền riêng tư, quy định huỷ ca, điểm
 * uy tín, hướng dẫn sử dụng). Khoá = NGUYÊN VĂN câu tiếng Việt trong trang (tx).
 * Gộp vào `enText` ở `en.ts`; không ghi đè câu các đợt trước (test kiểm).
 * ⚠️ Bản dịch do AI viết — điều khoản / quyền riêng tư: bản tiếng Việt là bản gốc.
 */

/** Khoá vi.ts của trang Giới thiệu (about.*). */
export const enPages: Record<string, string> = {
  'about.intro': 'CaLẻ is a short-shift job marketplace by CaLedo Tech, a team based in Vietnam.',
  'about.mission.title': 'What we do',
  'about.mission.body':
    'We help students and freelancers find shifts with clear hours, clear pay and a clear location, and help shop owners find enough people on time without scattered messaging.',
  'about.values.title': 'What we stand for',
  'about.values.item.transparency': 'Clarity: hours, pay and requirements are stated before you take a shift.',
  'about.values.item.payment': 'The pay is held as a deposit before a shift appears.',
  'about.values.item.twoWayTrust': 'Two-way trust: both sides have profiles and reputation scores.',
  'about.values.item.support': 'Support in Vietnamese from our team in Hanoi.',
  'about.team.title': 'Our team',
  'about.team.body':
    'CaLẻ is built by CaLedo Tech, for people who need shifts around their studies and for shops that need extra hands at peak times.',
  'about.version.title': 'Current version',
  'about.version.body.supabase':
    'This is a limited trial (Beta). Top-ups, deposits, pay and withdrawals are real transactions through the PayOS payment gateway. We will notify users in advance of any change to fees or terms.',
  'about.version.body':
    'This is a trial version. All money transactions in the app are simulated and not connected to a real payment system. We will notify registered users before the official launch.',
  'about.partners.title': 'Potential partners & partnership directions',
  'about.partners.intro':
    'CaLẻ is at an early stage and has not established any official partnerships yet. The groups below are directions we hope to build in the future.',
  'about.partners.disclaimerEmphasis': 'has not established any official partnerships yet',
  'about.partners.empty': 'Content is being updated.',
  'about.partners.badge.directional': 'Potential / directional partner',
  'about.partners.group.universities': 'Universities & student affairs offices',
  'about.partners.group.fnb': 'Restaurants, cafés & F&B chains',
  'about.partners.group.events': 'Event organisers',
  'about.partners.group.weddings': 'Wedding services',
  'about.partners.group.payments': 'Payment gateways',
  'about.partners.group.seasonal': 'Seasonal businesses',
  'about.partners.group.verification': 'Verification & safety partners',
};

export const enPagesText: Record<string, string> = {
  // --- Giới thiệu / chung -------------------------------------------------------
  'Về chúng tôi': 'About us',
  'Giới thiệu CaLẻ': 'About CaLẻ',
  'Pháp lý': 'Legal',
  'Hỗ trợ': 'Support',

  // --- Tranh chấp ---------------------------------------------------------------
  'Khi một ca làm xảy ra mâu thuẫn về chất lượng công việc, giờ giấc, thái độ hoặc thanh toán, hai bên có thể mở yêu cầu xử lý tranh chấp với CaLẻ. Tài liệu này mô tả quy trình.':
    'When a shift runs into a disagreement about work quality, hours, behaviour or payment, either side can open a dispute with CaLẻ. This page describes the process.',
  'Khi nào nên mở tranh chấp': 'When to open a dispute',
  'Người lao động vắng mặt không báo trước.': 'The worker did not show up without notice.',
  'Nhà tuyển dụng yêu cầu công việc khác xa so với mô tả ca.': 'The employer asked for work very different from the shift description.',
  'Mâu thuẫn về giờ làm thực tế hoặc số lượng vị trí được bố trí.': 'Disagreement about actual hours worked or the number of positions.',
  'Có dấu hiệu hành vi không phù hợp giữa các bên.': 'Signs of inappropriate behaviour between the parties.',
  'Cách mở yêu cầu': 'How to open a request',
  'Vào trang chi tiết ca làm liên quan và bấm "Báo cáo sự cố". Mô tả tình huống cụ thể, thời điểm xảy ra, và đính kèm chứng cứ nếu có (ảnh màn hình, lịch check-in/out, đoạn hội thoại trong app).':
    'Open the related shift page and tap "Report a problem". Describe what happened and when, and attach evidence if you have it (screenshots, check-in/out times, messages).',
  'Quy trình xét xử': 'How disputes are reviewed',
  'Quản trị viên CaLẻ nhận yêu cầu và liên hệ cả hai bên trong vòng 24–48 giờ.':
    'A CaLẻ administrator receives the request and contacts both sides within 24–48 hours.',
  'Cả hai bên có quyền cung cấp giải trình và bằng chứng.': 'Both sides can give their account and evidence.',
  'Quản trị viên đối chiếu với lịch sử ca, điểm uy tín và đánh giá liên quan.':
    'The administrator checks the shift history, reputation scores and related reviews.',
  'Quyết định cuối cùng có thể là trả tiền cọc cho người lao động, hoàn tiền cọc cho nhà tuyển dụng, hoặc giải pháp khác phù hợp.':
    'The final decision may be to pay the deposit to the worker, refund it to the employer, or another suitable solution.',
  'Hệ quả với điểm uy tín': 'Effect on reputation scores',
  'Tuỳ kết quả tranh chấp, điểm uy tín có thể được giữ nguyên, điều chỉnh hoặc tạm khoá tài khoản nếu có vi phạm nghiêm trọng. Mọi điều chỉnh điểm đều được ghi lại trong lịch sử tài khoản cùng lý do.':
    'Depending on the outcome, reputation scores may stay the same or be adjusted, and accounts may be suspended for serious violations. Every score change is recorded in the account history with a reason.',
  'Phản hồi quyết định': 'Appealing a decision',
  'Nếu bạn cho rằng quyết định chưa hợp lý, có thể gửi phản hồi bằng văn bản về':
    'If you think a decision is unfair, you can send a written appeal to',
  '. Quản trị viên cấp cao sẽ xem xét lại trong vòng 7 ngày.': '. A senior administrator will review it within 7 days.',

  // --- Hỏi đáp ------------------------------------------------------------------
  'Tổng hợp các câu hỏi chúng tôi nhận được nhiều nhất từ người lao động và nhà tuyển dụng. Nếu bạn không tìm thấy câu trả lời, hãy liên hệ tổ hỗ trợ.':
    'The questions we hear most from workers and employers. If you cannot find your answer, contact the support team.',
  'Tôi có phải trả trước khoản nào khi đăng ký người lao động không?': 'Do I have to pay anything to sign up as a worker?',
  'Không. Người lao động hoàn toàn không phải nộp phí đăng ký, khoản trả trước hoặc phí ẩn nào. Mọi tiền cọc trên hệ thống đều do nhà tuyển dụng thực hiện trước khi ca được công khai.':
    'No. Workers pay no sign-up fee, upfront payment or hidden fee. Shift deposits are made by employers before a shift goes public.',
  'Tại sao tôi không ứng tuyển được một số ca?': 'Why can’t I apply for some shifts?',
  'Bạn cần xác minh số điện thoại trước khi ứng tuyển ca đầu tiên, và điểm uy tín cần ≥ 50. Một số ca cũng yêu cầu xác minh thêm CMND/CCCD hoặc thẻ sinh viên — thông tin này hiển thị ở phần chi tiết ca làm.':
    'You may need to verify your phone number before your first application, and your reputation score must be 50 or more. Some shifts also require an ID card or student card; this is shown on the shift page.',
  'Tôi có thể huỷ ca đã ứng tuyển không?': 'Can I cancel a shift I applied for?',
  'Có, nhưng quy định khác nhau theo thời điểm huỷ. Huỷ trước giờ bắt đầu hơn 24h không bị trừ điểm; huỷ sát giờ trong vòng 24h sẽ bị trừ −10 điểm uy tín và có thể cần nhà tuyển dụng đồng ý. Chi tiết tại "Quy định huỷ ca".':
    'Yes, but the rules depend on timing. Cancelling more than 24 hours before the start costs no points; cancelling within 24 hours costs 10 reputation points and may need the employer’s agreement. See "Cancellation policy".',
  'Khi nào tôi nhận được tiền công?': 'When do I get paid?',
  'Ngay khi nhà tuyển dụng xác nhận bạn hoàn thành ca, tiền công được chuyển vào ví của bạn trên CaLẻ và bạn có thể rút về tài khoản ngân hàng bất cứ lúc nào. Nếu nhà tuyển dụng không xác nhận, hệ thống tự xác nhận sau 24 giờ kể từ khi ca kết thúc.':
    'As soon as the employer confirms you completed the shift, your pay goes into your CaLẻ wallet and you can withdraw it to your bank account at any time. If the employer does not confirm, the system confirms automatically 24 hours after the shift ends.',
  'Sau khi bạn check-out và nhà tuyển dụng xác nhận hoàn thành, tiền công được trả vào hệ thống và phản ánh ngay trong mục "Tổng thu nhập" trên dashboard người lao động. Trong bản dùng thử hiện tại, mọi giao dịch tiền tệ đều là mô phỏng.':
    'After you check out and the employer confirms completion, your pay is recorded and shows under "Total earnings" on your worker dashboard. In this trial version, all money transactions are simulated.',
  'Tôi đăng ca xong nhưng chưa ai ứng tuyển, làm sao bây giờ?': 'I posted a shift but nobody has applied. What now?',
  'Hãy đảm bảo ca đã được giữ cọc và công khai (kiểm tra trạng thái hiển thị "Đang tuyển"). Mô tả ca rõ ràng, mức lương theo thị trường khu vực, và sử dụng lượt boost (nếu có) để ưu tiên hiển thị. Nếu cần thay đổi mô tả, dùng nút Chỉnh sửa trước 24h.':
    'Make sure the deposit is held and the shift is public (its status shows "Hiring"). Write a clear description, pay the local going rate, and use a boost (if you have one) to show it higher. To change the description, use Edit more than 24 hours before the start.',
  'Tôi gặp tranh chấp với người lao động/nhà tuyển dụng — phải làm sao?': 'I have a dispute with a worker / employer. What should I do?',
  'Mở chi tiết ca làm và bấm "Báo cáo sự cố". Quản trị viên sẽ xem xét hồ sơ, đánh giá từ cả hai bên và quyết định trả tiền cọc cho người lao động hoặc hoàn lại cho nhà tuyển dụng. Vui lòng tham khảo "Chính sách xử lý tranh chấp" để biết quy trình.':
    'Open the shift page and tap "Report a problem". An administrator reviews the case and both sides’ accounts, then decides whether to pay the worker or refund the employer. See the "Dispute policy" for the process.',

  // --- Cách hoạt động -------------------------------------------------------------
  'Một ca làm đi qua 4 bước, từ lúc đăng ca đến lúc trả tiền công.': 'A shift goes through 4 steps, from posting to payment.',
  'Xem ca đang tuyển': 'See open shifts',
  'Nhà tuyển dụng đăng ca': 'The employer posts a shift',
  'Nhập giờ làm, địa điểm, lương theo giờ và số người cần.': 'Enter the hours, location, hourly pay and number of people needed.',
  'Ca chỉ hiện cho người lao động sau khi hệ thống giữ cọc tiền công và 10% phí từ ví.':
    'The shift only appears to workers after the system holds the pay and 10% fee from the wallet.',
  'Ca chỉ hiện cho người lao động sau khi giữ cọc (mô phỏng).': 'The shift only appears to workers after the deposit is held (simulated).',
  'Người lao động ứng tuyển': 'Workers apply',
  'Chọn ca hợp lịch rồi bấm Ứng tuyển. Hệ thống cảnh báo nếu ca trùng giờ với lịch của bạn.':
    'Choose a shift that fits your schedule and tap Apply. The system warns you if it clashes with your schedule.',
  'Duyệt và làm ca': 'Approval and the shift',
  'Nhà tuyển dụng xem hồ sơ và duyệt người phù hợp. Người lao động bấm check-in khi đến và check-out khi xong.':
    'The employer reviews profiles and approves suitable people. Workers check in on arrival and check out when done.',
  'Xác nhận và trả tiền công': 'Confirmation and payment',
  'Nhà tuyển dụng xác nhận hoàn thành, tiền công vào ví người lao động. Nếu không ai bấm, hệ thống tự chốt khoảng 24 giờ sau ca.':
    'The employer confirms completion and the pay goes into the worker’s wallet. If nobody acts, the system settles about 24 hours after the shift.',
  'Nhà tuyển dụng xác nhận hoàn thành, tiền công vào ví người lao động (mô phỏng).':
    'The employer confirms completion and the pay goes into the worker’s wallet (simulated).',
  'Cần nhớ': 'Remember',
  'Người lao động dùng CaLẻ miễn phí.': 'CaLẻ is free for workers.',
  'Phần tiền không dùng (vị trí trống, người vắng mặt, ca huỷ) được hoàn về ví nhà tuyển dụng.':
    'Unused money (unfilled spots, no-shows, cancelled shifts) is refunded to the employer’s wallet.',
  'Có vướng mắc: vào trang Liên hệ hỗ trợ.': 'Questions? Go to the Contact support page.',

  // --- Quyền riêng tư -------------------------------------------------------------
  'Tài liệu này mô tả thông tin chúng tôi thu thập, cách dùng và cách bảo vệ. Áp dụng cho phiên bản dùng thử của CaLẻ.':
    'This page describes the information we collect, how we use it and how we protect it. It applies to the trial version of CaLẻ. The Vietnamese version is the original.',
  'Thông tin chúng tôi thu thập': 'Information we collect',
  'Thông tin tài khoản: tên, email, số điện thoại, vai trò (người lao động hoặc nhà tuyển dụng).':
    'Account information: name, email, phone number, role (worker or employer).',
  'Thông tin xác minh tuỳ chọn: CMND/CCCD, thẻ sinh viên, đăng ký kinh doanh — chỉ khi bạn chủ động cung cấp.':
    'Optional verification information: ID card, student card, business registration, only if you choose to provide it.',
  'Hoạt động trong ứng dụng: ca đã ứng tuyển, ca đã đăng, đánh giá đã nhận, lịch sử huỷ.':
    'Activity in the app: shifts applied for, shifts posted, reviews received, cancellation history.',
  'Thông tin kỹ thuật: dữ liệu lưu cục bộ trong trình duyệt, không gửi lên máy chủ ngoài.':
    'Technical information: data stored locally in your browser, not sent to outside servers.',
  'Cách chúng tôi sử dụng thông tin': 'How we use information',
  'Thông tin được dùng để vận hành dịch vụ — cho phép ứng tuyển, duyệt người lao động, tính điểm uy tín, gửi thông báo trong ứng dụng. Chúng tôi không bán thông tin cá nhân cho bên thứ ba.':
    'Information is used to run the service: applying, approving workers, calculating reputation scores and sending in-app notifications. We do not sell personal information to third parties.',
  'Lưu trữ trong phiên bản dùng thử': 'Storage in the trial version',
  'Phiên bản hiện tại lưu dữ liệu trong localStorage trình duyệt': 'The current version stores data in the browser’s localStorage',
  'Quyền của bạn': 'Your rights',
  'Quyền xem và chỉnh sửa thông tin cá nhân của mình.': 'The right to view and edit your personal information.',
  'Quyền xoá tài khoản và dữ liệu liên quan bằng cách liên hệ tổ hỗ trợ.':
    'The right to delete your account and related data by contacting the support team.',
  'Quyền yêu cầu giải thích về cách dữ liệu được sử dụng.': 'The right to ask how your data is used.',
  'Liên hệ về quyền riêng tư': 'Privacy contact',
  'Email phụ trách quyền riêng tư:': 'Privacy email:',

  // --- An toàn --------------------------------------------------------------------
  'CaLẻ giữ tiền công trước và ghi lại từng bước của ca để hai bên yên tâm.':
    'CaLẻ holds the pay in advance and records every step of a shift so both sides can feel safe.',
  'Tiền công được giữ trước': 'Pay is held in advance',
  'Nhà tuyển dụng giữ cọc đủ tiền công trước khi ca hiện ra. Tiền chỉ trả cho người lao động khi ca xong; phần không dùng hoàn về ví nhà tuyển dụng.':
    'The employer holds the full pay before the shift appears. The money is only paid to the worker when the shift is done; any unused part is refunded to the employer’s wallet.',
  'Nhà tuyển dụng giữ cọc đủ tiền công trước khi ca hiện ra (mô phỏng). Tiền chỉ trả khi ca xong; phần không dùng được hoàn lại.':
    'The employer holds the full pay before the shift appears (simulated). The money is only paid when the shift is done; any unused part is refunded.',
  'Xác minh tài khoản': 'Account verification',
  'Bạn có thể xác minh số điện thoại và giấy tờ tuỳ thân trong trang hồ sơ. Hồ sơ đã xác minh giúp bên kia yên tâm hơn khi nhận việc hoặc duyệt người.':
    'You can verify your phone number and ID on your profile page. A verified profile reassures the other side when taking a job or approving people.',
  'Mỗi người có điểm uy tín tạm tính từ lịch sử ca: hoàn thành, huỷ, vắng mặt. Nhà tuyển dụng xem điểm này khi duyệt người.':
    'Everyone has a reputation score estimated from their shift history: completions, cancellations, no-shows. Employers see it when approving people.',
  'Điểm uy tín tạm tính từ lịch sử ca và đánh giá sau ca. Điểm dưới 50 bị tạm khoá ứng tuyển (bản demo).':
    'The reputation score is estimated from shift history and reviews. Below 50, applying is temporarily blocked (demo).',
  'Lưu ý an toàn': 'Safety tips',
  'CaLẻ không thu phí và không giữ tiền của người lao động.': 'CaLẻ charges workers nothing and does not hold workers’ money.',
  'Chỉ nhận tiền công trong ứng dụng, không nhận tiền mặt ngoài luồng.': 'Only accept pay through the app, not cash outside it.',
  'Gặp nguy hiểm: rời khỏi địa điểm, gọi 113, sau đó báo cho CaLẻ qua trang Liên hệ hỗ trợ.':
    'In danger: leave the place, call 113, then tell CaLẻ through the Contact support page.',

  // --- Hỗ trợ ---------------------------------------------------------------------
  'Đội ngũ CaLedo Tech sẵn sàng hỗ trợ bạn trong giờ hành chính. Ngoài giờ, vui lòng gửi email — chúng tôi phản hồi trong vòng 24 giờ vào các ngày làm việc.':
    'The CaLedo Tech team is here to help during office hours. Outside those hours, please email us; we reply within 24 hours on working days.',
  'Email hỗ trợ': 'Support email',
  'Gửi email về': 'Email us at',
  '. Trong tiêu đề, vui lòng ghi rõ vai trò (người lao động hoặc nhà tuyển dụng) và mã ca làm liên quan (nếu có) để chúng tôi xử lý nhanh hơn.':
    '. In the subject, please state your role (worker or employer) and the related shift code (if any) so we can help faster.',
  'Tổng đài:': 'Hotline:',
  'Giờ trực: 08:00 – 20:00, Thứ Hai đến Thứ Bảy.': 'Hours: 08:00 – 20:00, Monday to Saturday.',
  'Văn phòng': 'Office',
  'Phản ánh hoặc gợi ý sản phẩm': 'Feedback or product ideas',
  'Chúng tôi rất mong nhận được phản hồi từ người dùng thực tế. Nếu bạn có ý tưởng để cải thiện CaLẻ, gửi cho chúng tôi qua email hoặc form phản hồi trong ứng dụng.':
    'We would love to hear from real users. If you have ideas to improve CaLẻ, send them to us by email or through the in-app feedback form.',

  // --- Điều khoản -----------------------------------------------------------------
  'Bằng việc tạo tài khoản hoặc sử dụng dịch vụ CaLẻ, bạn đồng ý với các điều khoản dưới đây. Tài liệu áp dụng cho phiên bản dùng thử của sản phẩm.':
    'By creating an account or using CaLẻ, you agree to the terms below. They apply to the trial version of the product. The Vietnamese version is the original; this English version is for reference.',
  '1. Phạm vi dịch vụ': '1. Scope of the service',
  'CaLẻ là nền tảng kết nối nhà tuyển dụng cần người lao động ngắn hạn với người lao động linh hoạt. Chúng tôi không phải là người sử dụng lao động trực tiếp; quan hệ lao động được hai bên trao đổi tự nguyện thông qua nền tảng.':
    'CaLẻ is a platform connecting employers who need short-term staff with flexible workers. We are not the direct employer; the working relationship is agreed voluntarily between the two parties through the platform.',
  '2. Tạo tài khoản': '2. Creating an account',
  'Bạn cần cung cấp thông tin chính xác và cập nhật. Bạn chịu trách nhiệm bảo mật mật khẩu của mình. CaLẻ có thể tạm khoá tài khoản nếu phát hiện hành vi gian lận, mạo danh, hoặc vi phạm pháp luật.':
    'You must provide accurate, up-to-date information. You are responsible for keeping your password safe. CaLẻ may suspend accounts involved in fraud, impersonation or illegal activity.',
  '3. Hành vi không được phép': '3. Prohibited behaviour',
  'Đăng ca giả, ca không có thật, hoặc ca vi phạm pháp luật.': 'Posting fake, non-existent or illegal shifts.',
  'Mạo danh người khác, sử dụng giấy tờ giả để xác minh.': 'Impersonating others or using fake documents for verification.',
  'Yêu cầu/hứa thanh toán ngoài luồng nền tảng.': 'Requesting or promising payment outside the platform.',
  'Quấy rối, đe doạ hoặc có hành vi không phù hợp với người dùng khác.': 'Harassing, threatening or behaving inappropriately towards other users.',
  '4. Giữ cọc': '4. Deposits',
  'Nhà tuyển dụng giữ cọc tiền công cùng phí dịch vụ 10% trước khi ca công khai. Tiền công được chuyển vào ví người lao động khi ca được xác nhận hoàn thành, hoặc được hệ thống tự xác nhận sau 24 giờ kể từ khi ca kết thúc. Phần cọc không sử dụng (vị trí trống, người lao động vắng mặt, ca bị huỷ) được hoàn về ví nhà tuyển dụng, kèm phần phí tương ứng. Nạp và rút tiền được xử lý qua cổng thanh toán PayOS. Tiền thưởng nạp ví (nếu có chương trình) chỉ dùng để trả phí dịch vụ, không dùng trả tiền công, không rút được và không quy đổi thành tiền mặt; phần phí trả bằng tiền thưởng khi được hoàn sẽ quay lại tiền thưởng. Khi CaLẻ áp dụng cọc người lao động: người lao động chưa xác thực CCCD và chưa làm đủ số ca yêu cầu trong 30 ngày gần nhất phải đặt cọc một phần tiền công khi ứng tuyển (mức cọc hiện trước khi xác nhận). Cọc được hoàn đủ khi ca hoàn thành, khi bị từ chối, hoặc khi huỷ trước giờ bắt đầu. Nếu nhà tuyển dụng xác nhận người lao động vắng mặt không báo, cọc được chuyển cho nhà tuyển dụng sau 72 giờ, trừ khi người lao động khiếu nại trong thời hạn đó và quản trị viên quyết định hoàn lại. Trường hợp hệ thống tự ghi vắng mặt vì nhà tuyển dụng không xác nhận, quản trị viên xem xét trước khi xử lý tiền cọc.':
    'Employers hold the pay plus a 10% service fee before a shift goes public. The pay goes into the worker’s wallet when the shift is confirmed as completed, or when the system confirms it automatically 24 hours after the shift ends. Unused deposit (unfilled spots, absent workers, cancelled shifts) is refunded to the employer’s wallet together with the matching fee. Top-ups and withdrawals are processed through the PayOS payment gateway. Top-up bonus money (if there is a promotion) can only pay service fees; it cannot pay wages, be withdrawn or be exchanged for cash, and fees paid with bonus money are refunded back to the bonus. When CaLẻ applies worker deposits: workers who have not verified their ID card and have not completed the required number of shifts in the last 30 days must deposit part of the pay when applying (the amount is shown before confirming). The deposit is refunded in full when the shift is completed, when the application is rejected, or when cancelled before the start. If the employer confirms the worker was absent without notice, the deposit goes to the employer after 72 hours, unless the worker disputes within that time and an administrator decides to refund it. If the system records an absence because the employer did not confirm, an administrator reviews it before the deposit is handled.',
  'Nhà tuyển dụng giữ cọc trước khi ca công khai. Tiền cọc được trả hoặc hoàn lại theo trạng thái ca. Trong phiên bản dùng thử hiện tại, mọi giao dịch tiền tệ là mô phỏng và không tạo nghĩa vụ tài chính thực tế giữa các bên.':
    'Employers hold a deposit before a shift goes public. The deposit is paid out or refunded depending on the shift status. In this trial version, all money transactions are simulated and create no real financial obligation between the parties.',
  '5. Thay đổi điều khoản': '5. Changes to the terms',
  'CaLedo Tech có thể cập nhật điều khoản theo thời gian. Người dùng sẽ được thông báo trước khi điều khoản mới có hiệu lực, và có quyền ngừng sử dụng dịch vụ nếu không đồng ý với phiên bản mới.':
    'CaLedo Tech may update these terms over time. Users will be notified before new terms take effect and may stop using the service if they disagree with the new version.',
  '6. Liên hệ': '6. Contact',
  'Mọi thắc mắc về điều khoản, vui lòng gửi về': 'For any questions about these terms, please write to',

  // --- Quy định huỷ ca ------------------------------------------------------------
  'CaLẻ cho phép bạn huỷ ca khi cần thiết, nhưng có quy định để bảo vệ nhà tuyển dụng và những người lao động khác. Hãy đọc kỹ trước khi ứng tuyển.':
    'CaLẻ lets you cancel when you need to, but there are rules to protect employers and other workers. Please read them before applying.',
  'Các nhóm huỷ ca': 'Types of cancellation',
  'Huỷ trước 24 giờ: không bị trừ điểm uy tín, không cần nhà tuyển dụng đồng ý.':
    'More than 24 hours before: no reputation points lost, no employer approval needed.',
  'Huỷ trong vòng 24 giờ: bị trừ −10 điểm uy tín (huỷ sát giờ).': 'Within 24 hours: −10 reputation points (late cancellation).',
  'Huỷ trong vòng 3 giờ trước giờ bắt đầu: cần nhà tuyển dụng đồng ý; nếu họ chấp nhận, vẫn áp dụng quy tắc trừ điểm theo thời gian.':
    'Within 3 hours of the start: the employer must agree; if they do, the time-based point rules still apply.',
  'Vắng mặt không báo trước: bị tính là no-show, trừ −20 điểm và có thể bị tạm khoá tài khoản nếu lặp lại.':
    'Not showing up without notice: counted as a no-show, −20 points, and the account may be suspended if it happens again.',
  'Hạn mức huỷ ca': 'Cancellation limit',
  'Bạn được huỷ tối đa 3 lần trong 7 ngày và 10 lần trong 30 ngày; vượt hạn mức thì tạm thời không huỷ được. Điểm ≥ 80 được thêm 1 lượt/tuần và 2 lượt/tháng; ≥ 95 thêm 2 lượt/tuần và 4 lượt/tháng.':
    'You can cancel at most 3 times in 7 days and 10 times in 30 days; beyond that you temporarily cannot cancel. A score of 80 or more adds 1 per week and 2 per month; 95 or more adds 2 per week and 4 per month.',
  'Cách huỷ đúng quy định': 'How to cancel properly',
  'Vào "Tổng quan" hoặc trang chi tiết ca, bấm "Huỷ đơn ứng tuyển".': 'Go to "Overview" or the shift page and tap "Cancel application".',
  'Chọn lý do và viết ngắn gọn; thông tin này gửi tới nhà tuyển dụng.': 'Choose a reason and keep it short; it is sent to the employer.',
  'Hệ thống sẽ tự động tính điểm và cập nhật lịch sử huỷ ngay.': 'The system updates your score and cancellation history straight away.',
  'Khi nhà tuyển dụng huỷ ca': 'When the employer cancels',
  'Bạn nhận thông báo và không bị trừ điểm. Hãy tìm ca khác hợp với lịch của bạn.':
    'You are notified and lose no points. Look for another shift that fits your schedule.',

  // --- Điểm uy tín ----------------------------------------------------------------
  'Điểm uy tín giúp nhà tuyển dụng nhanh chóng nhận biết bạn là người lao động đáng tin. Mọi người đều bắt đầu với 100 điểm và có thể giữ vững/tăng lên qua hành vi thực tế.':
    'Your reputation score helps employers quickly see that you are reliable. Everyone starts at 100 and can keep or improve it through how they actually work.',
  'Cách tính điểm': 'How the score works',
  '+5 điểm mỗi khi hoàn thành ca làm và được nhà tuyển dụng xác nhận.': '+5 points for each shift completed and confirmed by the employer.',
  '−10 điểm khi huỷ ca trong vòng 24 giờ trước giờ bắt đầu (huỷ sát giờ).': '−10 points for cancelling within 24 hours of the start (late cancellation).',
  '−20 điểm khi vắng mặt không báo trước.': '−20 points for not showing up without notice.',
  'Quản trị viên có thể điều chỉnh điểm với lý do cụ thể; mọi điều chỉnh đều ghi vào lịch sử.':
    'Administrators can adjust scores with a specific reason; every adjustment is recorded in the history.',
  'Ngưỡng điểm và quyền lợi': 'Score levels and benefits',
  '≥ 80: được hiển thị ưu tiên trong danh sách người ứng tuyển, mở rộng hạn mức huỷ ca trong tuần.':
    '80 or more: shown first in applicant lists and a higher weekly cancellation limit.',
  '50 – 79: ứng tuyển bình thường.': '50 – 79: apply as normal.',
  '< 50: tạm khoá quyền ứng tuyển ca mới cho đến khi điểm phục hồi.': 'Below 50: applying for new shifts is blocked until the score recovers.',
  'Cách nhanh chóng cải thiện điểm': 'How to improve your score quickly',
  'Chỉ ứng tuyển ca bạn chắc chắn tham gia được.': 'Only apply for shifts you are sure you can do.',
  'Đến đúng giờ, check-in qua hệ thống để có dấu thời gian rõ ràng.': 'Arrive on time and check in through the app for a clear time record.',
  'Nếu có việc đột xuất, huỷ càng sớm càng tốt — huỷ trước 24h không bị trừ điểm.':
    'If something comes up, cancel as early as possible; cancelling more than 24 hours ahead costs no points.',
  'Hoàn thành tốt ca làm để nhận đánh giá 4–5 sao và cộng điểm.': 'Do the shift well to get 4–5 star reviews and gain points.',
  'Hồ sơ cá nhân': 'Your profile',
  'Cập nhật ảnh đại diện, kỹ năng và khu vực ưa thích trong trang Hồ sơ. Nhà tuyển dụng nhìn thấy thông tin này khi xét duyệt đơn ứng tuyển, vì vậy hồ sơ rõ ràng giúp bạn được duyệt nhanh hơn.':
    'Update your photo, skills and preferred areas on your Profile page. Employers see this when reviewing applications, so a clear profile helps you get approved faster.',

  // --- Hướng dẫn sử dụng ----------------------------------------------------------
  'Đăng ký và làm hồ sơ.': 'Sign up and set up your profile.',
  'Chọn "Tôi muốn tìm ca làm" khi đăng ký. Thêm kỹ năng và khu vực muốn làm trong trang Hồ sơ.':
    'Choose "I want to find shifts" when signing up. Add your skills and preferred areas on your Profile page.',
  'Tìm và ứng tuyển ca.': 'Find and apply for shifts.',
  'Bấm "Tìm ca làm", mở ca phù hợp rồi bấm "Ứng tuyển". Ca trùng giờ với lịch của bạn sẽ bị chặn.':
    'Tap "Find shifts", open a suitable shift and tap "Apply". Shifts that clash with your schedule are blocked.',
  'Chờ duyệt.': 'Wait for approval.',
  'Bạn nhận thông báo khi nhà tuyển dụng duyệt hoặc từ chối (kèm lý do).':
    'You are notified when the employer approves or rejects you (with a reason).',
  'Đi làm.': 'Go to work.',
  'Đến nơi thì bấm "Check-in" trên trang Tổng quan, làm xong bấm "Check-out".':
    'When you arrive, tap "Check in" on your Overview; when you finish, tap "Check out".',
  'Nhận tiền công.': 'Get paid.',
  'Nhà tuyển dụng xác nhận hoàn thành thì tiền công vào ví, rút về ngân hàng khi cần. Không ai bấm thì hệ thống tự chốt khoảng 24 giờ sau ca.':
    'When the employer confirms completion, your pay goes into your wallet; withdraw it to your bank when you need. If nobody acts, the system settles about 24 hours after the shift.',
  'Nhà tuyển dụng xác nhận hoàn thành thì tiền công vào ví (mô phỏng trong bản demo).':
    'When the employer confirms completion, your pay goes into your wallet (simulated in the demo).',
  'Đăng ký và chọn loại tài khoản.': 'Sign up and choose an account type.',
  'Chọn "Tôi cần tuyển người lao động", rồi chọn Cá nhân hoặc Doanh nghiệp.':
    'Choose "I need to hire workers", then choose Individual or Business.',
  'Đăng ca và giữ cọc.': 'Post a shift and hold the deposit.',
  'Nhập giờ, địa điểm, lương và số người cần. Hệ thống giữ cọc tiền công + 10% phí từ ví rồi mới công khai ca.':
    'Enter the hours, location, pay and number of people. The system holds the pay + 10% fee from your wallet, then publishes the shift.',
  'Nhập giờ, địa điểm, lương và số người cần. Bấm "Mô phỏng giữ cọc" để công khai ca.':
    'Enter the hours, location, pay and number of people. Tap "Simulate deposit" to publish the shift.',
  'Duyệt người ứng tuyển.': 'Review applicants.',
  'Xem hồ sơ và điểm uy tín, bấm "Duyệt" hoặc "Từ chối" kèm lý do.':
    'Check profiles and reputation scores, then tap "Approve" or "Reject" with a reason.',
  'Theo dõi ca.': 'Follow the shift.',
  'Ca tự chuyển sang Đang diễn ra khi đến giờ. Người lao động check-in khi đến và check-out khi xong.':
    'The shift switches to In progress automatically at the start time. Workers check in on arrival and check out when done.',
  'Xác nhận hoàn thành.': 'Confirm completion.',
  'Bấm "Xác nhận hoàn thành" để trả tiền công. Ai không đến thì bấm "Vắng mặt": phần cọc đó hoàn về ví của bạn.':
    'Tap "Confirm completion" to pay. For anyone who did not come, tap "Absent": that part of the deposit is refunded to your wallet.',
  'Bấm "Xác nhận hoàn thành" để trả tiền công (mô phỏng). Ai không đến thì bấm "Vắng mặt".':
    'Tap "Confirm completion" to pay (simulated). For anyone who did not come, tap "Absent".',
  'Cách dùng CaLẻ': 'How to use CaLẻ',
  'Hướng dẫn ngắn cho người lao động và nhà tuyển dụng. Nạp, giữ cọc, trả công và rút tiền là giao dịch thật qua PayOS.':
    'A short guide for workers and employers. Top-ups, deposits, pay and withdrawals are real transactions through PayOS.',
  'Hướng dẫn ngắn cho người lao động và nhà tuyển dụng. Đây là bản demo: tiền và xác minh đều là mô phỏng.':
    'A short guide for workers and employers. This is the demo: money and verification are simulated.',
  'Tìm ca làm ngay': 'Find shifts now',
  'Tính năng cho người tìm việc': 'Features for job seekers',
  'Đánh dấu giờ bận / rảnh trong tuần.': 'Mark your busy / free hours in the week.',
  'Khi bạn ứng tuyển, ca trùng lịch bận hoặc trùng ca đã được duyệt sẽ bị chặn.':
    'When you apply, shifts that clash with your busy time or an approved shift are blocked.',
  'Bạn học 14:00–16:00 thứ Ba. Ca 15:00–17:00 thứ Ba sẽ báo trùng lịch.':
    'You have class 14:00–16:00 on Tuesday. A 15:00–17:00 Tuesday shift will show a clash.',
  'Đăng nhập để mở Lịch cá nhân': 'Log in to open your Schedule',
  'Tìm ca làm phù hợp': 'Find suitable shifts',
  'Bắt đầu 100 điểm (tạm tính từ lịch sử ca). Hoàn thành ca +5, vắng mặt không báo −20, huỷ trong 24 giờ trước ca −10.':
    'Start at 100 points (estimated from shift history). Completed shift +5, no-show without notice −20, cancelling within 24 hours of the shift −10.',
  'Nhà tuyển dụng xem điểm này khi duyệt người.': 'Employers see this score when approving people.',
  'Điểm dưới 50 bị tạm khoá ứng tuyển (bản demo).': 'Below 50, applying is temporarily blocked (demo).',
  'Bạn đang 100 điểm, vắng một ca không báo thì còn 80.': 'You have 100 points; missing a shift without notice leaves you with 80.',
  'Đăng nhập để xem điểm của bạn': 'Log in to see your score',
  'Ca đã hoàn thành': 'Completed shifts',
  'Số ca bạn làm xong và đã được nhà tuyển dụng xác nhận. Ca đang chờ xác nhận chưa được đếm.':
    'The number of shifts you finished and the employer confirmed. Shifts awaiting confirmation are not counted yet.',
  'Tuần này làm 3 ca, 2 ca đã xác nhận → ô này hiện 2.': 'You worked 3 shifts this week and 2 are confirmed → this tile shows 2.',
  'Tổng thu nhập': 'Total earnings',
  'Tổng tiền công đã vào ví từ các ca đã được xác nhận.': 'Total pay received in your wallet from confirmed shifts.',
  'Tổng tiền công từ các ca đã được xác nhận (mô phỏng).': 'Total pay from confirmed shifts (simulated).',
  'Không tính ca đang diễn ra hoặc đang chờ xác nhận.': 'Shifts in progress or awaiting confirmation are not counted.',
  'Ca 4 giờ × 45.000đ + ca 5 giờ × 60.000đ → tăng 480.000đ.': 'A 4-hour shift × 45.000đ + a 5-hour shift × 60.000đ → up 480.000đ.',
  'Tối đa 3 lần huỷ trong 7 ngày và 10 lần trong 30 ngày.': 'At most 3 cancellations in 7 days and 10 in 30 days.',
  'Điểm uy tín 80–94: 4/tuần, 12/tháng. Điểm 95–100: 5/tuần, 14/tháng.':
    'Reputation 80–94: 4 per week, 12 per month. Reputation 95–100: 5 per week, 14 per month.',
  '7 ngày qua đã huỷ 2 ca → còn 1 lượt.': 'You cancelled 2 shifts in the last 7 days → 1 left.',
  'Tính năng cho nhà tuyển dụng': 'Features for employers',
  'Nhập tên ca, giờ, địa điểm, lương theo giờ và số người cần.':
    'Enter the shift name, hours, location, hourly pay and number of people needed.',
  'Ca chỉ hiện cho người lao động sau khi hệ thống giữ cọc tiền công + 10% phí từ ví.':
    'The shift only appears to workers after the system holds the pay + 10% fee from your wallet.',
  'Ca 4 giờ, 35.000đ/giờ, cần 2 người: tiền công 280.000đ → giữ 308.000đ (gồm 28.000đ phí).':
    'A 4-hour shift at 35.000đ/hour for 2 people: 280.000đ pay → 308.000đ held (including a 28.000đ fee).',
  'Ca 4 giờ, 35.000đ/giờ, cần 2 người: giữ cọc 280.000đ (mô phỏng).':
    'A 4-hour shift at 35.000đ/hour for 2 people: 280.000đ deposit held (simulated).',
  'Đăng nhập để đăng ca tuyển': 'Log in to post a shift',
  'Xem cách giữ cọc': 'See how deposits work',
  'Xem hồ sơ, điểm uy tín và số ca đã làm ngay trên trang quản lý ca.':
    'See profiles, reputation scores and shifts worked right on the shift management page.',
  'Bấm "Duyệt", hoặc "Từ chối" kèm lý do để người lao động hiểu.':
    'Tap "Approve", or "Reject" with a reason so the worker understands.',
  '3 người ứng tuyển: bạn duyệt 2 người nhiều kinh nghiệm, từ chối 1 người kèm lý do.':
    '3 applicants: you approve the 2 most experienced and reject 1 with a reason.',
  'Đăng nhập để quản lý người ứng tuyển': 'Log in to manage applicants',
  'Xem quy trình tuyển dụng': 'See the hiring process',
  'Ca đang hoạt động': 'Active shifts',
  'Ca đã giữ cọc và đang tuyển, đã đủ người, đang diễn ra hoặc chờ xác nhận. Không tính nháp, đã huỷ, hết hạn, đã hoàn thành.':
    'Shifts with a deposit held that are hiring, full, in progress or awaiting confirmation. Drafts, cancelled, expired and completed shifts are not counted.',
  'Đơn chờ duyệt': 'Pending applications',
  'Đơn bạn chưa duyệt hoặc từ chối. Nên xử lý sớm, nhất là ca diễn ra trong 24 giờ tới.':
    'Applications you have not approved or rejected yet. Handle them early, especially for shifts in the next 24 hours.',
  'Ca đã đăng': 'Posted shifts',
  'Tổng số ca bạn từng tạo, gồm mọi trạng thái.': 'All shifts you have ever created, in every status.',
  'Ca bạn đã xác nhận hoàn thành; tiền công đã vào ví người lao động.':
    'Shifts you confirmed as completed; the pay is in the workers’ wallets.',
  'Ca bạn đã xác nhận hoàn thành; tiền công đã được trả (mô phỏng).':
    'Shifts you confirmed as completed; the pay has been paid (simulated).',
  'Tiền cọc': 'Deposits',
  'Cách giữ cọc hoạt động': 'How deposits work',
  'Giữ cọc': 'Deposit',
  'Tiền công được giữ cọc trước khi ca hiện ra, và chỉ trả cho người lao động khi ca xong.':
    'The pay is held before the shift appears and only paid to workers when the shift is done.',
  'Phần không dùng (vị trí trống, người vắng mặt, ca huỷ) hoàn về ví của bạn.':
    'Unused money (unfilled spots, no-shows, cancelled shifts) is refunded to your wallet.',
  'Nạp và rút tiền là giao dịch thật qua PayOS.': 'Top-ups and withdrawals are real transactions through PayOS.',
  'Trong bản demo, mọi giao dịch đều là mô phỏng.': 'In the demo, every transaction is simulated.',
  'Xem chi tiết giữ cọc': 'See deposit details',
  'Đăng nhập': 'Log in',
  'Tổng tiền công chờ thanh toán': 'Total pay awaiting payment',
  'Tiền cọc đang giữ cho các ca chưa xong. Chưa phải tiền đã trả.':
    'Deposits held for shifts not yet finished. This is not money already paid.',
  'Đăng ca 280.000đ tiền công → ô này tăng 280.000đ.': 'Post a shift with 280.000đ pay → this tile goes up 280.000đ.',
  'Tổng tiền công đã thanh toán': 'Total pay paid',
  'Tiền đã trả cho người lao động, tăng mỗi lần bạn xác nhận hoàn thành.':
    'Money paid to workers; it goes up each time you confirm completion.',
  'Quyền riêng tư': 'Privacy',
  'Xác minh người dùng': 'User verification',
  'Cách xác minh hoạt động': 'How verification works',
  'Gửi giấy tờ trong trang Hồ sơ; quản trị viên duyệt.': 'Submit documents on your Profile page; an administrator reviews them.',
  'Người dùng khác chỉ thấy huy hiệu "Đã xác minh" và số giấy tờ đã che, không thấy ảnh gốc.':
    'Other users only see a "Verified" badge and a masked document number, never the original images.',
  'Người lao động có phải trả trước không?': 'Do workers pay anything upfront?',
  'Không. Chỉ nhà tuyển dụng giữ cọc tiền công trước khi đăng ca.': 'No. Only employers hold the pay as a deposit before posting a shift.',
  'Tôi có huỷ được ca đã được duyệt không?': 'Can I cancel a shift I was approved for?',
  'Được. Còn hơn 3 giờ trước ca thì huỷ ngay; dưới 3 giờ cần nhà tuyển dụng đồng ý. Huỷ trong 24 giờ trước ca bị trừ 10 điểm uy tín.':
    'Yes. More than 3 hours before the shift you can cancel straight away; within 3 hours the employer must agree. Cancelling within 24 hours of the shift costs 10 reputation points.',
  'Có giao dịch tiền thật không?': 'Is real money involved?',
  'Có. Nạp, giữ cọc, trả công và rút tiền là giao dịch thật qua cổng thanh toán PayOS.':
    'Yes. Top-ups, deposits, pay and withdrawals are real transactions through the PayOS payment gateway.',
  'Không. Đây là bản demo, mọi giao dịch đều là mô phỏng.': 'No. This is the demo; every transaction is simulated.',
  'Có vướng mắc thì làm gì?': 'What if I have a problem?',
  'Vào trang Liên hệ hỗ trợ, đội ngũ CaLẻ sẽ xem và phản hồi.': 'Go to the Contact support page; the CaLẻ team will look into it and reply.',
  'Bấm "Báo cáo vấn đề" trên trang quản lý ca; quản trị viên xem xét theo Chính sách xử lý tranh chấp.':
    'Tap "Report a problem" on the shift management page; an administrator reviews it under the Dispute policy.',
  // 03/10 — bản thật chưa có luồng khiếu nại trong app: mở yêu cầu qua đội hỗ trợ.
  'Vào trang Liên hệ hỗ trợ, mô tả sự việc và gửi kèm bằng chứng (ảnh bàn giao, giờ check-in). Đội ngũ CaLẻ sẽ xem và phản hồi.':
    'Go to the Support page, describe what happened and include evidence (handover photo, check-in time). The CaLẻ team will review it and reply.',
  'Liên hệ đội hỗ trợ CaLẻ qua trang Liên hệ hỗ trợ. Mô tả tình huống cụ thể, thời điểm xảy ra, và đính kèm chứng cứ nếu có (ảnh màn hình, giờ check-in/out).':
    'Contact the CaLẻ support team via the Support page. Describe the situation and when it happened, and attach evidence if you have it (screenshots, check-in/out times).',
  // 03/10 — bản thật: điểm uy tín chỉ tạm tính (không chặn ứng tuyển, chưa có hạn mức huỷ / điều chỉnh điểm), chưa có boost.
  'Bạn cần xác thực số điện thoại trước khi ứng tuyển ca đầu tiên. Ca đã đủ người hoặc đã bắt đầu thì không nhận thêm đơn.':
    'You need to verify your phone number before applying for your first shift. Shifts that are already full or have already started no longer accept applications.',
  'Có. Còn hơn 3 giờ nữa mới bắt đầu thì bạn tự huỷ được; trong vòng 3 giờ cần nhà tuyển dụng đồng ý. Huỷ trong 24 giờ trước ca bị trừ 10 điểm uy tín. Chi tiết tại "Quy định huỷ ca".':
    'Yes. More than 3 hours before the start you can cancel yourself; within 3 hours the employer has to agree. Cancelling within 24 hours of the shift costs 10 reputation points. Details are in "Cancellation rules".',
  'Hãy đảm bảo ca đã được giữ cọc và công khai (kiểm tra trạng thái hiển thị "Đang tuyển"). Mô tả ca rõ ràng, mức lương theo thị trường khu vực. Nếu cần thay đổi mô tả, dùng nút Chỉnh sửa trước 24h.':
    'Make sure the shift has its deposit held and is public (check that it shows "Hiring"). Describe the shift clearly and set pay in line with the local market. If you need to change the description, use the Edit button at least 24 hours ahead.',
  'Hệ quả với tài khoản':
    'Consequences for the account',
  'Tuỳ kết quả xem xét, quản trị viên có thể tạm khoá tài khoản nếu có vi phạm nghiêm trọng.':
    'Depending on the outcome, an administrator may temporarily lock an account for a serious violation.',
  'Bản thật chưa giới hạn số lần huỷ. Mỗi lần huỷ trong 24 giờ trước ca vẫn bị trừ 10 điểm uy tín.':
    'The live version does not limit how many times you cancel yet. Each cancellation within 24 hours of a shift still costs 10 reputation points.',
  'Còn hơn 3 giờ trước ca thì tự huỷ; trong vòng 3 giờ cần nhà tuyển dụng đồng ý.':
    'More than 3 hours before the shift you can cancel yourself; within 3 hours the employer has to agree.',
  'Huỷ một ca bắt đầu sau 2 giờ nữa → gửi yêu cầu, chờ nhà tuyển dụng đồng ý.':
    'Cancelling a shift that starts in 2 hours → send a request and wait for the employer to agree.',
  // 03/10 — /safety bản thật.
  'Xác thực số điện thoại bằng mã gửi qua tin nhắn và CCCD (quản trị viên duyệt) trong trang hồ sơ. Ảnh giấy tờ nằm ở kho riêng tư, chỉ quản trị viên xem để duyệt.':
    'Verify your phone number with a text-message code and your citizen ID (reviewed by an administrator) on your profile page. ID photos are kept in private storage; only administrators see them to review.',
  'Đánh giá sau ca':
    'Post-shift reviews',
  'Sau mỗi ca, hai bên chấm sao và viết nhận xét cho nhau trong 14 ngày. Nhà tuyển dụng thấy điểm sao trung bình, số ca đã làm với mình và số lần vắng mặt của người ứng tuyển; người lao động thấy nhận xét về quán trước khi nhận ca.':
    'After each shift, both sides rate each other with stars and a comment within 14 days. Employers see the average stars, shifts worked with them and no-shows of each applicant; workers see comments about the venue before taking a shift.',
  'CaLẻ không thu phí của người lao động. Khoản cọc khi ứng tuyển (nếu có) hoàn đủ khi ca hoàn thành hoặc khi bạn không được chọn.':
    'CaLẻ charges workers no fees. Any deposit taken when you apply is refunded in full when the shift is completed or if you are not selected.',
  // 03/10 — /how-it-works đồng bộ landing.
  "Trang nhà tuyển dụng":
    "Employer page",
  "Bốn bước của một ca":
    "Four steps of a shift",
  "Nhập giờ làm, địa điểm, lương theo giờ và số người cần. Ca chỉ hiện cho người lao động sau khi hệ thống giữ tiền công và 10% phí từ ví.":
    "Enter the hours, place, hourly pay and number of people. Workers only see the shift once the wages plus the 10% fee are held from the wallet.",
  "Nhập giờ làm, địa điểm, lương theo giờ và số người cần. Ca chỉ hiện cho người lao động sau khi giữ cọc (mô phỏng).":
    "Enter the hours, place, hourly pay and number of people. Workers only see the shift once the deposit is held (simulated).",
  "Chọn ca hợp lịch rồi bấm Ứng tuyển. Đơn chờ nhà tuyển dụng duyệt.":
    "Pick a shift that fits your schedule and tap Apply. The employer then reviews your application.",
  "Mọi đồng giữ lúc đăng ca đi về đúng một trong ba nơi: người đã làm, phí CaLẻ, hoặc hoàn về ví nhà tuyển dụng.":
    "Every đồng held at posting goes to exactly one of three places: the people who worked, the CaLẻ fee, or back to the employer wallet.",
  "Xem kỹ từng bước theo vai trò":
    "Walk through it for your role",
  "Bạn tìm ca":
    "Looking for shifts",
  "Tìm ca, ứng tuyển, nhận tiền":
    "Find, apply, get paid",
  "Xem một ca từ lúc tìm, đọc chi tiết, ứng tuyển tới lúc check-in và tiền về ví.":
    "Follow one shift from searching and reading the details to applying, checking in and getting paid.",
  "Xem minh hoạ":
    "See the walkthrough",
  "Bạn cần người":
    "Need people",
  "Đăng ca, duyệt người, trả công":
    "Post, approve, pay",
  "Thử đăng một ca, tính tiền giữ từ ví, xem người ứng tuyển và ngày làm diễn ra thế nào.":
    "Try posting a shift, work out the amount held, and see applicants and the shift day play out.",
  "Thử đăng một ca":
    "Try posting a shift",
  "Tôi cần việc":
    "I need work",
  "Tôi cần tuyển người":
    "I need to hire",
  // 03/10 — trang hướng dẫn làm lại (feat/info-pages-redesign).
  "Hồ sơ rõ ràng và đánh giá tốt sau mỗi ca giúp nhà tuyển dụng yên tâm duyệt bạn. Điểm uy tín đang được hoàn thiện.":
    "A clear profile and good reviews after each shift help employers approve you with confidence. The reputation score is still being finished.",
  "Hồ sơ rõ ràng, đánh giá tốt sau mỗi ca và điểm uy tín cao giúp nhà tuyển dụng yên tâm duyệt bạn.":
    "A clear profile, good reviews after each shift and a high reputation score help employers approve you with confidence.",
  "Cập nhật hồ sơ":
    "Update your profile",
  "Nhà tuyển dụng thấy gì khi duyệt bạn":
    "What employers see when reviewing you",
  "Những thông tin này hiện trên thẻ ứng viên, cạnh nút Duyệt.":
    "This information shows on the applicant card, next to the Approve button.",
  "Số ca đã làm với họ":
    "Shifts worked with them",
  "Bao nhiêu ca bạn đã hoàn thành cho chính nhà tuyển dụng đó.":
    "How many shifts you have completed for that employer.",
  "Số lần vắng mặt với họ":
    "No-shows with them",
  "Không đến mà không báo được ghi lại cho từng nhà tuyển dụng.":
    "Not showing up without notice is recorded per employer.",
  "Điểm sao trung bình":
    "Average stars",
  "Từ đánh giá sau ca của các nhà tuyển dụng trước.":
    "From post-shift reviews by previous employers.",
  "Lời giới thiệu và loại việc bạn muốn làm.":
    "Your introduction and the kinds of work you want.",
  "Tính từ lịch sử ca: hoàn thành, huỷ sát giờ, vắng mặt.":
    "Calculated from shift history: completions, late cancellations, no-shows.",
  "Ca đã hoàn thành, số lần vắng":
    "Completed shifts, no-shows",
  "Lịch sử làm ca của bạn trên CaLẻ.":
    "Your shift history on CaLẻ.",
  "Kỹ năng và xác minh":
    "Skills and verification",
  "Cấp kỹ năng theo loại việc và giấy tờ đã xác minh.":
    "Skill levels per type of work and verified documents.",
  "Điểm uy tín tính thế nào?":
    "How is the reputation score calculated?",
  "Bản thật chưa tính điểm uy tín. Khi tính năng mở, điểm sẽ cộng trừ theo luật dưới đây.":
    "The live version does not calculate reputation yet. When it launches, points will follow the rules below.",
  "Mọi người bắt đầu với 100 điểm. Điểm thay đổi theo những gì bạn làm với từng ca.":
    "Everyone starts at 100 points. Points change with what you do on each shift.",
  "Hoàn thành ca":
    "Completed shift",
  "Nhà tuyển dụng xác nhận bạn đã làm xong ca.":
    "The employer confirms you finished the shift.",
  "Huỷ trong 24 giờ trước ca":
    "Cancelling within 24 hours of the shift",
  "Huỷ càng sát giờ càng làm nhà tuyển dụng khó tìm người thay.":
    "The later you cancel, the harder it is for the employer to find someone else.",
  "Vắng mặt không báo":
    "No-show without notice",
  "Không đến mà không báo trước. Bạn cũng không nhận tiền công ca đó.":
    "Not turning up without telling anyone. You also get no pay for that shift.",
  "Được ưu tiên":
    "Priority",
  "Hiện trước trong danh sách người ứng tuyển, thêm lượt huỷ mỗi tuần (bản demo).":
    "Shown first in the applicant list, with extra cancellations each week (demo).",
  "Tạm khoá ứng tuyển":
    "Applying paused",
  "Không ứng tuyển ca mới cho tới khi điểm phục hồi (bản demo).":
    "You cannot apply for new shifts until your score recovers (demo).",
  "Giữ hồ sơ tốt":
    "Keep a good record",
  "Chỉ nhận ca chắc đi được":
    "Only take shifts you can make",
  "Xem kỹ giờ, địa điểm và yêu cầu trước khi bấm Ứng tuyển.":
    "Check the hours, place and requirements before tapping Apply.",
  "Check-in đúng giờ":
    "Check in on time",
  "Bấm check-in trong khoảng 15 phút trước tới 15 phút sau giờ bắt đầu.":
    "Check in between 15 minutes before and 15 minutes after the start time.",
  "Có việc thì huỷ sớm":
    "Cancel early if something comes up",
  "Còn hơn 3 giờ thì tự huỷ được; càng sớm càng tốt cho nhà tuyển dụng.":
    "More than 3 hours before, you can cancel yourself; the earlier the better for the employer.",
  "Làm tốt để được 4–5 sao":
    "Do well to earn 4–5 stars",
  "Đánh giá sau ca đi theo bạn sang những lần ứng tuyển sau.":
    "Post-shift reviews follow you to your next applications.",
  "Các mốc thời gian khi bạn cần huỷ một ca đã nhận.":
    "The deadlines for cancelling a shift you have taken.",
  "Có việc đột xuất thì huỷ được, miễn là đúng mốc giờ. Ví dụ dưới đây là một ca bắt đầu lúc {start}.":
    "If something comes up you can cancel, as long as you meet the deadlines. The example below is a shift starting at {start}.",
  "Mở trang Tổng quan":
    "Open your Overview",
  "Huỷ lúc nào thì sao?":
    "What happens when you cancel?",
  "Ca ví dụ: {start}–{end}. Mốc giờ đổi theo giờ bắt đầu của ca bạn nhận.":
    "Example shift: {start}–{end}. The deadlines move with the start time of your shift.",
  "Trước {time}":
    "Before {time}",
  "Tự huỷ":
    "Cancel yourself",
  "Còn hơn 3 giờ nữa mới bắt đầu: bạn tự huỷ, không cần ai đồng ý.":
    "More than 3 hours before the start: you cancel yourself, no approval needed.",
  "Còn hơn 3 giờ nữa mới bắt đầu: bạn tự huỷ. Huỷ trong 24 giờ trước ca bị trừ 10 điểm uy tín.":
    "More than 3 hours before the start: you cancel yourself. Cancelling within 24 hours of the shift costs 10 reputation points.",
  "Cần nhà tuyển dụng đồng ý":
    "Employer approval needed",
  "Trong 3 giờ trước ca: gửi yêu cầu huỷ. Trong lúc chờ, bạn vẫn giữ chỗ.":
    "Within 3 hours of the shift: send a cancellation request. You keep your place while you wait.",
  "Sau {time}":
    "After {time}",
  "Không đến mà không báo":
    "Not showing up without notice",
  "Bị tính vắng mặt và không nhận tiền công. Nếu bạn đã đặt cọc khi ứng tuyển, cọc chuyển cho nhà tuyển dụng; bạn khiếu nại được trong 72 giờ.":
    "Counted as a no-show, with no pay. If you paid a deposit when applying, it goes to the employer; you can contest within 72 hours.",
  "Bị tính vắng mặt, không nhận tiền công và bị trừ 20 điểm uy tín.":
    "Counted as a no-show, with no pay and minus 20 reputation points.",
  "Điểm uy tín và hạn mức số lần huỷ đang được hoàn thiện; khi mở, huỷ sát giờ sẽ ảnh hưởng tới điểm của bạn.":
    "Reputation and cancellation limits are still being finished; once live, late cancellations will affect your score.",
  "Hạn mức (bản demo): tối đa 3 lần huỷ trong 7 ngày và 10 lần trong 30 ngày. Điểm từ 80 được thêm 1 lượt mỗi tuần, từ 95 thêm 2 lượt.":
    "Limits (demo): at most 3 cancellations in 7 days and 10 in 30 days. A score of 80+ adds 1 per week, 95+ adds 2.",
  "Mở ca đã nhận":
    "Open the shift",
  "Vào trang Tổng quan hoặc trang chi tiết ca.":
    "Go to your Overview or the shift page.",
  "Bấm \"Huỷ đơn ứng tuyển\"":
    "Tap \"Cancel application\"",
  "Trong 3 giờ trước ca, nút này gửi yêu cầu huỷ tới nhà tuyển dụng.":
    "Within 3 hours of the shift, this button sends a cancellation request to the employer.",
  "Ghi lý do ngắn gọn":
    "Give a short reason",
  "Lý do được gửi tới nhà tuyển dụng.":
    "The reason is sent to the employer.",
  "Theo dõi trạng thái":
    "Follow the status",
  "Đơn chuyển sang \"Yêu cầu huỷ\" cho tới khi nhà tuyển dụng trả lời.":
    "The application shows \"Cancellation requested\" until the employer answers.",
  "Bạn không bị trừ gì":
    "Nothing is held against you",
  "Đơn chuyển sang \"Nhà tuyển dụng đã hủy\" trên trang Tổng quan. Cọc khi ứng tuyển (nếu có) được hoàn đủ.":
    "The application shows \"Cancelled by employer\" on your Overview. Any deposit you paid when applying is refunded in full.",
  "Bạn nhận thông báo, đơn chuyển sang \"Nhà tuyển dụng đã hủy\" và không bị trừ điểm.":
    "You get a notification, the application shows \"Cancelled by employer\" and you lose no points.",
  "Nhà tuyển dụng cũng có mốc":
    "Employers have deadlines too",
  "Họ chỉ huỷ được khi còn hơn 6 giờ nữa mới bắt đầu, nếu ca đã có người ứng tuyển.":
    "Once someone has applied, they can only cancel more than 6 hours before the start.",
  "Nhà tuyển dụng thấy gì khi duyệt bạn.":
    "What employers see when reviewing you.",
  "Một phút chấm sao và viết một câu nhận xét giúp nhà tuyển dụng sau biết người mình sắp duyệt, và giúp người làm tốt được nhận ca tiếp.":
    "A minute to rate and write one line helps the next employer know who they are approving, and helps good workers get more shifts.",
  "Mở trang quản lý":
    "Open your dashboard",
  "Khi nào và chấm thế nào?":
    "When and how to rate",
  "Sau khi ca hoàn thành":
    "After the shift is completed",
  "Bạn có 14 ngày kể từ giờ kết thúc ca để chấm từng người trong trang quản lý ca.":
    "You have 14 days from the end of the shift to rate each person on the shift page.",
  "Bạn chấm khi xác nhận hoàn thành ca. Trong bản demo, phải đánh giá thì tiền công (mô phỏng) mới được trả.":
    "You rate when confirming completion. In the demo, wages (simulated) are only paid after you rate.",
  "Chấm sao, thêm một câu nhận xét":
    "Stars plus one line of comment",
  "Nhận xét không bắt buộc nhưng rất có ích cho nhà tuyển dụng sau.":
    "The comment is optional but very useful for the next employer.",
  "Hai chiều":
    "Two-way",
  "Người lao động cũng chấm quán":
    "Workers rate your venue too",
  "Họ chấm sao, chọn thẻ nhanh như \"Trả lương đúng cam kết\" và viết nhận xét về quán.":
    "They give stars, pick quick tags such as \"Paid as promised\" and comment on your venue.",
  "Cố định":
    "Final",
  "Gửi rồi không sửa được":
    "Cannot be edited once sent",
  "Đọc lại trước khi bấm Gửi.":
    "Read it again before tapping Send.",
  "Gợi ý tiêu chí":
    "Suggested criteria",
  "Viết cụ thể: \"Pha chế nhanh, gọn quầy\" hữu ích hơn \"Tốt\".":
    "Be specific: \"Fast drinks, tidy bar\" helps more than \"Good\".",
  "Đúng giờ":
    "Punctuality",
  "Có mặt và check-in đúng giờ bắt đầu ca không?":
    "Did they arrive and check in at the start time?",
  "Thái độ":
    "Attitude",
  "Lịch sự, hợp tác với khách và đồng nghiệp?":
    "Polite and cooperative with customers and colleagues?",
  "Chất lượng công việc":
    "Quality of work",
  "Làm đúng những gì ghi trong mô tả ca?":
    "Did they do what the shift description asked?",
  "Nghe máy, báo trước nếu đến muộn hay có vấn đề?":
    "Did they answer calls and warn you if late or if something came up?",
  "Có sự cố thì sao?":
    "What if something goes wrong?",
  "Đánh giá vẫn nên trung thực, nhưng sự cố cần được xử lý riêng.":
    "Reviews should stay honest, but incidents need to be handled separately.",
  "Không chỉ chấm sao thấp":
    "Do not just give low stars",
  "Gặp hành vi không phù hợp hay mất an toàn: liên hệ đội hỗ trợ CaLẻ để quản trị viên xem xét.":
    "For inappropriate or unsafe behaviour, contact the CaLẻ support team so an administrator can review it.",
  "Gặp hành vi không phù hợp hay mất an toàn: mở \"Báo cáo sự cố\" để quản trị viên xem xét.":
    "For inappropriate or unsafe behaviour, open \"Report an incident\" so an administrator can review it.",
  "Vắng":
    "No-show",
  "Đánh dấu vắng mặt trong trang quản lý ca; phần tiền của vị trí đó hoàn về ví của bạn.":
    "Mark them absent on the shift page; the money for that place goes back to your wallet.",
  "Nạp tiền vào ví bằng chuyển khoản qua PayOS. Khi đăng ca, hệ thống giữ tiền công cùng phí dịch vụ 10% từ ví; tiền công chỉ trả cho người đã làm.":
    "Top up your wallet by bank transfer via PayOS. When you post a shift, the wages plus the 10% service fee are held from your wallet; wages are only paid to people who worked.",
  "Khi đăng ca, tiền công được giữ từ ví; tiền chỉ trả cho người lao động khi ca hoàn thành. Trong bản demo mọi khoản tiền là mô phỏng, không có giao dịch thật.":
    "When you post a shift, the wages are held from your wallet and only paid to workers when the shift is completed. In the demo all money is simulated; there are no real transactions.",
  "Khi nào tiền được trả hoặc hoàn?":
    "When is money paid or refunded?",
  "Xác nhận":
    "Confirm",
  "Trả công":
    "Pay wages",
  "Tự chốt":
    "Auto-settle",
  "Không ai bấm thì hệ thống tự xác nhận 24 giờ sau khi ca kết thúc.":
    "If nobody confirms, the system confirms automatically 24 hours after the shift ends.",
  "Hoàn":
    "Refund",
  "Phần không dùng":
    "Unused part",
  "Vị trí trống, người vắng mặt, ca huỷ: phần tiền tương ứng, kể cả phí, hoàn về ví của bạn.":
    "Empty places, no-shows, cancelled shifts: the matching amount, fee included, goes back to your wallet.",
  "Rút":
    "Withdraw",
  "Về ngân hàng":
    "To your bank",
  "Số dư ví rút về tài khoản ngân hàng khi bạn cần.":
    "Withdraw your wallet balance to your bank account whenever you need.",
  "Trả công (mô phỏng)":
    "Pay wages (simulated)",
  "Bạn xác nhận hoàn thành ca: khoản tiền giữ chuyển thành tiền công cho người lao động.":
    "You confirm completion: the held amount becomes wages for the workers.",
  "Huỷ đúng quy định":
    "Cancel within the rules",
  "Huỷ ca đúng mốc thì khoản tiền giữ được hoàn về ví.":
    "Cancel before the deadline and the held amount goes back to your wallet.",
  "Tranh chấp":
    "Disputes",
  "Quản trị viên xem bằng chứng rồi quyết định trả hay hoàn khoản tiền giữ.":
    "An administrator reviews the evidence and decides whether the held amount is paid or refunded.",
  "Người lao động vắng mặt không báo: bạn được tặng 1 lượt boost cho ca sau, giúp ca hiện ưu tiên.":
    "If a worker does not show up without notice, you get 1 boost for your next shift so it is shown first.",
  "Ví dụ một ca bắt đầu lúc {start}.":
    "Example: a shift starting at {start}.",
  "Huỷ được":
    "You can cancel",
  "Còn hơn 6 giờ nữa mới bắt đầu: bạn huỷ, khoản tiền giữ hoàn về ví.":
    "More than 6 hours before the start: you cancel and the held amount goes back to your wallet.",
  "Tuỳ có người ứng tuyển chưa":
    "Depends on applicants",
  "Trong 6 giờ trước ca: đã có người ứng tuyển thì không huỷ được, để bảo vệ người lao động; chưa có ai thì vẫn huỷ được.":
    "Within 6 hours of the shift: if anyone has applied you cannot cancel, to protect workers; if nobody has, you still can.",
  "Không huỷ được":
    "You cannot cancel",
  "Ca đã bắt đầu.":
    "The shift has started.",
  "Nạp tiền vào ví bằng chuyển khoản qua PayOS. Trong đợt miễn phí dịch vụ, phí là 0 đ.":
    "Top up your wallet by bank transfer via PayOS. During a fee-free offer, the fee is 0 đ.",
  "Phí dịch vụ và ví dụ cho một ca.":
    "Service fee and an example for one shift.",
  "Một chỗ xem các ca đã nhận, ca đang chờ duyệt và giờ bận của bạn, để không nhận nhầm ca trùng giờ học hay việc riêng.":
    "One place to see the shifts you have taken, those awaiting approval and your busy times, so you do not take a shift that clashes with classes or other plans.",
  "Mở lịch cá nhân":
    "Open your schedule",
  "Lịch hiện những gì":
    "What the schedule shows",
  "Ca đã nhận và ca chờ duyệt":
    "Taken and pending shifts",
  "Mỗi ca một màu theo trạng thái: chờ duyệt, đã duyệt, đã hoàn thành.":
    "Each shift is coloured by status: pending, approved, completed.",
  "Giờ bận, giờ rảnh":
    "Busy and free times",
  "Bạn tự thêm: giờ học, ca làm nơi khác, việc riêng; hoặc giờ rảnh muốn nhận ca.":
    "You add them yourself: classes, work elsewhere, personal plans; or free times when you want shifts.",
  "Tóm tắt tuần":
    "Week summary",
  "Số ca đã nhận, số giờ làm, tiền công dự kiến và số đơn chờ duyệt của tuần đang xem.":
    "Shifts taken, hours, expected pay and pending applications for the week shown.",
  "Năm mục gần nhất kể từ hôm nay, bấm là mở chi tiết.":
    "The next five items from today; tap one to open its details.",
  "Cách dùng":
    "How to use it",
  "Chọn tuần":
    "Pick a week",
  "Bấm mũi tên hoặc chọn ngày trên lịch tháng nhỏ. Mỗi ngày chia 4 cụm: Đêm, Sáng, Chiều, Tối.":
    "Use the arrows or pick a day on the small month calendar. Each day has 4 blocks: Night, Morning, Afternoon, Evening.",
  "Thêm giờ bận":
    "Add busy time",
  "Bấm vào ô trống: hộp thêm lịch mở sẵn đúng giờ bạn bấm.":
    "Tap an empty slot: the add form opens at the hour you tapped.",
  "Bấm một ca để xem giờ, địa điểm, tiền công và giờ mở check-in.":
    "Tap a shift to see its time, place, pay and when check-in opens.",
  "Trên điện thoại":
    "On your phone",
  "Lịch mở sẵn chế độ Danh sách, xem từng ngày cho dễ.":
    "The schedule opens in List view so each day is easy to read.",
  "Trùng lịch":
    "Clashes",
  "Ví dụ: bạn học 14:00–16:00 thứ Ba, rồi thấy một ca 15:00–17:00 cùng ngày.":
    "Example: you have class 14:00–16:00 on Tuesday and see a 15:00–17:00 shift that day.",
  "Tự xem":
    "Check yourself",
  "Kiểm tra lịch trước khi ứng tuyển":
    "Check your schedule before applying",
  "Bản này chưa tự chặn ca trùng giờ khi ứng tuyển. Mở lịch xem giờ bận trước khi bấm Ứng tuyển.":
    "This version does not block clashing shifts when you apply yet. Open your schedule and check your busy times before tapping Apply.",
  "Huỷ sớm":
    "Cancel early",
  "Lỡ nhận ca trùng":
    "Took a clashing shift by mistake",
  "Còn hơn 3 giờ trước ca thì tự huỷ được.":
    "More than 3 hours before the shift, you can cancel yourself.",
  "Chặn":
    "Blocked",
  "Ca trùng giờ bận bị chặn":
    "Shifts clashing with busy time are blocked",
  "Bấm Ứng tuyển ca 15:00–17:00 sẽ báo trùng lịch với giờ học của bạn.":
    "Applying for the 15:00–17:00 shift shows a clash with your class.",
  "Ca trùng ca đã duyệt bị chặn":
    "Shifts clashing with approved shifts are blocked",
  "Không nhận được hai ca chồng giờ nhau.":
    "You cannot take two overlapping shifts.",
  "Khoá":
    "Locked",
  "Không thêm giờ bận đè lên ca đã duyệt":
    "No busy time over an approved shift",
  "Ca đã duyệt được giữ chỗ trên lịch.":
    "Approved shifts keep their place on the schedule.",
  "Nhập giờ, địa điểm, lương theo giờ và số người cần. Ca hiện cho người lao động ngay khi hệ thống giữ đủ tiền công cùng 10% phí từ ví.":
    "Enter the hours, place, hourly pay and number of people. Workers see the shift as soon as the wages plus the 10% fee are held from your wallet.",
  "Nhập giờ, địa điểm, lương theo giờ và số người cần. Ca hiện cho người lao động khi đã giữ đủ tiền công (mô phỏng).":
    "Enter the hours, place, hourly pay and number of people. Workers see the shift once the wages are held (simulated).",
  "Tiền được giữ thế nào":
    "How money is held",
  "Bốn bước đăng một ca":
    "Four steps to post a shift",
  "Tên ca, loại việc, ngày, giờ, địa điểm, lương theo giờ, số người; thêm mô tả, yêu cầu và người phụ trách tại chỗ.":
    "Shift name, type of work, date, hours, place, hourly pay, headcount; plus description, requirements and the on-site contact.",
  "Xem số tiền giữ":
    "Check the amount held",
  "Trang đăng ca tính sẵn tiền công, phí 10% và tổng giữ từ ví.":
    "The posting page works out the wages, the 10% fee and the total held from your wallet.",
  "Trang đăng ca tính sẵn tổng tiền giữ từ ví (mô phỏng).":
    "The posting page works out the total held from your wallet (simulated).",
  "Giữ tiền và đăng":
    "Hold funds and post",
  "Ví đủ thì ca hiện ngay cho người lao động; ví thiếu thì ca được lưu nháp, nạp thêm rồi đăng.":
    "With enough in your wallet the shift goes live at once; if not, it is saved as a draft, top up and post.",
  "Duyệt người":
    "Approve people",
  "Người ứng tuyển hiện trong trang quản lý ca; bạn duyệt từng người.":
    "Applicants show on the shift page; you approve each person.",
  "Sửa và huỷ ca đã đăng":
    "Editing and cancelling a posted shift",
  "Sửa ca":
    "Edit a shift",
  "Sửa được khi còn hơn 24 giờ nữa mới bắt đầu.":
    "You can edit until 24 hours before the start.",
  "Còn hơn 6 giờ: huỷ được, khoản tiền giữ hoàn về ví. Trong 6 giờ mà đã có người ứng tuyển thì không huỷ được.":
    "More than 6 hours before: you can cancel and the held amount comes back. Within 6 hours, once anyone has applied, you cannot.",
  "Đăng lại":
    "Repost",
  "Ca lặp lại hằng tuần":
    "Weekly repeat shifts",
  "Tạo ca mới từ ca cũ, chỉ cần chọn lại ngày giờ.":
    "Create a new shift from an old one; just pick the new date and time.",
  "Duyệt người, xác nhận có mặt và hoàn thành ca.":
    "Approve people, confirm attendance and completion.",
  "Mọi việc với người làm của một ca nằm trên trang quản lý ca: duyệt người, xác nhận có mặt, đánh dấu vắng và xác nhận hoàn thành.":
    "Everything about the people on a shift lives on the shift page: approving, confirming attendance, marking no-shows and confirming completion.",
  "Thẻ ứng viên cho bạn biết gì":
    "What the applicant card tells you",
  "Số ca đã làm với bạn":
    "Shifts worked with you",
  "Người này từng hoàn thành bao nhiêu ca cho bạn.":
    "How many shifts this person has completed for you.",
  "Số lần vắng mặt với bạn":
    "No-shows with you",
  "Không đến mà không báo, với chính bạn.":
    "Times they did not show up without notice, with you.",
  "Lời giới thiệu và loại việc người đó muốn làm.":
    "Their introduction and the kinds of work they want.",
  "Lịch sử làm ca của người đó trên CaLẻ.":
    "Their shift history on CaLẻ.",
  "Điểm sao và kỹ năng":
    "Stars and skills",
  "Điểm sao từ đánh giá sau ca, cấp kỹ năng theo loại việc.":
    "Stars from post-shift reviews, skill levels per type of work.",
  "Số điện thoại, giấy tờ đã xác minh.":
    "Verified phone number and documents.",
  "Từ duyệt người tới trả công":
    "From approving to paying",
  "Duyệt hoặc từ chối":
    "Approve or decline",
  "Bấm \"Duyệt\" từng người; từ chối thì ghi lý do để người đó hiểu.":
    "Tap \"Approve\" for each person; when declining, give a reason so they understand.",
  "Xác nhận có mặt":
    "Confirm attendance",
  "Ngày làm, người lao động check-in khi tới; bạn xác nhận có mặt từng người.":
    "On the day, workers check in when they arrive; you confirm each person is present.",
  "Đánh dấu vắng mặt":
    "Mark no-shows",
  "Ai không đến, bạn đánh dấu vắng; phần tiền của vị trí đó hoàn về ví.":
    "Mark anyone who did not come as absent; the money for that place goes back to your wallet.",
  "Sau giờ kết thúc, bấm xác nhận là tiền công vào ví người làm; không bấm thì tự chốt sau 24 giờ.":
    "After the end time, confirm and wages go to the workers' wallets; otherwise it settles automatically after 24 hours.",
  "Sau giờ kết thúc, bấm xác nhận là tiền công được ghi vào ví người làm (mô phỏng).":
    "After the end time, confirm and wages are credited to the workers' wallets (simulated).",
  "Chấm sao và nhận xét cho từng người trong 14 ngày.":
    "Rate and comment on each person within 14 days.",
  "Lợi ích, cách nhận ca và nhận tiền":
    "Benefits, taking shifts and getting paid",
  "Xem ca đã nhận và giờ bận của bạn":
    "See your shifts and busy times",
  "Các mốc giờ khi cần huỷ ca đã nhận":
    "Deadlines for cancelling a shift",
  "Điền ca, giữ tiền công rồi đăng":
    "Fill in, hold wages, post",
  "Duyệt người, xác nhận có mặt và hoàn thành":
    "Approve, confirm attendance and completion",
  "Tiền ca được giữ, trả và hoàn thế nào. Bản demo không có giao dịch thật.":
    "How shift money is held, paid and refunded. The demo has no real transactions.",
  "Chấm sao và nhận xét sau mỗi ca":
    "Stars and comments after each shift",
  // 03/10 — /pricing làm lại.
  "Phí 10%, chỉ trên phần ca có người làm":
    "A 10% fee, only on the part of a shift someone works",
  "Giai đoạn thử nghiệm: 0 đ":
    "Trial period: 0 đ",
  "CaLẻ không thu phí rút tiền.":
    "CaLẻ charges no withdrawal fee.",
  "Trang người lao động":
    "Page for workers",
  "trên tiền công của phần ca có người làm":
    "of the wages for the part of a shift someone works",
  "dự kiến 10% tiền công, chưa thu phí":
    "planned 10% of wages, not charged yet",
  "Phần không dùng được hoàn lại (mô phỏng).":
    "Any unused part is refunded (simulated).",
  "Ví dụ: tiền công 200.000 đ thì giữ 220.000 đ. Ca xong, người lao động nhận 200.000 đ, phí CaLẻ 20.000 đ.":
    "Example: wages of 200.000 đ mean 220.000 đ is held. After the shift, the worker gets 200.000 đ and the CaLẻ fee is 20.000 đ.",
  "Ví dụ mô phỏng: tiền công 200.000 đ thì giữ 200.000 đ (chưa cộng phí). Ca xong, người lao động nhận 200.000 đ.":
    "Simulated example: wages of 200.000 đ mean 200.000 đ is held (no fee added). After the shift, the worker gets 200.000 đ.",
  "Khi nào tiền được trả hoặc hoàn, và quy định huỷ ca.":
    "When money is paid out or refunded, and the cancellation rules.",
  // 03/10 — đăng nhập / đăng ký làm lại.
  "Bấm để điền sẵn, mật khẩu đều là \"demo\".":
    "Tap to fill in; every password is \"demo\".",
  "Ca đã nhận, check-in, ví tiền công và người ứng tuyển của từng ca: đăng nhập là thấy ngay.":
    "Accepted shifts, check-in, your wage wallet and each shift's applicants: log in to see them all.",
  "Nạp và rút tiền qua PayOS. Tiền công được giữ cọc tới khi ca hoàn thành.":
    "Top-ups and withdrawals go through PayOS. Wages are held until the shift is completed.",
  "Bản demo: dữ liệu lưu trong trình duyệt này. Nạp, giữ, trả tiền và xác minh giấy tờ đều là mô phỏng.":
    "Demo: data is stored in this browser. Top-ups, held money, payouts and ID checks are all simulated.",
  "Chào mừng quay lại":
    "Welcome back",
  "Ca làm của bạn vẫn ở đây.":
    "Your shifts are right where you left them.",
  "Ứng tuyển miễn phí":
    "Apply for free",
  "Tìm ca theo khu vực, ngày và loại việc. Không mất phí khi ứng tuyển.":
    "Find shifts by area, date and job type. Applying costs nothing.",
  "Ca chỉ hiện khi nhà tuyển dụng đã giữ đủ tiền công; ca xong, tiền vào ví của bạn.":
    "A shift only appears once the employer has the full wages held; after the shift, the money goes to your wallet.",
  "Tiền công được giữ trước (mô phỏng)":
    "Wages are held up front (simulated)",
  "Ca chỉ hiện khi đã giữ đủ tiền công; ca xong, tiền vào ví mô phỏng.":
    "A shift only appears once the full wages are held; after the shift, the money goes to a simulated wallet.",
  "Đánh giá hai chiều":
    "Two-way reviews",
  "Sau ca, hai bên chấm sao cho nhau trong 14 ngày.":
    "After the shift, both sides rate each other within 14 days.",
  "Đăng ca trong vài phút":
    "Post a shift in minutes",
  "Điền giờ, lương và số người; ca hiện cho người lao động ngay khi tiền đã được giữ.":
    "Fill in the hours, pay and headcount; workers see the shift as soon as the money is held.",
  "Phí chỉ trên phần ca có người làm":
    "Fees only on the part of a shift someone works",
  "10% tiền công. Vị trí trống, người vắng mặt, ca huỷ: hoàn cả tiền công lẫn phí.":
    "10% of wages. Empty spots, no-shows, cancelled shifts: both wages and fees are refunded.",
  "Tiền giữ và tiền hoàn đều là mô phỏng.":
    "Held and refunded money are both simulated.",
  "Xem điểm sao và số ca người đó đã làm với bạn trước khi duyệt.":
    "See their star rating and how many shifts they have done with you before approving.",
  "Điền họ tên và số điện thoại":
    "Enter your full name and phone number",
  "Tìm một ca và ứng tuyển":
    "Find a shift and apply",
  "Được duyệt thì check-in đúng giờ":
    "Once approved, check in on time",
  "Chọn loại hình và tên cơ sở":
    "Choose your business type and name",
  "Nạp tiền và đăng ca đầu tiên":
    "Top up and post your first shift",
  "Đăng ca đầu tiên":
    "Post your first shift",
  "Duyệt người, xác nhận hoàn thành":
    "Approve people, confirm completion",
  "Làm ca theo giờ rảnh của bạn.":
    "Work shifts around your free time.",
  "Thiếu người cho ca, tuyển trong vài phút.":
    "Short-staffed? Hire for the shift in minutes.",
  "Sau khi đăng ký":
    "After you sign up",
  // 03/10 — cẩm nang làm lại.
  "Hướng dẫn theo vai trò":
    "Guides by role",
  "Bản demo: nạp, giữ tiền, trả công, hoàn tiền và rút tiền trong bài đều là mô phỏng (sổ cái mô phỏng), không qua PayOS và không tính phí dịch vụ.":
    "Demo: top-ups, held money, payouts, refunds and withdrawals in this article are all simulated (a simulated ledger), with no PayOS and no service fee.",
  // 03/10 — /user-guide làm lại.
  "Người lao động: 5 bước":
    "Workers: 5 steps",
  "Nhà tuyển dụng: 5 bước":
    "Employers: 5 steps",
  "Trên trang của người lao động":
    "On the worker pages",
  "Giải thích các ô và tính năng bạn gặp trên trang Tổng quan.":
    "What the tiles and features on your Overview page mean.",
  "Ví dụ:":
    "Example:",
  "Trên trang của nhà tuyển dụng":
    "On the employer pages",
  "Giải thích các ô và tính năng trên trang quản lý ca.":
    "What the tiles and features on the shift management page mean.",
  "Tiền ca làm và xác minh":
    "Shift money and verification",
  "Thường là không. Nếu CaLẻ đang áp dụng cọc ứng tuyển, bạn thấy số cọc (tối đa 50% tiền công ca, không quá 100.000đ) trước khi đồng ý; cọc được hoàn khi hoàn thành, bị từ chối hoặc huỷ, chỉ mất khi vắng mặt không báo.":
    "Usually not. If CaLẻ is using application deposits, you see the amount (at most 50% of the shift wages, no more than 100.000đ) before you agree; it is refunded when you complete the shift, are rejected or cancel, and only lost if you do not show up without notice.",
  "Được. Còn hơn 3 giờ trước ca thì huỷ ngay; dưới 3 giờ cần nhà tuyển dụng đồng ý.":
    "Yes. More than 3 hours before the shift you can cancel right away; within 3 hours the employer has to agree.",
  "An toàn khi đi làm":
    "Staying safe at work",
  "Cách nhận ra ca đáng ngờ và giữ an toàn trong ca.":
    "How to spot a suspicious shift and stay safe during one.",
  "Bấm \"Tìm ca làm\", mở ca phù hợp rồi bấm \"Ứng tuyển\". Hệ thống chưa tự chặn ca trùng giờ, hãy xem Lịch cá nhân trước khi ứng tuyển.":
    "Tap \"Find shifts\", open a shift that suits you and tap \"Apply\". Overlapping shifts are not blocked automatically yet, so check your personal schedule before applying.",
  "Trạng thái đơn hiện trong trang Tổng quan: Đã duyệt hoặc Bị từ chối (kèm lý do).":
    "Your application status shows on the Overview page: Approved, or Rejected (with a reason).",
  "Nhập giờ, địa điểm, lương và số người cần. Hệ thống giữ tiền công + phí dịch vụ 10% (0đ trong đợt miễn phí) từ ví rồi mới công khai ca.":
    "Enter the hours, location, pay and headcount. The system holds the wages + a 10% service fee (0đ during a fee-free campaign) from your wallet before the shift goes public.",
  "Xem hồ sơ, số sao trung bình và số ca người đó đã làm với bạn, rồi bấm \"Duyệt\" hoặc \"Từ chối\" kèm lý do.":
    "See their profile, average stars and how many shifts they have done with you, then tap \"Approve\" or \"Reject\" with a reason.",
  "Đánh dấu giờ bận / rảnh trong tuần và xem các ca đã nhận.":
    "Mark your busy / free hours for the week and see the shifts you have accepted.",
  "Bản chính thức chưa tự chặn ca trùng giờ khi ứng tuyển; lịch giúp bạn tự tránh.":
    "The live version does not block overlapping shifts when you apply yet; the schedule helps you avoid them yourself.",
  "Bạn học 14:00–16:00 thứ Ba: đừng ứng tuyển ca 15:00–17:00 thứ Ba.":
    "You have class 14:00–16:00 on Tuesday: do not apply for a 15:00–17:00 Tuesday shift.",
  "Hướng dẫn Lịch cá nhân":
    "Personal schedule guide",
  "Nhà tuyển dụng xem gì khi duyệt bạn":
    "What employers see when reviewing you",
  "Bản chính thức chưa dùng điểm uy tín.":
    "The live version does not use a reputation score yet.",
  "Khi duyệt, nhà tuyển dụng xem số sao trung bình, nhận xét, số ca bạn đã làm và số lần vắng mặt ở ca của họ.":
    "When reviewing, employers see your average stars, comments, how many shifts you have done and how many of their shifts you missed.",
  "Số ca bạn làm xong và đã được xác nhận (nhà tuyển dụng bấm hoặc hệ thống tự chốt). Ca đang chờ xác nhận chưa được đếm.":
    "Shifts you finished that have been confirmed (by the employer or automatically by the system). Shifts still awaiting confirmation are not counted.",
  "Bản thật chưa giới hạn số lần huỷ và chưa tính điểm uy tín.":
    "The live version does not limit cancellations or count reputation points yet.",
  "Ca chỉ hiện cho người lao động sau khi hệ thống giữ tiền công + phí dịch vụ 10% từ ví (0đ trong đợt miễn phí).":
    "A shift only appears to workers after the system holds the wages + a 10% service fee from your wallet (0đ during a fee-free campaign).",
  "Ca 4 giờ, 35.000đ/giờ, cần 2 người: tiền công 280.000đ → giữ 308.000đ (gồm 28.000đ phí, ngoài đợt miễn phí).":
    "A 4-hour shift at 35.000đ/hour for 2 people: 280.000đ in wages → 308.000đ held (including a 28.000đ fee, outside a fee-free campaign).",
  "Hướng dẫn đăng ca":
    "Shift posting guide",
  "Xem hồ sơ, số sao trung bình, số ca đã làm và số lần vắng mặt với bạn ngay trên trang quản lý ca.":
    "See each applicant's profile, average stars, shifts done and no-shows with you right on the shift management page.",
  "Hướng dẫn quản lý người ứng tuyển":
    "Applicant management guide",
  "Tiền công đang giữ cho các ca chưa xong (không gồm phí dịch vụ). Chưa phải tiền đã trả.":
    "Wages held for shifts that are not finished yet (not including the service fee). Not money paid out yet.",
  "Xác thực số điện thoại bằng mã OTP và gửi ảnh CCCD trong trang Hồ sơ; quản trị viên duyệt CCCD.":
    "Verify your phone number with an OTP code and send a photo of your ID card on the Profile page; an admin reviews the ID card.",
  "Chỉ quản trị viên xem ảnh CCCD. Hiện nhà tuyển dụng chưa thấy huy hiệu xác minh.":
    "Only admins see the ID card photo. Employers do not see a verification badge yet.",
  // 03/10 — 6 trang thông tin làm lại.
  'Mục lục': 'Contents',
  'Chủ đề': 'Topics',
  'Tiền và thanh toán': 'Money and payments',
  'Khi có vấn đề': 'When something goes wrong',
  'Tiền công giữ trước, xác minh tài khoản và lưu ý an toàn.': 'Pay held upfront, account verification and safety tips.',
  'CaLẻ bảo vệ hai bên thế nào': 'How CaLẻ protects both sides',
  'Phí và cọc': 'Fees and deposits',
  'Nhận tiền công': 'Getting paid',
  'Ưu tiên an toàn': 'Safety first',
  'Khi nào nên mở yêu cầu và CaLẻ xem xét thế nào.': 'When to open a request and how CaLẻ reviews it.',
  'Liên hệ với chúng tôi': 'Get in touch',
  'Trong tiêu đề, ghi rõ vai trò (người lao động hoặc nhà tuyển dụng) và mã ca liên quan (nếu có) để chúng tôi xử lý nhanh hơn.':
    'In the subject line, state your role (worker or employer) and the related shift code (if any) so we can help faster.',
  'Khi có vấn đề trong ca': 'When something goes wrong on a shift',
  'Bản hiện tại chưa có nút khiếu nại trong ứng dụng. Mọi phản ánh gửi qua email hỗ trợ.':
    'There is no in-app complaint button yet. Send every report to the support email.',
  'Bản demo có nút "Khiếu nại" ngay trong chi tiết ca.': 'The demo has a "Dispute" button right in the shift details.',
  'Gặp nguy hiểm thì rời khỏi địa điểm và gọi 113 trước, rồi mới báo cho CaLẻ.':
    'If you are in danger, leave the place and call 113 first, then tell CaLẻ.',
  'Ghi lại sự việc': 'Keep a record',
  'Chụp màn hình ca làm, ghi lại giờ check-in / check-out và giữ ảnh bàn giao nếu có.':
    'Screenshot the shift, note the check-in / check-out times and keep any handover photos.',
  'Gửi email cho đội hỗ trợ': 'Email the support team',
  'Ghi vai trò, mã ca, thời điểm xảy ra và đính kèm ảnh.': 'Include your role, the shift code and when it happened, and attach photos.',
  'Bấm "Khiếu nại" trong ca': 'Tap "Dispute" on the shift',
  'Mở chi tiết ca liên quan, bấm "Khiếu nại" và mô tả sự việc.':
    'Open the shift details, tap "Dispute" (employers: "File a complaint") and describe what happened.',
  'CaLẻ xem xét và trả lời': 'CaLẻ reviews and replies',
  'Đội ngũ CaLẻ liên hệ hai bên, đối chiếu lịch sử ca và trả lời qua email.':
    'The CaLẻ team contacts both sides, checks the shift history and replies by email.',
  'Quản trị viên xem xét': 'An administrator reviews it',
  'Quản trị viên xem giải trình của hai bên và quyết định theo Chính sách xử lý tranh chấp.':
    'An administrator reads both sides and decides under the Dispute policy.',
  'Chúng tôi rất mong nhận được phản hồi từ người dùng thực tế. Nếu bạn có ý tưởng để cải thiện CaLẻ, gửi cho chúng tôi qua email.':
    'We would love to hear from real users. If you have an idea to improve CaLẻ, send it to us by email.',
  'Tìm câu trả lời': 'Find answers',
  'Ứng tuyển, huỷ ca, tiền công và tranh chấp.': 'Applying, cancelling, pay and disputes.',
};
