import { PartnersSection } from '@/components/about/PartnersSection';
import { TeamCarousel } from '@/components/about/TeamCarousel';
import { TEAM_MEMBERS } from '@/components/about/teamData';
import type { TFunction } from '@/i18n/locale';

/**
 * Khối "Về CaLẻ" của trang chủ (`#home-about`, 03/10 — gộp từ trang `/about` cũ; làm lại cho
 * gọn, dễ quét). Ngay sau màn đầu:
 *   1. Trái: tiêu đề + giới thiệu + làm cho ai (không lặp tên CaLedo Tech). Phải: 4 ô thông tin nhanh
 *      (đơn vị phát triển, số thành viên đếm từ `teamData`, nơi làm việc, giai đoạn) và câu
 *      trung thực về phiên bản (bản thật: tiền thật qua PayOS; demo: mô phỏng).
 *   2. Thanh trượt "Đội ngũ" (`TeamCarousel`, thẻ gọn, vòng lặp, tự chạy).
 *   3. Đối tác tiềm năng: chip viền nét đứt + một chú thích chung.
 * "Chúng tôi làm gì" / "Điều chúng tôi giữ" đã có ở các khối sau nên không lặp.
 */
export function HomeAbout({ t, tx, live, tone }: { t: TFunction; tx: TFunction; live: boolean; tone?: string }) {
  const facts = [
    { k: tx('Đơn vị phát triển'), v: 'CaLedo Tech' },
    { k: tx('Đội ngũ'), v: tx('{n} thành viên').replace('{n}', String(TEAM_MEMBERS.length)) },
    { k: tx('Làm việc tại'), v: tx('Hà Nội') },
    { k: tx('Giai đoạn'), v: live ? tx('Thử nghiệm giới hạn (Beta)') : tx('Bản dùng thử') },
  ];
  return (
    <section aria-labelledby="home-about" data-tone={tone} className="px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
          <div>
            <h2 id="home-about" className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {tx('Về CaLẻ')}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-gray-700 sm:text-lg">{t('about.intro')}</p>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              {tx('Chúng tôi làm CaLẻ cho các bạn cần ca theo lịch học và các quán cần người bù giờ cao điểm.')}
            </p>
          </div>
          <div>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-black/5 shadow-card ring-1 ring-black/5">
              {facts.map((f) => (
                <div key={f.k} className="bg-white px-5 py-4 sm:px-6 sm:py-5">
                  <dt className="text-xs font-medium text-gray-600">{f.k}</dt>
                  <dd className="mt-1 text-base font-semibold leading-snug text-gray-900 sm:text-lg">{f.v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 flex gap-2.5 text-sm leading-relaxed text-gray-600">
              <span aria-hidden="true" className={['mt-1.5 h-2 w-2 shrink-0 rounded-full', live ? 'bg-green-600' : 'bg-orange-500'].join(' ')} />
              <span>{live ? t('about.version.body.supabase') : t('about.version.body')}</span>
            </p>
          </div>
        </div>
        <div className="mt-16">
          <TeamCarousel title={t('about.team.title')} />
        </div>
        <div className="mt-12">
          <PartnersSection t={t} />
        </div>
      </div>
    </section>
  );
}
