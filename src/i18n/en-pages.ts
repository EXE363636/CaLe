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
};
