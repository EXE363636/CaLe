/**
 * Khối "Hỏi trợ lý CaLẻ" (04/10) dùng chung cho trang chủ, /for-workers, /for-employers:
 * tiêu đề + một đoạn + ba ý ✓ bên trái, minh hoạ chat tự chạy (`SupportChatDemo`) bên
 * phải. Mỗi trang truyền `audience` để minh hoạ hỏi đúng thắc mắc của người xem đó.
 * Chữ do trang (server) dịch sẵn rồi truyền vào.
 */

import { SupportChatDemo } from '@/components/landing/SupportChatDemo';
import { supportDemoData, type SupportDemoAudience } from '@/components/landing/supportDemoScript';
import { isSupabaseEnv } from '@/data/supabaseClient';
import type { SupportLocale } from '@/domain/supportBot';

export interface SupportAssistantSectionProps {
  /** id của tiêu đề (đồng thời là neo #…). */
  id: string;
  audience: SupportDemoAudience;
  /** Ngôn ngữ trang (trang server đã đọc sẵn). */
  locale: SupportLocale;
  tone: 'paper' | 'cream';
  title: string;
  body: string;
  points: string[];
}

export function SupportAssistantSection({ id, audience, locale, tone, title, body, points }: SupportAssistantSectionProps) {
  // Dựng kịch bản ở server: kho hỏi đáp không vào gói JS của trang.
  const demo = supportDemoData(locale, isSupabaseEnv(), audience);
  return (
    <section aria-labelledby={id} data-tone={tone} className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:gap-16">
        <div className="max-w-xl">
          <h2 id={id} className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-gray-600 sm:text-lg">{body}</p>
          <ul className="mt-6 grid gap-3">
            {points.map((it) => (
              <li key={it} className="flex gap-3 text-base leading-relaxed text-gray-800">
                <svg
                  className="mt-1 h-5 w-5 shrink-0 text-green-700"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.25}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 10.5 3.2 3L15 6.5" />
                </svg>
                <span>{it}</span>
              </li>
            ))}
          </ul>
        </div>
        <SupportChatDemo demo={demo} />
      </div>
    </section>
  );
}
