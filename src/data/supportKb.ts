/**
 * Kho hỏi đáp của trợ lý hỗ trợ (bong bóng chat, tab "Hỏi CaLẻ").
 * Logic khớp câu hỏi: `src/domain/supportBot.ts`.
 *
 * Mọi câu trả lời lấy từ nội dung đã có trong repo: `/faq`, `/user-guide`, `/support`,
 * `/for-workers`, `/for-employers` (+ `#employer-pricing`), `/terms`, `/privacy`,
 * `/disputes`, cẩm nang (`data/mock/handbookArticles.ts`), `i18n/vi.ts`, các hằng số
 * trong `src/domain/*` (timeGates, chat, workerDeposit, reputation, cancellationQuota,
 * reviewEligibility, skillProgression, wage, topupBonus) và `data/capabilities.ts`.
 * Số liệu nào chưa chắc → trả lời chung và dẫn tới trang có chi tiết.
 *
 * `answer` (vi / en) = bản demo (local, tiền mô phỏng). `answer.live` = bản chính thức
 * (cale.io.vn, tiền thật qua PayOS) khi câu chữ khác bản demo; KHÔNG được ghi "mô phỏng".
 * Không hứa thời hạn khiếu nại (chủ dự án đã bỏ "72 giờ"): chỉ dẫn liên hệ đội hỗ trợ.
 * Tiền tệ: "đ" / "đồng", không "VNĐ" / "₫". Test: `src/__tests__/supportKb.test.ts`.
 */
import type { SupportEntry, SupportLink } from '@/domain/supportBot';

function link(href: string, vi: string, en: string): SupportLink {
  return { href, label: { vi, en } };
}

const L = {
  home: link('/', 'Trang chủ', 'Home'),
  about: link('/#home-about', 'Về CaLẻ', 'About CaLẻ'),
  how: link('/#home-how', 'Cách CaLẻ hoạt động', 'How CaLẻ works'),
  forWorkers: link('/for-workers', 'Dành cho người lao động', 'For workers'),
  forEmployers: link('/for-employers', 'Dành cho nhà tuyển dụng', 'For employers'),
  workerVerify: link('/for-workers#worker-verify', 'Xác thực một lần', 'One-time verification'),
  workerCancel: link('/for-workers#worker-cancel', 'Quy định huỷ ca', 'Cancellation rules'),
  workerReputation: link('/for-workers#worker-reputation', 'Hồ sơ & điểm uy tín', 'Profile & reputation'),
  workerScheduleGuide: link('/for-workers#worker-schedule', 'Hướng dẫn Lịch cá nhân', 'Schedule guide'),
  employerPost: link('/for-employers#employer-post', 'Thử đăng một ca', 'Try posting a shift'),
  employerVerify: link('/for-employers#employer-verify', 'Xác thực tài khoản', 'Account verification'),
  employerApplicants: link('/for-employers#employer-applicants', 'Quản lý người ứng tuyển', 'Managing applicants'),
  employerPayments: link('/for-employers#employer-payments', 'Tiền giữ, trả, hoàn', 'Holding, paying, refunds'),
  pricing: link('/for-employers#employer-pricing', 'Phí dịch vụ', 'Pricing'),
  employerReviews: link('/for-employers#employer-reviews', 'Đánh giá hai chiều', 'Two-way reviews'),
  login: link('/login', 'Đăng nhập', 'Log in'),
  register: link('/register', 'Đăng ký', 'Sign up'),
  forgot: link('/forgot-password', 'Quên mật khẩu', 'Forgot password'),
  shifts: link('/shifts', 'Tìm ca làm', 'Find shifts'),
  workerDash: link('/worker/dashboard', 'Tổng quan', 'Dashboard'),
  workerProfile: link('/worker/profile', 'Hồ sơ cá nhân', 'My profile'),
  workerSchedule: link('/worker/schedule', 'Lịch cá nhân', 'My schedule'),
  employerDash: link('/employer/dashboard', 'Tổng quan nhà tuyển dụng', 'Employer dashboard'),
  newShift: link('/employer/shifts/new', 'Đăng ca tuyển', 'Post a shift'),
  employerProfile: link('/employer/profile', 'Hồ sơ doanh nghiệp', 'Business profile'),
  employerSchedule: link('/employer/schedule', 'Lịch tuyển dụng', 'Hiring calendar'),
  adminDash: link('/admin/dashboard', 'Tổng quan admin', 'Admin dashboard'),
  disputes: link('/disputes', 'Chính sách xử lý tranh chấp', 'Dispute policy'),
  faq: link('/faq', 'Câu hỏi thường gặp', 'FAQ'),
  terms: link('/terms', 'Điều khoản sử dụng', 'Terms of use'),
  privacy: link('/privacy', 'Chính sách bảo mật', 'Privacy policy'),
  support: link('/support', 'Liên hệ hỗ trợ', 'Contact support'),
  safety: link('/support#support-safety', 'Lưu ý an toàn', 'Safety tips'),
  guide: link('/user-guide', 'Hướng dẫn sử dụng', 'User guide'),
  guideVerify: link('/user-guide#verification-overview', 'Cách xác minh hoạt động', 'How verification works'),
  guideQuota: link('/user-guide#worker-cancellation-quota', 'Hạn mức huỷ ca', 'Cancellation quota'),
  guideIncome: link('/user-guide#worker-total-income', 'Tổng thu nhập', 'Total income'),
  guideEmployerItems: link('/user-guide#guide-employer-items', 'Các ô trên trang nhà tuyển dụng', 'Employer dashboard tiles'),
  handbook: link('/handbook', 'Cẩm nang làm việc', 'Work handbook'),
  hbEvidence: link('/handbook/muc-bang-chung-thanh-toan', 'Bằng chứng khi check-out', 'Check-out evidence'),
  hbEmployerEvidence: link('/handbook/chon-muc-bang-chung-khi-dang-ca', 'Chọn mức bằng chứng', 'Choosing an evidence level'),
  hbDeposit: link('/handbook/giu-coc-phi-dich-vu-va-hoan-tien', 'Tiền giữ, phí và hoàn tiền', 'Holding, fees and refunds'),
};

// ---------------------------------------------------------------------------
// Giới thiệu chung
// ---------------------------------------------------------------------------

const ABOUT: SupportEntry[] = [
  {
    id: 'about-what-is-cale',
    category: 'about',
    questions: {
      vi: ['CaLẻ là gì?', 'cale la app gi vay', 'trang này dùng để làm gì', 'giới thiệu về cale', 'cale hoạt động ra sao', 'cale là sàn gì'],
      en: ['What is CaLẻ?', 'what does cale do', 'tell me about this app'],
    },
    keywords: ['cale', 'gioi thieu', 'san viec lam', 'viec lam theo ca', 'ca ngan han', 'about', 'what is'],
    answer: {
      vi: 'CaLẻ là sàn việc làm theo ca ngắn hạn ở Việt Nam: nhà tuyển dụng đăng ca theo giờ, người lao động tìm ca hợp lịch và ứng tuyển. Mỗi ca đi qua cùng một quy trình: đăng ca → ứng tuyển → duyệt → check-in / check-out → xác nhận hoàn thành → trả công → đánh giá. Đây là bản demo: tiền và xác minh đều là mô phỏng.',
      en: 'CaLẻ is a short-shift job marketplace in Vietnam: employers post hourly shifts, workers find shifts that fit their schedule and apply. Every shift follows the same flow: post → apply → approve → check-in / check-out → confirm completion → pay → review. This is the demo: money and verification are simulated.',
      live: {
        vi: 'CaLẻ là sàn việc làm theo ca ngắn hạn ở Việt Nam: nhà tuyển dụng đăng ca theo giờ, người lao động tìm ca hợp lịch và ứng tuyển. Mỗi ca đi qua cùng một quy trình: đăng ca → ứng tuyển → duyệt → check-in / check-out → xác nhận hoàn thành → trả công → đánh giá. CaLẻ đang thử nghiệm giới hạn (Beta); giữ cọc, trả công, hoàn và rút tiền là tiền thật trên ví CaLẻ, nạp và rút qua PayOS.',
        en: 'CaLẻ is a short-shift job marketplace in Vietnam: employers post hourly shifts, workers find shifts that fit their schedule and apply. Every shift follows the same flow: post → apply → approve → check-in / check-out → confirm completion → pay → review. CaLẻ is in a limited Beta; deposit holds, wages, refunds and withdrawals are real money in your CaLẻ wallet, with top-ups and withdrawals going through PayOS.',
      },
    },
    links: [L.about, L.how],
  },
  {
    id: 'about-company',
    category: 'about',
    questions: {
      vi: ['Ai đứng sau CaLẻ, công ty nào phát triển?', 'cale cua cong ty nao', 'đơn vị vận hành cale là ai', 'văn phòng cale ở đâu', 'cale co uy tin khong, ai lam ra'],
      en: ['Which company runs CaLẻ?', 'who is behind cale', 'where is your office'],
    },
    keywords: ['cong ty', 'don vi', 'caledo', 'caledo tech', 'van phong', 'ha noi', 'doi ngu', 'company', 'office', 'team'],
    answer: {
      vi: 'CaLẻ do CaLedo Tech phát triển, đội ngũ làm việc tại Hà Nội. Chúng tôi làm CaLẻ cho các bạn cần ca theo lịch học và các quán cần người bù giờ cao điểm. Thông tin liên hệ có ở trang Liên hệ hỗ trợ.',
      en: 'CaLẻ is built by CaLedo Tech, a team based in Hanoi. We made CaLẻ for people who need shifts around their class schedule and for shops that need extra hands at peak hours. Contact details are on the Support page.',
    },
    links: [L.about, L.support],
  },
  {
    id: 'about-how-it-works',
    category: 'about',
    questions: {
      vi: ['Quy trình từ lúc tìm ca tới lúc nhận tiền gồm mấy bước?', 'cac buoc su dung cale', 'dùng cale như thế nào từ đầu', 'quy trình nhận ca và trả công', 'mới vào không biết bắt đầu từ đâu'],
      en: ['How does it work from finding a shift to getting paid?', 'what are the steps to use cale', 'where do I start'],
    },
    keywords: ['quy trinh', 'cac buoc', 'bat dau', 'buoc', 'huong dan', 'nguoi moi', 'how it works', 'steps', 'getting started'],
    answer: {
      vi: 'Người lao động: đăng ký → xác thực số điện thoại → tìm ca và bấm "Ứng tuyển" → chờ duyệt → tới nơi check-in, xong ca check-out → nhà tuyển dụng xác nhận là tiền công vào ví (mô phỏng). Nhà tuyển dụng: đăng ký → đăng ca và giữ cọc (mô phỏng) → duyệt người → theo dõi ca → xác nhận hoàn thành. Chi tiết từng bước ở trang Hướng dẫn sử dụng.',
      en: 'Workers: sign up → verify phone → find a shift and tap "Apply" → wait for approval → check in on arrival, check out after → the employer confirms and the wage goes to your wallet (simulated). Employers: sign up → post a shift and hold the deposit (simulated) → approve people → follow the shift → confirm completion. Step-by-step details are in the User guide.',
      live: {
        vi: 'Người lao động: đăng ký → xác thực số điện thoại (khi CaLẻ yêu cầu) → tìm ca và bấm "Ứng tuyển" → chờ duyệt → tới nơi check-in, xong ca check-out → nhà tuyển dụng xác nhận là tiền công vào ví, rút về ngân hàng khi cần. Nhà tuyển dụng: đăng ký → nạp ví qua PayOS → đăng ca (hệ thống giữ tiền công + phí) → duyệt người → theo dõi ca → xác nhận hoàn thành. Chi tiết ở trang Hướng dẫn sử dụng.',
        en: 'Workers: sign up → verify phone (when CaLẻ requires it) → find a shift and tap "Apply" → wait for approval → check in on arrival, check out after → the employer confirms and the wage lands in your wallet, withdraw to your bank any time. Employers: sign up → top up via PayOS → post a shift (wage + fee are held) → approve people → follow the shift → confirm completion. Details are in the User guide.',
      },
    },
    links: [L.guide, L.how],
  },
  {
    id: 'about-demo-or-real',
    category: 'about',
    questions: {
      vi: ['Đây là bản demo hay bản thật, có giao dịch tiền thật không?', 'tien tren app la that hay ao', 'cale co that khong hay chi la thu nghiem', 'tien ao hay tien that', 'ban demo la sao'],
      en: ['Is this a demo or real money?', 'are transactions real', 'is the money real'],
    },
    keywords: ['demo', 'ban demo', 'tien that', 'tien ao', 'thu nghiem', 'beta', 'mo phong', 'giao dich that', 'real money', 'simulated'],
    answer: {
      vi: 'Bạn đang dùng bản demo của CaLẻ: dữ liệu lưu trong trình duyệt, mọi giao dịch nạp, giữ cọc, trả công, hoàn và rút tiền đều là mô phỏng, không có tiền thật. Xác minh giấy tờ và check-in cũng chỉ ở mức thử nghiệm.',
      en: 'You are using the CaLẻ demo: data is stored in your browser and every top-up, deposit hold, wage, refund and withdrawal is simulated, no real money moves. Document verification and check-in are prototypes too.',
      live: {
        vi: 'Đây là bản chính thức của CaLẻ, đang thử nghiệm giới hạn (Beta). Giữ cọc, trả công, hoàn tiền là tiền thật trên ví CaLẻ (ghi ở máy chủ của CaLẻ); nạp và rút qua cổng thanh toán PayOS. Điểm uy tín và một số tính năng khác đang được hoàn thiện.',
        en: 'This is the official CaLẻ service in a limited Beta. Deposit holds, wages and refunds are real money in your CaLẻ wallet (recorded on CaLẻ’s server); top-ups and withdrawals go through the PayOS payment gateway. Reputation points and a few other features are still being finished.',
      },
    },
    links: [L.guide, L.terms],
  },
  {
    id: 'about-job-types',
    category: 'about',
    questions: {
      vi: ['Trên CaLẻ có những loại việc gì?', 'co viec gi de lam', 'cale co nhung viec nao', 'có việc gì trên cale không', 'có việc phục vụ, pha chế, phát tờ rơi không', 'ngành nghề nào', 'co ca phu bep, su kien, kho van khong', 'loai cong viec nao'],
      en: ['What kinds of jobs are on CaLẻ?', 'job categories', 'is there waiter or barista work'],
    },
    keywords: ['loai viec', 'loai cong viec', 'nganh nghe', 'phuc vu', 'pha che', 'phu bep', 'su kien', 'kho van', 'phat to roi', 'bao ve', 'thu ngan', 'job types', 'categories'],
    answer: {
      vi: 'Các ca thường gặp là phục vụ, pha chế, phụ bếp, hỗ trợ sự kiện, kho vận, phát tờ rơi, bảo vệ, thu ngân… Ở trang Tìm ca làm bạn lọc theo loại việc; giờ làm, tiền công và yêu cầu ghi rõ trên từng ca.',
      en: 'Common shifts include waiting tables, bartending, kitchen help, event support, warehouse, flyer distribution, security and cashier work. On Find shifts you can filter by job type; hours, pay and requirements are shown on each shift.',
    },
    links: [L.shifts, L.forWorkers],
  },
  {
    id: 'about-experience',
    category: 'about',
    roles: ['worker', 'guest'],
    questions: {
      vi: ['Chưa có kinh nghiệm có làm được không?', 'k co kinh nghiem co nhan ca dc ko', 'người mới chưa đi làm bao giờ', 'cần bằng cấp gì không', 'sinh viên năm nhất làm được không'],
      en: ['Do I need experience?', 'no experience can I work', 'any qualification needed'],
    },
    keywords: ['kinh nghiem', 'chua co kinh nghiem', 'nguoi moi', 'bang cap', 'sinh vien', 'experience', 'beginner'],
    answer: {
      vi: 'Không nhất thiết. Nhiều ca phục vụ, phụ bếp, sự kiện nhận người mới; yêu cầu (nếu có) ghi rõ ở từng ca. Bạn điền giới thiệu và kỹ năng trong Hồ sơ để nhà tuyển dụng hiểu bạn hơn khi duyệt.',
      en: 'Not necessarily. Many waiting, kitchen-help and event shifts take newcomers; any requirement is listed on the shift. Fill in your bio and skills in your profile so employers know you better.',
    },
    links: [L.shifts, L.workerProfile],
  },
  {
    id: 'about-age',
    category: 'about',
    questions: {
      vi: ['Bao nhiêu tuổi thì được làm trên CaLẻ?', 'duoi 18 tuoi lam duoc khong', 'học sinh 16 tuổi đăng ký được không', 'giới hạn độ tuổi', 'tuoi toi thieu'],
      en: ['How old do I have to be?', 'minimum age', 'can a 16 year old work'],
    },
    keywords: ['tuoi', 'do tuoi', 'hoc sinh', 'vi thanh nien', '15 tuoi', '18 tuoi', 'age', 'minimum age', 'years old'],
    answer: {
      vi: 'Khi xác thực CCCD, ngày sinh phải đủ 15 tuổi. Một số ca có thêm yêu cầu riêng (độ tuổi, giấy tờ), ghi rõ trong chi tiết ca. Nếu chưa chắc mình có đủ điều kiện, bạn liên hệ đội hỗ trợ CaLẻ.',
      en: 'For ID (CCCD) verification your date of birth must show you are at least 15. Some shifts add their own requirements (age, documents), listed on the shift details. If unsure, contact the CaLẻ support team.',
    },
    links: [L.workerVerify, L.support],
  },
  {
    id: 'about-mobile',
    category: 'about',
    questions: {
      vi: ['CaLẻ có app trên điện thoại không, tải ở đâu?', 'tai app cale o dau', 'có ứng dụng android ios không', 'dùng trên điện thoại được không', 'cai dat app the nao'],
      en: ['Is there a mobile app?', 'where do I download the app', 'can I use it on my phone'],
    },
    keywords: ['tai app', 'ung dung dien thoai', 'dien thoai', 'android', 'ios', 'iphone', 'cai dat', 'ch play', 'app store', 'google play', 'download', 'mobile'],
    answer: {
      vi: 'CaLẻ là ứng dụng web: bạn mở bằng trình duyệt trên điện thoại hoặc máy tính, không cần cài đặt. Giao diện làm cho điện thoại trước, mọi bước tìm ca, ứng tuyển, check-in đều làm được trên điện thoại.',
      en: 'CaLẻ is a web app: open it in the browser on your phone or computer, nothing to install. It is designed mobile-first, so finding shifts, applying and checking in all work on a phone.',
    },
    links: [L.home],
  },
  {
    id: 'about-areas',
    category: 'about',
    questions: {
      vi: ['CaLẻ có ca ở khu vực, tỉnh thành nào?', 'tìm ca gần nhà mình', 'co ca o ha noi khong', 'o tphcm co viec khong', 'quận mình có ca không', 'cale hoat dong o dau'],
      en: ['Which cities or areas does CaLẻ cover?', 'are there shifts in hanoi', 'shifts near me'],
    },
    keywords: ['khu vuc', 'tinh thanh', 'thanh pho', 'ha noi', 'ho chi minh', 'tphcm', 'quan', 'gan nha', 'area', 'city', 'near me'],
    answer: {
      vi: 'Mỗi ca ghi rõ địa điểm. Ở trang Tìm ca làm, bạn gõ tên quận / khu vực vào ô Khu vực (ví dụ "Quận 1") để xem ca gần bạn. Trong Hồ sơ bạn cũng có thể ghi khu vực ưa thích (chỉ bạn thấy).',
      en: 'Every shift shows its location. On Find shifts, type a district or area in the Area filter (e.g. "District 1") to see shifts near you. You can also note preferred areas in your profile (only you see it).',
    },
    links: [L.shifts],
  },
  {
    id: 'about-not-employer',
    category: 'about',
    questions: {
      vi: ['CaLẻ có phải là người thuê mình trực tiếp không?', 'hop dong lao dong ky voi ai', 'cale co chiu trach nhiem nhu chu lao dong khong', 'quan hệ lao động giữa mình và quán', 'cale là bên trung gian à'],
      en: ['Is CaLẻ my employer?', 'who is my employer', 'is cale a middleman'],
    },
    keywords: ['nguoi su dung lao dong', 'chu lao dong', 'hop dong', 'quan he lao dong', 'trung gian', 'ket noi', 'employer of record', 'middleman', 'contract'],
    answer: {
      vi: 'Không. Theo Điều khoản, CaLẻ là nền tảng kết nối nhà tuyển dụng cần người ngắn hạn với người lao động linh hoạt, không phải người sử dụng lao động trực tiếp; quan hệ lao động do hai bên trao đổi tự nguyện qua nền tảng.',
      en: 'No. Under the Terms, CaLẻ is a platform connecting employers who need short-term help with flexible workers; it is not the direct employer. The working relationship is agreed voluntarily between the two parties through the platform.',
    },
    links: [L.terms],
  },
];

// ---------------------------------------------------------------------------
// Tài khoản & đăng nhập
// ---------------------------------------------------------------------------

const ACCOUNT: SupportEntry[] = [
  {
    id: 'account-register',
    category: 'account',
    questions: {
      vi: ['Đăng ký tài khoản CaLẻ như thế nào?', 'tao tai khoan o dau', 'dk tk sao vay', 'muốn đăng kí làm thành viên', 'đăng ký mất phí không', 'lam sao de dang ky'],
      en: ['How do I sign up?', 'create an account', 'how to register'],
    },
    keywords: ['dang ky', 'tao tai khoan', 'dang ki', 'mo tai khoan', 'thanh vien', 'sign up', 'register', 'create account'],
    answer: {
      vi: 'Bấm "Đăng ký", chọn vai trò "Tôi muốn tìm ca làm" (người lao động) hoặc "Tôi cần tuyển người lao động" (nhà tuyển dụng), rồi điền họ tên, email, số điện thoại và mật khẩu (ít nhất 8 ký tự). Đăng ký miễn phí.',
      en: 'Tap "Sign up", choose "I want to find shifts" (worker) or "I need to hire workers" (employer), then enter your name, email, phone and a password (at least 8 characters). Signing up is free.',
      live: {
        vi: 'Bấm "Đăng ký", chọn vai trò "Tôi muốn tìm ca làm" (người lao động) hoặc "Tôi cần tuyển người lao động" (nhà tuyển dụng), điền thông tin và mật khẩu (ít nhất 8 ký tự), hoặc bấm "Tiếp tục với Google". Đăng ký bằng email thì mở email xác nhận rồi mới đăng nhập. Đăng ký miễn phí.',
        en: 'Tap "Sign up", choose "I want to find shifts" (worker) or "I need to hire workers" (employer), fill in your details and a password (at least 8 characters), or tap "Continue with Google". With email sign-up, confirm via the email we send before logging in. Signing up is free.',
      },
    },
    links: [L.register],
  },
  {
    id: 'account-switch-role',
    category: 'account',
    questions: {
      vi: ['Một tài khoản vừa làm người lao động vừa làm nhà tuyển dụng được không?', 'doi vai tro tu nld sang ntd', 'chọn nhầm vai trò lúc đăng ký', 'muon chuyen sang tai khoan tuyen dung', 'đổi role tài khoản'],
      en: ['Can I switch my role between worker and employer?', 'I picked the wrong role', 'change account role'],
    },
    keywords: ['vai tro', 'doi vai tro', 'chuyen vai tro', 'chon nham', 'role', 'switch role', 'change role'],
    answer: {
      vi: 'Vai trò (người lao động hoặc nhà tuyển dụng) được chọn khi đăng ký và quyết định các màn bạn thấy. Nếu chọn nhầm hoặc cần dùng vai trò kia, bạn liên hệ đội hỗ trợ CaLẻ, ghi email đăng ký để được hướng dẫn.',
      en: 'Your role (worker or employer) is chosen at sign-up and decides which screens you see. If you picked the wrong one or need the other role, contact the CaLẻ support team with your account email.',
    },
    links: [L.support],
  },
  {
    id: 'account-employer-type',
    category: 'account',
    roles: ['employer'],
    questions: {
      vi: ['Loại tài khoản nhà tuyển dụng (cá nhân, hộ kinh doanh, doanh nghiệp) khác nhau gì?', 'doi loai tai khoan ntd duoc khong', 'chọn cá nhân hay doanh nghiệp', 'tài khoản agency sự kiện', 'hộ kinh doanh đăng ký loại nào'],
      en: ['What are the employer account types?', 'individual or business account', 'change employer account type'],
    },
    keywords: ['loai tai khoan', 'ca nhan', 'ho kinh doanh', 'doanh nghiep', 'agency', 'cong ty', 'account type', 'business', 'individual'],
    answer: {
      vi: 'Khi đăng ký nhà tuyển dụng, bạn chọn loại tài khoản: cá nhân thuê ngắn hạn, hộ kinh doanh, doanh nghiệp hoặc agency / sự kiện. Loại tài khoản hiện trên hồ sơ của bạn và không tự đổi được sau khi đăng ký; cần đổi thì gửi yêu cầu để quản trị viên xét duyệt.',
      en: 'When registering as an employer you pick an account type: individual short-term hirer, household business, company, or agency / events. It is shown on your profile and cannot be changed by you after registration; to change it, send a request for an admin to review.',
    },
    links: [L.register, L.support],
  },
  {
    id: 'account-login',
    category: 'account',
    questions: {
      vi: ['Đăng nhập vào CaLẻ ở đâu?', 'dang nhap kieu gi', 'dn o dau vay', 'login vào tài khoản', 'vào lại tài khoản cũ'],
      en: ['How do I log in?', 'where is the login', 'sign in'],
    },
    keywords: ['dang nhap', 'login', 'sign in', 'vao tai khoan', 'log in'],
    answer: {
      vi: 'Bấm "Đăng nhập" ở góc trên, nhập email và mật khẩu. Bản demo có sẵn tài khoản demo: bấm một tài khoản trong khung "Tài khoản demo" để điền sẵn, mật khẩu đều là "demo".',
      en: 'Tap "Log in" at the top and enter your email and password. The demo has ready-made accounts: tap one in the "Demo accounts" box to fill it in; the password is always "demo".',
      live: {
        vi: 'Bấm "Đăng nhập" ở góc trên, nhập email và mật khẩu, hoặc bấm "Tiếp tục với Google" nếu bạn đăng ký bằng Google. Quên mật khẩu thì bấm "Quên mật khẩu?" ngay dưới ô mật khẩu.',
        en: 'Tap "Log in" at the top and enter your email and password, or tap "Continue with Google" if you signed up with Google. Forgot your password? Tap "Forgot password?" under the password field.',
      },
    },
    links: [L.login],
  },
  {
    id: 'account-google',
    category: 'account',
    questions: {
      vi: ['Đăng nhập bằng Google được không?', 'dang nhap bang gmail', 'login gg', 'tiếp tục với google bị lỗi', 'dang ky bang google xong phai lam gi'],
      en: ['Can I log in with Google?', 'google sign in', 'continue with google not working'],
    },
    keywords: ['google', 'gmail', 'tiep tuc voi google', 'gg', 'oauth', 'google login'],
    answer: {
      vi: 'Đăng nhập bằng Google có ở bản chính thức. Bản demo dùng tài khoản demo có sẵn ở trang Đăng nhập (mật khẩu "demo").',
      en: 'Google sign-in is available on the official site. The demo uses the ready-made demo accounts on the Log in page (password "demo").',
      live: {
        vi: 'Được. Ở trang Đăng nhập hoặc Đăng ký, bấm "Tiếp tục với Google". Lần đầu, bạn chọn vai trò và bổ sung vài thông tin để hoàn tất đăng ký. CaLẻ chỉ dùng tên và email từ tài khoản Google. Nếu báo "Không mở được đăng nhập Google", bạn thử lại hoặc dùng email và mật khẩu.',
        en: 'Yes. On Log in or Sign up, tap "Continue with Google". The first time, choose your role and add a few details to finish sign-up. CaLẻ only uses your Google name and email. If Google sign-in fails to open, try again or use email and password.',
      },
    },
    links: [L.login, L.register],
  },
  {
    id: 'account-forgot-password',
    category: 'account',
    questions: {
      vi: ['Quên mật khẩu thì lấy lại thế nào?', 'quen mk', 'quen pass dang nhap', 'khong nho mat khau', 'reset mật khẩu', 'lay lai mat khau'],
      en: ['I forgot my password', 'reset password', 'how to recover my password'],
    },
    keywords: ['quen mat khau', 'lay lai mat khau', 'dat lai mat khau', 'reset', 'khong nho', 'forgot password', 'reset password'],
    answer: {
      vi: 'Bản demo không có đặt lại mật khẩu: các tài khoản demo đều dùng mật khẩu "demo". Ở bản chính thức, bạn bấm "Quên mật khẩu?" ở trang Đăng nhập để nhận link đặt lại qua email.',
      en: 'The demo has no password reset: all demo accounts use the password "demo". On the official site, tap "Forgot password?" on the Log in page to get a reset link by email.',
      live: {
        vi: 'Ở trang Đăng nhập, bấm "Quên mật khẩu?", nhập email đã đăng ký rồi bấm "Gửi link đặt lại". Email có link sẽ tới trong vài phút (nhớ xem cả mục Thư rác / Quảng cáo). Mở link, nhập mật khẩu mới (khác mật khẩu cũ, ít nhất 8 ký tự).',
        en: 'On Log in, tap "Forgot password?", enter your account email and tap "Send reset link". The email arrives within a few minutes (check Spam / Promotions too). Open the link and set a new password (different from the old one, at least 8 characters).',
      },
    },
    links: [L.forgot, L.login],
  },
  {
    id: 'account-reset-link',
    category: 'account',
    questions: {
      vi: ['Link đặt lại mật khẩu báo hết hạn hoặc không hợp lệ', 'không nhận được email đặt lại mật khẩu', 'chua thay mail reset pass', 'link reset bi loi', 'email quên mật khẩu không tới'],
      en: ['Password reset link expired', 'did not receive the reset email', 'reset link invalid'],
    },
    keywords: ['link het han', 'link khong hop le', 'khong nhan duoc email', 'thu rac', 'spam', 'link dat lai', 'reset link', 'expired link'],
    answer: {
      vi: 'Link đặt lại mật khẩu chỉ dùng được một lần và có hạn. Nếu báo hết hạn, bạn vào "Quên mật khẩu" để yêu cầu link mới. Không thấy email thì xem cả mục Thư rác / Quảng cáo và kiểm tra đúng email đã đăng ký; vẫn không có thì liên hệ đội hỗ trợ.',
      en: 'A reset link works once and expires. If it says expired, request a new one from "Forgot password". If the email is missing, check Spam / Promotions and make sure it is your account email; still nothing, contact support.',
    },
    links: [L.forgot, L.support],
  },
  {
    id: 'account-confirm-email',
    category: 'account',
    questions: {
      vi: ['Đăng ký xong báo kiểm tra email để xác nhận là sao?', 'chua xac nhan email nen khong dang nhap duoc', 'không nhận được email xác nhận tài khoản', 'kich hoat tai khoan', 'mail xác minh đăng ký'],
      en: ['I need to confirm my email after signing up?', 'did not get the confirmation email', 'activate account'],
    },
    keywords: ['xac nhan email', 'kich hoat', 'email xac nhan', 'confirm email', 'activate', 'verification email'],
    answer: {
      vi: 'Bản demo không cần xác nhận email: tạo tài khoản xong là đăng nhập được ngay.',
      en: 'The demo needs no email confirmation: you can log in right after creating the account.',
      live: {
        vi: 'Đăng ký bằng email thì CaLẻ gửi một email xác nhận; bạn mở email đó rồi mới đăng nhập. Không thấy thì xem mục Thư rác / Quảng cáo. Đăng ký bằng Google thì không cần bước này.',
        en: 'With email sign-up, CaLẻ sends a confirmation email; open it before logging in. If missing, check Spam / Promotions. Signing up with Google skips this step.',
      },
    },
    links: [L.login, L.support],
  },
  {
    id: 'account-change-password',
    category: 'account',
    questions: {
      vi: ['Đổi mật khẩu tài khoản ở đâu?', 'doi pass', 'muốn đổi mk mới', 'thay mat khau', 'đặt mật khẩu cho tài khoản google'],
      en: ['How do I change my password?', 'update password', 'set a new password'],
    },
    keywords: ['doi mat khau', 'thay mat khau', 'mat khau moi', 'change password', 'new password'],
    answer: {
      vi: 'Bản demo không đổi được mật khẩu (tài khoản demo dùng mật khẩu "demo"). Ở bản chính thức, dùng "Quên mật khẩu?" ở trang Đăng nhập để nhận link đặt mật khẩu mới qua email.',
      en: 'You cannot change passwords in the demo (demo accounts use "demo"). On the official site, use "Forgot password?" on the Log in page to get a link for setting a new password.',
      live: {
        vi: 'Bạn dùng "Quên mật khẩu?" ở trang Đăng nhập: nhập email, mở link trong email và đặt mật khẩu mới (ít nhất 8 ký tự, khác mật khẩu cũ). Hãy giữ mật khẩu cho riêng bạn.',
        en: 'Use "Forgot password?" on the Log in page: enter your email, open the link and set a new password (at least 8 characters, different from the old one). Keep your password to yourself.',
      },
    },
    links: [L.forgot],
  },
  {
    id: 'account-edit-profile',
    category: 'account',
    questions: {
      vi: ['Sửa thông tin cá nhân, tên, giới thiệu ở đâu?', 'cap nhat ho so', 'đổi tên hiển thị', 'sửa tên trong hồ sơ', 'chinh sua thong tin tai khoan', 'muốn đổi email đăng nhập', 'thêm kỹ năng vào hồ sơ'],
      en: ['How do I edit my profile?', 'change my name', 'update my bio and skills'],
    },
    keywords: ['ho so', 'sua thong tin', 'chinh sua', 'cap nhat', 'doi ten', 'doi email', 'gioi thieu', 'ky nang', 'profile', 'edit profile'],
    answer: {
      vi: 'Mở menu tài khoản → Hồ sơ (người lao động: "Hồ sơ cá nhân"; nhà tuyển dụng: "Hồ sơ doanh nghiệp") rồi bấm chỉnh sửa. Người lao động nên điền giới thiệu, kỹ năng, loại việc và khu vực ưa thích để nhà tuyển dụng hiểu bạn hơn khi duyệt. Muốn đổi email đăng nhập hoặc thông tin không tự sửa được, liên hệ đội hỗ trợ từ email đăng ký.',
      en: 'Open the account menu → Profile (workers: "My profile"; employers: "Business profile") and tap edit. Workers should fill in bio, skills, preferred job types and areas so employers understand you when approving. To change your login email, or anything you cannot edit yourself, contact support from your account email.',
    },
    links: [L.workerProfile, L.employerProfile],
  },
  {
    id: 'account-change-phone',
    category: 'account',
    questions: {
      vi: ['Đổi số điện thoại trong tài khoản được không?', 'doi sdt', 'thay số điện thoại mới', 'mat sim muon doi so', 'cap nhat so dien thoai'],
      en: ['Can I change my phone number?', 'update phone number', 'new phone number'],
    },
    keywords: ['doi so', 'doi so dien thoai', 'so moi', 'mat sim', 'change phone', 'new number'],
    answer: {
      vi: 'Được, trong trang Hồ sơ. Lưu ý: đổi số điện thoại sẽ cần xác thực lại số mới bằng mã gửi qua tin nhắn. Nếu số mới báo "đã được xác thực bởi tài khoản khác", bạn liên hệ đội hỗ trợ.',
      en: 'Yes, in your profile. Note: changing your number requires verifying the new one with an SMS code. If the new number is "already verified by another account", contact support.',
    },
    links: [L.workerProfile, L.support, L.employerProfile],
  },
  {
    id: 'account-delete',
    category: 'account',
    questions: {
      vi: ['Muốn xoá tài khoản CaLẻ thì làm sao?', 'xoa tk', 'huỷ tài khoản vĩnh viễn', 'khong dung nua muon xoa tai khoan', 'xoá dữ liệu cá nhân của tôi'],
      en: ['How do I delete my account?', 'close my account', 'remove my data'],
    },
    keywords: ['xoa tai khoan', 'xoa tk', 'huy tai khoan', 'xoa du lieu', 'delete account', 'close account', 'remove data'],
    answer: {
      vi: 'Theo Chính sách bảo mật, bạn có quyền xoá tài khoản và dữ liệu liên quan bằng cách liên hệ đội hỗ trợ CaLẻ. Gửi email từ địa chỉ đăng ký và nêu rõ yêu cầu.',
      en: 'Under the Privacy policy you can have your account and related data deleted by contacting the CaLẻ support team. Email us from your account address with the request.',
      live: {
        vi: 'Liên hệ đội hỗ trợ CaLẻ từ email đăng ký. Tài khoản đã có giao dịch tiền thì CaLẻ phải giữ lịch sử giao dịch và chỉ khoá tài khoản thay vì xoá; hãy rút hết số dư trước.',
        en: 'Contact CaLẻ support from your account email. If the account has money transactions, CaLẻ must keep the transaction history and will suspend the account instead of deleting it; withdraw your whole balance first.',
      },
    },
    links: [L.privacy, L.support],
  },
  {
    id: 'account-suspended',
    category: 'account',
    questions: {
      vi: ['Tài khoản của tôi bị tạm khoá, phải làm sao?', 'tk bi khoa', 'bị khóa acc không đăng nhập được', 'tai sao tai khoan bi khoa', 'mở khoá tài khoản', 'bị khoá vì lý do gì'],
      en: ['My account is suspended', 'account locked', 'why was my account banned'],
    },
    keywords: ['bi khoa', 'tam khoa', 'khoa tai khoan', 'mo khoa', 'suspended', 'banned', 'locked'],
    answer: {
      vi: 'CaLẻ có thể tạm khoá tài khoản khi phát hiện gian lận, mạo danh hoặc vi phạm (theo Điều khoản sử dụng). Khi bị khoá, bạn không đăng nhập được; hãy liên hệ đội hỗ trợ / quản trị viên CaLẻ, ghi email đăng ký để được xem xét.',
      en: 'CaLẻ may suspend accounts for fraud, impersonation or violations (see Terms of use). While suspended you cannot log in; contact the CaLẻ support team / admins with your account email for review.',
    },
    links: [L.support, L.terms],
  },
  {
    id: 'account-email-taken',
    category: 'account',
    questions: {
      vi: ['Đăng ký báo email này đã được đăng ký', 'email da ton tai', 'không tạo được tài khoản vì trùng email', 'email bi trung', 'email đã có người dùng'],
      en: ['It says the email is already registered', 'email already taken', 'duplicate email'],
    },
    keywords: ['email da duoc dang ky', 'trung email', 'email ton tai', 'email taken', 'already registered'],
    answer: {
      vi: 'Email đó đã có tài khoản CaLẻ. Bạn thử đăng nhập bằng email này (hoặc "Tiếp tục với Google" nếu từng đăng ký bằng Google); quên mật khẩu thì dùng "Quên mật khẩu?". Nếu không phải bạn tạo, liên hệ đội hỗ trợ.',
      en: 'That email already has a CaLẻ account. Try logging in with it (or "Continue with Google" if you used Google); if you forgot the password, use "Forgot password?". If you did not create it, contact support.',
    },
    links: [L.login, L.forgot],
  },
  {
    id: 'account-logout',
    category: 'account',
    questions: {
      vi: ['Đăng xuất khỏi CaLẻ ở đâu?', 'thoat tai khoan', 'log out', 'đăng xuất trên máy người khác'],
      en: ['How do I log out?', 'sign out', 'logout button'],
    },
    keywords: ['dang xuat', 'thoat', 'logout', 'log out', 'sign out'],
    answer: {
      vi: 'Mở menu tài khoản (ảnh đại diện góc trên) → "Đăng xuất". Nếu dùng máy chung, nhớ đăng xuất sau khi dùng.',
      en: 'Open the account menu (avatar at the top) → "Log out". On a shared device, remember to log out when done.',
    },
    links: [],
  },
];

// ---------------------------------------------------------------------------
// Xác thực SĐT / CCCD
// ---------------------------------------------------------------------------

const VERIFY: SupportEntry[] = [
  {
    id: 'verify-phone',
    category: 'verify',
    questions: {
      vi: ['Xác thực số điện thoại bằng mã OTP như thế nào?', 'xac minh sdt o dau', 'lay ma otp', 'xác thực sđt để làm gì', 'can xac thuc so dien thoai khong'],
      en: ['How do I verify my phone number?', 'phone verification otp', 'where do I get the code'],
    },
    keywords: ['xac thuc so dien thoai', 'xac minh so dien thoai', 'ma otp', 'ma 6 so', 'sdt', 'phone verification', 'verify phone'],
    answer: {
      vi: 'Bản demo: vào Hồ sơ → mục "Xác minh" → bấm "Mô phỏng xác minh SĐT (demo)". Người lao động cần xác minh số điện thoại trước khi ứng tuyển ca đầu tiên.',
      en: 'Demo: go to Profile → "Verification" → tap "Simulate phone verification (demo)". Workers must verify their phone before their first application.',
      live: {
        vi: 'Vào Hồ sơ → thẻ "Xác thực tài khoản" → Số điện thoại: nhập số, bấm "Gửi mã", nhập mã 6 số gửi qua tin nhắn (hiệu lực 5 phút). Khi CaLẻ bật yêu cầu này, bạn cần xác thực số điện thoại trước khi ứng tuyển ca đầu tiên / đăng ca.',
        en: 'Go to Profile → "Account verification" → Phone: enter your number, tap "Send code", type the 6-digit SMS code (valid 5 minutes). When CaLẻ turns this requirement on, you must verify your phone before your first application / before posting a shift.',
      },
    },
    links: [L.workerProfile, L.guideVerify, L.employerProfile],
  },
  {
    id: 'verify-otp-problem',
    category: 'verify',
    questions: {
      vi: ['Không nhận được mã OTP qua tin nhắn', 'ma otp khong ve', 'mã không gửi về máy', 'mã xác thực không tới', 'nhập mã báo sai hoặc hết hạn', 'otp loi', 'gui lai ma xac thuc', 'yeu cau qua nhieu ma'],
      en: ['I did not get the OTP code', 'code expired or wrong', 'too many code requests'],
    },
    keywords: ['khong nhan duoc ma', 'ma xac thuc', 'gui toi dien thoai', 'ma sai', 'ma het han', 'gui lai ma', 'otp', 'sms', 'qua nhieu', 'otp not received', 'code expired'],
    answer: {
      vi: 'Mã có hiệu lực 5 phút; hết hạn hoặc nhập sai nhiều lần thì bấm "Gửi lại mã" (phải chờ 60 giây giữa hai lần yêu cầu). Nếu báo đã yêu cầu quá nhiều mã hôm nay, thử lại sau 24 giờ. Kiểm tra số đúng là số di động Việt Nam; vẫn không nhận được thì liên hệ đội hỗ trợ.',
      en: 'Codes are valid for 5 minutes; if expired or entered wrong too often, tap "Resend code" (wait 60 seconds between requests). If it says too many codes today, try again after 24 hours. Check it is a valid Vietnamese mobile number; still nothing, contact support.',
    },
    links: [L.workerProfile, L.support, L.employerProfile],
  },
  {
    id: 'verify-phone-in-use',
    category: 'verify',
    questions: {
      vi: ['Báo số điện thoại đã được xác thực bởi tài khoản khác', 'sdt da duoc dung cho tk khac', 'số này đã dùng rồi', 'mot so dung cho hai tai khoan duoc khong'],
      en: ['Phone number already verified by another account', 'number already in use', 'one number two accounts'],
    },
    keywords: ['tai khoan khac', 'da duoc xac thuc', 'so da dung', 'trung so', 'phone in use', 'another account'],
    answer: {
      vi: 'Mỗi số điện thoại chỉ xác thực cho một tài khoản. Nếu số của bạn đang gắn với tài khoản cũ, hãy đăng nhập tài khoản đó; nếu không phải bạn, liên hệ đội hỗ trợ CaLẻ kèm email đăng ký để được kiểm tra.',
      en: 'Each phone number can be verified on one account only. If it belongs to an older account of yours, log into that one; otherwise contact CaLẻ support with your account email.',
    },
    links: [L.support],
  },
  {
    id: 'verify-cccd',
    category: 'verify',
    questions: {
      vi: ['Xác thực CCCD cần những gì?', 'gui cccd the nao', 'chup can cuoc cong dan', 'xac minh danh tinh', 'up anh cmnd', 'cần mấy ảnh căn cước'],
      en: ['How do I verify my ID card (CCCD)?', 'identity verification', 'upload my ID'],
    },
    keywords: ['cccd', 'can cuoc', 'can cuoc cong dan', 'xac thuc danh tinh', 'giay to', 'anh chan dung', 'id card', 'identity'],
    answer: {
      vi: 'Bản demo dùng giấy tờ mô phỏng: bạn gửi giấy tờ trong trang Hồ sơ, quản trị viên duyệt; người khác chỉ thấy huy hiệu "Đã xác minh" và số giấy tờ đã che.',
      en: 'The demo uses simulated documents: submit them in your profile and an admin reviews; others only see a "Verified" badge and a masked number.',
      live: {
        vi: 'Vào Hồ sơ → "Bắt đầu xác thực CCCD": nhập họ tên đúng như trên CCCD, số CCCD 12 số, ngày sinh, rồi gửi 3 ảnh: mặt trước, mặt sau và ảnh chân dung cầm CCCD (mỗi ảnh tối đa 5 MB). Quản trị viên duyệt tay; kết quả hiện ngay trong thẻ xác thực.',
        en: 'Go to Profile → "Start ID verification": enter your name exactly as on the card, the 12-digit CCCD number and date of birth, then upload 3 photos: front, back and a selfie holding the card (max 5 MB each). An admin reviews manually; the result shows in the verification card.',
      },
    },
    links: [L.workerProfile, L.guideVerify, L.employerProfile],
  },
  {
    id: 'verify-cccd-required',
    category: 'verify',
    questions: {
      vi: ['CCCD có bắt buộc không?', 'khong xac thuc cccd co ung tuyen duoc khong', 'không có căn cước thì sao', 'bat buoc gui giay to khong', 'ntd co can cccd moi dang ca'],
      en: ['Is ID verification required?', 'can I apply without CCCD', 'do employers need ID'],
    },
    keywords: ['bat buoc', 'khong bat buoc', 'cccd', 'can cuoc', 'required', 'mandatory', 'optional'],
    answer: {
      vi: 'Người lao động không cần CCCD để ứng tuyển (chỉ cần xác thực số điện thoại), nhưng một số ca có thể yêu cầu thêm giấy tờ, ghi trong chi tiết ca. Bản demo xác thực là mô phỏng.',
      en: 'Workers do not need an ID to apply (only phone verification), though some shifts may ask for documents, shown on the shift details. In the demo, verification is simulated.',
      live: {
        vi: 'Người lao động: không bắt buộc để ứng tuyển; khi CaLẻ yêu cầu cọc lúc ứng tuyển, đã xác thực CCCD thì thường được miễn cọc. Nhà tuyển dụng: khi CaLẻ bật yêu cầu này, cần CCCD được quản trị viên duyệt mới đăng được ca.',
        en: 'Workers: not required to apply; when CaLẻ asks for an application deposit, a verified ID usually exempts you. Employers: when CaLẻ turns this requirement on, an admin-approved ID is needed before posting shifts.',
      },
    },
    links: [L.workerVerify, L.employerVerify],
  },
  {
    id: 'verify-cccd-privacy',
    category: 'verify',
    questions: {
      vi: ['Ảnh CCCD của tôi có bị lộ không, ai xem được?', 'gui can cuoc co an toan khong', 'ntd co xem duoc anh cccd khong', 'anh giay to luu o dau', 'sợ lộ thông tin căn cước'],
      en: ['Who can see my ID photos?', 'is my ID safe', 'can employers see my ID card'],
    },
    keywords: ['lo thong tin', 'an toan', 'rieng tu', 'ai xem', 'anh cccd', 'kho rieng tu', 'id privacy', 'who can see'],
    answer: {
      vi: 'Người dùng khác chỉ thấy huy hiệu "Đã xác minh" và số giấy tờ đã che, không thấy ảnh gốc. Bản demo dùng giấy tờ mô phỏng nên bạn không cần tải ảnh thật.',
      en: 'Other users only see a "Verified" badge and a masked number, never the original photos. The demo uses simulated documents, so do not upload real ones.',
      live: {
        vi: 'Ảnh CCCD nằm ở kho lưu trữ riêng tư, chỉ quản trị viên CaLẻ xem để đối chiếu, không hiển thị công khai. Bạn đồng ý cho CaLẻ lưu ảnh chỉ để xác minh danh tính. Hiện nhà tuyển dụng chưa thấy huy hiệu xác minh.',
        en: 'ID photos sit in private storage that only CaLẻ admins can view for checking; they are never public. You consent to CaLẻ storing them only for identity verification. Employers currently do not see a verification badge.',
      },
    },
    links: [L.privacy, L.guideVerify],
  },
  {
    id: 'verify-cccd-status',
    category: 'verify',
    questions: {
      vi: ['CCCD đang chờ duyệt bao lâu, bị từ chối thì sao?', 'cccd bi tu choi', 'gui cccd lau chua duoc duyet', 'trang thai xac minh dang cho', 'gui lai can cuoc'],
      en: ['How long does ID review take?', 'my ID was rejected', 'ID still pending'],
    },
    keywords: ['cho duyet', 'tu choi', 'bi tu choi', 'anh mo', 'gui lai', 'trang thai', 'pending', 'rejected', 'review time'],
    answer: {
      vi: 'Sau khi gửi, trạng thái là "Đang chờ duyệt"; quản trị viên duyệt trong thời gian sớm nhất. Nếu bị từ chối, thẻ xác thực ghi lý do và bạn có thể gửi lại (chụp rõ, đủ 3 ảnh, họ tên và số CCCD đúng như trên thẻ). Chờ lâu thì liên hệ đội hỗ trợ.',
      en: 'After submitting, the status is "Pending review"; an admin reviews as soon as possible. If rejected, the card shows the reason and you can resubmit (clear photos, all 3 of them, name and number exactly as on the card). Waiting too long? Contact support.',
    },
    links: [L.workerProfile, L.support, L.employerProfile],
  },
];

// ---------------------------------------------------------------------------
// Tìm ca & ứng tuyển (người lao động)
// ---------------------------------------------------------------------------

const FIND: SupportEntry[] = [
  {
    id: 'find-shifts',
    category: 'find',
    roles: ['worker', 'guest'],
    questions: {
      vi: ['Tìm ca làm ở đâu trên CaLẻ?', 'xem danh sach ca dang tuyen', 'kiếm việc làm thêm', 'tìm việc part time', 'co ca nao dang tuyen khong', 'muon di lam them'],
      en: ['Where do I find shifts?', 'see open shifts', 'find part-time work'],
    },
    keywords: ['tim ca', 'tim viec', 'ca dang tuyen', 'lam them', 'part time', 'kiem viec', 'viec lam', 'find shifts', 'open shifts', 'jobs'],
    answer: {
      vi: 'Bấm "Tìm ca làm" để xem các ca đang tuyển. Chỉ những ca đã được giữ trước tiền công mới hiện ra. Mỗi ca ghi rõ tổng tiền cả ca, giờ làm, địa điểm và yêu cầu; bạn bấm vào ca để xem chi tiết và ứng tuyển.',
      en: 'Tap "Find shifts" to see open shifts. Only shifts whose wages are already held appear. Each shows total pay, hours, location and requirements; tap one to see details and apply.',
    },
    links: [L.shifts],
  },
  {
    id: 'find-filters',
    category: 'find',
    roles: ['worker', 'guest'],
    questions: {
      vi: ['Lọc ca theo khu vực, mức lương, loại việc thế nào?', 'bo loc tim ca', 'loc theo ngay lam', 'tim ca luong cao', 'tim theo ten quan', 'sắp xếp ca theo lương'],
      en: ['How do I filter shifts?', 'filter by area or pay', 'search shifts by date'],
    },
    keywords: ['loc', 'bo loc', 'luong cao', 'muc luong', 'tu ngay', 'den ngay', 'loai cong viec', 'tim kiem', 'filter', 'search'],
    answer: {
      vi: 'Ở trang Tìm ca làm, gõ tên ca hoặc địa điểm vào ô tìm kiếm, rồi mở "Bộ lọc" để chọn khu vực, loại công việc, khoảng ngày (từ ngày / đến ngày) và lương tối thiểu / tối đa theo giờ. Các bộ lọc đang áp dụng hiện ngay trên đầu danh sách.',
      en: 'On Find shifts, type a shift name or place in the search box, then open "Filters" to choose area, job type, date range and min / max hourly pay. Active filters are shown above the list.',
    },
    links: [L.shifts],
  },
  {
    id: 'find-no-shifts',
    category: 'find',
    roles: ['worker', 'guest'],
    questions: {
      vi: ['Sao danh sách ca trống, không thấy ca nào?', 'khong co ca nao het', 'mở tìm ca không ra gì', 'ca cu bien mat', 'het ca roi a'],
      en: ['Why are there no shifts?', 'the shift list is empty', 'a shift disappeared'],
    },
    keywords: ['khong thay ca', 'danh sach trong', 'het ca', 'bien mat', 'khong co ca', 'no shifts', 'empty list', 'disappeared'],
    answer: {
      vi: 'Danh sách chỉ hiện ca đã được giữ cọc và còn nhận người; ca đã đủ người, đã bắt đầu hoặc đã huỷ sẽ không còn nhận đơn. Bạn thử bỏ bớt bộ lọc (khu vực, lương, ngày) hoặc quay lại sau vì ca mới được đăng thường xuyên.',
      en: 'The list only shows shifts with a held deposit that still need people; full, started or cancelled shifts stop taking applications. Try removing some filters (area, pay, date) or check back later as new shifts are posted often.',
    },
    links: [L.shifts],
  },
  {
    id: 'find-shift-details',
    category: 'find',
    roles: ['worker', 'guest'],
    questions: {
      vi: ['Trong chi tiết ca có những thông tin gì?', 'xem dia chi ca lam o dau', 'ca ghi yeu cau gi', 'người phụ trách tại chỗ là ai', 'thong tin ca truoc khi ung tuyen'],
      en: ['What info does a shift page show?', 'shift details', 'where is the shift address'],
    },
    keywords: ['chi tiet ca', 'dia chi', 'dia diem', 'yeu cau', 'mo ta', 'nguoi phu trach', 'thong tin ca', 'shift details', 'address'],
    answer: {
      vi: 'Trang chi tiết ca ghi tổng tiền cả ca, lương theo giờ, ngày giờ làm, địa điểm, mô tả công việc, yêu cầu, mức bằng chứng khi check-out và trạng thái ca. Hãy đọc kỹ trước khi bấm "Ứng tuyển".',
      en: 'The shift page shows total pay, hourly wage, date and time, location, job description, requirements, the check-out evidence level and the shift status. Read it carefully before tapping "Apply".',
    },
    links: [L.shifts, L.hbEvidence],
  },
  {
    id: 'apply-how',
    category: 'apply',
    roles: ['worker', 'guest'],
    questions: {
      vi: ['Ứng tuyển một ca như thế nào?', 'cach ung tuyen ca', 'nhận ca làm sao', 'đăng ký nhận ca', 'bam ung tuyen o dau', 'apply ca'],
      en: ['How do I apply for a shift?', 'apply to a job', 'take a shift'],
    },
    keywords: ['ung tuyen', 'nhan ca', 'dang ky ca', 'apply', 'nop don', 'giu cho'],
    answer: {
      vi: 'Xác minh số điện thoại một lần trong Hồ sơ, mở ca muốn làm rồi bấm "Ứng tuyển". Đơn chờ nhà tuyển dụng duyệt; được duyệt hay bị từ chối, trạng thái đổi ngay trên trang Tổng quan. Không cần gửi CV.',
      en: 'Verify your phone once in your profile, open the shift you want and tap "Apply". The application waits for the employer; approved or rejected, the status updates on your Dashboard. No CV needed.',
      live: {
        vi: 'Mở ca muốn làm rồi bấm "Ứng tuyển" (khi CaLẻ bật yêu cầu này, bạn cần xác thực số điện thoại trong Hồ sơ trước). Đơn chờ nhà tuyển dụng duyệt; kết quả hiện trên trang Tổng quan. Không cần gửi CV.',
        en: 'Open the shift you want and tap "Apply" (when CaLẻ turns this requirement on, verify your phone in your profile first). The application waits for the employer; the result shows on your Dashboard. No CV needed.',
      },
    },
    links: [L.shifts, L.workerDash],
  },
  {
    id: 'apply-cannot',
    category: 'apply',
    roles: ['worker'],
    questions: {
      vi: ['Tại sao tôi không ứng tuyển được ca này?', 'khong bam ung tuyen duoc', 'nút ứng tuyển bị khoá', 'bao loi khi ung tuyen', 'ung tuyen bi chan'],
      en: ['Why can’t I apply for this shift?', 'apply button disabled', 'error when applying'],
    },
    keywords: ['khong ung tuyen duoc', 'bi chan', 'loi ung tuyen', 'nut ung tuyen', 'cannot apply', 'blocked'],
    answer: {
      vi: 'Bạn cần xác minh số điện thoại trước khi ứng tuyển ca đầu tiên, và điểm uy tín cần từ 50 trở lên. Ca đã đủ người, đã bắt đầu, trùng giờ với ca đã duyệt / lịch bận của bạn, hoặc bạn đã có đơn đang mở ở ca đó cũng không ứng tuyển được. Lưu ý "mang giấy tờ tuỳ thân" trên một số ca không chặn ứng tuyển.',
      en: 'You must verify your phone before your first application, and your reputation must be 50 or higher. Full or started shifts, shifts overlapping an approved shift or your busy time, or shifts where you already have an open application also block applying. A "bring your ID" note on a shift does not block applying.',
      live: {
        vi: 'Khi CaLẻ bật yêu cầu này, bạn cần xác thực số điện thoại trước khi ứng tuyển ca đầu tiên. Ca đã đủ người hoặc đã bắt đầu thì không nhận thêm đơn. Mỗi ca chỉ có một đơn đang mở; đơn bị từ chối hoặc đã huỷ thì có thể ứng tuyển lại. Nếu đang áp dụng cọc ứng tuyển, bạn cần đồng ý khoản cọc trước khi gửi đơn.',
        en: 'When CaLẻ turns this requirement on, you must verify your phone before your first application. Full or started shifts take no more applications. Each shift can have only one open application from you; if it was rejected or cancelled you can apply again. If an application deposit applies, you must accept it before sending.',
      },
    },
    links: [L.workerProfile, L.faq],
  },
  {
    id: 'apply-doc-requirement',
    category: 'apply',
    roles: ['worker'],
    questions: {
      vi: ['Ca ghi phải mang giấy tờ hoặc thẻ sinh viên thì có ứng tuyển được không?', 'ca can the sinh vien', 'ca doi giay to rieng', 'yêu cầu riêng của ca là gì', 'ca bat phai co giay to', 'ca yeu cau mang giay to tuy than'],
      en: ['The shift says to bring documents — can I still apply?', 'shift-specific requirements', 'need ID for this shift'],
    },
    keywords: ['the sinh vien', 'yeu cau rieng', 'giay to rieng', 'mang giay to', 'giay to tuy than', 'requirement', 'student card'],
    answer: {
      vi: 'Không có ca nào chặn ứng tuyển vì giấy tờ. Một số ca ghi lưu ý "Vui lòng mang giấy tờ tuỳ thân đã xác minh khi tới ca làm": bạn vẫn ứng tuyển bình thường, chỉ cần mang giấy tờ khi đi làm. Xác minh giấy tờ trong trang Hồ sơ (bản demo: mô phỏng) giúp nhà tuyển dụng yên tâm hơn.',
      en: 'No shift blocks applying because of documents. Some shifts note "Please bring your verified ID when you come to the shift": you apply as usual and just bring it to work. Verifying documents in your profile (demo: simulated) reassures employers.',
      live: {
        vi: 'Không có ca nào chặn ứng tuyển vì giấy tờ. Một số ca ghi lưu ý mang giấy tờ tuỳ thân khi tới ca làm: bạn vẫn ứng tuyển bình thường, chỉ cần mang theo khi đi làm. Xác thực CCCD trong trang Hồ sơ (quản trị viên duyệt) giúp nhà tuyển dụng yên tâm hơn.',
        en: 'No shift blocks applying because of documents. Some shifts note that you should bring ID to the shift: you apply as usual and just bring it to work. Verifying your ID in your profile (admin-approved) reassures employers.',
      },
    },
    links: [L.workerProfile, L.shifts],
  },
  {
    id: 'apply-full',
    category: 'apply',
    roles: ['worker'],
    questions: {
      vi: ['Ca báo đã đủ người thì còn ứng tuyển được không?', 'ca day nguoi roi', 'het slot', 'ca full roi co cho them khong', 'hết chỗ'],
      en: ['The shift is full, can I still apply?', 'no slots left', 'fully booked'],
    },
    keywords: ['du nguoi', 'het cho', 'het slot', 'full', 'day nguoi', 'fully booked', 'no slots'],
    answer: {
      vi: 'Không. Ca đã đủ người thì không nhận thêm đơn. Bạn tìm ca khác tương tự ở trang Tìm ca làm; nếu có người huỷ, ca có thể mở lại chỗ trống.',
      en: 'No. Once a shift is full it takes no more applications. Look for a similar shift on Find shifts; if someone cancels, a slot may open again.',
    },
    links: [L.shifts],
  },
  {
    id: 'apply-multiple',
    category: 'apply',
    roles: ['worker'],
    questions: {
      vi: ['Ứng tuyển nhiều ca cùng lúc được không?', 'nhan 2 ca 1 ngay', 'ung tuyen lai ca da ung tuyen', 'bao loi da ung tuyen ca nay roi', 'đăng ký nhiều ca một lúc'],
      en: ['Can I apply to several shifts at once?', 'two shifts in one day', 'already applied error'],
    },
    keywords: ['nhieu ca', 'cung luc', 'hai ca', 'da ung tuyen', 'ung tuyen lai', 'multiple shifts', 'already applied'],
    answer: {
      vi: 'Được, miễn các ca không trùng giờ. Mỗi ca chỉ có một đơn đang mở ("Bạn đã ứng tuyển ca làm này rồi"); đơn bị từ chối hoặc đã huỷ thì có thể ứng tuyển lại. Trong bản demo, ca trùng giờ với ca đã duyệt hoặc lịch bận sẽ bị chặn.',
      en: 'Yes, as long as they do not overlap. Each shift can have only one open application from you ("You already applied to this shift"); if it was rejected or cancelled you can apply again. In the demo, shifts overlapping an approved shift or your busy time are blocked.',
      live: {
        vi: 'Được, miễn các ca không trùng giờ. Mỗi ca chỉ có một đơn đang mở; đơn bị từ chối hoặc đã huỷ thì có thể ứng tuyển lại. Bản chính thức chưa tự chặn ca trùng giờ khi ứng tuyển, nên hãy xem Lịch cá nhân trước để không nhận hai ca trùng giờ.',
        en: 'Yes, as long as they do not overlap. Each shift can have only one open application from you; if it was rejected or cancelled you can apply again. The official site does not yet block overlapping shifts when you apply, so check your schedule first to avoid holding two overlapping shifts.',
      },
    },
    links: [L.workerSchedule],
  },
  {
    id: 'apply-status',
    category: 'apply',
    roles: ['worker'],
    questions: {
      vi: ['Xem trạng thái đơn ứng tuyển ở đâu?', 'don cua toi da duoc duyet chua', 'việc đã ứng tuyển', 'kiem tra don ung tuyen', 'biết được nhận hay chưa'],
      en: ['Where can I see my application status?', 'was I approved', 'my applications'],
    },
    keywords: ['trang thai don', 'don ung tuyen', 'da duyet chua', 'viec da ung tuyen', 'application status', 'my applications'],
    answer: {
      vi: 'Trạng thái đơn hiện trên trang Tổng quan (menu tài khoản → "Việc đã ứng tuyển"): Chờ duyệt, Đã duyệt hoặc Bị từ chối (kèm lý do). Bạn cũng nhận thông báo khi trạng thái thay đổi.',
      en: 'Your application status is on the Dashboard (account menu → "My applications"): Pending, Approved or Rejected (with a reason). You also get a notification when it changes.',
      live: {
        vi: 'Trạng thái đơn hiện trên trang Tổng quan (menu tài khoản → "Việc đã ứng tuyển"): Chờ duyệt, Đã duyệt hoặc Bị từ chối (kèm lý do). Mở lại trang Tổng quan để xem trạng thái mới nhất.',
        en: 'Your application status is on the Dashboard (account menu → "My applications"): Pending, Approved or Rejected (with a reason). Reload the Dashboard to see the latest status.',
      },
    },
    links: [L.workerDash],
  },
  {
    id: 'apply-withdraw',
    category: 'apply',
    roles: ['worker'],
    questions: {
      vi: ['Rút đơn ứng tuyển khi đang chờ duyệt được không?', 'huy don khi chua duoc duyet', 'không muốn ứng tuyển nữa', 'rut don', 'ung tuyen nham ca'],
      en: ['Can I withdraw a pending application?', 'cancel my application before approval', 'applied by mistake'],
    },
    keywords: ['rut don', 'huy don', 'cho duyet', 'ung tuyen nham', 'withdraw application', 'pending'],
    answer: {
      vi: 'Được. Đơn còn "Chờ duyệt" thì bạn bấm "Huỷ đơn ứng tuyển", ghi lý do ngắn là huỷ ngay, không cần ai đồng ý và không bị trừ điểm uy tín. (Bản demo: lần huỷ này vẫn tính vào hạn mức huỷ.)',
      en: 'Yes. While "Pending", tap "Cancel application" and add a short reason; it is cancelled immediately, no approval needed and no reputation penalty. (Demo: it still counts toward your cancellation quota.)',
      live: {
        vi: 'Được. Đơn còn "Chờ duyệt" thì bạn bấm "Huỷ đơn ứng tuyển", ghi lý do ngắn là huỷ ngay, không cần ai đồng ý. Nếu đã đặt cọc ứng tuyển, cọc được hoàn đủ.',
        en: 'Yes. While "Pending", tap "Cancel application" with a short reason; it is cancelled immediately, no approval needed. Any application deposit is refunded in full.',
      },
    },
    links: [L.workerDash],
  },
  {
    id: 'apply-rejected',
    category: 'apply',
    roles: ['worker'],
    questions: {
      vi: ['Đơn ứng tuyển bị từ chối là sao?', 'bi tu choi ung tuyen', 'nhà tuyển dụng từ chối đơn của tôi', 'ntd khong nhan minh', 'tai sao bi reject', 'bị loại khỏi ca'],
      en: ['My application was rejected', 'why was I rejected', 'employer declined me'],
    },
    keywords: ['bi tu choi', 'tu choi', 'ly do tu choi', 'khong duoc nhan', 'rejected', 'declined'],
    answer: {
      vi: 'Nhà tuyển dụng từ chối phải ghi lý do, bạn xem lý do ở trang Tổng quan. Bị từ chối không bị trừ điểm uy tín. Bạn có thể ứng tuyển ca khác; điền đủ hồ sơ (giới thiệu, kỹ năng) giúp tăng cơ hội được duyệt.',
      en: 'Employers must give a reason when rejecting; you see it on your Dashboard. A rejection costs no reputation. You can apply to other shifts; a complete profile (bio, skills) improves your chances.',
      live: {
        vi: 'Nhà tuyển dụng từ chối phải ghi lý do, bạn xem lý do ở trang Tổng quan. Nếu đã đặt cọc ứng tuyển, cọc được hoàn đủ. Bạn có thể ứng tuyển ca khác; điền đủ hồ sơ giúp tăng cơ hội được duyệt.',
        en: 'Employers must give a reason when rejecting; you see it on your Dashboard. Any application deposit is refunded in full. Apply to other shifts; a complete profile improves your chances.',
      },
    },
    links: [L.workerDash, L.workerProfile],
  },
  {
    id: 'apply-pending-expired',
    category: 'apply',
    roles: ['worker'],
    questions: {
      vi: ['Đơn chờ duyệt lâu quá, ca bắt đầu rồi mà vẫn chưa duyệt thì sao?', 'don bi het han', 'đơn ứng tuyển của tôi bị hết hạn', 'ứng tuyển rồi bao lâu thì được duyệt', 'ntd khong duyet don', 'chờ duyệt mãi', 'đơn hết hạn là sao'],
      en: ['My application has been pending too long', 'application expired', 'employer never approved'],
    },
    keywords: ['cho duyet lau', 'het han', 'chua duyet', 'don het han', 'expired', 'pending too long'],
    answer: {
      vi: 'Nhà tuyển dụng thường xử lý đơn trước giờ ca. Nếu tới giờ bắt đầu mà đơn vẫn "Chờ duyệt", đơn tự chuyển sang "Đã hết hạn" và bạn không bị trừ gì. Trong lúc chờ, bạn cứ ứng tuyển thêm ca khác không trùng giờ.',
      en: 'Employers usually decide before the shift. If it is still "Pending" when the shift starts, the application becomes "Expired" with no penalty for you. Meanwhile, feel free to apply to other non-overlapping shifts.',
      live: {
        vi: 'Nhà tuyển dụng thường xử lý đơn trước giờ ca. Nếu tới giờ bắt đầu mà đơn vẫn "Chờ duyệt", đơn tự chuyển sang "Đã hết hạn", bạn không bị trừ gì và cọc ứng tuyển (nếu có) được hoàn đủ.',
        en: 'Employers usually decide before the shift. If it is still "Pending" at start time, it becomes "Expired", with no penalty and any application deposit refunded in full.',
      },
    },
    links: [L.workerDash],
  },
  {
    id: 'apply-no-cv',
    category: 'apply',
    roles: ['worker', 'guest'],
    questions: {
      vi: ['Ứng tuyển có cần gửi CV hay phỏng vấn không?', 'can cv khong', 'co phong van truoc khong', 'nộp hồ sơ xin việc', 'phai nhan tin hoi gia khong'],
      en: ['Do I need a CV or interview?', 'resume required', 'is there an interview'],
    },
    keywords: ['cv', 'phong van', 'ho so xin viec', 'resume', 'interview'],
    answer: {
      vi: 'Không cần CV hay nhắn tin hỏi giá: bạn ứng tuyển bằng một nút. Nhà tuyển dụng xem hồ sơ CaLẻ của bạn (giới thiệu, kỹ năng, đánh giá, số ca đã làm) để duyệt, nên hãy điền hồ sơ đầy đủ.',
      en: 'No CV or price haggling: you apply with one tap. Employers look at your CaLẻ profile (bio, skills, reviews, shifts done) to decide, so keep it complete.',
    },
    links: [L.workerProfile],
  },
  {
    id: 'apply-conflict',
    category: 'apply',
    roles: ['worker'],
    questions: {
      vi: ['Báo ca này trùng lịch / trùng giờ với ca khác là sao?', 'trung gio ca da duyet', 'bao trung lich ca nhan', 'hai ca trung nhau', 'loi trung lich khi ung tuyen'],
      en: ['It says the shift overlaps my schedule', 'schedule conflict', 'overlapping shifts'],
    },
    keywords: ['trung lich', 'trung gio', 'trung ca', 'lich ban', 'schedule conflict', 'overlap'],
    answer: {
      vi: 'Trong bản demo, ca trùng giờ với ca bạn đã được duyệt hoặc trùng giờ bận trong Lịch cá nhân sẽ bị chặn khi ứng tuyển. Ví dụ bạn học 14:00–16:00 thứ Ba thì ca 15:00–17:00 thứ Ba sẽ báo trùng lịch. Sửa lịch bận hoặc chọn ca khác.',
      en: 'In the demo, shifts overlapping one you are approved for, or busy time in your schedule, are blocked. E.g. class 14:00–16:00 Tuesday blocks a 15:00–17:00 Tuesday shift. Adjust your busy time or pick another shift.',
      live: {
        vi: 'Bản chính thức chưa tự chặn ca trùng giờ khi ứng tuyển, nên hãy xem Lịch cá nhân trước để không nhận hai ca trùng giờ.',
        en: 'The official site does not yet block overlapping shifts when you apply, so check your schedule first to avoid holding two overlapping shifts.',
      },
    },
    links: [L.workerSchedule, L.workerScheduleGuide],
  },
  {
    id: 'schedule-worker',
    category: 'schedule',
    roles: ['worker'],
    questions: {
      vi: ['Lịch cá nhân dùng để làm gì, thêm giờ bận thế nào?', 'them gio hoc vao lich', 'danh dau gio ranh', 'xem cac ca da nhan theo tuan', 'lich ca nhan o dau'],
      en: ['How does My schedule work?', 'add busy time', 'see my shifts by week'],
    },
    keywords: ['lich ca nhan', 'gio ban', 'gio ranh', 'lich hoc', 'tom tat tuan', 'schedule', 'busy time', 'calendar'],
    answer: {
      vi: 'Lịch cá nhân gom ca đã nhận, ca đang chờ duyệt và giờ bận của bạn vào một chỗ. Bấm vào ô trống để thêm giờ học, ca làm nơi khác, việc riêng hoặc giờ rảnh muốn nhận ca. Tóm tắt tuần cho biết số ca, số giờ làm, tiền công dự kiến và số đơn chờ duyệt. Trên điện thoại lịch mở chế độ Danh sách; máy tính có thêm Ngày và Tuần.',
      en: 'My schedule puts accepted shifts, pending applications and your busy time in one place. Tap an empty slot to add classes, other jobs, personal time or free time. The weekly summary shows shifts, hours, expected pay and pending applications. Phones open in List view; computers also have Day and Week.',
    },
    links: [L.workerSchedule, L.workerScheduleGuide],
  },
];

// ---------------------------------------------------------------------------
// Huỷ ca & điểm uy tín
// ---------------------------------------------------------------------------

const CANCEL: SupportEntry[] = [
  {
    id: 'cancel-worker',
    category: 'cancel',
    roles: ['worker'],
    questions: {
      vi: ['Tôi muốn huỷ ca đã được duyệt thì làm thế nào?', 'huy ca da nhan', 'khong di lam duoc nua muon huy', 'bận đột xuất huỷ ca', 'đã được nhận ca nhưng không muốn đi nữa', 'huy ca truoc may tieng', 'xin nghỉ ca đã nhận'],
      en: ['How do I cancel an approved shift?', 'I can no longer work my shift', 'cancel a shift'],
    },
    keywords: ['huy ca', 'huy don', 'ca da duyet', 'ban dot xuat', 'lo hen', 'khong muon di', 'xin nghi', 'cancel shift'],
    answer: {
      vi: 'Còn hơn 3 giờ nữa mới bắt đầu ca thì bạn tự huỷ ngay (bấm "Huỷ đơn ứng tuyển", ghi lý do). Trong vòng 3 giờ trước ca, bạn gửi yêu cầu huỷ và chờ nhà tuyển dụng đồng ý; trong lúc chờ bạn vẫn giữ chỗ. Huỷ trong 24 giờ trước ca bị trừ 10 điểm uy tín.',
      en: 'More than 3 hours before start you can cancel right away (tap "Cancel application", give a reason). Within 3 hours, you send a cancellation request and wait for the employer to agree; you keep your slot meanwhile. Cancelling within 24 hours of the shift costs 10 reputation points.',
      live: {
        vi: 'Còn hơn 3 giờ nữa mới bắt đầu ca thì bạn tự huỷ ngay (bấm "Huỷ đơn ứng tuyển", ghi lý do), không cần ai đồng ý. Trong vòng 3 giờ trước ca, bạn gửi yêu cầu huỷ và chờ nhà tuyển dụng đồng ý; trong lúc chờ bạn vẫn giữ chỗ. Cọc ứng tuyển (nếu có) được hoàn khi huỷ.',
        en: 'More than 3 hours before start you can cancel right away (tap "Cancel application", give a reason), no approval needed. Within 3 hours, send a cancellation request and wait for the employer; you keep your slot meanwhile. Any application deposit is refunded on cancellation.',
      },
    },
    links: [L.workerCancel, L.workerDash],
  },
  {
    id: 'cancel-request-pending',
    category: 'cancel',
    roles: ['worker'],
    questions: {
      vi: ['Đã gửi yêu cầu huỷ mà nhà tuyển dụng chưa đồng ý thì sao?', 'yeu cau huy dang cho', 'yêu cầu huỷ bị từ chối', 'huy sat gio can ntd dong y', 'trạng thái yêu cầu huỷ'],
      en: ['My cancellation request is still waiting', 'employer rejected my cancel request', 'late cancellation request'],
    },
    keywords: ['yeu cau huy', 'cho dong y', 'tu choi yeu cau', 'sat gio', 'cancellation request', 'waiting approval'],
    answer: {
      vi: 'Trong vòng 3 giờ trước ca, đơn của bạn chuyển sang "Yêu cầu huỷ" và bạn vẫn giữ chỗ trong lúc chờ. Nếu nhà tuyển dụng từ chối, bạn vẫn là người làm ca đó: hãy đi làm hoặc nhắn trao đổi với họ. Không đến mà không báo sẽ bị tính vắng mặt.',
      en: 'Within 3 hours of the shift your application becomes "Cancellation requested" and you keep the slot while waiting. If the employer declines, you are still on the shift: go to work or message them. Not showing up counts as a no-show.',
    },
    links: [L.workerCancel],
  },
  {
    id: 'cancel-penalty',
    category: 'cancel',
    roles: ['worker'],
    questions: {
      vi: ['Huỷ ca có bị trừ điểm uy tín không?', 'huy ca co sao khong', 'hủy có bị phạt không', 'huy ca bi tru may diem', 'hậu quả khi huỷ ca'],
      en: ['Will cancelling hurt my reputation?', 'penalty for cancelling', 'cancellation penalty'],
    },
    keywords: ['tru diem', 'bi phat', 'hau qua', 'uy tin', 'phat', 'penalty', 'cancellation penalty'],
    answer: {
      vi: 'Huỷ trong vòng 24 giờ trước ca bị trừ 10 điểm uy tín; huỷ sớm hơn hoặc rút đơn khi còn chờ duyệt thì không bị trừ. Mỗi lần huỷ (kể cả khi chờ duyệt) tính vào hạn mức huỷ: tối đa 3 lần trong 7 ngày và 10 lần trong 30 ngày.',
      en: 'Cancelling within 24 hours of the shift costs 10 reputation points; earlier cancellations or withdrawing a pending application cost nothing. Each cancellation (including pending ones) counts toward the quota: at most 3 per 7 days and 10 per 30 days.',
      live: {
        vi: 'Bản chính thức chưa tính điểm uy tín và chưa giới hạn số lần huỷ. Khi tính năng mở, huỷ sát giờ sẽ ảnh hưởng tới điểm của bạn, nên hãy huỷ sớm nhất có thể. Cọc ứng tuyển (nếu có) được hoàn khi bạn huỷ.',
        en: 'The official site does not count reputation points or limit cancellations yet. Once it does, last-minute cancellations will affect your score, so cancel as early as possible. Any application deposit is refunded when you cancel.',
      },
    },
    links: [L.workerCancel, L.workerReputation],
  },
  {
    id: 'cancel-quota',
    category: 'cancel',
    roles: ['worker'],
    questions: {
      vi: ['Hạn mức huỷ ca là gì, được huỷ tối đa mấy lần?', 'het luot huy', 'huy qua nhieu lan', 'con bao nhieu luot huy', 'giới hạn số lần hủy'],
      en: ['What is the cancellation quota?', 'how many times can I cancel', 'out of cancellations'],
    },
    keywords: ['han muc', 'luot huy', 'so lan huy', 'gioi han', 'quota', 'cancellation quota'],
    answer: {
      vi: 'Bản demo: tối đa 3 lần huỷ trong 7 ngày và 10 lần trong 30 ngày. Điểm uy tín 80–94 được 4 lần / tuần, 12 lần / tháng; điểm 95–100 được 5 lần / tuần, 14 lần / tháng. Hết lượt thì không huỷ được cho tới khi lượt cũ ra khỏi cửa sổ 7 / 30 ngày.',
      en: 'Demo: at most 3 cancellations per 7 days and 10 per 30 days. Reputation 80–94 gets 4 / week and 12 / month; 95–100 gets 5 / week and 14 / month. Once used up, you cannot cancel until older ones leave the 7 / 30-day window.',
      live: {
        vi: 'Bản chính thức chưa giới hạn số lần huỷ. Quy tắc vẫn là: còn hơn 3 giờ trước ca thì tự huỷ; trong vòng 3 giờ cần nhà tuyển dụng đồng ý. Hạn mức huỷ sẽ áp dụng khi tính năng điểm uy tín mở.',
        en: 'The official site has no cancellation limit yet. The rule stays: more than 3 hours before start you cancel yourself; within 3 hours the employer must agree. A quota will apply once reputation points launch.',
      },
    },
    links: [L.guideQuota, L.workerCancel],
  },
  {
    id: 'cancel-by-employer',
    category: 'cancel',
    roles: ['worker'],
    questions: {
      vi: ['Nhà tuyển dụng huỷ ca của tôi thì sao?', 'ntd huy ca', 'ca bi huy boi chu quan', 'ca bị huỷ có được bồi thường không', 'quán huỷ ca sát giờ'],
      en: ['What if the employer cancels my shift?', 'shift cancelled by employer', 'compensation for cancelled shift'],
    },
    keywords: ['ntd huy', 'nha tuyen dung huy', 'ca bi huy', 'boi thuong', 'cancelled by employer'],
    answer: {
      vi: 'Nhà tuyển dụng chỉ huỷ được khi còn hơn 6 giờ nữa mới bắt đầu, nếu ca đã có người ứng tuyển, và phải ghi lý do. Ca bị huỷ thì bạn không bị trừ gì; bản demo còn cộng lại tối đa 2 điểm uy tín và trả lại 1 lượt huỷ trong tuần cho người đã được duyệt.',
      en: 'Employers can only cancel more than 6 hours before start if anyone has applied, and must give a reason. You lose nothing when a shift is cancelled; in the demo, approved workers also get up to 2 reputation points back and 1 weekly cancellation refunded.',
      live: {
        vi: 'Nhà tuyển dụng chỉ huỷ được khi còn hơn 6 giờ nữa mới bắt đầu, nếu ca đã có người ứng tuyển, và phải ghi lý do. Ca bị huỷ thì bạn không bị trừ gì, cọc ứng tuyển (nếu có) được hoàn đủ; trạng thái ca đổi thành "Đã hủy" trên trang Tổng quan.',
        en: 'Employers can only cancel more than 6 hours before start if anyone has applied, and must give a reason. You lose nothing and any application deposit is refunded in full; the shift shows as "Cancelled" on your Dashboard.',
      },
    },
    links: [L.workerCancel],
  },
  {
    id: 'reputation-what',
    category: 'reputation',
    roles: ['worker', 'employer'],
    questions: {
      vi: ['Điểm uy tín là gì, tính như thế nào?', 'vì sao bị trừ điểm uy tín', 'diem uy tin cong tru ra sao', 'cach tinh diem uy tin', 'uy tín 100 điểm', 'diem uy tin de lam gi'],
      en: ['What is the reputation score?', 'how is reputation calculated', 'reputation points'],
    },
    keywords: ['diem uy tin', 'uy tin', 'cong diem', 'tru diem uy tin', 'tinh diem', 'reputation', 'score'],
    answer: {
      vi: 'Mọi người lao động bắt đầu với 100 điểm (tối đa 100). Hoàn thành ca +5, huỷ trong 24 giờ trước ca −10, vắng mặt không báo −20. Từ 80 điểm được thêm lượt huỷ mỗi tuần; dưới 50 điểm bị tạm khoá ứng tuyển (bản demo).',
      en: 'Every worker starts at 100 points (max 100). Completed shift +5, cancelling within 24 hours −10, no-show −20. From 80 you get extra weekly cancellations; below 50 you cannot apply (demo).',
      live: {
        vi: 'Bản chính thức chưa tính điểm uy tín (tính năng "Sắp có"). Khi mở, điểm cộng trừ theo lịch sử ca: hoàn thành +5, huỷ trong 24 giờ trước ca −10, vắng mặt không báo −20. Hiện nhà tuyển dụng xem số sao trung bình, số ca bạn đã làm với họ và số lần vắng mặt.',
        en: 'The official site does not count reputation yet ("Coming soon"). Once live: completed +5, cancelling within 24 hours −10, no-show −20. Today employers see your average stars, shifts done with them and no-shows.',
      },
    },
    links: [L.workerReputation],
  },
  {
    id: 'reputation-low',
    category: 'reputation',
    roles: ['worker'],
    questions: {
      vi: ['Điểm uy tín dưới 50 bị khoá ứng tuyển thì làm sao?', 'diem uy tin thap qua', 'bi khoa ung tuyen vi diem', 'tang diem uy tin bang cach nao', 'lay lai diem uy tin'],
      en: ['My reputation is below 50', 'how do I raise my reputation', 'blocked from applying due to score'],
    },
    keywords: ['diem thap', 'duoi 50', 'tang diem', 'phuc hoi', 'khoa ung tuyen', 'low reputation', 'raise score'],
    answer: {
      vi: 'Bản demo: dưới 50 điểm thì không ứng tuyển ca mới cho tới khi điểm phục hồi. Điểm tăng +5 mỗi ca được xác nhận hoàn thành. Nếu điểm bị trừ do ghi nhận sai (ví dụ vắng mặt oan), liên hệ đội hỗ trợ; quản trị viên có thể điều chỉnh kèm lý do.',
      en: 'Demo: below 50 you cannot apply to new shifts until it recovers. Each confirmed completed shift adds +5. If points were taken by mistake (e.g. a wrong no-show), contact support; admins can adjust with a reason.',
      live: {
        vi: 'Bản chính thức chưa dùng điểm uy tín để chặn ứng tuyển. Điều giúp bạn được duyệt là đánh giá sao tốt, làm đủ ca và không vắng mặt. Nếu thấy ghi nhận vắng mặt chưa đúng, liên hệ đội hỗ trợ CaLẻ.',
        en: 'The official site does not use reputation to block applications. What helps you get approved is good star reviews, completed shifts and no no-shows. If a no-show record looks wrong, contact CaLẻ support.',
      },
    },
    links: [L.workerReputation, L.support],
  },
  {
    id: 'reputation-employer-sees',
    category: 'reputation',
    roles: ['worker'],
    questions: {
      vi: ['Nhà tuyển dụng nhìn thấy gì về tôi khi duyệt đơn?', 'ntd xem duoc thong tin gi cua minh', 'ho so cua toi hien gi', 'ai xem duoc ho so', 'chủ quán biết gì về mình'],
      en: ['What do employers see when reviewing me?', 'what is on my applicant card', 'who sees my profile'],
    },
    keywords: ['ntd thay gi', 'the ung vien', 'ho so cong khai', 'duyet ban', 'employer sees', 'applicant card'],
    answer: {
      vi: 'Khi duyệt, nhà tuyển dụng thấy điểm uy tín, số ca đã hoàn thành, điểm sao trung bình, cấp kỹ năng và giấy tờ đã xác minh, cùng lời giới thiệu và kỹ năng bạn điền. Khu vực ưa thích chỉ bạn thấy.',
      en: 'When reviewing, employers see your reputation, completed shifts, average stars, skill levels and verified documents, plus your bio and skills. Preferred areas are visible only to you.',
      live: {
        vi: 'Khi duyệt, nhà tuyển dụng thấy số ca bạn đã làm với họ, số lần vắng mặt ở ca của họ, điểm sao trung bình, lời giới thiệu và loại việc bạn muốn làm. Khu vực ưa thích chỉ bạn thấy; ảnh CCCD chỉ quản trị viên xem.',
        en: 'When reviewing, employers see shifts you did with them, no-shows on their shifts, your average stars, bio and preferred job types. Preferred areas are visible only to you; ID photos only to admins.',
      },
    },
    links: [L.workerReputation, L.workerProfile],
  },
  {
    id: 'skills-level',
    category: 'reputation',
    roles: ['worker'],
    questions: {
      vi: ['Cấp kỹ năng được tính thế nào, lên cấp ra sao?', 'cay cap ky nang', 'xp la gi', 'level ky nang', 'lên level nhanh'],
      en: ['How do skill levels work?', 'how to level up', 'what is XP'],
    },
    keywords: ['cap ky nang', 'len cap', 'xp', 'level', 'cay cap', 'skill level', 'level up'],
    answer: {
      vi: 'Mỗi loại việc có cấp riêng (1–5) theo điểm kinh nghiệm: mỗi ca hoàn thành +10, đánh giá 5 sao +5, 4 sao +3, ca không tranh chấp +2; ca vắng mặt / tranh chấp không được điểm. Mốc: cấp 2 từ 50, cấp 3 từ 120, cấp 4 từ 250, cấp 5 từ 500 điểm.',
      en: 'Each job type has its own level (1–5) based on XP: +10 per completed shift, +5 for a 5-star review, +3 for 4 stars, +2 if no dispute; no-shows / disputes earn nothing. Thresholds: level 2 at 50, 3 at 120, 4 at 250, 5 at 500 XP.',
      live: {
        vi: 'Cấp kỹ năng theo từng loại việc là tính năng "Sắp có" ở bản chính thức. Hiện nhà tuyển dụng xem số sao trung bình và số ca bạn đã làm với họ.',
        en: 'Per-job-type skill levels are "Coming soon" on the official site. Today employers see your average stars and shifts done with them.',
      },
    },
    links: [L.workerReputation],
  },
];

// ---------------------------------------------------------------------------
// Đi làm: check-in / check-out / vắng mặt / trạng thái ca
// ---------------------------------------------------------------------------

const ATTENDANCE: SupportEntry[] = [
  {
    id: 'checkin-how',
    category: 'attendance',
    roles: ['worker'],
    questions: {
      vi: ['Check-in ca làm như thế nào?', 'cach checkin', 'diem danh khi den noi', 'bấm check in ở đâu', 'tới quán rồi bấm gì'],
      en: ['How do I check in?', 'where is the check-in button', 'clock in'],
    },
    keywords: ['check in', 'checkin', 'diem danh', 'cham cong', 'den noi', 'clock in'],
    answer: {
      vi: 'Tới nơi làm, bạn mở trang Tổng quan (hoặc chi tiết ca) và bấm "Check-in". Nút hiện từ 15 phút trước giờ bắt đầu tới 15 phút sau giờ bắt đầu. Check-in ghi nhận theo giờ bấm trên CaLẻ, không dùng GPS hay QR.',
      en: 'When you arrive, open your Dashboard (or the shift page) and tap "Check-in". The button is available from 15 minutes before to 15 minutes after the start time. Check-in records the time you tap; it does not use GPS or QR.',
    },
    links: [L.workerDash],
  },
  {
    id: 'checkin-window',
    category: 'attendance',
    roles: ['worker'],
    questions: {
      vi: ['Check-in sớm hoặc muộn được tối đa bao nhiêu phút?', 'den som check in duoc khong', 'check in som nhat truoc may phut', 'khung gio check in', 'sao chua bam check in duoc'],
      en: ['How early or late can I check in?', 'check-in window', 'can’t check in yet'],
    },
    keywords: ['som', 'muon nhat', 'truoc gio', 'khung gio', 'chua check in duoc', 'check in window', 'early', 'late'],
    answer: {
      vi: 'Bạn check-in được trong khoảng từ 15 phút trước tới 15 phút sau giờ bắt đầu ca. Đến sớm hơn thì chờ tới mốc 15 phút trước giờ. Quá 15 phút sau giờ bắt đầu thì không tự check-in được nữa: báo ngay cho nhà tuyển dụng để họ xác nhận có mặt.',
      en: 'You can check in from 15 minutes before to 15 minutes after the start time. If early, wait until 15 minutes before. More than 15 minutes late, you can no longer check in yourself: tell the employer right away so they can mark you present.',
    },
    links: [L.workerDash],
  },
  {
    id: 'checkin-missed',
    category: 'attendance',
    roles: ['worker'],
    questions: {
      vi: ['Quên check-in hoặc đến muộn quá giờ check-in thì sao?', 'quen bam check in', 'qua gio checkin', 'trễ quá 15 phút chưa check-in', 'đến trễ có bị tính vắng không', 'den muon thi lam sao'],
      en: ['I forgot to check in', 'I arrived late', 'missed the check-in window'],
    },
    keywords: ['quen check in', 'den muon', 'den tre', 'tre', 'qua gio', 'missed check in', 'arrived late', 'forgot'],
    answer: {
      vi: 'Nhà tuyển dụng có thể "Xác nhận có mặt" cho bạn ngay tại chỗ, kể cả khi bạn chưa tự check-in. Nếu lỡ bị đánh dấu vắng vì đến muộn, họ có nút "Đến muộn - chuyển sang có mặt". Hãy báo cho nhà tuyển dụng (nhắn tin trong ca) ngay khi tới nơi.',
      en: 'The employer can "Mark present" for you on site even if you did not check in. If you were marked absent for arriving late, they can use "Arrived late - mark present". Tell the employer (message them in the shift) as soon as you arrive.',
    },
    links: [L.workerDash],
  },
  {
    id: 'checkin-gps',
    category: 'attendance',
    questions: {
      vi: ['Check-in có dùng GPS hay quét QR không?', 'co dinh vi khong', 'chống gian lận check in thế nào', 'check in o nha duoc khong', 'co theo doi vi tri khong'],
      en: ['Does check-in use GPS or QR?', 'is my location tracked', 'anti-cheating check-in'],
    },
    keywords: ['gps', 'dinh vi', 'vi tri', 'qr', 'gian lan', 'location', 'tracking'],
    answer: {
      vi: 'Không. Check-in / check-out trên CaLẻ ghi nhận theo giờ bạn bấm, không dùng GPS hay mã QR và không theo dõi vị trí. Vì vậy nhà tuyển dụng có thêm bước xác nhận có mặt và xác nhận hoàn thành; chỉ check-in khi bạn đã thật sự tới nơi.',
      en: 'No. Check-in / check-out on CaLẻ records the time you tap; there is no GPS, no QR and no location tracking. That is why employers also confirm presence and completion; only check in once you have actually arrived.',
    },
    links: [L.guide],
  },
  {
    id: 'checkout-how',
    category: 'attendance',
    roles: ['worker'],
    questions: {
      vi: ['Khi nào thì check-out được?', 'cach check out', 'lam xong bam check out o dau', 'check-out sau giờ kết thúc', 've som check out duoc khong'],
      en: ['When can I check out?', 'how to check out', 'no check-out button'],
    },
    keywords: ['check out', 'checkout', 'ket thuc ca', 've som', 'clock out'],
    answer: {
      vi: 'Nút "Check-out" chỉ hiện sau giờ kết thúc ca và chỉ khi bạn đã tự bấm check-in. Nếu nhà tuyển dụng đã xác nhận có mặt cho bạn, bạn vẫn cần tự bấm "Check-in" (xác nhận đã có mặt) trước khi check-out. Check-out không làm ca kết thúc sớm; tuỳ ca, bạn có thể phải tích checklist hoặc ghi chú bàn giao.',
      en: 'The "Check-out" button appears only after the shift end time and only if you checked in yourself. If the employer marked you present, you still need to tap "Check-in" (confirm you are there) before checking out. Checking out does not end a shift early; depending on the shift, you may need to tick a checklist or add a handover note.',
    },
    links: [L.workerDash, L.hbEvidence],
  },
  {
    id: 'checkout-late',
    category: 'attendance',
    roles: ['worker'],
    questions: {
      vi: ['Quên check-out sau ca thì có sao không?', 'quen bam check out', 'check out muon', 'het ca lau roi moi check out', 'quá giờ chưa check-out'],
      en: ['I forgot to check out', 'late check-out', 'checking out hours later'],
    },
    keywords: ['quen check out', 'check out muon', 'tre', '60 phut', 'late checkout', 'forgot checkout'],
    answer: {
      vi: 'Nút check-out vẫn mở sau giờ kết thúc, không bị khoá; quá 60 phút thì hiển thị là check-out muộn. Hãy check-out ngay khi nhớ ra. Nhà tuyển dụng vẫn có thể xác nhận hoàn thành cho bạn.',
      en: 'Check-out stays open after the end time, it is never locked; after 60 minutes it is shown as a late check-out. Check out as soon as you remember. The employer can still confirm your completion.',
      live: {
        vi: 'Nút check-out vẫn mở sau giờ kết thúc; quá 60 phút thì hiển thị là check-out muộn. Hãy check-out ngay khi nhớ ra. Nếu nhà tuyển dụng không xác nhận, hệ thống tự chốt khoảng 24 giờ sau ca: người đã check-in vẫn được trả công.',
        en: 'Check-out stays open after the end time; after 60 minutes it is shown as late. Check out as soon as you remember. If the employer does not confirm, the system settles about 24 hours after the shift: workers who checked in are still paid.',
      },
    },
    links: [L.workerDash],
  },
  {
    id: 'checkout-evidence',
    category: 'attendance',
    roles: ['worker', 'employer'],
    questions: {
      vi: ['Bằng chứng khi check-out gồm những mức nào?', 'làm xong có phải chụp ảnh không', 'phai chup anh ban giao khong', 'checklist hoan thanh la gi', 'ghi chu ban giao', 'muc bang chung cua ca'],
      en: ['What are the check-out evidence levels?', 'do I need a handover photo', 'completion checklist'],
    },
    keywords: ['bang chung', 'anh ban giao', 'chup anh', 'checklist', 'ghi chu ban giao', 'muc bang chung', 'evidence', 'handover photo'],
    answer: {
      vi: 'Nhà tuyển dụng chọn 1 trong 5 mức bằng chứng khi đăng ca, ví dụ: không cần bằng chứng, chỉ cần checklist hoàn thành, có thể đính kèm ảnh bàn giao, bắt buộc ảnh bàn giao, hoặc bắt buộc checklist + ghi chú bàn giao. Mức của ca hiện ở trang chi tiết ca, mục "Quy trình thanh toán & bằng chứng". Hiện CaLẻ chưa tải ảnh lên máy chủ: bạn nhập tên tệp ảnh và giữ ảnh trong điện thoại.',
      en: 'Employers pick one of 5 evidence levels when posting, e.g. none, completion checklist only, optional handover photo, required handover photo, or a required checklist + handover note. The level is on the shift page under "Payment & evidence". CaLẻ does not upload photos yet: enter the photo file name and keep the photo on your phone.',
    },
    links: [L.hbEvidence, L.hbEmployerEvidence],
  },
  {
    id: 'noshow-worker',
    category: 'attendance',
    roles: ['worker'],
    questions: {
      vi: ['Không đi làm mà không báo thì bị gì?', 'bom ca thi sao', 'vang mat khong bao', 'không đến ca có bị phạt không', 'nghỉ không xin phép'],
      en: ['What happens if I don’t show up?', 'no-show penalty', 'skipping a shift'],
    },
    keywords: ['vang mat', 'bom ca', 'khong den', 'no show', 'khong bao', 'skip'],
    answer: {
      vi: 'Không đến mà không báo (quá 15 phút sau giờ bắt đầu chưa check-in) sẽ bị tính vắng mặt: không nhận tiền công và bị trừ 20 điểm uy tín. Nếu không đi được, hãy huỷ sớm theo quy định huỷ ca.',
      en: 'Not showing up without notice (no check-in 15 minutes after start) counts as a no-show: no wage and −20 reputation points. If you cannot go, cancel early following the cancellation rules.',
      live: {
        vi: 'Không đến mà không báo sẽ bị tính vắng mặt và không nhận tiền công. Nếu bạn đã đặt cọc khi ứng tuyển, cọc chuyển cho nhà tuyển dụng sau thời gian chờ xử lý (một số trường hợp do quản trị viên xem xét); thấy ghi nhận chưa đúng thì liên hệ đội hỗ trợ CaLẻ. Nếu không đi được, hãy huỷ sớm theo quy định huỷ ca.',
        en: 'Not showing up without notice counts as a no-show and you get no wage. If you paid an application deposit, it goes to the employer after a processing period (some cases are reviewed by an admin); if the record looks wrong, contact CaLẻ support. If you cannot go, cancel early following the cancellation rules.',
      },
    },
    links: [L.workerCancel],
  },
  {
    id: 'noshow-wrong',
    category: 'attendance',
    roles: ['worker'],
    questions: {
      vi: ['Tôi bị đánh dấu vắng mặt oan thì làm sao?', 'di lam roi ma bi danh vang', 'bi ghi nhan vang mat sai', 'khieu nai vang mat', 'có làm mà bị tính vắng'],
      en: ['I was wrongly marked as a no-show', 'marked absent but I worked', 'dispute a no-show'],
    },
    keywords: ['vang mat oan', 'danh vang', 'ghi nhan sai', 'khieu nai vang mat', 'wrong no show', 'marked absent'],
    answer: {
      vi: 'Trước hết nhắn nhà tuyển dụng: nếu bạn chỉ đến muộn, họ có thể bấm "Đến muộn - chuyển sang có mặt". Nếu vẫn không được, mở "Khiếu nại" trong chi tiết ca (bản demo), kèm giờ đến, ảnh màn hình, ảnh bàn giao nếu có; quản trị viên xem giải trình hai bên.',
      en: 'First message the employer: if you were just late, they can tap "Arrived late - mark present". If not resolved, open "Dispute" on the shift page (demo) with your arrival time, screenshots and handover photos; an admin reviews both sides.',
      live: {
        vi: 'Trước hết nhắn nhà tuyển dụng: nếu bạn chỉ đến muộn, họ có thể bấm "Đến muộn - chuyển sang có mặt". Nếu thấy ghi nhận vẫn chưa đúng, bạn liên hệ đội hỗ trợ CaLẻ qua email, ghi mã ca, giờ đến và gửi kèm ảnh màn hình / ảnh bàn giao.',
        en: 'First message the employer: if you were just late, they can tap "Arrived late - mark present". If it still looks wrong, contact CaLẻ support by email with the shift code, your arrival time and screenshots / handover photos.',
      },
    },
    links: [L.support, L.disputes],
  },
  {
    id: 'shift-status-labels',
    category: 'attendance',
    questions: {
      vi: ['Các trạng thái ca như Sắp bắt đầu, Chờ xác nhận nghĩa là gì?', 'trang thai ca nghia la gi', 'cho check out la sao', 'ca hết hạn là gì', 'trạng thái ghi trên ca nghĩa là gì', 'nhan dang dien ra mau xanh'],
      en: ['What do the shift statuses mean?', 'awaiting confirmation meaning', 'status labels'],
    },
    keywords: ['trang thai ca', 'dang tuyen', 'sap bat dau', 'dang dien ra', 'cho check out', 'cho xac nhan', 'da hoan thanh', 'da het han', 'dang khieu nai', 'status', 'labels'],
    answer: {
      vi: 'Mỗi ca có một nhãn thống nhất ở mọi trang: Bản nháp, Chờ giữ cọc, Đang tuyển, Sắp bắt đầu, Đang diễn ra, Chờ check-out, Chờ xác nhận, Đã hoàn thành, Đã hết hạn, Đã hủy, Đang khiếu nại. Ca chuyển sang "Đang diễn ra" và kết thúc đúng theo giờ trên ca.',
      en: 'Every shift has one consistent label on all pages: Draft, Awaiting deposit, Hiring, Starting soon, In progress, Awaiting check-out, Awaiting confirmation, Completed, Expired, Cancelled, In dispute. A shift moves to "In progress" and ends strictly by its scheduled times.',
    },
    links: [L.guide],
  },
  {
    id: 'shift-not-started',
    category: 'attendance',
    questions: {
      vi: ['Đã check-in rồi sao ca vẫn chưa chuyển sang Đang diễn ra?', 'check in xong ca van sap bat dau', 'ca chua bat dau du da diem danh', 'sao ca chưa chạy', 'trạng thái ca không đổi sau khi check in'],
      en: ['I checked in but the shift is not In progress yet', 'status did not change after check-in'],
    },
    keywords: ['chua dang dien ra', 'trang thai khong doi', 'chua bat dau', 'theo dong ho', 'not in progress', 'status unchanged'],
    answer: {
      vi: 'Trạng thái ca chỉ đổi theo đồng hồ: ca chuyển sang "Đang diễn ra" đúng giờ bắt đầu và kết thúc đúng giờ kết thúc. Check-in sớm hay nhà tuyển dụng xác nhận có mặt chỉ ghi nhận bạn đã tới, không đẩy ca bắt đầu sớm. Nếu vẫn thấy sai, tải lại trang.',
      en: 'Shift status follows the clock only: it becomes "In progress" at the start time and ends at the end time. Checking in early or being marked present only records your arrival; it does not start the shift early. If it still looks wrong, reload the page.',
    },
    links: [L.workerDash],
  },
];

// ---------------------------------------------------------------------------
// Tiền công (người lao động)
// ---------------------------------------------------------------------------

const PAY: SupportEntry[] = [
  {
    id: 'pay-when',
    category: 'pay',
    roles: ['worker'],
    questions: {
      vi: ['Làm xong ca bao lâu thì nhận được tiền công?', 'khi nao co luong', 'bao gio nhan tien cong', 'tien cong ve vi luc nao', 'tiền lương về tài khoản ví khi nào', 'lam xong co tien lien khong', 'làm xong ca thì bao lâu được trả tiền', 'lương trả khi nào'],
      en: ['When do I get paid after a shift?', 'when does my wage arrive', 'payout timing'],
    },
    keywords: ['nhan tien', 'tien cong', 'tien luong', 'tien luong ve vi', 'luong', 'tra cong', 've vi', 'get paid', 'payout', 'wage'],
    answer: {
      vi: 'Sau khi bạn check-out và nhà tuyển dụng xác nhận hoàn thành, tiền công được ghi vào ví và hiện ở mục "Tổng thu nhập" trên trang Tổng quan. Đây là bản demo nên mọi khoản tiền đều là mô phỏng.',
      en: 'After you check out and the employer confirms completion, the wage is recorded in your wallet and shown under "Total income" on your Dashboard. This is the demo, so all money is simulated.',
      live: {
        vi: 'Ngay khi nhà tuyển dụng xác nhận bạn hoàn thành ca, tiền công được chuyển vào ví CaLẻ của bạn và bạn rút về ngân hàng bất cứ lúc nào. Nếu nhà tuyển dụng không xác nhận, hệ thống tự xác nhận sau 24 giờ kể từ khi ca kết thúc (người đã check-in được trả công).',
        en: 'As soon as the employer confirms your completed shift, the wage goes into your CaLẻ wallet and you can withdraw to your bank any time. If the employer does not confirm, the system confirms automatically 24 hours after the shift ends (workers who checked in are paid).',
      },
    },
    links: [L.workerDash, L.forWorkers],
  },
  {
    id: 'pay-auto-confirm',
    category: 'pay',
    questions: {
      vi: ['Nhà tuyển dụng không bấm xác nhận hoàn thành thì sao?', 'ntd quen xac nhan', 'tu dong xac nhan sau bao lau', 'hệ thống tự chốt ca', 'chu quan khong xac nhan thi co duoc tra luong khong'],
      en: ['What if the employer never confirms?', 'auto confirmation', 'automatic settlement'],
    },
    keywords: ['tu chot', 'tu dong xac nhan', 'khong xac nhan', 'quen xac nhan', '24 gio', 'auto confirm', 'auto settle'],
    answer: {
      vi: 'Bản demo: nếu nhà tuyển dụng không xác nhận, hệ thống tự xác nhận 12 giờ sau khi người lao động check-out (mô phỏng). Có vấn đề với ca thì liên hệ đội hỗ trợ CaLẻ trước khi hệ thống tự xác nhận.',
      en: 'Demo: if the employer does not confirm, the system confirms automatically 12 hours after the worker checks out (simulated). If there is a problem with the shift, contact CaLẻ support before that happens.',
      live: {
        vi: 'Nếu không ai bấm, hệ thống tự chốt khoảng 24 giờ sau giờ kết thúc ca: người đã check-in hoặc được xác nhận có mặt được trả công, người được duyệt mà không ai ghi nhận có mặt bị tính vắng mặt. Có vấn đề thì liên hệ đội hỗ trợ CaLẻ trước khi hệ thống tự chốt.',
        en: 'If nobody confirms, the system settles about 24 hours after the shift end: workers who checked in or were marked present are paid, approved workers with no recorded presence count as no-shows. If there is a problem, contact CaLẻ support before auto-settlement.',
      },
    },
    links: [L.hbDeposit, L.support],
  },
  {
    id: 'pay-wage-calc',
    category: 'pay',
    questions: {
      vi: ['Tiền công một ca được tính như thế nào?', 'làm một ca thì được bao nhiêu tiền', 'luong theo gio tinh sao', 'tong tien ca la gi', 'ca 4 tieng 45k thi duoc bao nhieu', 'cách tính lương ca'],
      en: ['How is the wage for a shift calculated?', 'hourly pay calculation', 'total shift pay'],
    },
    keywords: ['tinh luong', 'luong theo gio', 'tong tien', 'tien cong ca', 'so gio', 'cach tinh', 'hourly', 'calculation', 'total pay'],
    answer: {
      vi: 'Tiền công = lương theo giờ × số giờ của ca; tổng tiền cả ca ghi ngay trên ca trước khi bạn ứng tuyển. Ví dụ ca 4 giờ, 45.000đ mỗi giờ thì bạn nhận 180.000đ. Với nhà tuyển dụng, tổng tiền công của ca = lương theo giờ × số giờ × số người cần.',
      en: 'Wage = hourly rate × shift hours; the total shift pay is shown on the shift before you apply. E.g. a 4-hour shift at 45.000đ per hour pays 180.000đ. For employers, total wages = hourly rate × hours × people needed.',
    },
    links: [L.shifts, L.guideIncome],
  },
  {
    id: 'pay-fee-worker',
    category: 'pay',
    roles: ['worker', 'guest'],
    questions: {
      vi: ['Người lao động có mất phí gì không?', 'cale co thu phi nld khong', 'co bi tru phan tram luong khong', 'phải đóng tiền trước khi đi làm không', 'có phải đóng phí để nhận việc không', 'phí đăng ký người lao động'],
      en: ['Do workers pay any fees?', 'is it free for workers', 'do you take a cut of my wage'],
    },
    keywords: ['mat phi', 'thu phi', 'dong phi', 'mien phi', 'phi', 'tru phan tram', 'tra truoc', 'free', 'fees', 'commission'],
    answer: {
      vi: 'Không. Người lao động không phải nộp phí đăng ký, khoản trả trước hay phí ẩn nào; tìm ca và ứng tuyển miễn phí. Mọi tiền cọc đều do nhà tuyển dụng giữ trước khi ca được công khai. Bản demo: mọi khoản tiền đều là mô phỏng.',
      en: 'No. Workers pay no sign-up fee, upfront payment or hidden fee; finding and applying for shifts is free. Deposits are held by the employer before a shift goes public. Demo: all money is simulated.',
      live: {
        vi: 'Không. Tìm ca, ứng tuyển và nhận tiền công đều miễn phí; bạn nhận đủ số tiền ghi trên ca và CaLẻ không thu phí rút tiền. Riêng khi CaLẻ áp dụng cọc ứng tuyển, khoản cọc nhỏ này được hoàn đủ khi ca hoàn thành hoặc khi bạn không được chọn.',
        en: 'No. Finding shifts, applying and getting paid are free; you receive the full amount shown and CaLẻ charges no withdrawal fee. When CaLẻ applies an application deposit, that small amount is refunded in full when the shift completes or you are not selected.',
      },
    },
    links: [L.pricing, L.faq],
  },
  {
    id: 'pay-total-income',
    category: 'pay',
    roles: ['worker'],
    questions: {
      vi: ['Ô "Tổng thu nhập" và "Ca đã hoàn thành" trên trang Tổng quan tính thế nào?', 'tong thu nhap khong tang', 'ca da hoan thanh hien sai', 'thu nhap chua cap nhat', 'so du vi khac tong thu nhap'],
      en: ['How are Total income and Completed shifts counted?', 'income not updated', 'balance differs from total income'],
    },
    keywords: ['tong thu nhap', 'ca da hoan thanh', 'thong ke', 'so du', 'total income', 'completed shifts'],
    answer: {
      vi: '"Tổng thu nhập" là tổng tiền công từ các ca đã được xác nhận (nhà tuyển dụng bấm hoặc hệ thống tự chốt); ca đang diễn ra hoặc chờ xác nhận chưa được tính. "Ca đã hoàn thành" cũng chỉ đếm ca đã xác nhận. Số dư ví mới là số tiền bạn đang có (bản demo: mô phỏng).',
      en: '"Total income" sums wages from confirmed shifts (by the employer or auto-settled); in-progress or awaiting-confirmation shifts are not counted. "Completed shifts" also counts confirmed ones only. Your wallet balance is what you actually hold (demo: simulated).',
      live: {
        vi: '"Tổng thu nhập" là tổng tiền công đã vào ví từ các ca đã được xác nhận; ca đang diễn ra hoặc chờ xác nhận chưa được tính. "Ca đã hoàn thành" cũng chỉ đếm ca đã xác nhận. Số dư ví là số tiền bạn đang có và rút được.',
        en: '"Total income" sums wages paid into your wallet from confirmed shifts; in-progress or awaiting-confirmation shifts are not counted. "Completed shifts" counts confirmed ones only. Your wallet balance is what you hold and can withdraw.',
      },
    },
    links: [L.guideIncome, L.workerDash],
  },
  {
    id: 'pay-guarantee',
    category: 'pay',
    roles: ['worker', 'guest'],
    questions: {
      vi: ['Làm xong có chắc được trả lương không, lỡ quán quỵt tiền thì sao?', 'so bi quyt luong', 'ntd khong tra tien thi sao', 'tien cong da co san chua', 'đảm bảo nhận được tiền không'],
      en: ['How do I know I will be paid?', 'what if the employer doesn’t pay', 'is the wage held in advance'],
    },
    keywords: ['quyt', 'quyt luong', 'khong tra', 'giu san', 'dam bao', 'chac chan', 'unpaid', 'held in advance'],
    answer: {
      vi: 'Ca chỉ hiện cho người lao động khi nhà tuyển dụng đã giữ cọc tiền công trên CaLẻ (bản demo: mô phỏng). Làm xong, tiền công từ khoản giữ đó được ghi vào ví khi ca được xác nhận. Có vấn đề thì liên hệ đội hỗ trợ CaLẻ.',
      en: 'A shift only appears once the employer has held the wages on CaLẻ (demo: simulated). After the shift, the wage comes from that hold into your wallet once confirmed. If something goes wrong, contact the CaLẻ support team.',
      live: {
        vi: 'Ca chỉ hiện cho người lao động khi tiền công đã được giữ sẵn trên CaLẻ từ ví nhà tuyển dụng. Làm xong, nhà tuyển dụng xác nhận là tiền công vào ví của bạn; không ai bấm thì hệ thống tự chốt sau 24 giờ và người đã check-in được trả công. Có vấn đề thì liên hệ đội hỗ trợ CaLẻ.',
        en: 'A shift only appears once its wages are already held on CaLẻ from the employer’s wallet. After work, the employer confirms and the wage lands in your wallet; if nobody does, the system settles after 24 hours and checked-in workers are paid. If something is wrong, contact CaLẻ support.',
      },
    },
    links: [L.forWorkers, L.support],
  },
  {
    id: 'pay-cash',
    category: 'pay',
    questions: {
      vi: ['Nhận tiền mặt trực tiếp từ quán được không?', 'tra luong tien mat', 'ntd muon tra tien mat ngoai app', 'chuyển khoản riêng cho nhau được không', 'trả lương ngoài cale'],
      en: ['Can I be paid in cash directly?', 'pay outside the app', 'private bank transfer'],
    },
    keywords: ['tien mat', 'ngoai app', 'ngoai luong', 'chuyen khoan rieng', 'cash', 'outside the app'],
    answer: {
      vi: 'Không nên. CaLẻ chỉ ghi nhận tiền công trả trong ứng dụng; "yêu cầu / hứa thanh toán ngoài luồng nền tảng" bị cấm theo Điều khoản. Nếu trả hoặc nhận tiền ngoài CaLẻ, giao dịch đó không được ghi nhận và CaLẻ không xử lý được tranh chấp cho nó.',
      en: 'Please don’t. CaLẻ only records wages paid in the app; asking for or promising off-platform payment is prohibited by the Terms. Money paid outside CaLẻ is not recorded and CaLẻ cannot resolve disputes about it.',
    },
    links: [L.safety, L.terms],
  },
  {
    id: 'pay-not-received',
    category: 'pay',
    roles: ['worker'],
    questions: {
      vi: ['Làm xong ca rồi mà chưa nhận được tiền công?', 'chua thay tien cong ve vi', 'tien cong bi thieu', 'nhận sai số tiền lương', 'khong duoc tra luong'],
      en: ['I finished but haven’t been paid', 'wage missing', 'wrong wage amount'],
    },
    keywords: ['chua nhan', 'chua co tien', 'chua thay tien cong', 'thieu tien', 'sai tien', 'khong duoc tra', 'not paid', 'missing wage', 'wrong amount'],
    answer: {
      vi: 'Kiểm tra trạng thái ca: nếu còn "Chờ xác nhận", tiền công chưa được ghi. Nhắc nhà tuyển dụng bấm "Xác nhận hoàn thành". Nếu đã xác nhận mà số tiền sai hoặc thiếu, mở "Khiếu nại" trong chi tiết ca (bản demo) hoặc liên hệ đội hỗ trợ kèm mã ca.',
      en: 'Check the shift status: while "Awaiting confirmation", no wage is recorded yet. Remind the employer to tap "Confirm completion". If confirmed but the amount is wrong, open "Dispute" on the shift page (demo) or contact support with the shift code.',
      live: {
        vi: 'Kiểm tra trạng thái ca: nếu còn "Chờ xác nhận", tiền công chưa vào ví; hệ thống tự chốt khoảng 24 giờ sau giờ kết thúc nếu nhà tuyển dụng không bấm. Đã xác nhận mà không thấy tiền hoặc số tiền sai, xem lịch sử giao dịch ví rồi liên hệ đội hỗ trợ CaLẻ kèm mã ca.',
        en: 'Check the shift status: while "Awaiting confirmation" the wage is not in your wallet yet; the system settles about 24 hours after the end if the employer does nothing. If confirmed but missing or wrong, check your wallet history and contact CaLẻ support with the shift code.',
      },
    },
    links: [L.workerDash, L.support],
  },
];

// ---------------------------------------------------------------------------
// Cọc người lao động (chỉ bản chính thức, quản trị viên bật / tắt)
// ---------------------------------------------------------------------------

const WORKER_DEPOSIT: SupportEntry[] = [
  {
    id: 'wdeposit-what',
    category: 'worker-deposit',
    roles: ['worker'],
    questions: {
      vi: ['Ứng tuyển có phải đặt cọc không?', 'coc ung tuyen la gi', 'sao ung tuyen bi doi coc', 'nld phai dat coc bao nhieu', 'tiền cọc khi nhận ca'],
      en: ['Do I have to pay a deposit to apply?', 'application deposit', 'why is there a deposit'],
    },
    keywords: ['coc ung tuyen', 'dat coc', 'tien coc', 'coc nguoi lao dong', 'application deposit', 'deposit to apply'],
    answer: {
      vi: 'Bản demo không có cọc người lao động: chỉ nhà tuyển dụng giữ cọc tiền công (mô phỏng) trước khi đăng ca.',
      en: 'The demo has no worker deposit: only employers hold the wage deposit (simulated) before posting.',
      live: {
        vi: 'Tuỳ thời điểm. CaLẻ có thể yêu cầu một khoản cọc nhỏ khi ứng tuyển để hạn chế nhận ca rồi bỏ: tối đa 50% tiền công ca, không quá 100.000đ. Số tiền hiện rõ để bạn đồng ý trước khi gửi đơn và được trừ từ ví CaLẻ của bạn; ví không đủ thì nạp thêm, hoặc xác thực CCCD để được miễn. Làm đủ số ca gần đây cũng thường được miễn.',
        en: 'It depends. CaLẻ may ask for a small deposit when you apply, to discourage taking shifts and skipping them: up to 50% of the shift wage, no more than 100.000đ. The amount is shown for you to accept before sending and is taken from your CaLẻ wallet; if it is short, top up or verify your ID to be exempt. Enough recent shifts usually exempts you too.',
      },
    },
    links: [L.forWorkers, L.terms],
  },
  {
    id: 'wdeposit-exempt',
    category: 'worker-deposit',
    roles: ['worker'],
    questions: {
      vi: ['Làm sao để được miễn cọc ứng tuyển?', 'mien coc khi nao', 'không muốn đặt cọc', 'dieu kien mien coc', 'sao toi van bi coc du da xac thuc'],
      en: ['How do I get exempt from the application deposit?', 'deposit exemption', 'still asked for deposit'],
    },
    keywords: ['mien coc', 'dieu kien', 'khong coc', '5 ca', '30 ngay', 'exempt', 'exemption'],
    answer: {
      vi: 'Bản demo không có cọc ứng tuyển nên bạn không cần làm gì.',
      en: 'The demo has no application deposit, so nothing to do.',
      live: {
        vi: 'Bạn được miễn cọc khi đã có CCCD được duyệt, hoặc đã hoàn thành ít nhất 5 ca trong 30 ngày gần nhất. Nếu bị tính vắng mặt trong 30 ngày gần đây, bạn vẫn phải đặt cọc dù đủ điều kiện trên.',
        en: 'You are exempt with an approved ID, or at least 5 completed shifts in the last 30 days. If you had a no-show in the last 30 days, you still need a deposit even if you meet those conditions.',
      },
    },
    links: [L.workerVerify],
  },
  {
    id: 'wdeposit-refund',
    category: 'worker-deposit',
    roles: ['worker'],
    questions: {
      vi: ['Khi nào được hoàn lại tiền cọc ứng tuyển?', 'lay lai coc ung tuyen', 'coc co duoc tra lai khong', 'hoàn cọc nld', 'mat coc khi nao'],
      en: ['When is my application deposit refunded?', 'get my deposit back', 'when do I lose the deposit'],
    },
    keywords: ['hoan coc', 'tra coc', 'lay lai coc', 'mat coc', 'deposit refund', 'lose deposit'],
    answer: {
      vi: 'Bản demo không có cọc ứng tuyển.',
      en: 'The demo has no application deposit.',
      live: {
        vi: 'Cọc hoàn đủ về ví khi ca hoàn thành, khi bạn không được chọn, khi bạn huỷ hoặc ca bị huỷ, hoặc khi ca bắt đầu mà đơn vẫn chờ duyệt. Chỉ khi vắng mặt không báo, cọc mới chuyển cho nhà tuyển dụng, sau thời gian chờ xử lý (một số trường hợp do quản trị viên xem xét); nếu thấy ghi nhận chưa đúng, bạn liên hệ đội hỗ trợ CaLẻ.',
        en: 'The deposit is refunded in full when the shift completes, you are not selected, you or the employer cancel, or the shift starts while still pending. Only a no-show without notice sends it to the employer, after a processing period (some cases are reviewed by an admin); if that record looks wrong, contact CaLẻ support.',
      },
    },
    links: [L.forWorkers, L.support],
  },
  {
    id: 'wdeposit-limit',
    category: 'worker-deposit',
    roles: ['worker'],
    questions: {
      vi: ['Sao báo đã đạt giới hạn khoản cọc, không ứng tuyển thêm được?', 'qua nhieu khoan coc', 'gioi han coc dang giu', 'toi da bao nhieu khoan coc'],
      en: ['It says I reached the deposit limit', 'too many deposits held', 'maximum open deposits'],
    },
    keywords: ['gioi han coc', 'khoan coc', 'toi da 3', 'dang giu', 'deposit limit', 'open deposits'],
    answer: {
      vi: 'Bản demo không có cọc ứng tuyển.',
      en: 'The demo has no application deposit.',
      live: {
        vi: 'Mỗi người lao động có tối đa 3 khoản cọc ứng tuyển đang giữ cùng lúc. Khi một ca hoàn thành, đơn bị từ chối hoặc huỷ, khoản cọc được hoàn và bạn ứng tuyển thêm được. Khoản giữ quá 7 ngày sau hết ca mà đơn chưa kết thúc sẽ được hoàn dự phòng.',
        en: 'Each worker can have at most 3 application deposits held at once. When a shift completes or an application is rejected or cancelled, the deposit is refunded and you can apply again. Holds older than 7 days after the shift with no outcome are refunded as a safeguard.',
      },
    },
    links: [L.workerDash],
  },
];

// ---------------------------------------------------------------------------
// Ví: nạp, rút, lịch sử
// ---------------------------------------------------------------------------

const WALLET: SupportEntry[] = [
  {
    id: 'wallet-overview',
    category: 'wallet',
    roles: ['worker', 'employer'],
    questions: {
      vi: ['Ví tiền ở đâu, xem số dư thế nào?', 'xem so du vi', 'vi cua toi o dau', 'số dư hiện tại', 'vi cale dung de lam gi'],
      en: ['Where is my wallet?', 'check my balance', 'what is the wallet for'],
    },
    keywords: ['vi', 'vi tien', 'so du', 'xem vi', 'wallet', 'balance'],
    answer: {
      vi: 'Ví nằm trên trang Tổng quan của bạn, hiện "Số dư hiện tại" và các giao dịch gần đây. Người lao động nhận tiền công vào ví; nhà tuyển dụng dùng ví để giữ cọc khi đăng ca. Bản demo: số dư và giao dịch là mô phỏng.',
      en: 'Your wallet is on your Dashboard, showing "Current balance" and recent transactions. Workers receive wages there; employers use it to hold deposits when posting. Demo: balance and transactions are simulated.',
      live: {
        vi: 'Ví nằm trên trang Tổng quan của bạn, hiện "Số dư hiện tại" và các giao dịch gần đây. Người lao động nhận tiền công vào ví rồi rút về ngân hàng; nhà tuyển dụng nạp ví qua PayOS để giữ tiền công khi đăng ca. Đây là tiền thật.',
        en: 'Your wallet is on your Dashboard, showing "Current balance" and recent transactions. Workers receive wages there and withdraw to their bank; employers top up via PayOS to hold wages when posting. This is real money.',
      },
    },
    links: [L.workerDash, L.employerDash],
  },
  {
    id: 'wallet-topup',
    category: 'wallet',
    roles: ['employer', 'worker'],
    questions: {
      vi: ['Nạp tiền vào ví như thế nào?', 'nap tien vao vi', 'nap tien qua qr', 'nạp tối thiểu bao nhiêu', 'nap vi bang chuyen khoan', 'nap tien payos'],
      en: ['How do I top up my wallet?', 'add money to wallet', 'minimum top-up'],
    },
    keywords: ['nap tien', 'nap vi', 'qr', 'nap toi thieu', 'top up', 'add money', 'deposit money'],
    answer: {
      vi: 'Bản demo: trong Ví bấm "Nạp tiền vào ví", nhập số tiền (tối đa 50.000.000đ) và bấm "Xác nhận nạp"; số dư được cộng ngay vào sổ cái mô phỏng, không có mã QR PayOS và không chuyển tiền thật.',
      en: 'Demo: in the wallet tap "Top up", enter an amount (max 50.000.000đ) and tap "Confirm top-up"; the balance is added to the simulated ledger instantly, with no PayOS QR and no real transfer.',
      live: {
        vi: 'Trong Ví bấm "Nạp tiền vào ví", nhập số tiền (tối thiểu 2.000đ) rồi bấm "Tiếp tục": CaLẻ hiện mã QR PayOS. Quét bằng app ngân hàng, giữ nguyên số tiền và nội dung chuyển khoản, chuyển xong bấm "Tôi đã chuyển khoản". Tiền vào ví ngay khi PayOS báo đã nhận. Nhà tuyển dụng nạp để giữ tiền công khi đăng ca; người lao động nạp khi cần đặt cọc ứng tuyển.',
        en: 'In the wallet tap "Top up", enter an amount (min 2.000đ) and tap "Continue": CaLẻ shows a PayOS QR code. Scan it with your banking app, keep the amount and transfer note unchanged, then tap "I have transferred". Money arrives as soon as PayOS confirms. Employers top up to hold wages when posting; workers top up when an application deposit is needed.',
      },
    },
    links: [L.employerDash, L.workerDash, L.hbDeposit],
  },
  {
    id: 'wallet-topup-missing',
    category: 'wallet',
    roles: ['employer'],
    questions: {
      vi: ['Đã chuyển khoản nạp tiền mà ví chưa được cộng?', 'ck roi ma chua thay tien', 'nap tien khong vao vi', 'chuyen roi so du khong tang', 'nap tien bi treo', 'nạp xong mà số dư vẫn bằng không'],
      en: ['I transferred but my wallet wasn’t credited', 'top-up not received', 'payment not showing'],
    },
    keywords: ['chua cong', 'chua vao vi', 'nap khong vao', 'chua thay tien', 'not credited', 'top up missing'],
    answer: {
      vi: 'Bản demo không có chuyển khoản thật: số dư nạp được cộng ngay vào sổ cái mô phỏng. Nếu không thấy, tải lại trang hoặc kiểm tra bạn có xoá dữ liệu trình duyệt không.',
      en: 'The demo has no real transfers: top-ups are added to the simulated ledger instantly. If you do not see it, reload the page or check whether browser data was cleared.',
      live: {
        vi: 'Nếu vừa chuyển, đợi vài giây rồi bấm kiểm tra lại. Nếu giao dịch chưa khớp đơn nạp (chuyển lệch số tiền, sai nội dung, chuyển vào mã đã hết hạn hoặc chuyển hai lần), ví hiện "Giao dịch nạp cần kiểm tra": quản trị viên đối chiếu và cộng nếu hợp lệ. Đừng chuyển khoản lại; cần hỏi thêm thì gửi mã đơn nạp (#…) qua trang Hỗ trợ.',
        en: 'If you just paid, wait a few seconds and tap check again. If the transfer did not match the order (wrong amount or note, expired code, paid twice), the wallet shows "Top-up needs review": an admin reconciles and credits it if valid. Do not transfer again; for questions, send the order code (#…) via Support.',
      },
    },
    links: [L.support, L.hbDeposit],
  },
  {
    id: 'wallet-qr-problem',
    category: 'wallet',
    roles: ['employer'],
    questions: {
      vi: ['Mã QR nạp tiền bị hết hạn hoặc không hiện?', 'qr het han', 'khong quet duoc ma qr', 'không tạo được mã qr', 'quet qr bao loi'],
      en: ['The top-up QR code expired or won’t show', 'can’t scan the QR', 'QR error'],
    },
    keywords: ['qr het han', 'ma qr', 'quet qr', 'khong hien qr', 'qr expired', 'qr code', 'scan'],
    answer: {
      vi: 'Bản demo không có mã QR: trong Ví bấm "Nạp tiền vào ví", nhập số tiền rồi bấm "Xác nhận nạp".',
      en: 'The demo has no QR code: in the wallet tap "Top up", enter an amount and tap "Confirm top-up".',
      live: {
        vi: 'Nếu mã QR không hiện, dùng nút "Mở trang thanh toán PayOS" ngay bên dưới. Mã đã hết hạn thì đừng chuyển vào nữa: tạo lệnh nạp mới. Nếu lỡ chuyển vào mã hết hạn, giao dịch chuyển sang "cần kiểm tra" và quản trị viên sẽ đối chiếu, bạn không cần chuyển lại.',
        en: 'If the QR does not show, use the "Open PayOS payment page" button below it. If the code expired, do not pay it: create a new top-up. If you already paid an expired code, it goes to "needs review" and an admin reconciles it; no need to pay again.',
      },
    },
    links: [L.hbDeposit, L.support],
  },
  {
    id: 'wallet-withdraw',
    category: 'wallet',
    roles: ['worker', 'employer'],
    questions: {
      vi: ['Rút tiền về tài khoản ngân hàng thế nào?', 'rút tiền về ngân hàng', 'rut tien ve stk', 'tiền công trong ví rút ra thế nào', 'chuyen tien tu vi ve ngan hang', 'rut luong ve the', 'muon rut het tien trong vi'],
      en: ['How do I withdraw money to my bank account?', 'withdraw to bank', 'cash out my wallet'],
    },
    keywords: ['rut tien', 'withdraw', 'ngan hang', 'so tai khoan', 'rut ve', 'rut het', 'cash out', 'momo', 'vi dien tu'],
    answer: {
      vi: 'Bản demo chưa rút được tiền thật: bấm "Rút tiền" trong Ví chỉ trừ số dư trong sổ cái mô phỏng, không chuyển tiền về ngân hàng.',
      en: 'The demo cannot withdraw real money: "Withdraw" in the wallet only deducts the simulated ledger balance; nothing is sent to a bank.',
      live: {
        vi: 'Trong Ví bấm "Rút tiền": chọn ngân hàng, nhập số tài khoản, tên chủ tài khoản (viết hoa, không dấu) và số tiền (tối thiểu 2.000đ, có nút "Rút hết"). Tiền được chuyển thật qua PayOS về đúng tài khoản bạn nhập; CaLẻ không thu phí rút.',
        en: 'In the wallet tap "Withdraw": choose your bank, enter the account number, account holder name (uppercase, no diacritics) and amount (min 2.000đ, or "Withdraw all"). Money is sent via PayOS to exactly that account; CaLẻ charges no withdrawal fee.',
      },
    },
    links: [L.workerDash, L.employerDash],
  },
  {
    id: 'wallet-withdraw-time',
    category: 'wallet',
    roles: ['worker', 'employer'],
    questions: {
      vi: ['Rút tiền bao lâu thì về tài khoản?', 'rut tien mat bao lau', 'lenh rut dang xu ly', 'rút rồi chưa thấy tiền vào tài khoản', 'tiền rút chưa thấy về ngân hàng', 'trạng thái lệnh rút'],
      en: ['How long does a withdrawal take?', 'withdrawal still processing', 'money not in my bank yet'],
    },
    keywords: ['bao lau', 'dang xu ly', 'chua ve', 'chua thay', 'lenh rut', 'withdrawal time', 'processing'],
    answer: {
      vi: 'Bản demo rút tiền là mô phỏng nên không có tiền về ngân hàng.',
      en: 'Withdrawals in the demo are simulated, so nothing reaches a bank.',
      live: {
        vi: 'Lệnh rút thường về tài khoản sau vài phút. Lệnh đang chờ hoặc thất bại hiện ở mục "Lệnh rút gần đây" trong Ví (bấm "Kiểm tra" để cập nhật); lệnh thành công hiện trong "Giao dịch gần đây". Quá lâu chưa về thì liên hệ đội hỗ trợ kèm thời điểm rút.',
        en: 'Withdrawals usually arrive within a few minutes. Pending or failed withdrawals are listed under "Recent withdrawals" in the wallet (tap "Check" to refresh); successful ones show under "Recent transactions". If it takes too long, contact support with the withdrawal time.',
      },
    },
    links: [L.support],
  },
  {
    id: 'wallet-withdraw-failed',
    category: 'wallet',
    roles: ['worker', 'employer'],
    questions: {
      vi: ['Rút tiền báo thất bại hoặc bị từ chối thì sao?', 'rut tien bi loi', 'payos tu choi lenh rut', 'khong rut duoc tien', 'rút tiền không thành công'],
      en: ['My withdrawal failed', 'withdrawal rejected', 'can’t withdraw'],
    },
    keywords: ['that bai', 'bi tu choi', 'loi rut', 'khong rut duoc', 'withdrawal failed', 'rejected'],
    answer: {
      vi: 'Bản demo rút tiền là mô phỏng; nếu báo "Số dư không đủ" thì số tiền rút lớn hơn số dư khả dụng.',
      en: 'Demo withdrawals are simulated; "Insufficient balance" means the amount exceeds your available balance.',
      live: {
        vi: 'Lệnh rút thất bại thì số tiền tự hoàn lại vào ví của bạn. Kiểm tra lại ngân hàng, số tài khoản (chỉ gồm chữ số) và tên chủ tài khoản rồi thử lại. Nếu báo hệ thống tạm thời chưa chi được, bạn thử lại sau; vẫn lỗi thì liên hệ đội hỗ trợ.',
        en: 'A failed withdrawal is refunded to your wallet automatically. Check the bank, account number (digits only) and holder name, then try again. If it says payouts are temporarily unavailable, try later; still failing, contact support.',
      },
    },
    links: [L.support],
  },
  {
    id: 'wallet-withdraw-fee',
    category: 'wallet',
    roles: ['worker', 'employer'],
    questions: {
      vi: ['Rút tiền có mất phí không, rút tối thiểu bao nhiêu?', 'phi rut tien', 'rut it nhat bao nhieu', 'so du it co rut duoc khong', 'chưa rút được vì dưới mức tối thiểu'],
      en: ['Is there a withdrawal fee?', 'minimum withdrawal', 'balance too low to withdraw'],
    },
    keywords: ['phi rut', 'rut toi thieu', 'muc toi thieu', '2000', 'withdrawal fee', 'minimum withdrawal'],
    answer: {
      vi: 'Bản demo rút tiền là mô phỏng, không thu phí.',
      en: 'Demo withdrawals are simulated and free.',
      live: {
        vi: 'CaLẻ không thu phí rút tiền. Mỗi lần rút tối thiểu 2.000đ; số dư dưới mức này thì chưa rút được. Tiền thưởng nạp ví (nếu có) không rút được.',
        en: 'CaLẻ charges no withdrawal fee. The minimum is 2.000đ per withdrawal; below that you cannot withdraw yet. Top-up bonus money (if any) cannot be withdrawn.',
      },
    },
    links: [L.pricing],
  },
  {
    id: 'wallet-wrong-account',
    category: 'wallet',
    roles: ['worker', 'employer'],
    questions: {
      vi: ['Lỡ nhập sai số tài khoản khi rút tiền thì sao?', 'nhap nham stk', 'chuyen nham ngan hang', 'rut nham tai khoan nguoi khac', 'sai tên chủ tài khoản'],
      en: ['I entered the wrong bank account', 'withdrew to the wrong account', 'wrong account number'],
    },
    keywords: ['nhap sai', 'nham', 'sai so tai khoan', 'chuyen nham', 'wrong account'],
    answer: {
      vi: 'Bản demo không chuyển tiền thật nên không ảnh hưởng gì.',
      en: 'The demo moves no real money, so nothing is affected.',
      live: {
        vi: 'Tiền được chuyển thật qua PayOS về đúng tài khoản bạn nhập, nên chuyển nhầm không lấy lại được: hãy kiểm tra kỹ ngân hàng và số tài khoản trước khi bấm. Nếu lệnh bị ngân hàng từ chối, tiền tự hoàn về ví. Lỡ chuyển nhầm thì liên hệ ngay đội hỗ trợ kèm thời điểm rút.',
        en: 'Money goes via PayOS to exactly the account you enter, so a wrong transfer cannot be recovered: double-check the bank and account number before confirming. If the bank rejects it, the money returns to your wallet. If it went to the wrong account, contact support immediately with the withdrawal time.',
      },
    },
    links: [L.support],
  },
  {
    id: 'wallet-history',
    category: 'wallet',
    roles: ['worker', 'employer'],
    questions: {
      vi: ['Xem lịch sử giao dịch ví ở đâu?', 'lich su nap rut', 'sao ke vi', 'xem cac khoan giu hoan tra', 'tìm mã đơn nạp'],
      en: ['Where is my transaction history?', 'wallet statement', 'find my top-up order code'],
    },
    keywords: ['lich su giao dich', 'lich su', 'sao ke', 'giao dich gan day', 'ma don', 'transaction history', 'statement'],
    answer: {
      vi: 'Trong Ví bấm "Xem lịch sử giao dịch". Mỗi khoản giữ cọc, trả công, hoàn, nạp, rút đều có một dòng riêng (bản demo: mô phỏng).',
      en: 'In the wallet tap "View transaction history". Every hold, wage, refund, top-up and withdrawal has its own line (demo: simulated).',
      live: {
        vi: 'Trong Ví bấm "Xem lịch sử giao dịch". Mỗi khoản nạp, giữ, trả công, hoàn và rút đều có một dòng riêng. Khi cần hỏi hỗ trợ về một lần nạp, gửi kèm mã đơn nạp (#…) trong lịch sử ví.',
        en: 'In the wallet tap "View transaction history". Every top-up, hold, wage, refund and withdrawal has its own line. When asking support about a top-up, include its order code (#…) from the history.',
      },
    },
    links: [L.workerDash, L.employerDash],
  },
  {
    id: 'wallet-topup-bonus',
    category: 'wallet',
    roles: ['employer'],
    questions: {
      vi: ['Thưởng nạp ví / tiền thưởng dùng để làm gì?', 'tien thuong nap vi', 'khuyen mai nap tien', 'tiền thưởng rút được không', 'tui tien thuong', 'số dư tiền thưởng'],
      en: ['What is the top-up bonus?', 'promo balance', 'can I withdraw bonus money'],
    },
    keywords: ['thuong nap', 'tien thuong', 'khuyen mai', 'tui thuong', 'promo', 'bonus'],
    answer: {
      vi: 'Thưởng nạp ví chỉ có ở bản chính thức. Bản demo không tính phí dịch vụ nên không có tiền thưởng.',
      en: 'The top-up bonus exists only on the official site. The demo charges no service fee, so there is no bonus.',
      live: {
        vi: 'Khi CaLẻ có chương trình, nhà tuyển dụng nạp từ mức tối thiểu sẽ được thưởng vào "túi tiền thưởng" (số lần có giới hạn). Tiền thưởng chỉ dùng trả phí dịch vụ khi đăng ca, không trả tiền công, không rút được và không hết hạn; phần phí trả bằng thưởng nếu được hoàn sẽ quay lại túi thưởng.',
        en: 'When CaLẻ runs a promotion, employers topping up at least the minimum get a bonus in a separate "bonus pocket" (limited times). It only pays service fees when posting, never wages, cannot be withdrawn and does not expire; refunded fees paid with bonus go back to the bonus pocket.',
      },
    },
    links: [L.hbDeposit, L.terms],
  },
  {
    id: 'wallet-payos',
    category: 'wallet',
    questions: {
      vi: ['PayOS là gì, thanh toán qua PayOS có an toàn không?', 'payos la ben nao', 'cong thanh toan cua cale', 'tien cua minh duoc giu o dau', 'cale co giu tien cua toi khong'],
      en: ['What is PayOS?', 'is paying through PayOS safe', 'who holds my money'],
    },
    keywords: ['payos', 'cong thanh toan', 'an toan', 'giu tien', 'payment gateway'],
    answer: {
      vi: 'Bản demo không dùng PayOS: mọi giao dịch ghi trong sổ cái mô phỏng, không có tiền thật. Bản chính thức nạp và rút tiền qua cổng thanh toán PayOS.',
      en: 'The demo does not use PayOS: all transactions are in a simulated ledger, no real money. The official site handles top-ups and withdrawals through the PayOS payment gateway.',
      live: {
        vi: 'PayOS là cổng thanh toán CaLẻ dùng để xử lý nạp tiền (quét QR chuyển khoản) và rút tiền về ngân hàng. Số dư ví, khoản giữ cọc và lịch sử giao dịch được lưu trên máy chủ của CaLẻ; mỗi khoản đều có dòng trong lịch sử ví.',
        en: 'PayOS is the payment gateway CaLẻ uses for top-ups (bank-transfer QR) and withdrawals to your bank. Wallet balances, deposit holds and transaction history are stored on CaLẻ servers, with a line for every movement in your wallet history.',
      },
    },
    links: [L.privacy, L.terms],
  },
];

// ---------------------------------------------------------------------------
// Nhà tuyển dụng: phí, đăng ca, giữ cọc, sửa / huỷ ca
// ---------------------------------------------------------------------------

const EMPLOYER_POST: SupportEntry[] = [
  {
    id: 'pricing-fee',
    category: 'pricing',
    roles: ['employer', 'guest'],
    questions: {
      vi: ['Phí dịch vụ cho nhà tuyển dụng là bao nhiêu?', 'dang ca co mat phi khong', 'cale thu phi bao nhieu phan tram', 'bang gia', 'chi phi tuyen nguoi tren cale', 'phí dịch vụ tính trên phần nào', 'phi 10 phan tram'],
      en: ['How much does CaLẻ charge employers?', 'is posting free', 'pricing', 'service fee for employers'],
    },
    keywords: ['phi dich vu', 'bang gia', 'chi phi', '10', 'phan tram', 'phi dang ca', 'pricing', 'fee', 'service fee'],
    answer: {
      vi: 'Trong giai đoạn thử nghiệm (bản demo), CaLẻ chưa thu phí: 0đ, dự kiến 10% tiền công. Đăng ca và duyệt người miễn phí; tiền công được giữ khi đăng ca và mọi giao dịch đều là mô phỏng.',
      en: 'During the trial (demo), CaLẻ charges nothing: 0đ, with 10% of wages planned. Posting and approving are free; wages are held when posting and all transactions are simulated.',
      live: {
        vi: 'Đăng ca và duyệt người miễn phí. Phí dịch vụ 10% chỉ tính trên tiền công của phần ca có người làm. Vị trí trống, người vắng mặt, ca huỷ: hoàn cả tiền công lẫn phí phần đó. Khi CaLẻ chạy đợt miễn phí, trang Bảng giá ghi rõ miễn phí đến ngày nào.',
        en: 'Posting and approving are free. The 10% service fee applies only to wages for the part of the shift actually worked. Empty slots, no-shows and cancelled shifts get both wages and fee refunded. During a fee-free campaign, the Pricing section shows the end date.',
      },
    },
    links: [L.pricing, L.hbDeposit],
  },
  {
    id: 'pricing-cost-example',
    category: 'pricing',
    roles: ['employer', 'guest'],
    questions: {
      vi: ['Đăng một ca thì bị giữ bao nhiêu tiền trong ví?', 'tinh thu tien mot ca', 'ca 4 tieng 2 nguoi het bao nhieu', 'tong tien giu khi dang ca', 'vi du tinh tien ca'],
      en: ['How much is held when I post a shift?', 'cost of one shift', 'example calculation'],
    },
    keywords: ['giu bao nhieu', 'tinh thu', 'vi du', 'tong tien giu', 'het bao nhieu', 'cost', 'how much'],
    answer: {
      vi: 'Tiền giữ = lương theo giờ × số giờ × số người. Ví dụ ca 4 giờ, 35.000đ/giờ, cần 2 người: giữ 280.000đ (mô phỏng, bản demo chưa cộng phí). Bạn thử sửa giờ, lương, số người ở khối "Thử đăng một ca" để xem ngay số tiền.',
      en: 'Amount held = hourly rate × hours × people. E.g. 4 hours, 35.000đ/hour, 2 people: 280.000đ held (simulated; the demo adds no fee). Try changing hours, pay and headcount in "Try posting a shift" to see the amount.',
      live: {
        vi: 'Tiền giữ = tiền công (lương theo giờ × số giờ × số người) + phí dịch vụ 10%. Ví dụ ca 4 giờ, 35.000đ/giờ, cần 2 người: tiền công 280.000đ → giữ 308.000đ (gồm 28.000đ phí; 0đ phí trong đợt miễn phí). Thử ngay ở khối "Thử đăng một ca".',
        en: 'Amount held = wages (hourly rate × hours × people) + 10% service fee. E.g. 4 hours, 35.000đ/hour, 2 people: wages 280.000đ → 308.000đ held (including a 28.000đ fee; 0đ fee during a free period). Try it in "Try posting a shift".',
      },
    },
    links: [L.employerPost, L.pricing],
  },
  {
    id: 'pricing-free-campaign',
    category: 'pricing',
    roles: ['employer'],
    questions: {
      vi: ['Đợt miễn phí dịch vụ áp dụng thế nào?', 'dang mien phi den bao gio', 'khuyen mai mien phi phi dich vu', 'ca nao duoc mien phi', 'mien phi 30 ngay'],
      en: ['How does the fee-free period work?', 'free service fee promotion', 'which shifts are free'],
    },
    keywords: ['mien phi', 'dot mien phi', 'khuyen mai', '30 ngay', 'free period', 'promotion'],
    answer: {
      vi: 'Bản demo chưa thu phí nên mọi ca đều 0đ phí (mô phỏng).',
      en: 'The demo charges no fee, so every shift has a 0đ fee (simulated).',
      live: {
        vi: 'Khi CaLẻ chạy đợt miễn phí, trang Dành cho nhà tuyển dụng hiện dòng "Đang miễn phí dịch vụ đến hết …". Ca đăng trong đợt chỉ miễn phí nếu ngày làm ca nằm trong vòng 30 ngày sau khi đợt kết thúc. Không có đợt thì áp dụng phí 10% thường lệ.',
        en: 'When CaLẻ runs a free period, the For employers page shows "Service fee free until …". Shifts posted in the period are free only if the work date is within 30 days after it ends. Otherwise the usual 10% fee applies.',
      },
    },
    links: [L.pricing],
  },
  {
    id: 'post-how',
    category: 'post',
    roles: ['employer'],
    questions: {
      vi: ['Đăng ca tuyển người như thế nào?', 'cach dang ca', 'tạo ca làm mới', 'dang tin tuyen nguoi', 'muon tuyen nhan vien part time', 'cần tuyển gấp nhân viên phục vụ', 'muốn tuyển người làm sự kiện', 'quán cần thêm người phụ bếp cuối tuần', 'đăng job ở đâu'],
      en: ['How do I post a shift?', 'create a new shift', 'hire staff'],
    },
    keywords: ['dang ca', 'tao ca', 'tuyen nguoi', 'dang tin', 'tuyen nhan vien', 'post shift', 'hire'],
    answer: {
      vi: 'Bấm "Đăng ca tuyển", nhập tên ca, mô tả, loại việc, địa điểm, ngày giờ, lương theo giờ, số người cần và người phụ trách tại chỗ. Lưu xong, bấm "Mô phỏng giữ cọc" để công khai ca; trước đó ca ở trạng thái nháp, người lao động chưa thấy.',
      en: 'Tap "Post a shift", enter title, description, job type, location, date and time, hourly wage, people needed and an on-site contact. After saving, tap "Simulate deposit hold" to publish; until then it is a draft workers cannot see.',
      live: {
        vi: 'Bấm "Đăng ca tuyển", nhập tên ca, mô tả, loại việc, địa điểm, ngày giờ, lương theo giờ, số người cần và người phụ trách tại chỗ. Khi đăng, hệ thống giữ tiền công + phí dịch vụ 10% (0đ trong đợt miễn phí) từ ví rồi mới công khai ca cho người lao động.',
        en: 'Tap "Post a shift", enter title, description, job type, location, date and time, hourly wage, people needed and an on-site contact. On posting, the system holds wages + the 10% fee (0đ during a free period) from your wallet, then publishes the shift.',
      },
    },
    links: [L.newShift, L.employerPost],
  },
  {
    id: 'post-requirements',
    category: 'post',
    roles: ['employer'],
    questions: {
      vi: ['Cần chuẩn bị gì trước khi đăng ca?', 'dieu kien dang ca', 'sao chua dang ca duoc', 'phai xac thuc gi moi dang ca', 'bao can xac thuc truoc khi dang ca'],
      en: ['What do I need before posting?', 'why can’t I post yet', 'posting requirements'],
    },
    keywords: ['chuan bi', 'dieu kien', 'chua dang duoc', 'xac thuc truoc', 'requirements', 'before posting'],
    answer: {
      vi: 'Bản demo: chọn loại tài khoản khi đăng ký và nộp giấy tờ xác minh theo loại (mô phỏng), rồi đăng ca; ví cần đủ số dư mô phỏng để giữ cọc. Nhà tuyển dụng bản demo không bị chặn vì chưa xác minh số điện thoại.',
      en: 'Demo: pick your account type at sign-up and submit the matching verification documents (simulated), then post; your wallet needs enough simulated balance for the deposit. Demo employers are not blocked for an unverified phone.',
      live: {
        vi: 'Khi CaLẻ bật yêu cầu này, bạn cần xác thực số điện thoại trước khi đăng ca, và có thể cần thêm CCCD được quản trị viên duyệt. Rồi nạp tiền vào ví qua PayOS để đủ giữ tiền công + phí khi đăng ca.',
        en: 'When CaLẻ turns this requirement on, you must verify your phone before posting, and an admin-approved ID may also be required. Then top up your wallet via PayOS to cover wages + fee when posting.',
      },
    },
    links: [L.employerVerify, L.employerProfile],
  },
  {
    id: 'post-deposit-hold',
    category: 'post',
    roles: ['employer'],
    questions: {
      vi: ['Giữ cọc khi đăng ca là gì, tiền đi đâu?', 'ví bị trừ tiền khi đăng ca là sao', 'tai sao phai giu coc', 'tien coc ntd', 'coc ca lam', 'tiền giữ của ca đi về đâu'],
      en: ['What is the deposit hold when posting?', 'where does the held money go', 'why hold a deposit'],
    },
    keywords: ['giu coc', 'tien giu', 'coc', 'escrow', 'deposit hold', 'held'],
    answer: {
      vi: 'Tiền công được giữ cọc từ ví trước khi ca hiện ra và chỉ trả cho người lao động khi ca xong; phần không dùng (vị trí trống, người vắng mặt, ca huỷ) hoàn về ví của bạn. Trong bản demo, mọi giao dịch đều là mô phỏng.',
      en: 'Wages are held from your wallet before the shift goes live and are paid to workers only when the shift is done; unused parts (empty slots, no-shows, cancellations) return to your wallet. In the demo, all transactions are simulated.',
      live: {
        vi: 'Khi đăng ca, hệ thống giữ tiền công cùng phí dịch vụ từ ví. Mỗi đồng đó đi về đúng một trong ba nơi: người đã làm, phí CaLẻ, hoặc hoàn về ví của bạn (vị trí trống, người vắng mặt, ca huỷ: hoàn cả tiền công lẫn phí phần đó). Đây là tiền thật trong ví CaLẻ; nạp và rút qua PayOS.',
        en: 'When posting, wages plus the service fee are held from your wallet. Every đồng goes to exactly one place: the worker who worked, CaLẻ’s fee, or back to your wallet (empty slots, no-shows, cancellations get wages and fee refunded). This is real money in your CaLẻ wallet; top-ups and withdrawals go through PayOS.',
      },
    },
    links: [L.employerPayments, L.hbDeposit],
  },
  {
    id: 'post-insufficient',
    category: 'post',
    roles: ['employer'],
    questions: {
      vi: ['Ví không đủ tiền để giữ cọc khi đăng ca thì sao?', 'khong du so du dang ca', 'vi thieu tien', 'bao so du khong du', 'het tien trong vi khong dang duoc'],
      en: ['My wallet doesn’t have enough to post', 'insufficient balance', 'not enough money to hold deposit'],
    },
    keywords: ['khong du', 'thieu tien', 'so du khong du', 'nap them', 'insufficient balance', 'not enough'],
    answer: {
      vi: 'Ca chỉ hiện cho người lao động khi đã giữ đủ tiền. Ví không đủ thì bản nháp vẫn được giữ: bạn nạp thêm (mô phỏng) rồi xác nhận lại, không cần nhập lại ca.',
      en: 'A shift only goes live once fully held. If the wallet is short, the draft is kept: top up (simulated) and confirm again without re-entering the shift.',
      live: {
        vi: 'Ca chỉ hiện cho người lao động khi đã giữ đủ tiền công + phí. Ví không đủ thì ca được giữ ở dạng nháp: bạn nạp thêm qua QR PayOS (tối thiểu 2.000đ) rồi xác nhận lại, không cần nhập lại ca.',
        en: 'A shift only goes live once wages + fee are fully held. If the wallet is short, it stays a draft: top up via the PayOS QR (min 2.000đ) and confirm again without re-entering the shift.',
      },
    },
    links: [L.employerDash, L.hbDeposit],
  },
  {
    id: 'post-draft',
    category: 'post',
    roles: ['employer'],
    questions: {
      vi: ['Lưu nháp ca làm và tiếp tục sửa sau được không?', 'ban nhap da luu o dau', 'xoa ban nhap', 'ca nhap co hien cho nld khong', 'luu nhap chua dang'],
      en: ['Can I save a shift as a draft?', 'where are my drafts', 'delete a draft'],
    },
    keywords: ['luu nhap', 'ban nhap', 'nhap', 'draft', 'save draft'],
    answer: {
      vi: 'Được. Trong form đăng ca, bấm "Lưu nháp"; bản nháp nằm ở mục "Bản nháp đã lưu" để "Tiếp tục chỉnh sửa" hoặc "Xóa bản nháp". Nháp chưa phải ca thật: người lao động không thấy, không giữ tiền, không cần huỷ hay hoàn cọc.',
      en: 'Yes. In the shift form tap "Save draft"; drafts live under "Saved drafts" where you can "Continue editing" or "Delete draft". A draft is not a real shift: workers cannot see it, no money is held, nothing to cancel or refund.',
    },
    links: [L.newShift],
  },
  {
    id: 'post-edit',
    category: 'post',
    roles: ['employer'],
    questions: {
      vi: ['Sửa ca đã đăng được không?', 'đã đăng ca rồi muốn sửa lại', 'hạn chót sửa ca là đến khi nào', 'chinh sua ca da dang', 'doi gio ca lam', 'sửa mô tả ca', 'không bấm sửa ca được nữa'],
      en: ['Can I edit a posted shift?', 'change shift time', 'edit button missing'],
    },
    keywords: ['sua ca', 'chinh sua', 'doi gio', 'sua mo ta', '24 gio', 'edit shift'],
    answer: {
      vi: 'Sửa ca được khi còn hơn 24 giờ nữa mới bắt đầu (ca 17:00 thì sửa tới 17:00 hôm trước). Trong vòng 24 giờ trước giờ bắt đầu thì không sửa được nữa, để người lao động không bị đổi thông tin sát giờ.',
      en: 'You can edit a shift until 24 hours before it starts (a 17:00 shift until 17:00 the day before). Within 24 hours of the start you can no longer edit, so workers do not get last-minute changes.',
    },
    links: [L.employerDash],
  },
  {
    id: 'post-edit-positions',
    category: 'post',
    roles: ['employer'],
    questions: {
      vi: ['Tăng hoặc giảm số người cần tuyển sau khi đăng được không?', 'them nguoi cho ca', 'giam so luong nguoi', 'tang gio lam bao vuot tien coc', 'doi so vi tri'],
      en: ['Can I change the number of people after posting?', 'add more slots', 'reduce headcount'],
    },
    keywords: ['so nguoi', 'so luong', 'vi tri', 'tang', 'giam', 'vuot coc', 'positions', 'headcount'],
    answer: {
      vi: 'Trong thời hạn được sửa (hơn 24 giờ trước ca), bạn chỉnh được số người cần, nhưng không giảm xuống dưới số người đã được duyệt. Không tăng được giờ làm / số vị trí vượt quá tiền cọc đã giữ: khi đó hãy huỷ ca và đăng ca mới.',
      en: 'Within the edit window (more than 24 hours before start) you can change headcount, but not below the number already approved. You cannot increase hours / slots beyond the deposit already held: in that case cancel and post a new shift.',
    },
    links: [L.employerDash],
  },
  {
    id: 'post-repost',
    category: 'post',
    roles: ['employer'],
    questions: {
      vi: ['Ca lặp lại hằng tuần có đăng lại nhanh được không?', 'dang lai ca cu', 'copy ca cu', 'ca co dinh moi tuan', 'nhân bản ca làm'],
      en: ['Can I repost an old shift?', 'weekly recurring shift', 'duplicate a shift'],
    },
    keywords: ['dang lai', 'lap lai', 'hang tuan', 'ca cu', 'copy', 'repost', 'recurring', 'duplicate'],
    answer: {
      vi: 'Được. Mở một ca đã hoàn thành, đã huỷ hoặc đã hết hạn và bấm "Đăng lại từ ca này": form điền sẵn thông tin ca cũ, bạn chỉ cần chọn lại ngày giờ. Ca mới vẫn cần giữ cọc trước khi công khai.',
      en: 'Yes. Open a completed, cancelled or expired shift and tap "Repost from this shift": the form is pre-filled, you just pick the new date and time. The new shift still needs its deposit held before going live.',
    },
    links: [L.employerDash],
  },
  {
    id: 'post-date-error',
    category: 'post',
    roles: ['employer'],
    questions: {
      vi: ['Đăng ca báo lỗi ngày giờ trong quá khứ hoặc giờ kết thúc phải sau giờ bắt đầu', 'khong dang duoc ca qua khu', 'loi gio ket thuc', 'ca qua dem dang sao', 'loi nhap ngay gio ca'],
      en: ['Posting says the date is in the past', 'end time must be after start', 'overnight shift error'],
    },
    keywords: ['qua khu', 'gio ket thuc', 'gio bat dau', 'loi ngay', 'qua dem', 'past date', 'end time'],
    answer: {
      vi: 'CaLẻ không cho đăng ca trong quá khứ: chọn ngày giờ trong tương lai. Giờ nhập theo dạng 24 giờ (HH:mm) và giờ kết thúc phải sau giờ bắt đầu. Nếu ca kéo qua nửa đêm và form không nhận, bạn liên hệ đội hỗ trợ để được hướng dẫn.',
      en: 'CaLẻ does not allow shifts in the past: pick a future date and time. Times use 24-hour HH:mm and the end must be after the start. If a shift past midnight is not accepted, contact support for help.',
    },
    links: [L.newShift, L.support],
  },
  {
    id: 'post-contact-person',
    category: 'post',
    roles: ['employer'],
    questions: {
      vi: ['Người phụ trách tại chỗ khi đăng ca là gì, có bắt buộc không?', 'nguoi phu trach tai cho', 'so dien thoai nguoi phu trach', 'bao loi vui long nhap nguoi phu trach', 'ai đón người lao động ở quán'],
      en: ['What is the on-site contact when posting?', 'contact person required', 'on-site contact phone'],
    },
    keywords: ['nguoi phu trach', 'tai cho', 'lien he tai cho', 'nguoi don', 'on site contact', 'contact person'],
    answer: {
      vi: 'Bắt buộc. Khi đăng ca, bạn nhập tên và số điện thoại người phụ trách tại chỗ, người sẽ đón và hướng dẫn người lao động khi họ tới. Thiếu thì form báo "Vui lòng nhập người phụ trách tại chỗ".',
      en: 'Required. When posting, enter the name and phone number of the on-site contact who will meet and guide workers when they arrive. Missing it, the form says the on-site contact is required.',
    },
    links: [L.newShift],
  },
  {
    id: 'post-wage-guide',
    category: 'post',
    roles: ['employer'],
    questions: {
      vi: ['Nên trả lương theo giờ bao nhiêu, có mức khuyến nghị không?', 'mức lương thế nào là hợp lý', 'luong toi thieu khuyen nghi', 'canh bao luong thap', 'tra 25k mot gio co duoc khong', 'mức lương phục vụ bao nhiêu'],
      en: ['What hourly wage should I offer?', 'recommended minimum wage', 'low wage warning'],
    },
    keywords: ['muc luong', 'khuyen nghi', 'hop ly', 'luong thap', 'luong toi thieu', 'canh bao', 'recommended wage', 'minimum wage'],
    answer: {
      vi: 'Form đăng ca cảnh báo khi lương dưới "mức khuyến nghị tối thiểu" theo loại việc, ví dụ phục vụ 30.000đ/giờ, pha chế, kho vận, bảo vệ, thu ngân 35.000đ/giờ, phát tờ rơi 25.000đ/giờ. Đây là mức tham khảo thị trường, không phải ngưỡng pháp lý; lương theo thị trường khu vực giúp ca có người ứng tuyển nhanh hơn.',
      en: 'The posting form warns when pay is below the "recommended minimum" for the job type, e.g. waiting 30.000đ/hour, bartending, warehouse, security, cashier 35.000đ/hour, flyers 25.000đ/hour. It is a market reference, not a legal threshold; market-rate pay fills shifts faster.',
    },
    links: [L.newShift],
  },
  {
    id: 'post-no-applicants',
    category: 'post',
    roles: ['employer'],
    questions: {
      vi: ['Đăng ca xong mà chưa ai ứng tuyển thì làm sao?', 'khong co ai ung tuyen', 'ca dang lau khong co nguoi', 'tang hien thi ca', 'boost ca'],
      en: ['No one has applied to my shift', 'how to get more applicants', 'boost my shift'],
    },
    keywords: ['chua ai ung tuyen', 'khong co nguoi', 'it nguoi', 'boost', 'uu tien hien thi', 'no applicants'],
    answer: {
      vi: 'Kiểm tra ca đã được giữ cọc và công khai (trạng thái "Đang tuyển"). Viết mô tả rõ ràng, trả lương theo thị trường khu vực, và dùng lượt boost (nếu có) để ưu tiên hiển thị. Cần đổi mô tả thì dùng nút Chỉnh sửa trước 24 giờ.',
      en: 'Check the shift has its deposit held and is public ("Recruiting"). Write a clear description, pay market rates for the area, and use a boost (if you have one) to rank higher. To change the description, edit it before the 24-hour cutoff.',
      live: {
        vi: 'Kiểm tra ca đã được giữ cọc và công khai (trạng thái "Đang tuyển"). Viết mô tả rõ ràng, trả lương theo thị trường khu vực. Cần đổi mô tả thì dùng nút Chỉnh sửa trước 24 giờ. Bản chính thức chưa có lượt boost.',
        en: 'Check the shift has its deposit held and is public ("Recruiting"). Write a clear description and pay market rates for the area. To change the description, edit before the 24-hour cutoff. Boosts are not available on the official site yet.',
      },
    },
    links: [L.faq, L.employerDash],
  },
  {
    id: 'post-evidence-level',
    category: 'post',
    roles: ['employer'],
    questions: {
      vi: ['Nên chọn mức bằng chứng sau ca nào khi đăng ca?', 'bang chung sau ca la gi', 'yeu cau anh ban giao', 'chon muc bang chung', 'he thong goi y muc bang chung'],
      en: ['Which evidence level should I choose?', 'after-shift evidence', 'require handover photo'],
    },
    keywords: ['muc bang chung', 'bang chung sau ca', 'anh ban giao', 'checklist', 'evidence level'],
    answer: {
      vi: 'Khi đăng ca, mục "Bằng chứng sau ca" cho bạn chọn 1 trong 5 mức: những gì người lao động phải gửi khi check-out. Hệ thống gợi ý theo loại việc (việc rủi ro thấp như phát tờ rơi, hỗ trợ sự kiện: chỉ cần checklist); bạn giữ nguyên hoặc đổi. Chọn đúng mức giúp có căn cứ đối chiếu mà không làm khó người làm.',
      en: 'When posting, "After-shift evidence" lets you pick one of 5 levels: what workers must submit at check-out. The system suggests one by job type (low-risk work like flyers or events: checklist only); keep or change it. The right level gives you a record without burdening workers.',
    },
    links: [L.hbEmployerEvidence],
  },
  {
    id: 'employer-cancel-shift',
    category: 'post',
    roles: ['employer'],
    questions: {
      vi: ['Tôi muốn huỷ ca mình đã đăng tuyển', 'huy ca da dang', 'nhà tuyển dụng muốn huỷ ca đã đăng', 'khong can nguoi nua muon huy ca', 'sao không huỷ ca được', 'huy ca sat gio'],
      en: ['Can I cancel a shift I posted?', 'cancel a posting', 'why can’t I cancel'],
    },
    keywords: ['huy ca da dang', 'khong huy duoc', '6 gio', 'cancel posting'],
    answer: {
      vi: 'Được, nếu ca còn hơn 6 giờ nữa mới bắt đầu (cần ghi lý do). Trong vòng 6 giờ mà đã có người ứng tuyển thì không huỷ được, để bảo vệ người lao động; sau giờ bắt đầu cũng không huỷ được. Hãy báo sớm vì người lao động đã sắp xếp lịch cho ca của bạn.',
      en: 'Yes, if the shift starts in more than 6 hours (a reason is required). Within 6 hours, if anyone has applied, you cannot cancel, to protect workers; after the start time you cannot cancel either. Tell workers early, they have planned around your shift.',
    },
    links: [L.employerDash, L.hbDeposit],
  },
  {
    id: 'employer-cancel-refund',
    category: 'post',
    roles: ['employer'],
    questions: {
      vi: ['Huỷ ca thì tiền giữ có được hoàn không, có mất phí huỷ không?', 'phi huy ca', 'huy ca co bi phat tien khong', 'hoan coc khi huy ca', 'mất bao nhiêu khi huỷ ca'],
      en: ['Do I get my money back if I cancel?', 'cancellation fee for employers', 'refund on cancellation'],
    },
    keywords: ['phi huy', 'phat', 'hoan coc', 'hoan tien', 'huy ca', 'cancellation fee', 'refund'],
    answer: {
      vi: 'Huỷ đúng mốc thì khoản tiền giữ được hoàn về ví (mô phỏng). Bản demo có phí huỷ ca nếu đã duyệt người: 5% tiền cọc khi huỷ hơn 24 giờ trước ca, 10% khi còn 6–24 giờ; chưa duyệt ai thì không mất phí.',
      en: 'Cancel within the allowed window and the held money returns to your wallet (simulated). The demo charges a cancellation fee if anyone was approved: 5% of the deposit more than 24 hours before, 10% between 6 and 24 hours; no fee if nobody was approved.',
      live: {
        vi: 'Ca bị huỷ thì phần tiền công và phí dịch vụ đã giữ được hoàn về ví của bạn. Hãy huỷ sớm và ghi rõ lý do vì người lao động đã sắp xếp lịch cho ca của bạn.',
        en: 'When a shift is cancelled, the held wages and service fee return to your wallet. Cancel early and give a clear reason, as workers have planned around your shift.',
      },
    },
    links: [L.employerPayments, L.hbDeposit],
  },
  {
    id: 'employer-refund-when',
    category: 'post',
    roles: ['employer'],
    questions: {
      vi: ['Khi nào tiền giữ được hoàn lại vào ví nhà tuyển dụng?', 'tien thua hoan khi nao', 'vi tri trong co duoc hoan khong', 'tien coc cua nguoi vang mat', 'hoàn phần không dùng'],
      en: ['When are unused funds refunded?', 'refund for empty slots', 'money back for no-shows'],
    },
    keywords: ['hoan ve vi', 'phan khong dung', 'vi tri trong', 'tien thua', 'unused', 'refund', 'empty slots'],
    answer: {
      vi: 'Vị trí không có người, người lao động vắng mặt, ca bị huỷ hoặc hết hạn: phần tiền công của phần đó được hoàn về ví của bạn (mô phỏng).',
      en: 'Empty slots, no-show workers, cancelled or expired shifts: the wages for that part return to your wallet (simulated).',
      live: {
        vi: 'Vị trí không có người, người lao động vắng mặt, ca bị huỷ hoặc hết hạn: phần tiền công và phí dịch vụ của phần đó được hoàn về ví của bạn khi ca chốt. Phí 10% chỉ tính trên phần ca có người làm.',
        en: 'Empty slots, no-shows, cancelled or expired shifts: the wages and service fee for that part return to your wallet when the shift settles. The 10% fee only applies to the part actually worked.',
      },
    },
    links: [L.employerPayments, L.hbDeposit],
  },
];

// ---------------------------------------------------------------------------
// Nhà tuyển dụng: duyệt người, theo dõi ca, xác nhận
// ---------------------------------------------------------------------------

const EMPLOYER_MANAGE: SupportEntry[] = [
  {
    id: 'applicants-review',
    category: 'applicants',
    roles: ['employer'],
    questions: {
      vi: ['Duyệt người ứng tuyển ở đâu?', 'xem ung vien', 'duyet nld', 'ai đã ứng tuyển ca của tôi', 'chon nguoi lam', 'quản lý người ứng tuyển'],
      en: ['Where do I approve applicants?', 'see who applied', 'choose workers'],
    },
    keywords: ['duyet', 'ung vien', 'nguoi ung tuyen', 'quan ly ung vien', 'chon nguoi', 'approve', 'applicants'],
    answer: {
      vi: 'Mở ca trên trang Tổng quan nhà tuyển dụng → trang quản lý ca. Thẻ ứng viên cho biết điểm uy tín, số ca đã làm, điểm sao, kỹ năng và giấy tờ đã xác minh. Bấm "Duyệt" từng người, hoặc "Từ chối" kèm lý do. Nên xử lý sớm, nhất là ca diễn ra trong 24 giờ tới.',
      en: 'Open the shift from the employer Dashboard → shift management page. Applicant cards show reputation, shifts done, stars, skills and verified documents. Tap "Approve" for each person, or "Reject" with a reason. Decide early, especially for shifts in the next 24 hours.',
      live: {
        vi: 'Mở ca trên trang Tổng quan nhà tuyển dụng → trang quản lý ca. Thẻ ứng viên cho biết người đó đã làm bao nhiêu ca với bạn, vắng mấy lần và được chấm bao nhiêu sao. Bấm "Duyệt" từng người, hoặc "Từ chối" kèm lý do. Nên xử lý sớm, nhất là ca diễn ra trong 24 giờ tới.',
        en: 'Open the shift from the employer Dashboard → shift management page. Applicant cards show how many shifts they did with you, no-shows and average stars. Tap "Approve" for each person, or "Reject" with a reason. Decide early, especially for shifts in the next 24 hours.',
      },
    },
    links: [L.employerDash, L.employerApplicants],
  },
  {
    id: 'applicants-reject',
    category: 'applicants',
    roles: ['employer'],
    questions: {
      vi: ['Từ chối người ứng tuyển có cần ghi lý do không?', 'tu choi ung vien', 'khong muon nhan nguoi nay', 'loai ung vien', 'bỏ duyệt người lao động'],
      en: ['Do I need a reason to reject an applicant?', 'decline a worker', 'reject application'],
    },
    keywords: ['tu choi', 'ly do', 'loai', 'khong nhan', 'reject', 'decline'],
    answer: {
      vi: 'Có. Từ chối cần ghi lý do; lý do được gửi kèm thông báo để người lao động hiểu. Ví dụ: 3 người ứng tuyển, bạn duyệt 2 người nhiều kinh nghiệm và từ chối 1 người kèm lý do.',
      en: 'Yes. Rejecting requires a reason, which is sent with the notification so the worker understands. E.g. 3 applicants: approve the 2 most experienced and reject 1 with a reason.',
      live: {
        vi: 'Có. Từ chối cần ghi lý do; người lao động thấy lý do trên trang Tổng quan của họ.',
        en: 'Yes. Rejecting requires a reason; the worker sees it on their Dashboard.',
      },
    },
    links: [L.employerApplicants],
  },
  {
    id: 'applicants-after-start',
    category: 'applicants',
    roles: ['employer'],
    questions: {
      vi: ['Sao không duyệt thêm người được khi ca đã bắt đầu?', 'ca bat dau roi khong duyet duoc', 'don cho duyet bien thanh het han', 'duyet tre', 'không duyệt được người trùng ca khác'],
      en: ['Why can’t I approve after the shift started?', 'pending applications expired', 'cannot approve overlapping worker'],
    },
    keywords: ['da bat dau', 'khong duyet duoc', 'het han', 'trung ca', 'already started', 'cannot approve'],
    answer: {
      vi: 'Ca đã bắt đầu thì không duyệt thêm người được; đơn còn chờ duyệt tự chuyển "Đã hết hạn" và người lao động không bị trừ gì. Hãy duyệt trước giờ ca.',
      en: 'Once a shift starts, you cannot approve more people; still-pending applications become "Expired" with no penalty for the worker. Approve before the start time.',
      live: {
        vi: 'Ca đã bắt đầu thì không duyệt thêm người được; đơn còn chờ duyệt tự chuyển "Đã hết hạn". Hãy duyệt trước giờ ca.',
        en: 'Once a shift starts, you cannot approve more people; still-pending applications become "Expired". Approve before the start time.',
      },
    },
    links: [L.employerDash],
  },
  {
    id: 'applicants-cancel-request',
    category: 'applicants',
    roles: ['employer'],
    questions: {
      vi: ['Người lao động xin huỷ ca sát giờ thì tôi xử lý thế nào?', 'nld gui yeu cau huy', 'chap nhan yeu cau huy', 'tu choi yeu cau huy cua nld', 'người lao động báo nghỉ trước vài tiếng', 'nhân viên xin nghỉ đột xuất'],
      en: ['A worker asked to cancel last minute', 'approve a cancellation request', 'reject cancellation request'],
    },
    keywords: ['yeu cau huy', 'xin huy', 'chap nhan', 'tu choi yeu cau', 'cancellation request'],
    answer: {
      vi: 'Trong vòng 3 giờ trước ca, người lao động muốn huỷ phải gửi yêu cầu; đơn chuyển sang "Yêu cầu huỷ" và họ vẫn giữ chỗ. Bạn mở trang quản lý ca và bấm "Chấp nhận huỷ" hoặc "Từ chối huỷ". Từ chối thì người đó vẫn là người làm ca; không đến sẽ bị tính vắng mặt.',
      en: 'Within 3 hours of the shift, a worker who wants out must send a request; the application becomes "Cancellation requested" and they keep the slot. Open the shift page and tap "Accept cancellation" or "Reject cancellation". If rejected they remain on the shift; not showing up counts as a no-show.',
    },
    links: [L.employerDash],
  },
  {
    id: 'employer-mark-present',
    category: 'applicants',
    roles: ['employer'],
    questions: {
      vi: ['Xác nhận người lao động có mặt như thế nào?', 'diem danh nhan vien', 'nld quen check in thi sao', 'xac nhan co mat', 'nhân viên tới rồi mà chưa check in'],
      en: ['How do I mark a worker present?', 'worker forgot to check in', 'confirm attendance'],
    },
    keywords: ['xac nhan co mat', 'co mat', 'diem danh', 'quen check in', 'mark present', 'attendance'],
    answer: {
      vi: 'Ngày làm, người lao động check-in khi tới; bạn xác nhận có mặt từng người trên trang quản lý ca. Nếu họ quên hoặc không tự check-in được, bạn vẫn bấm "Xác nhận có mặt" để ghi nhận. Xác nhận có mặt không làm ca bắt đầu sớm.',
      en: 'On the day, workers check in on arrival; you confirm each one as present on the shift page. If they forgot or could not check in, you can still tap "Mark present". Marking present does not start the shift early.',
    },
    links: [L.employerApplicants],
  },
  {
    id: 'employer-no-show',
    category: 'applicants',
    roles: ['employer'],
    questions: {
      vi: ['Người lao động không đến thì nhà tuyển dụng làm gì?', 'nld bom ca', 'người làm không đến thì tiền cọc của tôi thế nào', 'danh dau vang mat', 'nhan vien khong toi', 'người làm không đến có được hoàn tiền không'],
      en: ['A worker didn’t show up', 'mark a no-show', 'refund for absent worker'],
    },
    keywords: ['vang mat', 'danh dau vang', 'khong den', 'bom ca', 'no show', 'absent'],
    answer: {
      vi: 'Sau giờ bắt đầu ca 15 phút, bạn bấm "Đánh dấu vắng mặt" cho người không đến. Người đó không nhận tiền công, phần tiền giữ cho vị trí đó hoàn về ví (mô phỏng), và bạn được tặng 1 lượt boost cho ca sau. Nếu họ chỉ đến muộn, dùng "Đến muộn - chuyển sang có mặt".',
      en: '15 minutes after the start time, tap "Mark no-show" for anyone who did not come. They get no wage, that slot’s held money returns to your wallet (simulated), and you get 1 boost for your next shift. If they were just late, use "Arrived late - mark present".',
      live: {
        vi: 'Sau giờ bắt đầu ca 15 phút, bạn bấm "Đánh dấu vắng mặt" cho người không đến. Người đó không nhận tiền công; phần tiền giữ cho vị trí đó, kể cả phí, hoàn về ví của bạn khi ca chốt. Nếu họ có cọc ứng tuyển, cọc chuyển cho bạn sau thời gian chờ xử lý (một số trường hợp do quản trị viên xem xét). Họ chỉ đến muộn thì dùng "Đến muộn - chuyển sang có mặt".',
        en: '15 minutes after the start time, tap "Mark no-show" for anyone who did not come. They get no wage; that slot’s held money, fee included, returns to your wallet when the shift settles. If they paid an application deposit, it goes to you after a processing period (some cases are reviewed by an admin). If they were just late, use "Arrived late - mark present".',
      },
    },
    links: [L.employerApplicants, L.employerPayments],
  },
  {
    id: 'employer-confirm',
    category: 'applicants',
    roles: ['employer'],
    questions: {
      vi: ['Xác nhận hoàn thành ca để trả công như thế nào?', 'tra luong cho nld', 'bam xac nhan hoan thanh', 'thanh toan cho nhan vien sau ca', 'xác nhận xong ca'],
      en: ['How do I confirm completion and pay?', 'pay my workers', 'confirm shift done'],
    },
    keywords: ['xac nhan hoan thanh', 'tra luong', 'tra cong', 'thanh toan', 'confirm completion', 'pay workers'],
    answer: {
      vi: 'Sau giờ kết thúc, mở trang quản lý ca và bấm "Xác nhận hoàn thành" cho từng người: khoản tiền giữ chuyển thành tiền công vào ví người làm (mô phỏng). Người không đến thì bấm "Đánh dấu vắng mặt".',
      en: 'After the end time, open the shift page and tap "Confirm completion" for each worker: the held money becomes their wage in their wallet (simulated). For anyone absent, tap "Mark no-show".',
      live: {
        vi: 'Sau giờ kết thúc, mở trang quản lý ca và bấm "Xác nhận hoàn thành" cho từng người: tiền công vào ví người đó ngay. Không ai bấm thì hệ thống tự xác nhận 24 giờ sau khi ca kết thúc. Ai không đến thì bấm "Đánh dấu vắng mặt": phần tiền giữ cho vị trí đó hoàn về ví của bạn.',
        en: 'After the end time, open the shift page and tap "Confirm completion" for each worker: the wage lands in their wallet instantly. If nobody does, the system confirms 24 hours after the end. For anyone absent, tap "Mark no-show": that slot’s held money returns to your wallet.',
      },
    },
    links: [L.employerApplicants, L.employerPayments],
  },
  {
    id: 'employer-late-arrival',
    category: 'applicants',
    roles: ['employer'],
    questions: {
      vi: ['Người lao động đến muộn mà tôi lỡ đánh dấu vắng mặt thì sửa thế nào?', 'nld den tre', 'danh nham vang mat', 'chuyen tu vang sang co mat', 'nhân viên tới trễ 20 phút'],
      en: ['A worker arrived late but I marked them absent', 'undo a no-show', 'late worker'],
    },
    keywords: ['den muon', 'den tre', 'danh nham', 'chuyen sang co mat', 'hoan tac', 'late worker', 'undo no show'],
    answer: {
      vi: 'Trên thẻ người lao động, bấm "Đến muộn - chuyển sang có mặt" để chuyển từ vắng mặt sang có mặt: ca tiếp tục bình thường và điểm uy tín của người lao động được hoàn lại. Không chuyển được khi ca đã chốt hoặc đơn không còn ở trạng thái vắng mặt.',
      en: 'On the worker’s card, tap "Arrived late - mark present" to switch them from no-show to present: the shift continues normally and the worker’s reputation is restored. It is not possible once the shift has settled or the application is no longer a no-show.',
      live: {
        vi: 'Trên thẻ người lao động, bấm "Đến muộn - chuyển sang có mặt" và ghi lý do: đơn chuyển từ vắng mặt sang có mặt và ca tiếp tục bình thường. Không chuyển được khi ca đã chốt.',
        en: 'On the worker’s card, tap "Arrived late - mark present" and give a reason: the application switches from no-show to present and the shift continues normally. It is not possible once the shift has settled.',
      },
    },
    links: [L.employerApplicants],
  },
  {
    id: 'applicants-how-many',
    category: 'applicants',
    roles: ['employer'],
    questions: {
      vi: ['Được duyệt tối đa bao nhiêu người cho một ca?', 'duyet qua so nguoi can', 'ca da du nguoi muon nhan them', 'duyet them nguoi du phong', 'nhận thêm người dự bị', 'duyệt được mấy người'],
      en: ['How many people can I approve for a shift?', 'approve more than needed', 'add a backup worker'],
    },
    keywords: ['may nguoi', 'so nguoi can', 'du nguoi', 'nhan them', 'du phong', 'du bi', 'how many', 'backup'],
    answer: {
      vi: 'Số người được duyệt tương ứng "Số lượng người cần" của ca; duyệt đủ thì ca chuyển sang đủ người và không nhận thêm đơn. Muốn thêm người, tăng số lượng trong thời hạn được sửa ca (hơn 24 giờ trước ca) và trong phạm vi tiền đã giữ; nếu không đủ thì đăng thêm một ca mới.',
      en: 'Approvals match the shift’s "People needed"; once filled, the shift is full and takes no more applications. To add people, raise the number within the edit window (more than 24 hours before) and within the money already held; otherwise post an extra shift.',
    },
    links: [L.employerDash],
  },
  {
    id: 'employer-schedule',
    category: 'applicants',
    roles: ['employer'],
    questions: {
      vi: ['Lịch tuyển dụng của nhà tuyển dụng xem thế nào?', 'xem cac ca da dang theo tuan', 'lich ca cua quan', 'lịch tuyển dụng theo ngày', 'xem lich ca cua cua hang'],
      en: ['How do I see my posted shifts on a calendar?', 'hiring calendar', 'weekly view of shifts'],
    },
    keywords: ['lich tuyen dung', 'theo tuan', 'theo ngay', 'lich ca', 'hiring calendar', 'calendar'],
    answer: {
      vi: 'Vào "Lịch tuyển dụng" để xem các ca đã đăng theo tuần hoặc theo ngày; bấm vào một ca là tới trang quản lý ca đó.',
      en: 'Open "Hiring calendar" to see posted shifts by week or by day; tap a shift to go to its management page.',
    },
    links: [L.employerSchedule],
  },
  {
    id: 'employer-dashboard-tiles',
    category: 'applicants',
    roles: ['employer'],
    questions: {
      vi: ['Các ô trên trang Tổng quan nhà tuyển dụng nghĩa là gì?', 'ca da dang la gi', 'ca da hoan thanh tinh the nao', 'don cho duyet', 'khoi ca lam sap toi', 'o tien cong da tra la gi', 'tong tien cong cho thanh toan o dau'],
      en: ['What do the employer dashboard tiles mean?', 'posted shifts count', 'upcoming shifts section'],
    },
    keywords: ['ca da dang', 'ca da hoan thanh', 'ca lam sap toi', 'don cho duyet', 'tien cong da tra', 'tong tien cong', 'dashboard tiles'],
    answer: {
      vi: '"Ca đã đăng": mọi ca bạn từng tạo. "Ca đã hoàn thành": ca bạn đã xác nhận xong. Khối "Ca làm sắp tới" và "Đơn chờ duyệt" kèm số đếm ở tiêu đề. Bản demo có thêm ô "Tiền công đã trả"; ở bản chính thức tiền nằm trong Ví.',
      en: '"Posted shifts": every shift you created. "Completed shifts": shifts you confirmed as done. The "Upcoming shifts" and "Pending applications" sections show their counts in the title. The demo also has a "Wages paid" tile; on the official site money is shown in your Wallet.',
    },
    links: [L.guideEmployerItems, L.employerDash],
  },
  {
    id: 'employer-profile',
    category: 'applicants',
    roles: ['employer'],
    questions: {
      vi: ['Hồ sơ doanh nghiệp gồm gì, người lao động thấy gì về quán?', 'cap nhat ho so doanh nghiep', 'thong tin cua hang', 'nld xem duoc gi ve ntd', 'sửa tên quán'],
      en: ['What is in my business profile?', 'what workers see about my shop', 'edit business info'],
    },
    keywords: ['ho so doanh nghiep', 'thong tin quan', 'ten cong ty', 'cua hang', 'business profile', 'shop info'],
    answer: {
      vi: 'Hồ sơ doanh nghiệp có tên công ty / cơ sở, loại hình kinh doanh, loại tài khoản và trạng thái xác thực. Người lao động xem hồ sơ cùng đánh giá sao từ những người đã làm ca của bạn. Bạn sửa thông tin trong menu tài khoản → "Hồ sơ doanh nghiệp".',
      en: 'Your business profile shows the company / shop name, business type, account type and verification status. Workers see it along with star reviews from people who worked your shifts. Edit it via the account menu → "Business profile".',
    },
    links: [L.employerProfile],
  },
];

// ---------------------------------------------------------------------------
// Đánh giá
// ---------------------------------------------------------------------------

const REVIEWS: SupportEntry[] = [
  {
    id: 'review-how',
    category: 'reviews',
    questions: {
      vi: ['Đánh giá sau ca làm như thế nào?', 'cham sao cho quan', 'danh gia nguoi lao dong', 'viet nhan xet sau ca', 'đánh giá trong bao lâu'],
      en: ['How do reviews work after a shift?', 'rate the employer', 'leave a review'],
    },
    keywords: ['danh gia', 'cham sao', 'nhan xet', 'sao', '14 ngay', 'review', 'rating', 'stars'],
    answer: {
      vi: 'Trong 14 ngày sau khi ca kết thúc, hai bên chấm nhau từ 1 tới 5 sao và có thể viết nhận xét: quán chấm người lao động và người lao động chấm quán. Chỉ đánh giá được khi ca đã được xác nhận hoàn thành. Nhận xét cụ thể ("Pha chế nhanh, gọn quầy") hữu ích hơn "Tốt": nên nói về đúng giờ, thái độ, chất lượng công việc, giao tiếp.',
      en: 'Within 14 days after the shift ends, both sides rate each other 1–5 stars and may add a comment. You can only review once the shift is confirmed complete. Specific comments ("Fast drinks, tidy counter") help more than "Good": cover punctuality, attitude, quality and communication.',
    },
    links: [L.employerReviews, L.workerReputation],
  },
  {
    id: 'review-edit',
    category: 'reviews',
    questions: {
      vi: ['Gửi đánh giá rồi có sửa hay xoá được không?', 'sua danh gia', 'cham nham sao', 'xoa nhan xet da gui', 'qua 14 ngay co danh gia duoc khong'],
      en: ['Can I edit or delete a review?', 'I gave the wrong stars', 'review after 14 days'],
    },
    keywords: ['sua danh gia', 'xoa danh gia', 'cham nham', 'qua han', 'edit review', 'delete review'],
    answer: {
      vi: 'Không. Đánh giá gửi rồi không sửa được, và mỗi chiều chỉ đánh giá một lần cho mỗi ca. Quá 14 ngày sau khi ca kết thúc thì không đánh giá được nữa. Hãy kiểm tra số sao trước khi bấm gửi.',
      en: 'No. Reviews cannot be edited once sent, and each side reviews a shift only once. After 14 days from the shift end you can no longer review. Check the stars before sending.',
    },
    links: [L.employerReviews],
  },
  {
    id: 'review-unfair',
    category: 'reviews',
    questions: {
      vi: ['Bị đánh giá thấp oan, sai sự thật thì làm sao?', 'bi cham 1 sao oan', 'nhan xet sai su that', 'danh gia xau', 'khiếu nại đánh giá'],
      en: ['I got an unfair low rating', 'false review', 'complain about a review'],
    },
    keywords: ['danh gia thap', 'sai su that', 'mot sao', 'danh gia xau', 'oan', 'unfair review', 'bad rating'],
    answer: {
      vi: 'Đánh giá không sửa được, nhưng nếu nội dung sai sự thật, xúc phạm hoặc đi kèm hành vi không phù hợp, bạn liên hệ đội hỗ trợ CaLẻ (ghi mã ca, mô tả sự việc, ảnh chụp) để quản trị viên xem xét. Gặp hành vi mất an toàn thì đừng chỉ chấm sao thấp, hãy báo ngay.',
      en: 'Reviews cannot be edited, but if one is false, abusive or tied to misconduct, contact CaLẻ support (shift code, what happened, screenshots) for an admin to review. For unsafe behaviour, do not just leave a low rating — report it.',
    },
    links: [L.support, L.disputes],
  },
];

// ---------------------------------------------------------------------------
// Chat theo đơn ứng tuyển (0035)
// ---------------------------------------------------------------------------

const CHAT: SupportEntry[] = [
  {
    id: 'chat-how',
    category: 'chat',
    questions: {
      vi: ['Nhắn tin với nhà tuyển dụng hoặc người lao động ở đâu?', 'chat voi ntd', 'nhan tin hoi cho gui xe', 'lien lac voi quan truoc ca', 'được duyệt rồi thì nhắn tin cho quán thế nào', 'nói chuyện với chủ quán trước khi làm', 'nhắn tin cho nhân viên', 'co chat trong app khong'],
      en: ['How do I message the employer or worker?', 'chat with employer', 'contact the worker before the shift'],
    },
    keywords: ['nhan tin', 'chat', 'tin nhan', 'trao doi', 'lien lac', 'message', 'contact'],
    answer: {
      vi: 'Mỗi đơn ứng tuyển có một cuộc trò chuyện riêng, mở khi đơn được duyệt. Người lao động bấm "Nhắn với nhà tuyển dụng" trong chi tiết ca; nhà tuyển dụng bấm "Nhắn tin" trên thẻ người lao động ở trang quản lý ca. Dùng để hỏi giờ đến, chỗ gửi xe, đồng phục…; bên kia nhận thông báo khi có tin mới. Bản demo: tin nhắn chỉ lưu trên trình duyệt này.',
      en: 'Each application has its own conversation, opened once the application is approved. Workers tap "Message the employer" on the shift page; employers tap "Message" on the worker’s card in shift management. Use it for arrival time, parking, uniform…; the other side is notified of new messages. Demo: messages are stored in this browser only.',
      live: {
        vi: 'Mỗi đơn ứng tuyển có một cuộc trò chuyện riêng, mở khi đơn được duyệt. Người lao động bấm "Nhắn với nhà tuyển dụng" trong chi tiết ca; nhà tuyển dụng bấm "Nhắn tin" trên thẻ người lao động ở trang quản lý ca. Dùng để hỏi giờ đến, chỗ gửi xe, đồng phục…; bên kia nhận thông báo khi có tin mới.',
        en: 'Each application has its own conversation, opened once the application is approved. Workers tap "Message the employer" on the shift page; employers tap "Message" on the worker’s card in shift management. Use it for arrival time, parking, uniform…; the other side is notified of new messages.',
      },
    },
    links: [L.workerDash, L.employerDash],
  },
  {
    id: 'chat-closed',
    category: 'chat',
    questions: {
      vi: ['Sao tôi không nhắn tin được, cuộc trò chuyện chỉ xem lại được?', 'chat bi dong', 'bao lâu sau ca thì chat đóng lại', 'khong thay nut nhan tin', 'chua duoc duyet co nhan tin duoc khong', 'cuộc trò chuyện đã đóng'],
      en: ['Why can’t I send messages?', 'chat is read-only', 'no message button'],
    },
    keywords: ['khong nhan tin duoc', 'chi doc', 'da dong', 'xem lai', 'chua duyet', 'read only', 'closed chat'],
    answer: {
      vi: 'Chat chỉ có khi đơn từng được duyệt; đơn còn chờ duyệt thì chưa nhắn được. Cuộc trò chuyện đóng (chỉ xem lại) sau 7 ngày kể từ khi ca kết thúc, hoặc khi đơn ứng tuyển / ca làm bị huỷ, vắng mặt hay hết hạn.',
      en: 'Chat exists only once an application has been approved; pending applications cannot message yet. A conversation becomes read-only 7 days after the shift ends, or when the application / shift is cancelled, marked no-show or expired.',
    },
    links: [L.workerDash],
  },
  {
    id: 'chat-limits',
    category: 'chat',
    questions: {
      vi: ['Tin nhắn dài tối đa bao nhiêu ký tự, gửi được ảnh không?', 'gui anh trong chat', 'tin nhan qua dai', 'gui qua nhieu tin nhan hom nay', 'tin nhắn viết được mấy chữ', 'chat co gui file duoc khong'],
      en: ['How long can a message be? Can I send photos?', 'message too long', 'too many messages today'],
    },
    keywords: ['ky tu', 'so chu', 'tin nhan bao nhieu chu', 'qua dai', 'gui anh', 'file', 'gioi han tin', 'tin nhan dai', 'message length', 'photos', 'limit'],
    answer: {
      vi: 'Chat hiện chỉ gửi chữ, tối đa 1000 ký tự mỗi tin; chưa gửi được ảnh hay tệp. Mỗi người gửi tối đa 20 tin / phút và 300 tin / ngày; quá giới hạn thì thử lại sau. Enter để gửi, Shift + Enter để xuống dòng.',
      en: 'Chat is text only, up to 1000 characters per message; photos and files are not supported yet. Each person can send up to 20 messages per minute and 300 per day; over the limit, try again later. Enter sends, Shift + Enter adds a line.',
    },
    links: [],
  },
  {
    id: 'chat-report',
    category: 'chat',
    questions: {
      vi: ['Báo cáo tin nhắn lừa đảo hoặc xúc phạm như thế nào?', 'report tin nhan', 'bi chui trong chat', 'ntd doi chuyen khoan rieng trong chat', 'tố cáo tin nhắn'],
      en: ['How do I report a message?', 'abusive message', 'scam message in chat'],
    },
    keywords: ['bao cao', 'report', 'xuc pham', 'lua dao', 'to cao', 'abusive', 'scam message'],
    answer: {
      vi: 'Bấm "Báo cáo" cạnh tin nhắn, ghi lý do (ví dụ đòi chuyển khoản riêng, lời lẽ xúc phạm) rồi "Gửi báo cáo". Quản trị viên CaLẻ sẽ xem lại cuộc trò chuyện. Chỉ bạn thấy cờ "Đã báo cáo"; bạn không báo cáo được tin của chính mình.',
      en: 'Tap "Report" next to the message, give a reason (e.g. asking for private transfers, insults) and "Send report". A CaLẻ admin will review the conversation. Only you see the "Reported" flag; you cannot report your own messages.',
    },
    links: [L.safety],
  },
  {
    id: 'chat-privacy',
    category: 'chat',
    questions: {
      vi: ['Admin có đọc được tin nhắn của tôi không?', 'tin nhan co rieng tu khong', 'quan tri vien xem chat khi nao', 'ai doc duoc cuoc tro chuyen'],
      en: ['Can admins read my messages?', 'is chat private', 'who can read my chat'],
    },
    keywords: ['admin doc', 'rieng tu', 'ai doc duoc', 'quan tri vien xem', 'private', 'who can read'],
    answer: {
      vi: 'Cuộc trò chuyện chỉ giữa bạn và bên kia của đơn ứng tuyển. Quản trị viên chỉ đọc được khi có tin bị báo cáo chưa xử lý, hoặc khi cọc người lao động của đơn đó đang bị khiếu nại; mỗi lần đọc đều được ghi lại.',
      en: 'A conversation is only between you and the other party of that application. Admins can read it only while a reported message is unresolved, or while that application’s worker deposit is being contested; every access is logged.',
    },
    links: [L.privacy],
  },
  {
    id: 'chat-off-platform',
    category: 'chat',
    questions: {
      vi: ['Sao gửi số điện thoại hay nhắc Zalo trong chat lại hiện cảnh báo?', 'canh bao giao dich ngoai app', 'cho so zalo duoc khong', 'gui stk trong chat', 'có bị chặn khi gửi số tài khoản không'],
      en: ['Why do I see a warning when sharing my phone or Zalo?', 'off-platform warning', 'sharing bank details in chat'],
    },
    keywords: ['zalo', 'telegram', 'canh bao', 'ngoai app', 'so tai khoan', 'momo', 'off platform', 'warning'],
    answer: {
      vi: 'Khi tin có dấu hiệu giao dịch ngoài app (Zalo, Telegram, chuyển khoản, số tài khoản, số điện thoại…), CaLẻ hiện lời nhắc "giữ trao đổi và thanh toán trên CaLẻ" nhưng không chặn tin. Giao dịch ngoài CaLẻ không được ghi nhận và CaLẻ không xử lý được tranh chấp cho nó.',
      en: 'When a message looks like an off-app deal (Zalo, Telegram, bank transfer, account or phone numbers…), CaLẻ shows a reminder to keep talks and payments on CaLẻ but does not block it. Off-platform deals are not recorded and CaLẻ cannot resolve disputes about them.',
    },
    links: [L.safety],
  },
];

// ---------------------------------------------------------------------------
// An toàn, tranh chấp, hỗ trợ, pháp lý
// ---------------------------------------------------------------------------

const SAFETY: SupportEntry[] = [
  {
    id: 'safety-scam',
    category: 'safety',
    questions: {
      vi: ['Có người yêu cầu chuyển tiền trước hoặc đóng phí để nhận ca, có phải lừa đảo không?', 'bi lua dao', 'doi nop tien coc ngoai app', 'nghi ngo lua dao', 'dùng cale có an toàn không', 'ntd bat chuyen khoan truoc', 'ca đáng ngờ'],
      en: ['Someone asked me to pay to get a shift — is it a scam?', 'scam', 'suspicious shift'],
    },
    keywords: ['lua dao', 'scam', 'chuyen tien truoc', 'nop phi', 'nop tien', 'bat nop', 'nhan viec', 'dang ngo', 'gia mao', 'ca gia', 'fraud', 'suspicious'],
    answer: {
      vi: 'Rất có thể. CaLẻ không thu phí người lao động và mọi tiền công đều đi trong ứng dụng; đăng ca giả, mạo danh hoặc đòi thanh toán ngoài nền tảng đều bị cấm. Đừng chuyển tiền cho ai bên ngoài CaLẻ; bấm "Báo cáo" tin nhắn đó hoặc gửi ảnh chụp cho đội hỗ trợ.',
      en: 'Very likely. CaLẻ charges workers nothing and all wages go through the app; fake shifts, impersonation or asking for off-platform payment are prohibited. Never send money to anyone outside CaLẻ; "Report" that message or send screenshots to support.',
    },
    links: [L.safety, L.support],
  },
  {
    id: 'safety-danger',
    category: 'safety',
    questions: {
      vi: ['Gặp nguy hiểm hoặc bị quấy rối trong ca thì làm gì?', 'bi quay roi khi di lam', 'cảm thấy không an toàn ở chỗ làm', 'bi de doa', 'gặp sự cố trong ca'],
      en: ['I feel unsafe during a shift', 'harassment at work', 'what to do in an emergency'],
    },
    keywords: ['nguy hiem', 'quay roi', 'chui mang', 'xuc pham', 'khong an toan', 'de doa', '113', 'su co', 'unsafe', 'harassment', 'emergency'],
    answer: {
      vi: 'Ưu tiên an toàn: rời khỏi địa điểm và gọi 113 trước, rồi mới báo cho CaLẻ. Ghi lại sự việc (ảnh chụp màn hình ca, giờ check-in / check-out, ảnh bàn giao nếu có), sau đó bấm "Khiếu nại" trong chi tiết ca (bản demo) hoặc liên hệ đội hỗ trợ.',
      en: 'Safety first: leave the place and call 113 first, then tell CaLẻ. Record what happened (screenshots, check-in / check-out times, handover photos), then tap "Dispute" on the shift page (demo) or contact support.',
      live: {
        vi: 'Ưu tiên an toàn: rời khỏi địa điểm và gọi 113 trước, rồi mới báo cho CaLẻ. Ghi lại sự việc (ảnh chụp màn hình ca, giờ check-in / check-out, ảnh bàn giao nếu có), sau đó gửi email cho đội hỗ trợ kèm vai trò, mã ca và thời điểm xảy ra.',
        en: 'Safety first: leave the place and call 113 first, then tell CaLẻ. Record what happened (screenshots, check-in / check-out times, handover photos), then email support with your role, the shift code and when it happened.',
      },
    },
    links: [L.safety, L.support],
  },
  {
    id: 'dispute-how',
    category: 'dispute',
    questions: {
      vi: ['Khiếu nại hoặc báo cáo sự cố về một ca làm như thế nào?', 'mo tranh chap', 'khieu nai ntd', 'phản ánh người lao động làm sai', 'bao cao su co', 'cong viec khac mo ta', 'báo cáo nhà tuyển dụng hoặc người lao động vi phạm'],
      en: ['How do I file a complaint about a shift?', 'open a dispute', 'report a problem'],
    },
    keywords: ['khieu nai', 'tranh chap', 'bao cao su co', 'phan anh', 'mau thuan', 'complaint', 'dispute', 'report problem'],
    answer: {
      vi: 'Mở chi tiết ca và bấm "Khiếu nại" / "Báo cáo sự cố" (người lao động sau khi check-out, nhà tuyển dụng ở khung xác nhận hoàn thành). Mô tả sự việc, thời điểm và đính kèm chứng cứ (ảnh màn hình, giờ check-in / check-out). Quản trị viên xem giải trình hai bên và quyết định theo Chính sách xử lý tranh chấp.',
      en: 'Open the shift and tap "Dispute" / "Report a problem" (workers after check-out, employers in the completion box). Describe what happened and when, and attach evidence (screenshots, check-in / check-out times). An admin reviews both sides under the Dispute policy.',
      live: {
        vi: 'Bản hiện tại chưa có nút khiếu nại trong ứng dụng: bạn gửi email cho đội hỗ trợ CaLẻ, ghi vai trò, mã ca, thời điểm xảy ra, mô tả sự việc và đính kèm ảnh (ảnh bàn giao, giờ check-in). Đội ngũ CaLẻ liên hệ hai bên, đối chiếu lịch sử ca và trả lời qua email.',
        en: 'There is no in-app complaint button yet: email the CaLẻ support team with your role, the shift code, when it happened, a description and photos (handover, check-in time). The CaLẻ team contacts both sides, checks the shift history and replies by email.',
      },
    },
    links: [L.disputes, L.support],
  },
  {
    id: 'dispute-decision',
    category: 'dispute',
    questions: {
      vi: ['Không đồng ý với quyết định xử lý tranh chấp thì làm sao?', 'phan hoi quyet dinh', 'xem xet lai tranh chap', 'khang nghi ket qua', 'kết quả khiếu nại chưa thoả đáng'],
      en: ['I disagree with the dispute decision', 'appeal a decision', 'review the outcome again'],
    },
    keywords: ['quyet dinh', 'khang nghi', 'xem xet lai', 'phan hoi', 'ket qua', 'appeal', 'decision'],
    answer: {
      vi: 'Theo Chính sách xử lý tranh chấp, bạn gửi phản hồi bằng văn bản qua email hỗ trợ của CaLẻ; quản trị viên cấp cao sẽ xem xét lại trong vòng 7 ngày. Quyết định có thể là trả tiền cho người lao động, hoàn cho nhà tuyển dụng hoặc giải pháp khác phù hợp.',
      en: 'Under the Dispute policy, send a written response to CaLẻ’s support email; a senior admin will review it within 7 days. Outcomes can be paying the worker, refunding the employer or another fair solution.',
    },
    links: [L.disputes, L.support],
  },
  {
    id: 'support-contact',
    category: 'support',
    questions: {
      vi: ['Liên hệ đội hỗ trợ CaLẻ bằng cách nào?', 'so hotline cale', 'email ho tro', 'gio lam viec cua cskh', 'goi dien cho ai', 'liên hệ admin'],
      en: ['How do I contact CaLẻ support?', 'support hotline', 'support email and hours'],
    },
    keywords: ['lien he', 'hotline', 'tong dai', 'so dien thoai ho tro', 'email ho tro', 'goi dien', 'gio truc', 'ho tro', 'contact', 'support', 'phone number'],
    answer: {
      vi: 'Hotline 0868325698 (08:00 – 20:00, Thứ Hai đến Thứ Bảy) hoặc email nguyenphuonganh98113@gmail.com; ngoài giờ, gửi email và đội ngũ phản hồi trong vòng 24 giờ vào ngày làm việc. Ghi rõ vai trò (người lao động hoặc nhà tuyển dụng), email đăng ký và mã ca liên quan để được xử lý nhanh hơn. Các kênh khác có ở tab Liên hệ trong bong bóng chat.',
      en: 'Hotline 0868325698 (08:00 – 20:00, Monday to Saturday) or email nguyenphuonganh98113@gmail.com; outside hours, email us and we reply within 24 hours on working days. Include your role (worker or employer), account email and the shift code so we can help faster. Other channels are in the Contact tab of this chat bubble.',
    },
    links: [L.support],
  },
  {
    id: 'support-feedback',
    category: 'support',
    questions: {
      vi: ['Muốn góp ý hoặc đề xuất tính năng cho CaLẻ', 'gop y san pham', 'bao loi app', 'de xuat cai tien', 'phản hồi về ứng dụng'],
      en: ['I want to give feedback or suggest a feature', 'report a bug', 'product suggestion'],
    },
    keywords: ['gop y', 'de xuat', 'y tuong', 'bao loi', 'cai tien', 'feedback', 'suggestion', 'bug'],
    answer: {
      vi: 'CaLẻ rất mong nhận phản hồi từ người dùng thực tế. Gửi ý tưởng, lỗi gặp phải (kèm ảnh chụp màn hình và thao tác trước đó) qua email hỗ trợ ở trang Liên hệ hỗ trợ.',
      en: 'CaLẻ would love feedback from real users. Send ideas or bugs (with screenshots and what you did before) to the support email on the Support page.',
    },
    links: [L.support],
  },
  {
    id: 'support-guides',
    category: 'support',
    questions: {
      vi: ['Có tài liệu hướng dẫn sử dụng hay cẩm nang làm việc không?', 'huong dan su dung o dau', 'cam nang lam viec', 'doc them huong dan', 'câu hỏi thường gặp ở đâu'],
      en: ['Is there a user guide or handbook?', 'where are the help articles', 'FAQ page'],
    },
    keywords: ['huong dan su dung', 'cam nang', 'tai lieu', 'bai viet', 'cau hoi thuong gap', 'user guide', 'handbook', 'faq'],
    answer: {
      vi: 'Có. "Hướng dẫn sử dụng" giải thích 5 bước cho mỗi vai trò và từng ô trên trang Tổng quan; "Cẩm nang làm việc" có bài về bằng chứng khi check-out, tiền giữ, phí và hoàn tiền; "Câu hỏi thường gặp" gom các câu hay hỏi nhất.',
      en: 'Yes. The "User guide" explains 5 steps per role and every Dashboard tile; the "Work handbook" has articles on check-out evidence, holds, fees and refunds; the "FAQ" collects the most common questions.',
    },
    links: [L.guide, L.handbook, L.faq],
  },
  {
    id: 'legal-terms',
    category: 'legal',
    questions: {
      vi: ['Điều khoản sử dụng của CaLẻ có gì quan trọng?', 'dieu khoan su dung', 'hanh vi bi cam tren cale', 'quy dinh cua cale', 'luật chơi trên nền tảng'],
      en: ['What are the key Terms of use?', 'prohibited behaviour', 'platform rules'],
    },
    keywords: ['dieu khoan', 'quy dinh', 'bi cam', 'hanh vi', 'vi pham', 'terms', 'rules', 'prohibited'],
    answer: {
      vi: 'Điều khoản gồm: phạm vi dịch vụ (CaLẻ là nền tảng kết nối), tạo tài khoản (thông tin chính xác, tự bảo mật mật khẩu), hành vi bị cấm (ca giả, mạo danh, giấy tờ giả, thanh toán ngoài nền tảng, quấy rối), giữ cọc và việc thay đổi điều khoản (được thông báo trước).',
      en: 'The Terms cover: service scope (CaLẻ is a connecting platform), accounts (accurate info, keep your password safe), prohibited behaviour (fake shifts, impersonation, fake documents, off-platform payment, harassment), deposits, and changes to the terms (announced in advance).',
    },
    links: [L.terms],
  },
  {
    id: 'legal-privacy',
    category: 'legal',
    questions: {
      vi: ['CaLẻ thu thập và dùng dữ liệu cá nhân của tôi thế nào?', 'chinh sach bao mat', 'cale co ban thong tin khong', 'du lieu cua toi luu o dau', 'bảo mật thông tin cá nhân'],
      en: ['How does CaLẻ use my personal data?', 'privacy policy', 'do you sell my data'],
    },
    keywords: ['bao mat', 'du lieu', 'thong tin ca nhan', 'thu thap', 'ban thong tin', 'privacy', 'personal data'],
    answer: {
      vi: 'CaLẻ thu thập thông tin tài khoản, giấy tờ xác minh (chỉ khi bạn cung cấp) và hoạt động trong ứng dụng, chỉ để vận hành dịch vụ; không bán thông tin cá nhân cho bên thứ ba. Bản demo lưu dữ liệu trong trình duyệt của bạn (localStorage), không gửi lên máy chủ.',
      en: 'CaLẻ collects account info, verification documents (only if you provide them) and in-app activity, only to run the service; it never sells personal data. The demo stores data in your browser (localStorage), not on a server.',
      live: {
        vi: 'CaLẻ thu thập thông tin tài khoản, giấy tờ xác minh, hoạt động và giao dịch, chỉ để vận hành dịch vụ; không bán thông tin cá nhân cho bên thứ ba. Dữ liệu lưu trên máy chủ CaLẻ (Supabase), mỗi người chỉ đọc được phần của mình; nạp / rút qua PayOS, mã SMS qua SpeedSMS; có dùng Google Analytics để đếm lượt xem trang.',
        en: 'CaLẻ collects account info, verification documents, activity and transactions, only to run the service; it never sells personal data. Data is stored on CaLẻ servers (Supabase), each user reads only their own; top-ups / withdrawals go via PayOS, SMS codes via SpeedSMS; Google Analytics counts page views.',
      },
    },
    links: [L.privacy],
  },
];

// ---------------------------------------------------------------------------
// Cài đặt & thông báo
// ---------------------------------------------------------------------------

const SETTINGS: SupportEntry[] = [
  {
    id: 'notifications',
    category: 'settings',
    questions: {
      vi: ['Thông báo của CaLẻ xem ở đâu?', 'chuong thong bao', 'khong nhan duoc thong bao', 'bam thong bao mo ra dau', 'cale có gửi thông báo khi được duyệt không'],
      en: ['Where do I see notifications?', 'notification bell', 'not getting notifications'],
    },
    keywords: ['thong bao', 'chuong', 'bao tin', 'notification', 'bell', 'alerts'],
    answer: {
      vi: 'Thông báo hiện ở biểu tượng chuông trên thanh menu: đơn được duyệt / từ chối, ca sắp bắt đầu, tin nhắn mới… Bấm vào thông báo sẽ mở đúng ca hoặc đơn liên quan. Trạng thái đơn và ca luôn xem được ở trang Tổng quan.',
      en: 'Notifications appear under the bell in the menu bar: approvals / rejections, shifts starting soon, new messages… Tapping one opens the related shift or application. Application and shift statuses are always on your Dashboard.',
      live: {
        vi: 'Bấm nút hỗ trợ tròn ở góc dưới bên phải → tab "Hộp thư" để xem tin nhắn theo ca và thông báo (tin nhắn mới, kết quả kiểm tra giao dịch nạp). Trạng thái đơn và ca luôn xem ở trang Tổng quan; mở lại trang để cập nhật.',
        en: 'Tap the round support button at the bottom right → "Inbox" tab to see per-shift messages and notices (new messages, top-up review results). Application and shift statuses are always on your Dashboard; reload it to refresh.',
      },
    },
    links: [L.workerDash, L.employerDash],
  },
  {
    id: 'language',
    category: 'settings',
    questions: {
      vi: ['Đổi ngôn ngữ sang tiếng Anh như thế nào?', 'web có bản tiếng anh không', 'chuyen sang tieng anh', 'doi ngon ngu', 'co tieng anh khong', 'english version'],
      en: ['How do I switch to English?', 'change language', 'Vietnamese version'],
    },
    keywords: ['ngon ngu', 'tieng anh', 'tieng viet', 'english', 'language', 'vi en'],
    answer: {
      vi: 'Bấm nút quả địa cầu trên thanh menu (ghi "EN" khi đang xem tiếng Việt, "VI" khi đang xem tiếng Anh) để chuyển ngôn ngữ; lựa chọn được nhớ cho lần sau. Một số màn bên trong vẫn đang được dịch nên có thể còn tiếng Việt.',
      en: 'Tap the globe button in the menu bar (it shows "EN" while viewing Vietnamese, "VI" while viewing English) to switch language; your choice is remembered. Some inner screens are still being translated and may show Vietnamese.',
    },
    links: [],
  },
  {
    id: 'dark-mode',
    category: 'settings',
    questions: {
      vi: ['Bật giao diện tối (dark mode) ở đâu?', 'che do toi', 'doi giao dien sang toi', 'nen den', 'tắt giao diện tối'],
      en: ['How do I turn on dark mode?', 'switch to light mode', 'theme'],
    },
    keywords: ['giao dien toi', 'dark mode', 'che do toi', 'nen toi', 'giao dien sang', 'theme', 'light mode'],
    answer: {
      vi: 'Bấm biểu tượng mặt trăng trên thanh menu để chuyển sang giao diện tối, mặt trời để về giao diện sáng. Đổi ngay không cần tải lại và được nhớ cho lần sau.',
      en: 'Tap the moon icon in the menu bar for dark mode, the sun icon for light mode. It switches instantly and is remembered next time.',
    },
    links: [],
  },
];

// ---------------------------------------------------------------------------
// Sự cố thường gặp
// ---------------------------------------------------------------------------

const TROUBLE: SupportEntry[] = [
  {
    id: 'trouble-not-loading',
    category: 'trouble',
    questions: {
      vi: ['Ứng dụng bị lỗi, trang không tải được thì làm sao?', 'web loi', 'app bi treo', 'trang trang khong hien gi', 'bao khong ket noi duoc may chu', 'lag qua'],
      en: ['The app isn’t loading', 'page error', 'cannot connect to server'],
    },
    keywords: ['loi', 'khong tai', 'treo', 'lag', 'trang trang', 'may chu', 'ket noi', 'error', 'not loading', 'crash'],
    answer: {
      vi: 'Thử tải lại trang, kiểm tra kết nối mạng, rồi đăng xuất và đăng nhập lại. Nếu báo "Không kết nối được máy chủ", đợi giây lát rồi thử lại. Vẫn lỗi thì gửi ảnh chụp màn hình, trình duyệt bạn dùng và thao tác trước đó cho đội hỗ trợ.',
      en: 'Reload the page, check your connection, then log out and back in. If it says it cannot connect to the server, wait a moment and retry. Still broken? Send support a screenshot, your browser and what you did before.',
    },
    links: [L.support],
  },
  {
    id: 'trouble-cannot-login',
    category: 'trouble',
    questions: {
      vi: ['Không đăng nhập được, báo sai email hoặc mật khẩu', 'dang nhap khong duoc', 'sai mat khau hoai', 'bị báo thử lại quá nhiều lần', 'khong vao duoc tai khoan'],
      en: ['I can’t log in', 'wrong email or password', 'too many attempts'],
    },
    keywords: ['khong dang nhap duoc', 'sai mat khau', 'sai email', 'qua nhieu lan', 'cannot log in', 'wrong password'],
    answer: {
      vi: 'Kiểm tra email và mật khẩu (phân biệt hoa thường). Bản demo: các tài khoản demo dùng mật khẩu "demo", bấm vào khung "Tài khoản demo" để điền sẵn. Nếu báo thử lại quá nhiều lần, đợi ít phút. Tài khoản bị tạm khoá thì liên hệ quản trị viên.',
      en: 'Check your email and password (case-sensitive). Demo: demo accounts use the password "demo"; tap the "Demo accounts" box to fill one in. If it says too many attempts, wait a few minutes. Suspended accounts need to contact an admin.',
      live: {
        vi: 'Kiểm tra email và mật khẩu (phân biệt hoa thường). Nếu từng đăng ký bằng Google, bấm "Tiếp tục với Google". Mới đăng ký thì nhớ xác nhận email trước. Quên mật khẩu dùng "Quên mật khẩu?"; báo thử lại quá nhiều lần thì đợi ít phút. Tài khoản bị tạm khoá thì liên hệ quản trị viên.',
        en: 'Check your email and password (case-sensitive). If you signed up with Google, tap "Continue with Google". New accounts must confirm their email first. Forgot it? Use "Forgot password?"; too many attempts, wait a few minutes. Suspended accounts need to contact an admin.',
      },
    },
    links: [L.login, L.forgot],
  },
  {
    id: 'trouble-demo-data',
    category: 'trouble',
    questions: {
      vi: ['Dữ liệu của tôi bị mất hoặc quay về ban đầu', 'mat het du lieu', 'ca da dang bien mat het', 'xoa lich su trinh duyet bi mat', 'đổi máy không thấy dữ liệu'],
      en: ['My data disappeared or reset', 'lost everything', 'data gone on another device'],
    },
    keywords: ['mat du lieu', 'reset', 'ban dau', 'trinh duyet', 'doi may', 'localstorage', 'data lost'],
    answer: {
      vi: 'Bản demo lưu dữ liệu trong trình duyệt (localStorage) trên máy này. Xoá dữ liệu trình duyệt, dùng tab ẩn danh hoặc đổi máy / trình duyệt thì dữ liệu trở về trạng thái khởi tạo; đây là giới hạn của bản demo.',
      en: 'The demo stores data in this browser (localStorage). Clearing browser data, using a private tab or switching device / browser resets it to the starting state; that is a demo limitation.',
      live: {
        vi: 'Bản chính thức lưu dữ liệu tài khoản, ca làm và giao dịch trên máy chủ, nên đăng nhập ở máy nào cũng thấy. Nếu thấy thiếu, tải lại trang và kiểm tra đúng tài khoản; vẫn thiếu thì liên hệ đội hỗ trợ kèm email đăng ký.',
        en: 'The official site stores accounts, shifts and transactions on the server, so they appear on any device you log into. If something is missing, reload and check you are on the right account; still missing, contact support with your account email.',
      },
    },
    links: [L.privacy, L.support],
  },
  {
    id: 'trouble-button-missing',
    category: 'trouble',
    questions: {
      vi: ['Không thấy nút check-in / check-out / xác nhận trên trang', 'mat nut check in', 'nut bi an', 'khong bam duoc nut', 'nút xác nhận hoàn thành không hiện'],
      en: ['A button is missing (check-in / check-out / confirm)', 'button greyed out', 'can’t find the button'],
    },
    keywords: ['khong thay nut', 'mat nut', 'nut an', 'nut xam', 'button missing', 'greyed out'],
    answer: {
      vi: 'Các nút hiện theo giờ: Check-in từ 15 phút trước tới 15 phút sau giờ bắt đầu; Check-out chỉ sau giờ kết thúc và khi đã check-in; Xác nhận hoàn thành sau giờ kết thúc. Kiểm tra đúng ca, đúng tài khoản và tải lại trang để đồng bộ trạng thái.',
      en: 'Buttons follow the clock: Check-in from 15 minutes before to 15 minutes after start; Check-out only after the end and once checked in; Confirm completion after the end time. Check you are on the right shift and account, then reload to sync.',
    },
    links: [L.workerDash, L.employerDash],
  },
];

// ---------------------------------------------------------------------------
// Quản trị viên
// ---------------------------------------------------------------------------

const ADMIN: SupportEntry[] = [
  {
    id: 'admin-overview',
    category: 'admin',
    roles: ['admin'],
    questions: {
      vi: ['Quản trị viên làm được những gì trên CaLẻ?', 'trang admin co gi', 'quyen cua admin', 'quan tri vien xu ly gi', 'admin dashboard'],
      en: ['What can admins do?', 'admin features', 'admin dashboard'],
    },
    keywords: ['quan tri vien', 'admin', 'trang quan tri', 'quyen admin', 'admin dashboard'],
    answer: {
      vi: 'Trang quản trị có: duyệt xác minh CCCD, quản lý tài khoản (tạo / khoá / mở khoá / xoá; tài khoản đã có giao dịch tiền thì không xoá được, chỉ khoá), xem ca làm, kiểm tra giao dịch nạp lệch, cài đặt xác thực, thưởng nạp ví, đợt miễn phí và cọc người lao động. Xử lý tranh chấp và điều chỉnh điểm uy tín chỉ có ở bản demo. Xem lại tin nhắn chat bị báo cáo đã có hàm trên máy chủ nhưng chưa có màn hình riêng.',
      en: 'The admin area covers: ID verification review, account management (create / suspend / reactivate / delete; accounts with money history cannot be deleted, only suspended), shifts, mismatched top-up review, verification settings, top-up bonus, fee-free periods and worker deposits. Disputes and reputation adjustments exist only in the demo. Reviewing reported chat messages exists as server functions but has no dedicated screen yet.',
    },
    links: [L.adminDash],
  },
  {
    id: 'admin-verify-ids',
    category: 'admin',
    roles: ['admin'],
    questions: {
      vi: ['Admin duyệt CCCD của người dùng ở đâu?', 'duyet xac thuc cccd', 'bat buoc xac thuc sdt', 'cai dat xac thuc', 'từ chối cccd kèm lý do'],
      en: ['Where do admins review ID verification?', 'verification settings', 'require phone verification'],
    },
    keywords: ['duyet cccd', 'tab xac thuc', 'cai dat xac thuc', 'bat buoc', 'review ids', 'verification settings'],
    answer: {
      vi: 'Trong trang quản trị, tab "Xác minh": xem hồ sơ CCCD đang chờ, duyệt hoặc từ chối kèm lý do. Khối "Cài đặt xác thực" cho bật "Bắt buộc xác thực SĐT trước khi ứng tuyển / đăng ca" (chỉ bật khi SMS đã gửi được thật) và "Bắt buộc CCCD đã duyệt trước khi nhà tuyển dụng đăng ca".',
      en: 'In the admin area, the "Verification" tab lists pending IDs to approve or reject with a reason. The "Verification settings" block lets you require phone verification before applying / posting (only once SMS really works) and an approved ID before employers post.',
    },
    links: [L.adminDash],
  },
  {
    id: 'admin-payment-review',
    category: 'admin',
    roles: ['admin'],
    questions: {
      vi: ['Admin xử lý giao dịch nạp cần kiểm tra thế nào?', 'giao dich nap lech so tien', 'nghi trung giao dich', 'cong tay vao vi', 'quy chi payos het tien'],
      en: ['How do admins handle top-ups needing review?', 'duplicate payment suspect', 'payout funds low'],
    },
    keywords: ['can kiem tra', 'nap lech', 'nghi trung', 'cong vi', 'quy chi', 'payment review', 'payout funds'],
    answer: {
      vi: 'Giao dịch nạp không khớp đơn hiện trong mục kiểm tra thanh toán: đối chiếu sao kê rồi chọn cộng đúng số tiền PayOS báo nhận (không kèm thưởng) hoặc "Không cộng (đã xử lý ngoài)". Nghi trùng thì không cộng tiếp. Giao dịch của chính mình phải nhờ quản trị viên khác. Khi quỹ chi PayOS hết tiền, lệnh rút bị từ chối và tự hoàn ví: cần nạp thêm vào tài khoản chi.',
      en: 'Unmatched top-ups appear in payment review: reconcile with the bank statement, then credit exactly what PayOS reported (no bonus) or choose "Do not credit (handled outside)". Suspected duplicates must not be credited again. Your own transactions need another admin. When payout funds run out, withdrawals are rejected and auto-refunded: top up the payout account.',
    },
    links: [L.adminDash],
  },
  {
    id: 'admin-settings',
    category: 'admin',
    roles: ['admin'],
    questions: {
      vi: ['Admin bật cọc người lao động, thưởng nạp ví, đợt miễn phí ở đâu?', 'cai dat thuong nap vi', 'bat tat coc nld', 'tao dot mien phi phi dich vu', 'chinh ti le coc'],
      en: ['Where do admins configure worker deposit, top-up bonus and free periods?', 'platform settings', 'turn on worker deposit'],
    },
    keywords: ['cai dat', 'thuong nap vi', 'coc nguoi lao dong', 'dot mien phi', 'bat tat', 'settings', 'platform settings'],
    answer: {
      vi: 'Trong trang quản trị có các cài đặt nền tảng: thưởng nạp ví (mức nạp tối thiểu, tiền thưởng, số lần tối đa mỗi nhà tuyển dụng; tiền thưởng = 0 là tắt, tối đa 50% mức nạp), đợt miễn phí dịch vụ và cọc người lao động (mặc định tắt; 50% tiền công, tối đa 100.000đ mỗi đơn).',
      en: 'The admin area has platform settings: top-up bonus (minimum top-up, bonus amount, max times per employer; bonus 0 = off, at most 50% of the top-up), fee-free periods, and worker deposits (off by default; 50% of the wage, max 100.000đ per application).',
    },
    links: [L.adminDash],
  },
];

export const SUPPORT_KB: SupportEntry[] = [
  ...ABOUT,
  ...ACCOUNT,
  ...VERIFY,
  ...FIND,
  ...CANCEL,
  ...ATTENDANCE,
  ...PAY,
  ...WORKER_DEPOSIT,
  ...WALLET,
  ...EMPLOYER_POST,
  ...EMPLOYER_MANAGE,
  ...REVIEWS,
  ...CHAT,
  ...SAFETY,
  ...SETTINGS,
  ...TROUBLE,
  ...ADMIN,
];

/** Câu gợi ý hiện sẵn (id mục trong SUPPORT_KB), theo vai trò người đang xem. */
export const SUPPORT_SUGGESTIONS: Record<'worker' | 'employer' | 'guest', string[]> = {
  worker: ['pay-when', 'cancel-worker', 'checkin-how', 'wallet-withdraw', 'apply-cannot'],
  employer: ['post-how', 'pricing-fee', 'applicants-review', 'employer-no-show', 'wallet-topup'],
  guest: ['about-what-is-cale', 'account-register', 'pay-fee-worker', 'pricing-fee', 'support-contact'],
};
