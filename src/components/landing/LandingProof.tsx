/**
 * "Từ những ca đã chạy thử" — bằng chứng xã hội trên trang chủ, /for-workers,
 * /for-employers (02/10). Ảnh nhóm tự chụp ở quán đã chạy thử + lời chia sẻ thật,
 * dữ liệu ở `proofData.ts`.
 *
 * Chưa có dữ liệu thật → trả về `null` (không khung trống, không câu mẫu). Trang
 * vai trò lọc lời chia sẻ theo phía; trang chủ hiện cả hai.
 *
 * Không có hook → dùng được trong server component. Trang truyền `locale` (từ
 * `getLocale()`) và câu chữ (`proofCopy(tx)`).
 */

import Image from 'next/image';

import type { Locale } from '@/i18n/locale';

import { PROOF_PHOTOS, PROOF_QUOTES, type ProofPhoto, type ProofQuote } from './proofData';

export function LandingProofView({
  id,
  copy,
  locale,
  audience,
  quotes = PROOF_QUOTES,
  photos = PROOF_PHOTOS,
  white = false,
  tone,
}: {
  id: string;
  copy: { title: string; lead: string; note: string };
  locale: Locale;
  /** Trang vai trò: chỉ hiện lời chia sẻ của phía này. */
  audience?: 'worker' | 'employer';
  quotes?: ProofQuote[];
  photos?: ProofPhoto[];
  /** Nền trắng thay cho nền kem (để các khối xen kẽ). */
  white?: boolean;
  /** Trang có nền đổi màu khi cuộn (`ToneScroll`): tông của khối này. */
  tone?: string;
}) {
  const shown = audience ? quotes.filter((q) => q.audience === audience) : quotes;
  if (shown.length === 0 && photos.length === 0) return null;
  const en = locale === 'en';

  return (
    <section
      aria-labelledby={id}
      data-tone={tone}
      className={['px-4 py-16 sm:px-6 sm:py-20 lg:px-8', white ? 'bg-white' : ''].join(' ')}
    >
      <div className="mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <h2 id={id} className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {copy.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-gray-600 sm:text-lg">{copy.lead}</p>
        </div>

        {photos.length > 0 && (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((p) => (
              <li key={p.src}>
                <figure>
                  <Image
                    src={p.src}
                    alt={en && p.altEn ? p.altEn : p.alt}
                    width={960}
                    height={720}
                    sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
                    className="aspect-[4/3] w-full rounded-2xl object-cover shadow-card"
                  />
                  <figcaption className="mt-2 text-sm text-gray-600">{en && p.placeEn ? p.placeEn : p.place}</figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}

        {shown.length > 0 && (
          <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shown.map((q) => (
              <li key={`${q.name}-${q.consentDate}`}>
                <figure className="flex h-full flex-col rounded-2xl bg-white p-6 shadow-card ring-1 ring-black/5">
                  <blockquote className="flex-1 text-lg leading-relaxed text-gray-900">
                    <p>“{en && q.quoteEn ? q.quoteEn : q.quote}”</p>
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    {q.photo ? (
                      <Image src={q.photo} alt="" width={88} height={88} className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-800"
                      >
                        {q.name.trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block font-semibold text-gray-900">{q.name}</span>
                      <span className="block text-sm text-gray-600">{en && q.roleEn ? q.roleEn : q.role}</span>
                    </span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 text-xs leading-relaxed text-gray-600">{copy.note}</p>
      </div>
    </section>
  );
}
