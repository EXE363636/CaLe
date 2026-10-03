import { GuideHero } from '@/components/landing/GuideHero';
import { LandingFeatures, LandingHelp, LandingIconGlyph, type LandingIcon } from '@/components/landing/LandingSections';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { getTx } from '@/i18n/server';

/**
 * Bảo vệ người dùng. 03/10 — làm lại theo ngôn ngữ landing (`GuideHero`, khối tính
 * năng, thẻ lưu ý an toàn, lối tắt hỗ trợ). Câu chữ giữ như bản trước:
 *
 * P1 feedback F3 — bớt chữ: mỗi mục tối đa 2 câu, chỉ nói điều hệ thống đang làm
 * thật. Production: cờ bắt buộc SĐT/CCCD mặc định tắt, server không chặn ứng tuyển
 * theo điểm uy tín → không hứa các điều đó.
 */
export default async function SafetyPage() {
  const tx = await getTx();
  const live = isSupabaseEnv();
  return (
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      <GuideHero
        eyebrow={tx('Hỗ trợ')}
        title={tx('Bảo vệ người dùng')}
        lead={tx('CaLẻ giữ tiền công trước và ghi lại từng bước của ca để hai bên yên tâm.')}
        actions={[{ href: '/support', label: tx('Liên hệ hỗ trợ') }]}
      />

      {/* 03/10 — bản thật: nhãn xác thực, điểm uy tín không hiện cho bên kia (thẻ ứng viên
          chỉ có số ca đã làm với nhà tuyển dụng, số lần vắng, sao đánh giá). */}
      <LandingFeatures
        id="safety-protect"
        tone="paper"
        title={tx('CaLẻ bảo vệ hai bên thế nào')}
        items={[
          {
            icon: 'wallet',
            title: tx('Tiền công được giữ trước'),
            body: live
              ? tx('Nhà tuyển dụng giữ cọc đủ tiền công trước khi ca hiện ra. Tiền chỉ trả cho người lao động khi ca xong; phần không dùng hoàn về ví nhà tuyển dụng.')
              : tx('Nhà tuyển dụng giữ cọc đủ tiền công trước khi ca hiện ra (mô phỏng). Tiền chỉ trả khi ca xong; phần không dùng được hoàn lại.'),
          },
          {
            icon: 'profile',
            title: tx('Xác minh tài khoản'),
            body: live
              ? tx('Xác thực số điện thoại bằng mã gửi qua tin nhắn và CCCD (quản trị viên duyệt) trong trang hồ sơ. Ảnh giấy tờ nằm ở kho riêng tư, chỉ quản trị viên xem để duyệt.')
              : tx('Bạn có thể xác minh số điện thoại và giấy tờ tuỳ thân trong trang hồ sơ. Hồ sơ đã xác minh giúp bên kia yên tâm hơn khi nhận việc hoặc duyệt người.'),
          },
          {
            icon: 'star',
            title: live ? tx('Đánh giá sau ca') : tx('Điểm uy tín'),
            body: live
              ? tx('Sau mỗi ca, hai bên chấm sao và viết nhận xét cho nhau trong 14 ngày. Nhà tuyển dụng thấy điểm sao trung bình, số ca đã làm với mình và số lần vắng mặt của người ứng tuyển; người lao động thấy nhận xét về quán trước khi nhận ca.')
              : tx('Điểm uy tín tạm tính từ lịch sử ca và đánh giá sau ca. Điểm dưới 50 bị tạm khoá ứng tuyển (bản demo).'),
          },
        ]}
      />

      <SafetyNotes
        id="safety-notes"
        title={tx('Lưu ý an toàn')}
        items={[
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
          {
            icon: 'shield',
            title: tx('Ưu tiên an toàn'),
            body: tx('Gặp nguy hiểm: rời khỏi địa điểm, gọi 113, sau đó báo cho CaLẻ qua trang Liên hệ hỗ trợ.'),
            urgent: true,
          },
        ]}
      />

      <div data-tone="cream" className="pt-14 sm:pt-20">
        <LandingHelp
          id="safety-help"
          title={tx('An toàn và hỗ trợ')}
          items={[
            { href: '/support', icon: 'help', title: tx('Cần hỗ trợ?'), body: tx('Email, hotline và cách phản ánh khi có vấn đề trong ca.') },
            { href: '/disputes', icon: 'status', title: tx('Chính sách xử lý tranh chấp'), body: tx('Khi nào nên mở yêu cầu và CaLẻ xem xét thế nào.') },
          ]}
        />
      </div>
    </ToneScroll>
  );
}

// ---------------------------------------------------------------------------
// Lưu ý an toàn — tiêu đề trái (dính khi cuộn), thẻ trắng có ô icon bên phải
// (cùng bố cục `LandingRules`, icon thay cho chip giá trị).
// ---------------------------------------------------------------------------

function SafetyNotes({
  id,
  title,
  items,
}: {
  id: string;
  title: string;
  items: Array<{ icon: LandingIcon; title: string; body: string; urgent?: boolean }>;
}) {
  return (
    <section aria-labelledby={id} data-tone="apricot" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
        <h2 id={id} className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:sticky lg:top-28 lg:self-start">
          {title}
        </h2>
        <ul className="flex flex-col gap-3">
          {items.map((it) => (
            <li key={it.title} className="flex gap-4 rounded-2xl bg-white p-4 shadow-card ring-1 ring-black/5 sm:p-5">
              <span
                className={[
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1',
                  it.urgent ? 'bg-red-50 text-red-800 ring-red-200' : 'bg-orange-50 text-orange-700 ring-orange-100',
                ].join(' ')}
              >
                <LandingIconGlyph name={it.icon} />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900">{it.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{it.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
