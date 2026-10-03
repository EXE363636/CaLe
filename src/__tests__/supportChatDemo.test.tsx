/**
 * Minh hoạ "hỏi trợ lý" tự chạy (`SupportChatDemo`, 04/10): câu trả lời lấy từ trợ lý
 * thật (`answerSupportQuestion` + `SUPPORT_KB`), giảm chuyển động → hiện đủ cuộc trò
 * chuyện đứng yên, đang chạy → gõ / ba chấm / trả lời theo thứ tự, nút mở bong bóng.
 * Chân trang: nút "Nhắn với trợ lý" mở bong bóng ở tab trợ lý.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const events = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock('@/components/support/supportBubbleEvents', () => ({ openSupportBubble: events.open }));

import { SupportChatDemo } from '@/components/landing/SupportChatDemo';
import {
  SUPPORT_DEMO_QUESTIONS,
  buildSupportDemo,
  SUPPORT_DEMO_SCRIPTS,
  shortReply,
  stripModeNote,
  supportDemoData,
} from '@/components/landing/supportDemoScript';
import { Footer } from '@/components/layout/Footer';
import { SUPPORT_KB } from '@/data/supportKb';
import { answerSupportQuestion } from '@/domain/supportBot';
import { LocaleProvider } from '@/i18n/LocaleProvider';

const realMatchMedia = window.matchMedia;
const realIO = window.IntersectionObserver;

function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) =>
    ({
      matches: reduce && query.includes('reduce'),
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent: () => false,
    }) as MediaQueryList) as typeof window.matchMedia;
}

/** IntersectionObserver giả: báo "đang trong màn hình" ngay khi observe. */
function stubOnScreen() {
  window.IntersectionObserver = class {
    constructor(private cb: IntersectionObserverCallback) {}
    observe(el: Element) {
      this.cb([{ isIntersecting: true, target: el } as IntersectionObserverEntry], this as unknown as IntersectionObserver);
    }
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}

/** Chạy đồng hồ giả `ms` mili giây theo từng nấc 25 ms; mỗi nấc một `act` để hiệu ứng
 *  kịp hẹn giờ cho bước kế. */
function tick(ms: number) {
  for (let t = 0; t < ms; t += 25) {
    act(() => {
      vi.advanceTimersByTime(25);
    });
  }
}

beforeEach(() => {
  events.open.mockClear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.matchMedia = realMatchMedia;
  window.IntersectionObserver = realIO;
});

describe('shortReply', () => {
  it('giữ nguyên câu ngắn, cắt câu dài ở ranh giới câu và thêm "…"', () => {
    expect(shortReply('Ngắn thôi.')).toBe('Ngắn thôi.');
    const long = 'Câu một khá dài để thử. Câu hai cũng dài để thử nghiệm. Câu ba sẽ bị bỏ đi vì quá dài.';
    expect(shortReply(long, 60)).toBe('Câu một khá dài để thử. Câu hai cũng dài để thử nghiệm…');
    const one = 'a '.repeat(150).trim();
    const cut = shortReply(one, 50);
    expect(cut.endsWith('…')).toBe(true);
    expect(cut.length).toBeLessThanOrEqual(51);
  });
});

describe('stripModeNote', () => {
  it('bỏ câu ghi chú bản demo, giữ phần còn lại; không còn gì thì giữ nguyên', () => {
    expect(stripModeNote('Không mất phí. Bản demo: mọi khoản tiền đều là mô phỏng.')).toBe('Không mất phí.');
    expect(stripModeNote('Tiền được giữ sẵn (bản demo: mô phỏng). Làm xong là có tiền.')).toBe(
      'Tiền được giữ sẵn. Làm xong là có tiền.',
    );
    expect(stripModeNote('Bản demo là mô phỏng.')).toBe('Bản demo là mô phỏng.');
  });
});

describe('buildSupportDemo — lấy từ trợ lý thật', () => {
  it('kịch bản là các thắc mắc cốt lõi: phí người lao động → bảo đảm trả lương → bao lâu có tiền → phí đăng ca → người thật', () => {
    const ids: string[] = [];
    let previous: { question: string; entryId?: string | null } | null = null;
    for (const q of SUPPORT_DEMO_QUESTIONS.vi) {
      const r = answerSupportQuestion(q, { kb: SUPPORT_KB, locale: 'vi', live: true, role: 'guest', previous });
      ids.push(r.kind === 'answer' ? r.entryId : r.kind);
      previous = { question: q, entryId: r.kind === 'answer' ? r.entryId : null };
    }
    expect(ids).toEqual(['pay-fee-worker', 'pay-guarantee', 'pay-when', 'pricing-fee', 'smalltalk']);
  });

  it('đoạn trích minh hoạ không chứa ghi chú "bản demo / mô phỏng" (đã có ở chú thích)', () => {
    for (const ex of buildSupportDemo('vi', false)) expect(ex.reply).not.toMatch(/bản demo|mô phỏng/i);
    for (const ex of buildSupportDemo('en', false)) expect(ex.reply).not.toMatch(/simulated|demo:/i);
  });

  it('khớp từng lượt với answerSupportQuestion (lượt sau có previous), cả hai chế độ và hai thứ tiếng', () => {
    for (const locale of ['vi', 'en'] as const) {
      for (const live of [false, true]) {
        const script = buildSupportDemo(locale, live);
        let previous: { question: string; entryId?: string | null } | null = null;
        script.forEach((ex, i) => {
          const r = answerSupportQuestion(ex.question, { kb: SUPPORT_KB, locale, live, role: 'guest', previous, seed: i });
          expect(ex.reply).toBe(shortReply(stripModeNote(r.text)));
          previous = { question: ex.question, entryId: r.kind === 'answer' ? r.entryId : null };
        });
      }
    }
  });

  it('tiếng Anh cũng ra đúng các mục; lượt cuối đưa kênh liên hệ', () => {
    const ids: string[] = [];
    let previous: { question: string; entryId?: string | null } | null = null;
    for (const q of SUPPORT_DEMO_QUESTIONS.en) {
      const r = answerSupportQuestion(q, { kb: SUPPORT_KB, locale: 'en', live: true, role: 'guest', previous });
      ids.push(r.kind === 'answer' ? r.entryId : r.kind);
      previous = { question: q, entryId: r.kind === 'answer' ? r.entryId : null };
    }
    expect(ids).toEqual(['pay-fee-worker', 'pay-guarantee', 'pay-when', 'pricing-fee', 'smalltalk']);
    expect(buildSupportDemo('vi', false)[4].contacts).toBe(true);
  });
});

describe('kịch bản theo đối tượng (trang người lao động / nhà tuyển dụng)', () => {
  const EXPECTED = {
    worker: ['about-experience', 'pay-fee-worker', 'pay-when', 'pay-guarantee', 'smalltalk'],
    employer: ['post-how', 'pricing-fee', 'employer-no-show', 'employer-cancel-refund', 'smalltalk'],
  } as const;
  for (const audience of ['worker', 'employer'] as const) {
    for (const locale of ['vi', 'en'] as const) {
      it(`${audience} / ${locale}: mỗi câu ra đúng mục, kết bằng kênh liên hệ`, () => {
        const { role, questions } = SUPPORT_DEMO_SCRIPTS[audience];
        const ids: string[] = [];
        let previous: { question: string; entryId?: string | null } | null = null;
        for (const q of questions[locale]) {
          const r = answerSupportQuestion(q, { kb: SUPPORT_KB, locale, live: true, role, previous });
          ids.push(r.kind === 'answer' ? r.entryId : r.kind);
          previous = { question: q, entryId: r.kind === 'answer' ? r.entryId : null };
        }
        expect(ids).toEqual([...EXPECTED[audience]]);
        expect(buildSupportDemo(locale, true, audience).at(-1)?.contacts).toBe(true);
      });
    }
  }

  it('trang nhà tuyển dụng hiện kịch bản nhà tuyển dụng', () => {
    setReducedMotion(true);
    const { container } = render(<SupportChatDemo demo={supportDemoData('vi', false, 'employer')} />);
    expect(container.querySelector('[data-support-demo="employer"]')).not.toBeNull();
    expect(screen.getByText(SUPPORT_DEMO_SCRIPTS.employer.questions.vi[0])).toBeInTheDocument();
  });
});

describe('minh hoạ trên trang công khai — không hứa khiếu nại / tranh chấp', () => {
  it('mọi kịch bản, hai thứ tiếng, hai chế độ', () => {
    for (const audience of ['general', 'worker', 'employer'] as const) {
      for (const locale of ['vi', 'en'] as const) {
        for (const live of [false, true]) {
          for (const ex of buildSupportDemo(locale, live, audience)) {
            expect(ex.reply, `${audience}/${locale}/${live}: ${ex.question}`).not.toMatch(/khiếu nại|tranh chấp|dispute|72 giờ|72 hours/i);
          }
        }
      }
    }
  });
});

describe('SupportChatDemo', () => {
  it('giảm chuyển động: hiện đủ cuộc trò chuyện, đứng yên, không có nút tạm dừng', () => {
    setReducedMotion(true);
    const { container } = render(<SupportChatDemo demo={supportDemoData('vi', false)} />);
    const fig = container.querySelector('[data-support-demo]')!;
    expect(fig.getAttribute('data-playback')).toBe('static');
    const script = buildSupportDemo('vi', false);
    for (const ex of script) {
      expect(screen.getByText(ex.question)).toBeInTheDocument();
      expect(screen.getByText(ex.reply)).toBeInTheDocument();
    }
    expect(container.querySelectorAll('[data-demo-msg="user"]')).toHaveLength(5);
    expect(container.querySelectorAll('[data-demo-msg="bot"]')).toHaveLength(5);
    expect(container.querySelectorAll('[data-demo-tag]')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /Tạm dừng/ })).toBeNull();
  });

  it('đang chạy: gõ câu hỏi → gửi → "đang trả lời" → trả lời; khung chat aria-hidden, có bản chép cho trình đọc màn hình', () => {
    vi.useFakeTimers();
    setReducedMotion(false);
    stubOnScreen();
    const { container } = render(<SupportChatDemo demo={supportDemoData('vi', false)} />);
    const fig = container.querySelector('[data-support-demo]')!;
    expect(fig.getAttribute('data-playback')).toBe('playing');
    expect(container.querySelector('[data-demo-transcript]')!.closest('[aria-hidden="true"]')).not.toBeNull();
    const script = buildSupportDemo('vi', false);
    // Bản chép sr-only có đủ 5 lượt.
    expect(container.querySelector('ol.sr-only')!.querySelectorAll('li')).toHaveLength(5);

    expect(container.querySelectorAll('[data-demo-msg]')).toHaveLength(0);
    // Chờ 0.7s + gõ ≤1.5s + 0.45s → đã gửi (~2.65s), trợ lý "đang trả lời" 1.3s.
    tick(3000);
    expect(container.querySelectorAll('[data-demo-msg="user"]')).toHaveLength(1);
    expect(container.querySelector('[data-demo-typing]')).not.toBeNull();
    tick(1200);
    const bot = container.querySelectorAll('[data-demo-msg="bot"]');
    expect(bot).toHaveLength(1);
    expect(bot[0].textContent).toContain(script[0].reply);

    // Tạm dừng: không chạy tiếp.
    fireEvent.click(screen.getByRole('button', { name: 'Tạm dừng cuộc trò chuyện mẫu' }));
    expect(fig.getAttribute('data-playback')).toBe('paused');
    tick(20000);
    expect(container.querySelectorAll('[data-demo-msg="bot"]')).toHaveLength(1);

    // Tiếp tục tới hết rồi "Xem lại" quay về đầu.
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục cuộc trò chuyện mẫu' }));
    const untilDone = () => {
      for (let i = 0; i < 4000 && fig.getAttribute('data-playback') !== 'done'; i += 1) tick(25);
    };
    untilDone();
    expect(fig.getAttribute('data-playback')).toBe('done');
    expect(container.querySelectorAll('[data-demo-msg="bot"]')).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'Xem lại cuộc trò chuyện mẫu' }));
    expect(fig.getAttribute('data-playback')).toBe('playing');
    expect(container.querySelectorAll('[data-demo-msg]')).toHaveLength(0);

    // Xong lượt: giữ cuộc trò chuyện một nhịp cho người xem đọc rồi TỰ diễn lại.
    untilDone();
    tick(3000);
    expect(fig.getAttribute('data-playback')).toBe('done');
    expect(container.querySelectorAll('[data-demo-msg="bot"]')).toHaveLength(5);
    tick(3100);
    expect(fig.getAttribute('data-playback')).toBe('playing');
    expect(container.querySelectorAll('[data-demo-msg]')).toHaveLength(0);
  });

  it('nút "Thử hỏi trợ lý ngay" mở bong bóng ở tab trợ lý', () => {
    setReducedMotion(true);
    render(<SupportChatDemo demo={supportDemoData('vi', false)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Thử hỏi trợ lý ngay' }));
    expect(events.open).toHaveBeenCalledWith({ tab: 'assistant' });
  });

  it('tiếng Anh: câu hỏi và nhãn theo ngôn ngữ trang', () => {
    setReducedMotion(true);
    render(
      <LocaleProvider locale="en">
        <SupportChatDemo demo={supportDemoData('en', false)} />
      </LocaleProvider>,
    );
    expect(screen.getByText(SUPPORT_DEMO_QUESTIONS.en[0])).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ask the assistant now' })).toBeInTheDocument();
  });
});

describe('Footer — "Nhắn với trợ lý"', () => {
  it('mở bong bóng hỗ trợ ở tab trợ lý', () => {
    render(<Footer />);
    const btn = screen.getByRole('button', { name: 'Nhắn với trợ lý' });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(events.open).toHaveBeenCalledWith({ tab: 'assistant' });
  });
});
