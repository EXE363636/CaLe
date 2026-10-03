/**
 * Kênh liên hệ đội hỗ trợ CaLẻ — MỘT nguồn cho chân trang, `/support`, ba trang
 * pháp lý và bong bóng hỗ trợ (`components/support/`). Đổi số / email ở đây.
 */

export const SUPPORT_HOTLINE = '0868325698';
export const SUPPORT_EMAIL = 'nguyenphuonganh98113@gmail.com';
export const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61594143497455';
export const ZALO_URL = 'https://zalo.me/0868325698';

/** Tiêu đề phiếu hỗ trợ gửi qua email. */
export const SUPPORT_TICKET_SUBJECT = '[CaLẻ] Yêu cầu hỗ trợ';
export const SUPPORT_TICKET_SUBJECT_EN = '[CaLẻ] Support request';

/** `tel:` cho một số điện thoại (bỏ khoảng trắng, dấu chấm, gạch nối). */
export function telHref(phone: string = SUPPORT_HOTLINE): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export interface SupportMailtoInput {
  userId?: string | null;
  email?: string | null;
  /** Trang đang xem (chỉ đường dẫn, không kèm query). */
  path?: string | null;
  locale?: 'vi' | 'en';
  /** Câu người dùng vừa hỏi trợ lý — gửi kèm để đội hỗ trợ không phải hỏi lại. */
  question?: string | null;
}

/** Bỏ ký tự xuống dòng / điều khiển và cắt ngắn — giá trị chỉ nằm trong thân thư. */
function clean(value: string | null | undefined, max = 200): string {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * `mailto:` phiếu hỗ trợ: tiêu đề cố định, thân thư có chỗ mô tả vấn đề + mã tài
 * khoản / email (khi đã đăng nhập) + trang đang xem. Tiêu đề và thân thư được mã
 * hoá bằng `encodeURIComponent` (xuống dòng là `%0D%0A` theo RFC 6068).
 */
export function supportMailto(input: SupportMailtoInput = {}): string {
  const en = input.locale === 'en';
  const userId = clean(input.userId);
  const email = clean(input.email);
  const path = clean(input.path, 300);
  const question = clean(input.question, 300);
  const lines = [en ? 'Describe your issue:' : 'Mô tả vấn đề:', question, '', '---'];
  if (userId) lines.push(`${en ? 'Account ID' : 'Mã tài khoản'}: ${userId}`);
  if (email) lines.push(`${en ? 'Account email' : 'Email tài khoản'}: ${email}`);
  if (path) lines.push(`${en ? 'Page' : 'Trang'}: ${path}`);
  const subject = en ? SUPPORT_TICKET_SUBJECT_EN : SUPPORT_TICKET_SUBJECT;
  const body = lines.join('\r\n');
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
