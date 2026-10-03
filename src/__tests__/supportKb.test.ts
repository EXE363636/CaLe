/**
 * Kho hỏi đáp thật của trợ lý hỗ trợ (`src/data/supportKb.ts`):
 *   1. toàn vẹn dữ liệu (id, số câu hỏi, tiền tệ, bản `live` không ghi "mô phỏng"…);
 *   2. hỏi đúng câu đầu tiên của một mục thì ra đúng mục đó;
 *   3. bộ câu hỏi "đời thường" không chép từ kho (không dấu, viết tắt, gõ sai, kèm chào hỏi);
 *   4. câu ngoài phạm vi → fallback; xã giao vẫn chạy với kho thật.
 */
import { describe, expect, it } from 'vitest';

import { SUPPORT_KB, SUPPORT_SUGGESTIONS } from '@/data/supportKb';
import { answerSupportQuestion, type SupportRole, type SupportLocale } from '@/domain/supportBot';

const ask = (q: string, opts: { locale?: SupportLocale; role?: SupportRole; live?: boolean } = {}) =>
  answerSupportQuestion(q, { kb: SUPPORT_KB, locale: opts.locale ?? 'vi', live: opts.live ?? false, role: opts.role });

const idOf = (r: ReturnType<typeof ask>) => (r.kind === 'answer' ? r.entryId : `<${r.kind}>`);

const allTexts = (e: (typeof SUPPORT_KB)[number]) => [
  ...e.questions.vi,
  ...e.questions.en,
  ...e.keywords,
  e.answer.vi,
  e.answer.en,
  e.answer.live?.vi ?? '',
  e.answer.live?.en ?? '',
  ...(e.links ?? []).flatMap((l) => [l.href, l.label.vi, l.label.en]),
];

describe('SUPPORT_KB — toàn vẹn', () => {
  it('có ít nhất 150 mục, id duy nhất dạng kebab-case', () => {
    expect(SUPPORT_KB.length).toBeGreaterThanOrEqual(150);
    const ids = SUPPORT_KB.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it.each(SUPPORT_KB.map((e) => [e.id, e] as const))('%s: đủ câu hỏi, từ khoá, câu trả lời', (_id, e) => {
    expect(e.questions.vi.length).toBeGreaterThanOrEqual(3);
    expect(e.questions.en.length).toBeGreaterThanOrEqual(2);
    expect(e.keywords.length).toBeGreaterThanOrEqual(3);
    expect(e.answer.vi.trim()).not.toBe('');
    expect(e.answer.en.trim()).not.toBe('');
    if (e.answer.live) {
      expect(e.answer.live.vi.trim()).not.toBe('');
      expect(e.answer.live.en.trim()).not.toBe('');
    }
  });

  it('không dùng "VNĐ" / "₫"', () => {
    for (const e of SUPPORT_KB) {
      for (const text of allTexts(e)) {
        expect(text, e.id).not.toMatch(/VNĐ|VND|₫/);
      }
    }
  });

  it('bản production (`live`) không bao giờ ghi "mô phỏng" / "simulat"', () => {
    for (const e of SUPPORT_KB) {
      if (!e.answer.live) continue;
      expect(e.answer.live.vi.toLowerCase(), e.id).not.toContain('mô phỏng');
      expect(e.answer.live.en.toLowerCase(), e.id).not.toContain('simulat');
    }
  });

  it('không hứa thời hạn khiếu nại 72 giờ', () => {
    for (const e of SUPPORT_KB) {
      for (const text of allTexts(e)) expect(text, e.id).not.toMatch(/72\s*(giờ|h|hours)/i);
    }
  });

  it('liên kết là đường dẫn nội bộ bắt đầu bằng "/" và có nhãn hai thứ tiếng', () => {
    for (const e of SUPPORT_KB) {
      for (const l of e.links ?? []) {
        expect(l.href.startsWith('/'), `${e.id} ${l.href}`).toBe(true);
        expect(l.href.startsWith('//')).toBe(false);
        expect(l.label.vi && l.label.en).toBeTruthy();
      }
    }
  });

  it('SUPPORT_SUGGESTIONS: 4–5 id mỗi vai trò, đều có trong kho', () => {
    const ids = new Set(SUPPORT_KB.map((e) => e.id));
    for (const role of ['worker', 'employer', 'guest'] as const) {
      const list = SUPPORT_SUGGESTIONS[role];
      expect(list.length).toBeGreaterThanOrEqual(4);
      expect(list.length).toBeLessThanOrEqual(5);
      for (const id of list) expect(ids.has(id), id).toBe(true);
    }
  });

  it('giữ mục wallet-withdraw (UI dùng làm ví dụ)', () => {
    expect(SUPPORT_KB.some((e) => e.id === 'wallet-withdraw')).toBe(true);
  });
});

describe('SUPPORT_KB — hỏi câu đầu tiên của mục thì ra đúng mục', () => {
  it.each(SUPPORT_KB.map((e) => [e.id, e.questions.vi[0]] as const))('vi %s', (id, q) => {
    expect(idOf(ask(q))).toBe(id);
  });

  it.each(SUPPORT_KB.map((e) => [e.id, e.questions.en[0]] as const))('en %s', (id, q) => {
    expect(idOf(ask(q, { locale: 'en' }))).toBe(id);
  });
});

/** [câu hỏi, id mong đợi, vai trò người hỏi (tuỳ chọn)] — KHÔNG chép nguyên từ kho. */
const HELD_OUT: Array<[string, string, SupportRole?]> = [
  // Giới thiệu
  ['cale la cai gi the', 'about-what-is-cale'],
  ['app nay de lam gi vay ad', 'about-what-is-cale'],
  ['ben ban la cong ty gi', 'about-company'],
  ['chao ad, van phong cale o dau a', 'about-company'],
  ['moi dung lan dau thi bat dau tu buoc nao', 'about-how-it-works'],
  ['tien trong vi la tien that hay tien demo', 'about-demo-or-real'],
  ['giao dich tren nay co that ko', 'about-demo-or-real'],
  ['co nhung viec gi tren cale vay', 'about-job-types'],
  ['co ca pha che ko ad', 'about-job-types'],
  ['ko co kinh nghiem thi co lam dc ko', 'about-experience', 'worker'],
  ['minh 16 tuoi lam duoc khong', 'about-age'],
  ['tai app o dau the', 'about-mobile'],
  ['co app tren ch play khong', 'about-mobile'],
  ['o ha noi co ca khong ad', 'about-areas'],
  ['cale co phai chu lao dong cua minh ko', 'about-not-employer'],
  // Tài khoản
  ['lam sao dk tai khoan', 'account-register'],
  ['mình muốn tạo acc mới', 'account-register'],
  ['dang ky nham vai tro roi', 'account-switch-role'],
  ['ho kinh doanh thi chon loai tai khoan nao', 'account-employer-type', 'employer'],
  ['dn kieu gi vay', 'account-login'],
  ['login bang gmail duoc ko', 'account-google'],
  ['quen mat khau roi giup voi', 'account-forgot-password'],
  ['ko nho pass', 'account-forgot-password'],
  ['link reset mk bao het han', 'account-reset-link'],
  ['khong thay mail xac nhan dang ky', 'account-confirm-email'],
  ['muon doi mk', 'account-change-password'],
  ['sua ten tren ho so o dau', 'account-edit-profile'],
  ['doi so dt moi dc ko', 'account-change-phone'],
  ['xoa acc vinh vien kieu gi', 'account-delete'],
  ['tai khoan minh bi khoa roi', 'account-suspended'],
  ['dang ky bao email da duoc dang ky', 'account-email-taken'],
  ['nut dang xuat o dau', 'account-logout'],
  // Xác thực
  ['xac thuc sdt the nao', 'verify-phone'],
  ['otp ko ve may', 'verify-otp-problem'],
  ['nhap ma otp bao het han', 'verify-otp-problem'],
  ['so cua minh bao da xac thuc boi tai khoan khac', 'verify-phone-in-use'],
  ['gui can cuoc cong dan nhu nao', 'verify-cccd'],
  ['chup cccd may anh', 'verify-cccd'],
  ['ko co cccd thi co ung tuyen dc ko', 'verify-cccd-required', 'worker'],
  ['anh can cuoc co bi lo khong', 'verify-cccd-privacy'],
  ['cccd bi tu choi thi lam sao', 'verify-cccd-status'],
  // Tìm ca & ứng tuyển
  ['tim viec lam them o dau', 'find-shifts', 'worker'],
  ['xem cac ca dang tuyen', 'find-shifts', 'worker'],
  ['loc ca theo quan duoc ko', 'find-filters', 'worker'],
  ['tim ca luong cao nhat', 'find-filters', 'worker'],
  ['sao ko thay ca nao het vay', 'find-no-shifts', 'worker'],
  ['dia chi ca lam xem o dau', 'find-shift-details', 'worker'],
  ['ung tuyen ca kieu gi', 'apply-how', 'worker'],
  ['nhan ca nhu the nao', 'apply-how', 'worker'],
  ['sao minh ko ung tuyen dc', 'apply-cannot', 'worker'],
  ['ca bao du nguoi roi', 'apply-full', 'worker'],
  ['ung tuyen 2 ca trong 1 ngay dc ko', 'apply-multiple', 'worker'],
  ['don cua em duoc duyet chua', 'apply-status', 'worker'],
  ['dang cho duyet ma muon rut don', 'apply-withdraw', 'worker'],
  ['bi ntd tu choi roi', 'apply-rejected', 'worker'],
  ['don ung tuyen bi het han la sao', 'apply-pending-expired', 'worker'],
  ['co can gui cv ko', 'apply-no-cv'],
  ['bao trung lich khi ung tuyen', 'apply-conflict', 'worker'],
  ['ca can the sinh vien thi sao', 'apply-doc-requirement', 'worker'],
  ['them gio hoc vao lich ca nhan', 'schedule-worker', 'worker'],
  // Huỷ ca & uy tín
  ['em muon huy ca da nhan', 'cancel-worker', 'worker'],
  ['chao ad, em bi om khong di lam duoc muon huy ca', 'cancel-worker', 'worker'],
  ['gui yeu cau huy roi ma ntd chua dong y', 'cancel-request-pending', 'worker'],
  ['huy ca co bi tru diem uy tin ko', 'cancel-penalty', 'worker'],
  ['huy co bi phat gi khong', 'cancel-penalty', 'worker'],
  ['con bao nhieu luot huy trong tuan', 'cancel-quota', 'worker'],
  ['ntd huy ca cua em thi sao', 'cancel-by-employer', 'worker'],
  ['diem uy tin tinh the nao', 'reputation-what', 'worker'],
  ['diem uy tin duoi 50 bi khoa', 'reputation-low', 'worker'],
  ['ntd thay duoc gi ve minh', 'reputation-employer-sees', 'worker'],
  ['len cap ky nang kieu gi', 'skills-level', 'worker'],
  // Đi làm
  ['checkin o dau vay', 'checkin-how', 'worker'],
  ['den som 30 phut check in dc ko', 'checkin-window', 'worker'],
  ['tre 20 phut roi chua check in', 'checkin-missed', 'worker'],
  ['check in co dinh vi gps ko', 'checkin-gps'],
  ['lam xong check out o dau', 'checkout-how', 'worker'],
  ['quen check out hom qua', 'checkout-late', 'worker'],
  ['co phai chup anh ban giao khong', 'checkout-evidence', 'worker'],
  ['bom ca thi bi gi', 'noshow-worker', 'worker'],
  ['di lam roi ma bi danh vang mat', 'noshow-wrong', 'worker'],
  ['cho xac nhan nghia la gi', 'shift-status-labels'],
  ['check in roi ma ca van chua dang dien ra', 'shift-not-started'],
  // Tiền công
  ['bao gio co luong', 'pay-when', 'worker'],
  ['lam xong bao lau tien ve vi', 'pay-when', 'worker'],
  ['ntd ko bam xac nhan thi sao', 'pay-auto-confirm'],
  ['luong tinh theo gio nhu nao', 'pay-wage-calc'],
  ['nld co mat phi gi ko', 'pay-fee-worker'],
  ['lam qua cale co bi cat phan tram ko', 'pay-fee-worker', 'worker'],
  ['tong thu nhap ko tang', 'pay-total-income', 'worker'],
  ['nhan tien mat truc tiep dc ko', 'pay-cash'],
  ['lam xong roi ma chua thay tien', 'pay-not-received', 'worker'],
  ['so bi quan quyt tien', 'pay-guarantee', 'worker'],
  // Cọc người lao động
  ['ung tuyen co phai dat coc ko', 'wdeposit-what', 'worker'],
  ['lam sao duoc mien coc', 'wdeposit-exempt', 'worker'],
  ['coc ung tuyen khi nao duoc tra lai', 'wdeposit-refund', 'worker'],
  ['bao dat gioi han khoan coc', 'wdeposit-limit', 'worker'],
  // Ví
  ['vi tien o dau', 'wallet-overview'],
  ['xem so du kieu gi', 'wallet-overview'],
  ['nap tien vao vi sao', 'wallet-topup', 'employer'],
  ['nap toi thieu bao nhieu', 'wallet-topup', 'employer'],
  ['ck nap tien roi ma vi chua cong', 'wallet-topup-missing', 'employer'],
  ['ma qr bi het han', 'wallet-qr-problem', 'employer'],
  ['rut tien ve ngan hang sao', 'wallet-withdraw', 'worker'],
  ['muon rut luong ve stk', 'wallet-withdraw', 'worker'],
  ['rut tien bao lau thi ve', 'wallet-withdraw-time', 'worker'],
  ['rut tien bi that bai', 'wallet-withdraw-failed', 'worker'],
  ['rut tien co mat phi ko', 'wallet-withdraw-fee', 'worker'],
  ['lo nhap sai stk khi rut', 'wallet-wrong-account', 'worker'],
  ['xem lich su giao dich o dau', 'wallet-history'],
  ['tien thuong nap vi rut duoc ko', 'wallet-topup-bonus', 'employer'],
  ['payos co an toan ko', 'wallet-payos'],
  // Nhà tuyển dụng: phí, đăng ca
  ['phi dich vu bao nhieu phan tram', 'pricing-fee', 'employer'],
  ['dang ca co mat tien ko', 'pricing-fee', 'employer'],
  ['ca 4 tieng 2 nguoi thi giu bao nhieu tien', 'pricing-cost-example', 'employer'],
  ['dot mien phi ap dung cho ca nao', 'pricing-free-campaign', 'employer'],
  ['dang ca tuyen nguoi o dau', 'post-how', 'employer'],
  ['muon tuyen 3 nhan vien phuc vu toi nay', 'post-how', 'employer'],
  ['can chuan bi gi truoc khi dang ca', 'post-requirements', 'employer'],
  ['tien coc khi dang ca di dau', 'post-deposit-hold', 'employer'],
  ['vi ko du tien de dang ca', 'post-insufficient', 'employer'],
  ['luu nhap ca de mai dang', 'post-draft', 'employer'],
  ['sua gio ca da dang dc ko', 'post-edit', 'employer'],
  ['muon tang so nguoi cho ca', 'post-edit-positions', 'employer'],
  ['ca thu 7 hang tuan dang lai nhanh', 'post-repost', 'employer'],
  ['bao loi ngay trong qua khu', 'post-date-error', 'employer'],
  ['nguoi phu trach tai cho la ai', 'post-contact-person', 'employer'],
  ['tra luong bao nhieu mot gio la hop ly', 'post-wage-guide', 'employer'],
  ['dang ca lau roi ma ko ai ung tuyen', 'post-no-applicants', 'employer'],
  ['chon muc bang chung nao khi dang ca', 'post-evidence-level', 'employer'],
  ['ntd huy ca da dang duoc ko', 'employer-cancel-shift', 'employer'],
  ['huy ca co mat phi khong', 'employer-cancel-refund', 'employer'],
  ['vi tri trong co duoc hoan tien ko', 'employer-refund-when', 'employer'],
  // Nhà tuyển dụng: quản lý ca
  ['xem ai ung tuyen ca cua toi', 'applicants-review', 'employer'],
  ['tu choi ung vien co can ly do ko', 'applicants-reject', 'employer'],
  ['ca bat dau roi ko duyet them dc', 'applicants-after-start', 'employer'],
  ['nld xin huy sat gio thi xu ly sao', 'applicants-cancel-request', 'employer'],
  ['nhan vien quen check in thi toi lam gi', 'employer-mark-present', 'employer'],
  ['nld ko den thi lam sao', 'employer-no-show', 'employer'],
  ['danh nham vang mat cho nguoi den tre', 'employer-late-arrival', 'employer'],
  ['duyet toi da may nguoi', 'applicants-how-many', 'employer'],
  ['tra luong cho nhan vien sau ca nhu nao', 'employer-confirm', 'employer'],
  ['xem lich cac ca da dang theo tuan', 'employer-schedule', 'employer'],
  ['tong tien cong cho thanh toan la gi', 'employer-dashboard-tiles', 'employer'],
  ['sua ten quan trong ho so doanh nghiep', 'employer-profile', 'employer'],
  // Đánh giá
  ['cham sao cho quan o dau', 'review-how'],
  ['danh gia nham sao sua dc ko', 'review-edit'],
  ['bi cham 1 sao oan qua', 'review-unfair'],
  // Chat
  ['nhan tin cho ntd o dau', 'chat-how', 'worker'],
  ['sao ko chat duoc nua', 'chat-closed'],
  ['gui anh trong chat dc ko', 'chat-limits'],
  ['bao cao tin nhan xuc pham', 'chat-report'],
  ['admin co doc tin nhan cua minh ko', 'chat-privacy'],
  ['gui so zalo bi hien canh bao', 'chat-off-platform'],
  // An toàn, tranh chấp, hỗ trợ
  ['co nguoi doi chuyen tien truoc moi cho nhan ca', 'safety-scam'],
  ['nghi ca nay lua dao', 'safety-scam'],
  ['co nguoi quay roi em luc dang lam ca', 'safety-danger'],
  ['muon khieu nai ntd', 'dispute-how'],
  ['ko dong y ket qua tranh chap', 'dispute-decision'],
  ['hotline ho tro so may vay', 'support-contact'],
  ['cho xin email ho tro', 'support-contact'],
  ['gop y cho cale', 'support-feedback'],
  ['co bai huong dan cach dung app ko', 'support-guides'],
  ['nhung hanh vi nao bi cam', 'legal-terms'],
  ['cale co ban du lieu ca nhan ko', 'legal-privacy'],
  // Cài đặt & sự cố
  ['ko nhan dc thong bao', 'notifications'],
  ['doi sang tieng anh', 'language'],
  ['bat che do toi', 'dark-mode'],
  ['web bi loi ko vao dc', 'trouble-not-loading'],
  ['dang nhap bao sai mat khau hoai', 'trouble-cannot-login'],
  ['mat het du lieu roi', 'trouble-demo-data'],
  ['ko thay nut check out', 'trouble-button-missing'],
  // Quản trị
  ['admin lam duoc gi', 'admin-overview', 'admin'],
  ['duyet cccd cho user o dau', 'admin-verify-ids', 'admin'],
  ['giao dich nap lech so tien xu ly sao', 'admin-payment-review', 'admin'],
  ['bat coc nguoi lao dong o dau', 'admin-settings', 'admin'],
  // Tiếng Anh
  ['hi, how do I get my money out to the bank', 'wallet-withdraw'],
  ['when will i get paid for my shift', 'pay-when'],
  ['how much is the fee for employers', 'pricing-fee'],
  ['i forgot the password for my account', 'account-forgot-password'],
  ['how to post a job', 'post-how'],
  ['can i cancel my shift', 'cancel-worker'],
  // Đợt 2: có dấu, kèm chào hỏi, gõ sai, tiếng lóng
  ['Chào bạn, cho mình hỏi làm xong ca thì khi nào được trả tiền ạ?', 'pay-when', 'worker'],
  ['ad ơi em rút tiền mà mãi chưa thấy về tk ngân hàng', 'wallet-withdraw-time', 'worker'],
  ['alo shop, nạp tiền xong ví vẫn bằng 0', 'wallet-topup-missing', 'employer'],
  ['Em lỡ hẹn không đi làm được, huỷ ca bây giờ có sao không ạ', 'cancel-worker', 'worker'],
  ['hello, sao tôi không đăng ca được nhỉ', 'post-requirements', 'employer'],
  ['quán mình cần 5 bạn phụ bếp cuối tuần, đăng tin kiểu gì', 'post-how', 'employer'],
  ['hệ thống thu phí nhà tuyển dụng bao nhiêu vậy', 'pricing-fee', 'employer'],
  ['làm thế nào để đổi mật khẩu', 'account-change-password'],
  ['mình quên mất mật khẩu đăng nhập rồi', 'account-forgot-password'],
  ['tài khoản bị khoá không rõ lý do', 'account-suspended'],
  ['ung tuyen xong bao lau thi duoc duyet', 'apply-pending-expired', 'worker'],
  ['check-in sớm được không ad', 'checkin-window', 'worker'],
  ['ntd không xác nhận hoàn thành cho em', 'pay-auto-confirm', 'worker'],
  ['người lao động không tới làm thì tiền cọc của tôi sao', 'employer-no-show', 'employer'],
  ['chuyển khoản nhầm số tiền khi nạp ví', 'wallet-topup-missing', 'employer'],
  ['muốn nói chuyện riêng với chủ quán trước khi đi làm', 'chat-how', 'worker'],
  ['tin nhắn tối đa bao nhiêu chữ', 'chat-limits'],
  ['có người nhắn bảo chuyển khoản riêng qua momo', 'chat-report'],
  ['làm sao để xác minh danh tính', 'verify-cccd'],
  ['mã xác thực không gửi tới điện thoại', 'verify-otp-problem'],
  ['tiền thưởng nạp ví dùng vào việc gì', 'wallet-topup-bonus', 'employer'],
  ['đánh giá người lao động sau ca ở đâu', 'review-how', 'employer'],
  ['giao diện tối bật thế nào', 'dark-mode'],
  ['switch language to english', 'language'],
  ['xin số điện thoại tổng đài hỗ trợ', 'support-contact'],
  ['chủ quán bắt nộp 200k mới cho nhận việc', 'safety-scam', 'worker'],
  ['lương phục vụ khoảng bao nhiêu một giờ thì ổn', 'post-wage-guide', 'employer'],
  ['sửa ca được đến lúc nào', 'post-edit', 'employer'],
  ['số dư thưởng không rút được à', 'wallet-topup-bonus', 'employer'],
  ['bao nhiêu điểm thì bị khoá ứng tuyển', 'reputation-low', 'worker'],
  // Đợt 3: đo trên câu chưa từng thấy (40/40 sau khi bổ sung kho)
  ['e ơi cho a hỏi tiền công về ví rồi rút ra kiểu gì', 'wallet-withdraw', 'worker'],
  ['làm 1 ca được bao nhiêu tiền', 'pay-wage-calc', 'worker'],
  ['có cần đóng phí gì để nhận việc không', 'pay-fee-worker', 'worker'],
  ['sao tôi bị trừ điểm uy tín', 'reputation-what', 'worker'],
  ['đã check in mà quên check out giờ làm sao', 'checkout-late', 'worker'],
  ['không bấm được check in', 'checkin-window', 'worker'],
  ['nhà tuyển dụng bắt làm việc khác mô tả', 'dispute-how', 'worker'],
  ['muốn báo cáo một nhà tuyển dụng', 'dispute-how', 'worker'],
  ['được duyệt rồi có nhắn tin với quán được không', 'chat-how', 'worker'],
  ['sau bao lâu thì chat bị đóng', 'chat-closed', 'worker'],
  ['cách tìm ca gần nhà', 'about-areas', 'worker'],
  ['lọc ca theo ngày được không', 'find-filters', 'worker'],
  ['ca ghi chờ xác nhận là sao', 'shift-status-labels', 'worker'],
  ['tôi có thể huỷ đơn khi chưa được duyệt không', 'apply-withdraw', 'worker'],
  ['sao đơn của mình bị từ chối', 'apply-rejected', 'worker'],
  ['điểm uy tín thấp có ứng tuyển được không', 'reputation-low', 'worker'],
  ['đăng ca rồi muốn sửa giờ', 'post-edit', 'employer'],
  ['người lao động xin nghỉ trước 1 tiếng', 'applicants-cancel-request', 'employer'],
  ['ca đã xong bấm xác nhận ở đâu', 'employer-confirm', 'employer'],
  ['sao ví bị trừ tiền khi đăng ca', 'post-deposit-hold', 'employer'],
  ['tiền thừa sau ca có được trả lại không', 'employer-refund-when', 'employer'],
  ['mình muốn nạp 500k vào ví', 'wallet-topup', 'employer'],
  ['phí 10% tính trên gì', 'pricing-fee', 'employer'],
  ['có được miễn phí dịch vụ không', 'pricing-free-campaign', 'employer'],
  ['xoá bản nháp ca', 'post-draft', 'employer'],
  ['ai đã ứng tuyển vào ca của quán', 'applicants-review', 'employer'],
  ['đánh dấu vắng mặt thế nào', 'employer-no-show', 'employer'],
  ['chấm điểm người làm sau ca', 'review-how', 'employer'],
  ['tôi muốn tuyển người làm sự kiện', 'post-how', 'employer'],
  ['đổi loại tài khoản từ cá nhân sang doanh nghiệp', 'account-employer-type', 'employer'],
  ['đăng nhập google bị lỗi', 'account-google'],
  ['mail đặt lại mật khẩu mãi không thấy', 'account-reset-link'],
  ['cale có an toàn không', 'safety-scam'],
  ['dữ liệu của tôi có được bảo mật không', 'legal-privacy'],
  ['giờ làm việc của bộ phận hỗ trợ', 'support-contact'],
  ['web có tiếng anh không', 'language'],
  ['chuyển giao diện sang nền tối', 'dark-mode'],
  ['trang bị trắng không hiện gì', 'trouble-not-loading'],
  ['cccd bị từ chối vì ảnh mờ', 'verify-cccd-status'],
  ['xác minh số điện thoại để làm gì', 'verify-phone'],
  // Đợt 4: câu chưa từng thấy; vài câu mơ hồ nhận mục gần đúng (vd huỷ trước 5 tiếng → quy định huỷ ca)
  ['bao giờ thì tiền lương về tài khoản ví', 'pay-when', 'worker'],
  ['hủy ca trước 5 tiếng có bị gì không', 'cancel-worker', 'worker'],
  ['không đi làm được thì báo ai', 'noshow-worker', 'worker'],
  ['tôi muốn đổi email đăng nhập', 'account-edit-profile'],
  ['sdt cũ không dùng nữa muốn đổi', 'account-change-phone'],
  ['tại sao phải xác thực cccd', 'verify-cccd', 'worker'],
  ['hôm nay có ca nào không', 'find-no-shifts', 'worker'],
  ['ca này yêu cầu gì', 'apply-doc-requirement', 'worker'],
  ['được nhận rồi mà không muốn đi nữa', 'cancel-worker', 'worker'],
  ['đến nơi rồi mà chưa check in được', 'checkin-how', 'worker'],
  ['làm xong phải chụp ảnh gì không', 'checkout-evidence', 'worker'],
  ['tiền về ví rồi rút có mất phí không', 'wallet-withdraw-fee', 'worker'],
  ['rút tiền tối thiểu là bao nhiêu', 'wallet-withdraw-fee', 'worker'],
  ['nạp tiền bằng momo được không', 'wallet-topup', 'employer'],
  ['lịch sử nạp tiền xem ở đâu', 'wallet-history', 'employer'],
  ['đăng ca có cần xác minh cccd không', 'verify-cccd-required', 'employer'],
  ['người làm đến muộn 30 phút', 'employer-late-arrival', 'employer'],
  ['sao tôi không huỷ được ca đã đăng', 'employer-cancel-shift', 'employer'],
  ['muốn đánh giá quán', 'review-how', 'worker'],
  ['cách liên hệ admin', 'support-contact'],
  ['tôi bị lừa mất tiền', 'safety-scam'],
  ['chủ quán chửi mắng nhân viên', 'safety-danger', 'worker'],
  ['điều khoản sử dụng ở đâu', 'legal-terms'],
];

describe('SUPPORT_KB — câu hỏi đời thường (không chép từ kho)', () => {
  it('bộ câu hỏi đủ lớn và không trùng nguyên văn câu trong kho', () => {
    expect(HELD_OUT.length).toBeGreaterThanOrEqual(150);
    const bank = new Set(SUPPORT_KB.flatMap((e) => [...e.questions.vi, ...e.questions.en]).map((q) => q.toLowerCase()));
    for (const [q] of HELD_OUT) expect(bank.has(q.toLowerCase()), q).toBe(false);
  });

  it.each(HELD_OUT)('%s → %s', (q, id, role) => {
    expect(idOf(ask(q, { role }))).toBe(id);
  });
});

describe('SUPPORT_KB — ngoài phạm vi và xã giao', () => {
  it.each([
    'thời tiết hôm nay thế nào',
    'giá vàng hôm nay bao nhiêu',
    'giá vàng',
    'tỷ số trận bóng đá tối qua',
    'đội nào vô địch world cup',
    'công thức nấu phở bò',
    'cách làm bánh flan',
    '2 cộng 2 bằng mấy',
    'giải phương trình bậc hai',
    'bầu cử tổng thống mỹ',
    'chính trị việt nam',
    'viết code giúp tôi',
    'viết code python sắp xếp mảng',
    'asdkjh qwe zxc',
    'lorem ipsum dolor sit amet',
    'kể chuyện cười đi',
    'hát một bài đi',
    'what is the weather today',
    'who won the football match',
    'recipe for chocolate cake',
    'tell me a joke',
    'bitcoin giá bao nhiêu',
    'xổ số miền bắc hôm nay',
    'phim gì hay chiếu rạp',
  ])('%s → fallback', (q) => {
    const r = ask(q);
    expect(r.kind, `${q} → ${idOf(r)}`).toBe('fallback');
    expect(r.showContacts).toBe(true);
  });

  it.each([
    ['chào', 'greeting'],
    ['xin chào ad', 'greeting'],
    ['cảm ơn', 'thanks'],
    ['cam on nhieu nha', 'thanks'],
    ['bạn là ai', 'whoami'],
    ['ban la bot a', 'whoami'],
    ['gặp người thật', 'human'],
    ['cho minh noi chuyen voi nhan vien ho tro', 'human'],
    ['tạm biệt', 'bye'],
  ])('%s → xã giao %s', (q, intent) => {
    const r = ask(q);
    expect(r.kind).toBe('smalltalk');
    expect(r.kind === 'smalltalk' && r.intent).toBe(intent);
  });

  it('bản production dùng câu trả lời `live` (tiền thật), bản demo nói mô phỏng', () => {
    const demo = ask('rút tiền về ngân hàng thế nào', { live: false });
    const live = ask('rút tiền về ngân hàng thế nào', { live: true });
    expect(demo.kind === 'answer' && demo.entryId).toBe('wallet-withdraw');
    expect(demo.text).toContain('mô phỏng');
    expect(live.text).toContain('PayOS');
    expect(live.text).not.toContain('mô phỏng');
  });
});
