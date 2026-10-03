/**
 * Mở bong bóng hỗ trợ từ nơi khác trong app (chân trang, trang hỗ trợ, minh hoạ…).
 *
 *   openSupportBubble();                                   // mở tab "Hỏi CaLẻ"
 *   openSupportBubble({ tab: 'contact' });                 // mở tab "Liên hệ"
 *   openSupportBubble({ ask: 'Rút tiền thế nào?' });       // mở + hỏi luôn
 *
 * `SupportBubble` (gắn ở root layout) nghe sự kiện `cale:open-support`. Khách
 * không có tab "Hộp thư" → `tab: 'inbox'` mở tab "Hỏi CaLẻ". `ask` được cắt khoảng
 * trắng và giới hạn 300 ký tự. Ở server (không có `window`) hàm không làm gì.
 */

export const OPEN_SUPPORT_EVENT = 'cale:open-support';

/** Độ dài tối đa một câu hỏi gửi trợ lý (ký tự). */
export const SUPPORT_QUESTION_MAX_LENGTH = 300;

export type SupportBubbleTab = 'assistant' | 'inbox' | 'contact';

export interface OpenSupportDetail {
  tab?: SupportBubbleTab;
  /** Câu hỏi gửi ngay cho trợ lý (mở tab "Hỏi CaLẻ"). */
  ask?: string;
}

export function openSupportBubble(opts: OpenSupportDetail = {}): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<OpenSupportDetail>(OPEN_SUPPORT_EVENT, { detail: { ...opts } }));
}
