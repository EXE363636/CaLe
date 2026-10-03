/**
 * Bộ câu hỏi "đề thi kín" cho trợ lý hỗ trợ: viết SAU khi kho đã xong, không chép từ
 * kho, dùng để đo khả năng hiểu câu hỏi mới (không phải để chỉnh kho cho khớp từng
 * câu). Mỗi câu chấp nhận một vài mục hợp lý. Câu ngoài kho thì phải gợi ý mục gần nhất.
 */
import { describe, expect, it } from 'vitest';

import { SUPPORT_KB } from '@/data/supportKb';
import { answerSupportQuestion, type SupportRole } from '@/domain/supportBot';

const CASES: [string, string[], SupportRole?][] = [
  ['lam xong bao lau thi co luong', ['pay-when', 'pay-auto-confirm']],
  ['tiền lương tính sao vậy', ['pay-wage-calc']],
  ['rút tiền mất phí không', ['wallet-withdraw-fee']],
  ['rút tiền rồi mà chưa thấy về tk', ['wallet-withdraw-time', 'wallet-withdraw-failed']],
  ['nạp tiền vào ví kiểu gì', ['wallet-topup']],
  ['nạp rồi mà ví không cộng tiền', ['wallet-topup-missing']],
  ['mã qr hết hạn rồi', ['wallet-qr-problem']],
  ['đăng tin tuyển người phục vụ', ['post-how']],
  ['đăng ca mất tiền không', ['pricing-fee', 'post-deposit-hold']],
  ['phí dịch vụ bao nhiêu phần trăm', ['pricing-fee', 'pay-fee-worker']],
  ['sửa giờ ca đã đăng', ['post-edit']],
  ['muốn huỷ ca đã đăng thì sao', ['employer-cancel-shift', 'employer-cancel-refund']],
  ['tiền cọc khi huỷ ca có được trả lại không', ['employer-cancel-refund', 'employer-refund-when'], 'employer'],
  ['duyệt ứng viên ở đâu', ['applicants-review']],
  ['người làm không đến thì xử lý sao', ['employer-no-show']],
  ['xác nhận hoàn thành ca cho nhân viên', ['employer-confirm']],
  ['tôi bị đánh vắng mặt oan', ['noshow-wrong']],
  ['quên check in thì sao', ['checkin-missed']],
  ['check out ở đâu', ['checkout-how']],
  ['check-in sớm được không', ['checkin-window']],
  ['có cần bật định vị không', ['checkin-gps']],
  ['làm sao để ứng tuyển', ['apply-how']],
  ['sao mình không bấm ứng tuyển được', ['apply-cannot']],
  ['ca đủ người rồi', ['apply-full'], 'worker'],
  ['bị từ chối thì sao', ['apply-rejected']],
  ['rút đơn ứng tuyển', ['apply-withdraw']],
  ['có cần cv không', ['apply-no-cv']],
  ['tôi không đi làm được nữa muốn huỷ', ['cancel-worker']],
  ['huỷ ca nhiều có bị khoá tài khoản không', ['cancel-quota', 'cancel-penalty', 'account-suspended']],
  ['điểm uy tín là gì', ['reputation-what']],
  ['điểm uy tín thấp quá', ['reputation-low']],
  ['quên mật khẩu', ['account-forgot-password']],
  ['đổi mật khẩu', ['account-change-password']],
  ['đăng nhập bằng google', ['account-google']],
  ['không nhận được mã otp', ['verify-otp-problem']],
  ['xác minh cccd để làm gì', ['verify-cccd', 'verify-cccd-required']],
  ['xoá tài khoản', ['account-delete']],
  ['tài khoản bị khoá', ['account-suspended']],
  ['đổi số điện thoại', ['account-change-phone']],
  ['nhắn tin với nhà tuyển dụng ở đâu', ['chat-how']],
  ['sao không nhắn tin được nữa', ['chat-closed']],
  ['báo cáo tin nhắn quấy rối', ['chat-report']],
  ['ntd bảo chuyển khoản riêng có sao không', ['chat-off-platform', 'safety-scam', 'chat-report']],
  ['bị lừa đảo thì làm sao', ['safety-scam']],
  ['khiếu nại ở đâu', ['dispute-how']],
  ['đánh giá nhà tuyển dụng', ['review-how']],
  ['bị đánh giá 1 sao không đúng', ['review-unfair']],
  ['chuyển sang tiếng anh', ['language']],
  ['bật chế độ tối', ['dark-mode']],
  ['web bị lỗi không vào được', ['trouble-not-loading']],
  ['số hotline là gì', ['support-contact']],
  ['calẻ là gì', ['about-what-is-cale']],
  ['sinh viên làm được không', ['about-age', 'about-experience', 'about-job-types', 'apply-doc-requirement']],
  ['có ứng dụng điện thoại không', ['about-mobile']],
  ['có ở hà nội không', ['about-areas']],
  ['cọc người lao động là gì', ['wdeposit-what']],
  ['xem lịch làm của tôi', ['schedule-worker'], 'worker'],
  ['tìm ca gần nhà', ['find-filters', 'find-shifts', 'about-areas']],
  ['nhận tiền mặt được không', ['pay-cash']],
  ['how do I get paid', ['pay-when']],
  ['how to post a job', ['post-how']],
  ['forgot my password', ['account-forgot-password']],
  ['cancel my shift', ['cancel-worker', 'employer-cancel-shift']],
  ['ca chưa bắt đầu sao đã hiện đang diễn ra', ['shift-not-started', 'shift-status-labels']],
  ['nhận thông báo ở đâu', ['notifications']],
  ['ad ơi cho hỏi làm 4 tiếng được bao nhiêu tiền', ['pay-wage-calc']],
  ['mình là chủ quán muốn tìm người phụ bếp gấp', ['post-how']],
  ['tiền có an toàn không', ['pay-guarantee', 'wallet-overview', 'wallet-payos']],
  ['ví là gì', ['wallet-overview']],
];

const isEnglish = (q: string) => /^[a-z ]+$/.test(q) && /(how|my|to)/.test(q);

describe('trợ lý hỗ trợ — câu hỏi mới (không có trong kho)', () => {
  it.each(CASES)('%s', (q, ids, role) => {
    const r = answerSupportQuestion(q, { kb: SUPPORT_KB, locale: isEnglish(q) ? 'en' : 'vi', live: true, role: role ?? null });
    expect(r.kind).toBe('answer');
    expect(ids).toContain(r.kind === 'answer' ? r.entryId : r.kind);
  });

  it('không chắc thì không đoán bừa nhưng gợi ý đúng mục: "rút tiền về momo"', () => {
    const r = answerSupportQuestion('e muốn rút tiền về momo đc ko', { kb: SUPPORT_KB, locale: 'vi', live: true, role: 'worker' });
    expect(r.kind === 'answer' ? r.entryId : r.related).toContain('wallet-withdraw');
  });
});

describe('trợ lý hỗ trợ — câu ngoài phạm vi không kèm gợi ý lạc đề', () => {
  it.each(['thời tiết hôm nay thế nào', 'giá vàng hôm nay', 'kết quả bóng đá tối qua', 'nấu phở bò thế nào'])('%s', (q) => {
    const r = answerSupportQuestion(q, { kb: SUPPORT_KB, locale: 'vi', live: true, role: 'guest' });
    expect(r.kind).toBe('fallback');
    expect(r.related).toEqual([]);
  });
});
