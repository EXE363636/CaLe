/**
 * English dictionary — đợt 1 (trang công khai: menu, footer, trang chủ,
 * /for-workers, /for-employers, bảng giá, đăng nhập / đăng ký / quên mật khẩu).
 *
 * - `en`: cùng khoá với `vi.ts`. Khoá chưa có ở đây → hiện tiếng Việt.
 * - `enText`: câu tiếng Việt còn viết cứng trong code (menu, footer, bảng giá)
 *   → câu tiếng Anh. Khoá của bảng là NGUYÊN VĂN câu tiếng Việt; sửa câu tiếng
 *   Việt trong code thì sửa khoá ở đây theo (test i18nEnglish kiểm).
 * - Tiền tệ vẫn viết `đ` (VND) như bản tiếng Việt; không dùng `VNĐ` / `₫`.
 * - Đợt 2a (lỗi, danh sách / chi tiết ca, chuông, ví) nằm ở `en-app.ts`, gộp ở cuối.
 */

import { enApp, enAppText } from './en-app';
import { enAdmin, enAdminText } from './en-admin';
import { enDashboard, enDashboardText } from './en-dashboard';
import { enPages, enPagesText } from './en-pages';

export const enPublic: Record<string, string> = {
  // --- Chung / điều hướng ---------------------------------------------------
  'site.name': 'CaLẻ',
  'btn.close': 'Close',
  'btn.login': 'Log in',
  'btn.register': 'Sign up',
  'common.loading': 'Loading...',
  'nav.home': 'Home',
  'nav.shifts': 'Find shifts',
  'nav.dashboard': 'Dashboard',
  'nav.schedule': 'My schedule',
  'nav.profile': 'Profile',
  'nav.login': 'Log in',
  'nav.logout': 'Log out',
  'nav.register': 'Sign up',
  'nav.postShift': 'Post a shift',
  'nav.short.postShift': 'Post shift',
  'nav.employerSchedule': 'Hiring schedule',
  'nav.short.employerSchedule': 'Hiring schedule',
  'nav.full.employerProfile': 'Business profile',
  'nav.short.employerProfile': 'Profile',
  'nav.label.handbook': 'Work handbook',
  'nav.label.safety': 'User protection',
  'nav.label.userGuide': 'User guide',
  'nav.userMenu.chip.admin': 'Administrator',
  'nav.userMenu.chip.individualEmployer': 'Individual / Freelance',
  'nav.userMenu.chip.reputation': 'Reputation: {score}/100',
  'nav.userMenu.chip.verifiedBusiness': 'Verified business',
  'role.admin': 'Administrator',
  'role.employer': 'Employer',
  'role.worker': 'Worker',

  // --- Trang chủ (chọn vai trò) ---------------------------------------------
  'landing.hero.title': 'Short-term work,',
  'landing.hero.titleAccent': 'clear shifts – clear pay',
  'landing.hero.trustHint':
    'Free to try · This is a demo · All payment steps are simulated.',
  'landing.hero.trustHint.supabase':
    'Free for workers · Limited beta · Wages are held before a shift goes public.',
  'landing.howItWorks.title': 'How it works',
  'home.chooser.lead': 'Looking for work or hiring?',
  'home.chooser.worker.desc': 'Find short shifts near you that fit your class schedule.',
  'home.chooser.worker.chip.free': 'Free',
  'home.chooser.worker.chip.pay': 'Paid to your wallet after each shift',
  'home.chooser.worker.chip.pay.demo': 'Simulated wallet',
  'home.chooser.worker.chip.noExp': 'No experience needed',
  'home.chooser.worker.cta': 'For workers',
  'home.chooser.employer.desc': 'Post hourly shifts and pick people from your applicants.',
  'home.chooser.employer.chip.fee': '10% of wages',
  'home.chooser.employer.chip.fee.demo': 'No fees yet',
  'home.chooser.employer.chip.payWorked': 'Pay only when someone works',
  'home.chooser.employer.chip.refund': 'Unused deposit refunded',
  'home.chooser.employer.cta': 'For employers',
  'home.chooser.safetyLink': 'Safety',
  'home.role.worker': 'I need work',
  'home.role.employer': 'I need staff',
  'home.role.switchAria': 'Choose a page by role',
  'home.urgent.title': 'Urgent shifts',
  'home.urgent.lead': 'Starting within {hours} hours and still short of people.',

  // --- /for-workers ---------------------------------------------------------
  'workerHome.hero.title': 'Find short shifts near you',
  'workerHome.hero.lead': 'Pick shifts around your classes. A few hours and you are done.',
  'workerHome.hero.cta': 'Sign up to get shifts',
  'workerHome.hero.browse': 'Browse open shifts',
  'workerHome.hero.haveAccount': 'Already have an account?',
  'workerHome.benefits.title': 'Why work through CaLẻ',
  'workerHome.benefit.fast.title': 'Get hired fast',
  'workerHome.benefit.fast.desc': 'Apply in seconds and hear back as soon as the employer approves.',
  'workerHome.benefit.fast.alt': 'A smiling food counter worker serving a customer',
  'workerHome.benefit.pay.title': 'Paid to your wallet after each shift',
  'workerHome.benefit.pay.desc':
    'When the shift is done, your wages go to your CaLẻ wallet. Withdraw to your bank anytime.',
  'workerHome.benefit.pay.desc.demo':
    'When the shift is done, your wages go to your wallet (simulated in the demo).',
  'workerHome.benefit.pay.alt': 'A man smiling and holding a phone on the street',
  'workerHome.benefit.noExp.title': 'No experience needed',
  'workerHome.benefit.noExp.desc':
    'Many serving, kitchen-helper and event shifts take beginners. Requirements are listed on each shift.',
  'workerHome.benefit.noExp.alt': 'A young person cooking on a grill in a busy restaurant',
  'workerHome.latest.title': 'Newest shifts',
  'workerHome.latest.viewAll': 'See all shifts',
  'workerHome.latest.empty': 'No open shifts right now. Check back soon.',
  'workerHome.switch.text': 'Need to hire people?',
  'workerHome.switch.cta': 'For employers',

  // --- /for-employers -------------------------------------------------------
  'employerHome.hero.title': 'Need people for a shift?',
  'employerHome.hero.lead': 'Post hourly shifts and choose the right people.',
  'employerHome.hero.cta': 'Sign up to post shifts',
  'employerHome.hero.haveAccount': 'Already have an account?',
  'employerHome.benefits.title': 'Benefits for employers',
  'employerHome.benefit.attendance.title': 'Know who showed up and who finished',
  'employerHome.benefit.attendance.desc':
    'Workers check in when they arrive. You confirm completion after the shift.',
  'employerHome.benefit.attendance.alt': 'A uniformed team gathering before an event shift',
  'employerHome.benefit.payWorked.title': 'Pay only when someone works',
  'employerHome.benefit.payWorked.desc': 'The 10% fee applies only to the part of the shift that was worked.',
  'employerHome.benefit.payWorked.desc.demo': 'In the demo, held money and fees are simulated.',
  'employerHome.benefit.payWorked.alt': 'Kitchen staff preparing vegetables in a restaurant kitchen',
  'employerHome.benefit.refund.title': 'Refunds for what you do not use',
  'employerHome.benefit.refund.desc':
    'Empty spots, no-shows and cancelled shifts: those wages and fees go back to your wallet.',
  'employerHome.benefit.refund.desc.demo':
    'Empty spots and no-shows: the held money goes back to your wallet (simulated).',
  'employerHome.benefit.refund.alt': 'A manager checking a list on a clipboard',
  'employerHome.pricing.title': 'Service fee',
  'employerHome.pricing.unit': 'of wages for the part of the shift that was worked',
  'employerHome.pricing.unit.demo': 'during the trial period, no fees charged yet',
  'employerHome.pricing.example':
    'Example: 200.000đ in wages → 220.000đ held. The worker receives 200.000đ.',
  'employerHome.pricing.example.demo': 'Simulated example: 200.000đ in wages → 200.000đ held.',
  'employerHome.pricing.more': 'See pricing',
  'employerHome.final.text': 'Ready to post your first shift?',
  'employerHome.switch.text': 'Looking for work?',
  'employerHome.switch.cta': 'For workers',

  // --- Đăng nhập / đăng ký / quên mật khẩu ----------------------------------
  'auth.login.title': 'Log in',
  'auth.login.subtitle': 'Welcome back to CaLẻ',
  'auth.login.noAccount': "Don't have an account?",
  'auth.register.title': 'Create an account',
  'auth.register.subtitle': 'Join CaLẻ today',
  'auth.register.hasAccount': 'Already have an account?',
  'auth.register.selectRole': 'How do you want to sign up?',
  'auth.register.asWorker': 'I want to find shifts',
  'auth.register.asEmployer': 'I need to hire workers',
  'auth.register.employerType.label': 'Employer account type',
  'auth.register.employerType.intro':
    'This account type decides which documents you verify and the deposit rules. You cannot change it yourself later - if you need to, send a request for an administrator to review.',
  'auth.register.employerType.required': 'Please choose an employer account type.',
  'employerType10A.Individual': 'Individual, short-term hiring',
  'employerType10A.HouseholdBusiness': 'Household business',
  'employerType10A.Company': 'Company',
  'employerType10A.AgencyEvent': 'Agency / Events',
  'employerType10A.Individual.hint':
    'No business licence needed. You verify your identity and the work location, and hold a 100% wage deposit.',
  'employerType10A.HouseholdBusiness.hint':
    'Household business: representative ID card + household business licence + storefront photo.',
  'employerType10A.Company.hint':
    'Company: business licence + tax code + photo of the branch or address.',
  'employerType10A.AgencyEvent.hint':
    'Agency / Events: business licence + contract or event confirmation + venue photo.',
  'auth.google.continue': 'Continue with Google',
  'auth.google.error': 'Could not open Google sign-in. Please try again.',
  'auth.google.or': 'or',
  'auth.oauth.complete.title': 'Finish signing up',
  'auth.oauth.complete.subtitle':
    'You are signed in with Google. Choose a role and add a few details to get started.',
  'auth.oauth.complete.submit': 'Finish signing up',
  'auth.oauth.complete.cancel': 'Use another account',
  'auth.oauth.complete.success': 'Signed up successfully',
  'auth.forgot.link': 'Forgot password?',
  'auth.forgot.title': 'Forgot password',
  'auth.forgot.subtitle': 'Enter the email you signed up with and we will send you a reset link.',
  'auth.forgot.submit': 'Send reset link',
  'auth.forgot.sent.title': 'Check your email',
  'auth.forgot.sent.body':
    'If {email} is registered with CaLẻ, you will get an email with a reset link within a few minutes. Check your Spam / Promotions folder too.',
  'auth.forgot.backToLogin': 'Back to log in',
  'auth.reset.title': 'Set a new password',
  'auth.reset.subtitle': 'Enter a new password for your account.',
  'auth.reset.newPassword': 'New password',
  'auth.reset.confirmPassword': 'Confirm new password',
  'auth.reset.mismatch': 'The two passwords do not match.',
  'auth.reset.submit': 'Save new password',
  'auth.reset.success': 'Password changed',
  'auth.reset.invalidLink.title': 'This link is invalid or has expired',
  'auth.reset.invalidLink.body': 'Reset links work once and for a limited time. Please request a new one.',
  'auth.reset.requestAgain': 'Send a new link',
  'auth.side.welcome': 'Welcome back',
  'auth.side.welcome.desc': 'Log in to keep managing your shifts, applications and schedule.',
  'auth.side.join': 'Join CaLẻ',
  'auth.side.join.desc':
    'Create a free account in a few minutes. Made for people who want flexible work and for venues and events that need flexible staff.',
  'auth.side.benefit1': 'Transparent payments',
  'auth.side.benefit1.desc': 'Employers pay up front; money is released only when the work is done.',
  'auth.side.benefit1.supabase': 'Clear shifts – clear pay',
  'auth.side.benefit1.desc.supabase':
    'Every shift lists its hours and wages. Wages are held up front and go to your wallet when the shift is done.',
  'auth.side.benefit2': 'No hidden fees',
  'auth.side.benefit2.desc': 'Workers never pay up front. Signing up is free.',
  'auth.side.benefit3': 'Two-way reputation',
  'auth.side.benefit3.desc': 'Reviews in both directions help build a trusted community.',
  'auth.side.disclaimer':
    'MVP version - all payments and verifications are simulated, no real transactions.',
  'auth.side.disclaimer.supabase':
    'Beta. Top-ups and withdrawals go through PayOS; wages are held until the shift is done.',
  'form.fullName': 'Full name',
  'form.email': 'Email',
  'form.phone': 'Phone number',
  'form.password': 'Password',
  'form.companyName': 'Company / venue name',
  'form.businessType': 'Business type',
  'error.required': 'This field is required.',
  'error.email.invalid': 'Invalid email address.',
  'error.password.tooShort': 'Password must be at least 8 characters.',
  'error.phone.invalid': 'Invalid phone number. Please enter a Vietnamese phone number.',
  'feedback.auth.login.success': 'Logged in',
  'feedback.auth.logout.success': 'Logged out',
  'feedback.auth.register.success': 'Account created',
  'feedback.auth.register.success.desc': 'You can log in and start right away.',
};

/** Câu tiếng Việt viết cứng trong code → tiếng Anh (xem `translateText`). */
export const enPublicText: Record<string, string> = {
  // Menu (NavBar / MobileNav) + footer
  'Trang chủ': 'Home',
  'Chính': 'Main',
  'Tổng quan': 'Dashboard',
  'Tổng quan admin': 'Admin dashboard',
  'Hồ sơ': 'Profile',
  'Hướng dẫn': 'Guides',
  'Người lao động': 'Workers',
  'Nhà tuyển dụng': 'Employers',
  'Hướng dẫn & hỗ trợ': 'Help & support',
  'Dành cho người lao động': 'For workers',
  'Dành cho nhà tuyển dụng': 'For employers',
  'Lợi ích và các ca mới đăng': 'Benefits and the newest shifts',
  'Lợi ích, phí dịch vụ và cách đăng ca': 'Benefits, fees and how to post a shift',
  'Tìm ca làm': 'Find shifts',
  'Xem các ca đang tuyển gần bạn': 'See open shifts near you',
  'Hồ sơ & điểm uy tín': 'Profile & reputation',
  'Hiểu cách hệ thống đánh giá độ tin cậy': 'How reliability is scored',
  'Lịch cá nhân': 'My schedule',
  'Lịch tuyển dụng': 'Hiring schedule',
  'Hồ sơ doanh nghiệp': 'Business profile',
  'Quản lý thời gian rảnh và tránh trùng lịch': 'Manage your free time and avoid clashes',
  'Cách tránh trùng lịch khi ứng tuyển': 'Avoid schedule clashes when applying',
  'Quy định huỷ ca': 'Cancellation rules',
  'Các mốc thời gian và hạn mức huỷ ca': 'Cancellation deadlines and limits',
  'Đăng ca tuyển': 'Post a shift',
  'Tạo ca làm và mời người lao động': 'Create a shift and invite workers',
  'Quy trình tạo ca và giữ tiền ca làm (mô phỏng)': 'Creating a shift and holding wages (simulated)',
  'Quản lý người ứng tuyển': 'Manage applicants',
  'Duyệt đơn và xác nhận ca hoàn thành': 'Approve applications and confirm finished shifts',
  'Cách duyệt và xác nhận ca làm': 'How to approve and confirm shifts',
  'Giữ tiền ca làm': 'Holding shift wages',
  'Giữ tiền ca làm (mô phỏng)': 'Holding shift wages (simulated)',
  'Mô phỏng giữ tiền ca để đảm bảo trả công. Trong MVP/demo không có giao dịch thật.':
    'Simulates holding wages to guarantee pay. No real transactions in the MVP/demo.',
  'Đánh giá sau ca': 'Post-shift reviews',
  'Hướng dẫn chấm điểm người lao động': 'How to rate workers',
  'Cách hoạt động': 'How it works',
  'Bốn bước từ đăng ca đến thanh toán': 'Four steps from posting to payment',
  'Bảng giá': 'Pricing',
  'Miễn phí trong giai đoạn thử nghiệm': 'Free during the trial period',
  'Bảo vệ người dùng': 'User protection',
  'Cơ chế bảo vệ người dùng của CaLẻ': 'How CaLẻ protects its users',
  'Câu hỏi thường gặp': 'FAQ',
  'Trả lời nhanh các thắc mắc phổ biến': 'Quick answers to common questions',
  'Xử lý tranh chấp': 'Disputes',
  'Quy trình khi xảy ra mâu thuẫn': 'What happens when there is a disagreement',
  'Hướng dẫn sử dụng': 'User guide',
  'Hướng dẫn từng bước cho cả hai phía': 'Step-by-step guides for both sides',
  'Cẩm nang làm việc': 'Work handbook',
  'Bí quyết để làm việc suôn sẻ': 'Tips for smooth shifts',
  'Cần hỗ trợ? Liên hệ đội CaLẻ': 'Need help? Contact the CaLẻ team',
  'Điểm uy tín': 'Reputation',
  'Điểm uy tín: {score}/100': 'Reputation: {score}/100',
  'Quản trị viên': 'Administrator',
  'Cá nhân / Freelance': 'Individual / Freelance',
  'Doanh nghiệp đã xác minh': 'Verified business',
  'Về CaLedo': 'About CaLedo',
  'Giới thiệu': 'About us',
  'Pháp lý & hỗ trợ': 'Legal & support',
  'Điều khoản sử dụng': 'Terms of use',
  'Chính sách bảo mật': 'Privacy policy',
  'Chính sách xử lý tranh chấp': 'Dispute policy',
  'Liên hệ hỗ trợ': 'Contact support',
  'Kết nối ca làm ngắn hạn an toàn, minh bạch và linh hoạt cho người lao động và nhà tuyển dụng tại Việt Nam.':
    'Safe, transparent and flexible short-term shifts for workers and employers in Vietnam.',
  'Địa chỉ: ': 'Address: ',
  'Hà Nội, Việt Nam': 'Hanoi, Vietnam',
  'Dữ liệu tài khoản, ca làm và đơn ứng tuyển được lưu trên hệ thống. Nạp, giữ cọc, trả công và rút tiền là giao dịch thật qua cổng thanh toán PayOS.':
    'Accounts, shifts and applications are stored on our servers. Top-ups, deposits, wage payouts and withdrawals are real transactions through the PayOS payment gateway.',
  'Dữ liệu demo đang lưu trên trình duyệt. Xóa cache sẽ mất dữ liệu. Trong MVP/demo không có giao dịch thật.':
    'Demo data is stored in your browser. Clearing the cache deletes it. No real transactions in the MVP/demo.',

  // Bảng giá
  'Chi phí': 'Costs',
  'Bảng giá giai đoạn thử nghiệm (Beta)': 'Beta pricing',
  'Giai đoạn thử nghiệm — 0đ': 'Trial period — 0đ',
  'Người lao động không mất phí. Nhà tuyển dụng chỉ trả phí cho phần ca có người làm.':
    'Workers pay nothing. Employers only pay a fee for the part of a shift that was worked.',
  'Giao dịch và số dư đều là mô phỏng. CaLẻ chưa thu, giữ hoặc chuyển tiền thật.':
    'Transactions and balances are simulated. CaLẻ does not collect, hold or move real money yet.',
  'Đăng ký / Đăng nhập': 'Sign up / Log in',
  'Miễn phí': 'Free',
  'Tìm ca và ứng tuyển không mất phí.': 'Finding and applying for shifts is free.',
  'Nhận đủ tiền công vào ví sau ca.': 'Get your full wages in your wallet after the shift.',
  'Tiền công vào ví mô phỏng sau ca.': 'Wages go to a simulated wallet after the shift.',
  'Rút tiền về tài khoản ngân hàng của bạn.': 'Withdraw to your own bank account.',
  'Chưa rút được tiền thật.': 'Real withdrawals are not available yet.',
  'trên tiền công': 'of wages',
  'dự kiến 10% tiền công — chưa thu phí': 'planned 10% of wages — not charged yet',
  'Đăng ca, duyệt người ứng tuyển miễn phí.': 'Posting shifts and reviewing applicants is free.',
  'Tiền công + phí được giữ khi đăng ca.': 'Wages + fee are held when you post a shift.',
  'Vị trí trống, người vắng mặt, ca huỷ: hoàn cả tiền công lẫn phí phần đó.':
    'Empty spots, no-shows, cancelled shifts: both wages and fees for that part are refunded.',
  'Tiền công được giữ (mô phỏng) khi đăng ca.': 'Wages are held (simulated) when you post a shift.',
  'Huỷ ca sau khi đã duyệt người có thể bị trừ 5–15% tiền giữ (mô phỏng).':
    'Cancelling after approving someone may cost 5–15% of the held amount (simulated).',
  'Ví dụ: tiền công 200.000đ → giữ 220.000đ. Ca xong, người lao động nhận 200.000đ, phí CaLẻ 20.000đ.':
    'Example: 200.000đ in wages → 220.000đ held. After the shift the worker receives 200.000đ and the CaLẻ fee is 20.000đ.',
  'Ví dụ mô phỏng: tiền công 200.000đ → giữ 200.000đ (chưa cộng phí). Ca xong, người lao động nhận 200.000đ.':
    'Simulated example: 200.000đ in wages → 200.000đ held (no fee added). After the shift the worker receives 200.000đ.',
  'Khi nào tiền được giữ?': 'When is money held?',
  'Khi bạn đăng ca. Ca chỉ hiện cho người lao động sau khi đã giữ đủ tiền.':
    'When you post a shift. The shift is shown to workers only after the full amount is held.',
  'Khi nào người lao động nhận tiền?': 'When do workers get paid?',
  'Khi nhà tuyển dụng xác nhận hoàn thành. Nếu nhà tuyển dụng không xác nhận, hệ thống tự chốt khoảng 24 giờ sau giờ kết thúc ca: người đã check-in được trả công, người không check-in bị tính vắng mặt. Ca đang có tranh chấp chờ quản trị viên xử lý.':
    'When the employer confirms the shift is done. If the employer does not confirm, the system settles it about 24 hours after the shift ends: people who checked in are paid, people who did not are marked absent. Disputed shifts wait for an administrator.',
  'Có gói trả phí nào khác không?': 'Are there other paid plans?',
  'Chưa. Hiện chỉ có mức phí ở trên.': 'Not yet. The fee above is the only one.',

  // Đăng nhập / đăng ký / quên mật khẩu
  'Tài khoản demo': 'Demo accounts',
  'Đã tạo tài khoản. Vui lòng kiểm tra email để xác nhận, sau đó đăng nhập.':
    'Account created. Please check your email to confirm, then log in.',
  'Nhà hàng, Cafe, Sự kiện...': 'Restaurant, café, events...',
  'Ít nhất 8 ký tự': 'At least 8 characters',
  'Bản demo không hỗ trợ đặt lại mật khẩu. Dùng tài khoản demo ở trang đăng nhập.':
    'The demo does not support password resets. Use a demo account on the log in page.',
};

export const en: Record<string, string> = {
  ...enPublic,
  ...enApp,
  ...enDashboard,
  ...enAdmin,
  ...enPages,
};
export const enText: Record<string, string> = {
  ...enPublicText,
  ...enAppText,
  ...enDashboardText,
  ...enAdminText,
  ...enPagesText,
};
