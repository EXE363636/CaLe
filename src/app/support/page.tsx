import type { ReactNode } from 'react';

import { GuideHero } from '@/components/landing/GuideHero';
import { SafetyPreview } from '@/components/landing/GuidePreviews';
import { LandingHelp, LandingIconGlyph, LandingSteps, type LandingIcon } from '@/components/landing/LandingSections';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { getTx } from '@/i18n/server';

/**
 * Liên hệ hỗ trợ. 03/10 — làm lại theo ngôn ngữ landing: `GuideHero`, ba thẻ liên hệ,
 * lưu ý an toàn (`#support-safety`, gộp từ /safety), các bước phản ánh khi có vấn đề (theo chế độ dữ liệu), góp ý sản phẩm, lối tắt.
 *
 * Email / hotline / địa chỉ: CÙNG giá trị với chân trang (`components/layout/Footer.tsx`
 * viết cứng). Đổi ở đó thì đổi cả ở đây.
 *
 * Cách phản ánh: bản thật chưa có luồng khiếu nại trong app (`capabilities.disputes =
 * false`) → gửi email cho đội hỗ trợ. Bản demo có nút "Khiếu nại" ở chi tiết ca (người
 * lao động sau khi check-out, nhà tuyển dụng ở khung xác nhận hoàn thành).
 */

const SUPPORT_EMAIL = 'nguyenphuonganh98113@gmail.com';
const SUPPORT_HOTLINE = '0868325698';

export default async function SupportPage() {
  const tx = await getTx();
  const live = isSupabaseEnv();
  return (
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      <GuideHero
        eyebrow={tx('Hỗ trợ')}
        title={tx('Liên hệ hỗ trợ')}
        lead={tx('Đội ngũ CaLedo Tech sẵn sàng hỗ trợ bạn trong giờ hành chính. Ngoài giờ, vui lòng gửi email — chúng tôi phản hồi trong vòng 24 giờ vào các ngày làm việc.')}
        actions={[{ href: '/faq', label: tx('Câu hỏi thường gặp') }]}
      />

      <section aria-labelledby="support-contact" data-tone="paper" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 id="support-contact" className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {tx('Liên hệ với chúng tôi')}
          </h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            <ContactCard
              icon={<MailGlyph />}
              label={tx('Email hỗ trợ')}
              value={
                <a href={`mailto:${SUPPORT_EMAIL}`} className="break-all text-orange-700 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
                  {SUPPORT_EMAIL}
                </a>
              }
              note={tx('Trong tiêu đề, ghi rõ vai trò (người lao động hoặc nhà tuyển dụng) và mã ca liên quan (nếu có) để chúng tôi xử lý nhanh hơn.')}
            />
            <ContactCard
              icon={<LandingIconGlyph name="phone" />}
              label="Hotline"
              value={
                <a href={`tel:${SUPPORT_HOTLINE}`} className="tabular-nums text-gray-900 underline-offset-2 hover:text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
                  {SUPPORT_HOTLINE}
                </a>
              }
              note={tx('Giờ trực: 08:00 – 20:00, Thứ Hai đến Thứ Bảy.')}
            />
            <ContactCard icon={<PinGlyph />} label={tx('Văn phòng')} value="CaLedo Tech" note={tx('Hà Nội, Việt Nam')} />
          </ul>
        </div>
      </section>

      {/* Lưu ý an toàn — gộp từ /safety (03/10). Phần "giữ tiền, đánh giá, điểm uy tín" đã có
          ở hai trang vai trò; "Ưu tiên an toàn" là bước đầu của khối phản ánh ngay sau. */}
      <SafetyNotes
        id="support-safety"
        tone="cream"
        title={tx('Lưu ý an toàn')}
        aside={<SafetyPreview />}
        items={[
          {
            icon: 'profile',
            title: tx('Xác minh tài khoản'),
            body: live
              ? tx('Xác thực số điện thoại bằng mã gửi qua tin nhắn và CCCD (quản trị viên duyệt) trong trang hồ sơ. Ảnh giấy tờ nằm ở kho riêng tư, chỉ quản trị viên xem để duyệt.')
              : tx('Bạn có thể xác minh số điện thoại và giấy tờ tuỳ thân trong trang hồ sơ. Hồ sơ đã xác minh giúp bên kia yên tâm hơn khi nhận việc hoặc duyệt người.'),
          },
          {
            icon: 'money',
            title: tx('Phí và cọc'),
            // Bản thật có cọc khi ứng tuyển (0028, quản trị viên bật / tắt).
            body: live
              ? tx('CaLẻ không thu phí của người lao động. Khoản cọc khi ứng tuyển (nếu có) hoàn đủ khi ca hoàn thành hoặc khi bạn không được chọn.')
              : tx('CaLẻ không thu phí và không giữ tiền của người lao động.'),
          },
          {
            icon: 'phone',
            title: tx('Nhận tiền công'),
            body: tx('Chỉ nhận tiền công trong ứng dụng, không nhận tiền mặt ngoài luồng.'),
          },
        ]}
      />

      <LandingSteps
        id="support-report"
        tone="paper"
        title={tx('Khi có vấn đề trong ca')}
        lead={
          live
            ? tx('Bản hiện tại chưa có nút khiếu nại trong ứng dụng. Mọi phản ánh gửi qua email hỗ trợ.')
            : tx('Bản demo có nút "Khiếu nại" ngay trong chi tiết ca.')
        }
        steps={[
          { title: tx('Ưu tiên an toàn'), body: tx('Gặp nguy hiểm thì rời khỏi địa điểm và gọi 113 trước, rồi mới báo cho CaLẻ.') },
          { title: tx('Ghi lại sự việc'), body: tx('Chụp màn hình ca làm, ghi lại giờ check-in / check-out và giữ ảnh bàn giao nếu có.') },
          live
            ? { title: tx('Gửi email cho đội hỗ trợ'), body: tx('Ghi vai trò, mã ca, thời điểm xảy ra và đính kèm ảnh.') }
            : { title: tx('Bấm "Khiếu nại" trong ca'), body: tx('Mở chi tiết ca liên quan, bấm "Khiếu nại" và mô tả sự việc.') },
          live
            ? { title: tx('CaLẻ xem xét và trả lời'), body: tx('Đội ngũ CaLẻ liên hệ hai bên, đối chiếu lịch sử ca và trả lời qua email.') }
            : { title: tx('Quản trị viên xem xét'), body: tx('Quản trị viên xem giải trình của hai bên và quyết định theo Chính sách xử lý tranh chấp.') },
        ]}
      />

      <section aria-labelledby="support-feedback" data-tone="cream" className="px-4 pt-14 sm:px-6 sm:pt-20 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-r-2xl border-l-4 border-orange-400 bg-orange-50 px-5 py-5 sm:px-6">
          <h2 id="support-feedback" className="text-lg font-bold tracking-tight text-gray-900">
            {tx('Phản ánh hoặc gợi ý sản phẩm')}
          </h2>
          <p className="mt-2 text-base leading-relaxed text-gray-700">
            {tx('Chúng tôi rất mong nhận được phản hồi từ người dùng thực tế. Nếu bạn có ý tưởng để cải thiện CaLẻ, gửi cho chúng tôi qua email.')}
          </p>
        </div>
      </section>

      <div data-tone="cream" className="pt-10 sm:pt-12">
        <LandingHelp
          id="support-help"
          title={tx('Tìm câu trả lời')}
          items={[
            { href: '/faq', icon: 'help', title: tx('Câu hỏi thường gặp'), body: tx('Ứng tuyển, huỷ ca, tiền công và tranh chấp.') },
            { href: '/disputes', icon: 'status', title: tx('Chính sách xử lý tranh chấp'), body: tx('Khi nào nên mở yêu cầu và CaLẻ xem xét thế nào.') },
          ]}
        />
      </div>
    </ToneScroll>
  );
}

// ---------------------------------------------------------------------------
// Lưu ý an toàn — tiêu đề trái (dính khi cuộn), thẻ trắng có ô icon bên phải
// (cùng bố cục `LandingRules`, icon thay cho chip giá trị). Chuyển từ /safety (03/10).
// ---------------------------------------------------------------------------

function SafetyNotes({
  id,
  tone,
  title,
  items,
  aside,
}: {
  id: string;
  tone: string;
  title: string;
  items: Array<{ icon: LandingIcon; title: string; body: string }>;
  /** Minh hoạ dưới tiêu đề ở cột trái (03/10: `SafetyPreview`); có minh hoạ thì cột trái không dính. */
  aside?: ReactNode;
}) {
  const list = (
    <ul className={['flex flex-col gap-3', aside ? 'mt-8' : ''].join(' ')}>
          {items.map((it) => (
            <li key={it.title} className="flex gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-black/5 sm:p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700 ring-1 ring-orange-100">
                <LandingIconGlyph name={it.icon} />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900">{it.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{it.body}</p>
              </div>
            </li>
          ))}
    </ul>
  );
  const heading = (
    <h2
      id={id}
      className={['text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl', aside ? '' : 'lg:sticky lg:top-28 lg:self-start'].join(' ')}
    >
      {title}
    </h2>
  );
  return (
    <section aria-labelledby={id} data-tone={tone} className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      {aside ? (
        // Có minh hoạ (03/10): tiêu đề + thẻ lưu ý bên trái, minh hoạ bên phải từ `lg`.
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-16">
          <div className="min-w-0">
            {heading}
            {list}
          </div>
          <div className="min-w-0">{aside}</div>
        </div>
      ) : (
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
          {heading}
          {list}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

function ContactCard({ icon, label, value, note }: { icon: ReactNode; label: string; value: ReactNode; note: string }) {
  return (
    <li className="flex flex-col rounded-3xl bg-white p-6 shadow-card ring-1 ring-black/5">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-700 ring-1 ring-orange-100">{icon}</span>
      <h3 className="mt-4 text-sm font-semibold text-gray-600">{label}</h3>
      <p className="mt-1 text-lg font-bold leading-snug tracking-tight text-gray-900">{value}</p>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{note}</p>
    </li>
  );
}

/** Cùng nét với `LandingIconGlyph` (1.75, 24×24). */
function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function MailGlyph() {
  return (
    <Glyph>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="m4.5 7.5 7.5 5.5 7.5-5.5" />
    </Glyph>
  );
}

function PinGlyph() {
  return (
    <Glyph>
      <path d="M12 21s-6.5-5.4-6.5-10.5a6.5 6.5 0 0 1 13 0C18.5 15.6 12 21 12 21Z" />
      <circle cx="12" cy="10.5" r="2.25" />
    </Glyph>
  );
}
