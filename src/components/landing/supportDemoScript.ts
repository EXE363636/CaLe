/**
 * Kịch bản minh hoạ "hỏi trợ lý CaLẻ" (04/10) — phần THUẦN của `SupportChatDemo`.
 *
 * Câu trả lời lấy từ chính `answerSupportQuestion` + `SUPPORT_KB` (cùng trợ lý ở bong
 * bóng hỗ trợ) nên minh hoạ không bao giờ nói khác trợ lý thật. Hàm này chạy ở SERVER
 * (`SupportAssistantSection`, trang /support): kho hỏi đáp ~220KB không vào gói JS của
 * trang — trình duyệt chỉ nhận vài câu đã dựng sẵn (`SupportDemoData`).
 */

import { SUPPORT_KB } from '@/data/supportKb';
import { answerSupportQuestion, SUPPORT_BOT_COPY, type SupportLocale, type SupportRole } from '@/domain/supportBot';

/**
 * Đối tượng của trang đặt minh hoạ: trang chủ (chung), trang người lao động, trang
 * nhà tuyển dụng — mỗi nơi hỏi đúng các thắc mắc mà người xem đó hay gặp khi mới vào.
 */
export type SupportDemoAudience = 'general' | 'worker' | 'employer';

interface DemoScript {
  /** Vai trò truyền cho trợ lý (ưu tiên mục đúng đối tượng). */
  role: SupportRole;
  questions: Record<SupportLocale, string[]>;
  /** Nhãn khoe khả năng của trợ lý, hiện cạnh câu trả lời của lượt tương ứng. */
  tags: Record<SupportLocale, Array<string | null>>;
}

const TAG_FOLLOW_UP = { vi: 'Hiểu câu hỏi nối tiếp', en: 'Understands follow-ups' };
const TAG_NO_ACCENT = { vi: 'Gõ không dấu, viết tắt vẫn hiểu', en: 'Works without accents or typos' };
const TAG_HUMAN = { vi: 'Chuyển sang người thật khi cần', en: 'Hands over to a real person' };
const tags = (...list: Array<typeof TAG_HUMAN | null>) => ({
  vi: list.map((t) => t?.vi ?? null),
  en: list.map((t) => t?.en ?? null),
});

/**
 * Kịch bản theo đối tượng. Mỗi kịch bản có một câu hỏi nối tiếp hoặc một câu gõ không
 * dấu / viết tắt để khoe trợ lý, và kết bằng "gặp người thật".
 */
export const SUPPORT_DEMO_SCRIPTS: Record<SupportDemoAudience, DemoScript> = {
  general: {
    role: 'guest',
    questions: {
      vi: [
        'Đi làm qua CaLẻ có mất phí gì không?',
        'Lỡ chủ quán không trả lương thì sao?',
        'thế bao lâu thì có tiền?',
        'dang ca tuyen nguoi co ton phi ko',
        'cho mình gặp người thật',
      ],
      en: [
        'Do workers pay any fees on CaLẻ?',
        "What if the employer doesn't pay me?",
        'so when do I get paid?',
        'is there a fee to post a shift',
        'can i talk to a real person',
      ],
    },
    tags: tags(null, null, TAG_FOLLOW_UP, TAG_NO_ACCENT, TAG_HUMAN),
  },
  worker: {
    role: 'worker',
    questions: {
      vi: [
        'Chưa có kinh nghiệm thì có làm được không?',
        'Đi làm có mất phí gì không?',
        'thế bao lâu thì có lương?',
        'lo chu quan ko tra tien thi sao',
        'cho mình gặp người thật',
      ],
      en: [
        'I have no experience, can I still work?',
        'Do I pay any fees?',
        'so when do I get paid?',
        "what if the employer doesn't pay me",
        'can i talk to a real person',
      ],
    },
    tags: tags(null, null, TAG_FOLLOW_UP, TAG_NO_ACCENT, TAG_HUMAN),
  },
  employer: {
    role: 'employer',
    questions: {
      vi: [
        'Đăng ca tuyển người thế nào?',
        'Phí dịch vụ tính thế nào?',
        'Người làm không đến thì sao?',
        'huy ca thi tien giu co duoc hoan ko',
        'cho mình gặp người thật',
      ],
      en: [
        'How do I post a shift?',
        'How is the service fee calculated?',
        "What if a worker doesn't show up?",
        'if i cancel do i get the held money back',
        'can i talk to a real person',
      ],
    },
    tags: tags(null, null, null, TAG_NO_ACCENT, TAG_HUMAN),
  },
};

/** Câu hỏi mẫu của trang chủ (giữ tên cũ cho test / e2e). */
export const SUPPORT_DEMO_QUESTIONS = SUPPORT_DEMO_SCRIPTS.general.questions;

/**
 * Bỏ câu ghi chú chế độ demo ("Bản demo: … mô phỏng") khỏi đoạn trích minh hoạ — ghi
 * chú đó đã có ở chú thích dưới khung (`figcaption`). Không còn gì thì giữ nguyên.
 */
export function stripModeNote(text: string): string {
  const note = /(bản demo|đây là bản demo|mô phỏng|demo:|simulated|this is the demo)/i;
  const kept = text
    .replace(/\s*\([^)]*(?:bản demo|demo|mô phỏng|simulated)[^)]*\)/gi, '')
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !note.test(sentence))
    .join(' ')
    .trim();
  return kept || text;
}

/** Giới hạn độ dài câu trả lời hiện trong minh hoạ (ký tự). */
const MAX_REPLY = 220;

/**
 * Rút gọn câu trả lời: giữ các câu đầu (ít nhất một) trong `max` ký tự, cắt thì thêm "…".
 * Câu đầu đã quá dài thì cắt ở khoảng trắng gần nhất.
 */
export function shortReply(text: string, max = MAX_REPLY): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const sentences = clean.split(/(?<=[.!?…])\s+/);
  let out = '';
  for (const s of sentences) {
    const next = out ? `${out} ${s}` : s;
    if (next.length > max) break;
    out = next;
  }
  if (!out) {
    const cut = clean.slice(0, max);
    out = cut.slice(0, Math.max(cut.lastIndexOf(' '), max * 0.6)).replace(/[\s,;:]+$/, '');
  }
  return `${out.replace(/[.!?…]+$/, '')}…`;
}

export interface SupportDemoExchange {
  question: string;
  reply: string;
  /** Trợ lý đưa kênh liên hệ (hotline, Zalo…) kèm câu trả lời. */
  contacts: boolean;
  /** Nhãn khoe khả năng ("✓ Hiểu câu hỏi nối tiếp"…) cạnh câu trả lời, nếu có. */
  tag: string | null;
}

/** Dựng cuộc trò chuyện mẫu bằng trợ lý thật (lượt sau có `previous` như bong bóng). */
export function buildSupportDemo(
  locale: SupportLocale,
  live: boolean,
  audience: SupportDemoAudience = 'general',
): SupportDemoExchange[] {
  const { role, questions } = SUPPORT_DEMO_SCRIPTS[audience];
  let previous: { question: string; entryId?: string | null } | null = null;
  const tagList = SUPPORT_DEMO_SCRIPTS[audience].tags[locale];
  return questions[locale].map((question, i) => {
    const r = answerSupportQuestion(question, { kb: SUPPORT_KB, locale, live, role, previous, seed: i });
    previous = { question, entryId: r.kind === 'answer' ? r.entryId : null };
    return {
      question,
      reply: shortReply(stripModeNote(r.text)),
      contacts: Boolean(r.showContacts),
      tag: tagList[i] ?? null,
    };
  });
}

/** Mọi thứ minh hoạ cần — tính ở server, khung chat (client) chỉ nhận chữ đã dựng. */
export interface SupportDemoData {
  audience: SupportDemoAudience;
  /** Chế độ production (tiền thật) — không thêm chú thích "tiền là mô phỏng". */
  live: boolean;
  welcome: string;
  script: SupportDemoExchange[];
}

export function supportDemoData(
  locale: SupportLocale,
  live: boolean,
  audience: SupportDemoAudience = 'general',
): SupportDemoData {
  return {
    audience,
    live,
    // Câu chào đầu tiên, trọn câu (không cắt dở giữa chừng).
    welcome: SUPPORT_BOT_COPY.welcome[locale].split(/(?<=[.!?])\s/)[0],
    script: buildSupportDemo(locale, live, audience),
  };
}
