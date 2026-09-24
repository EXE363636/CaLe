import type { ReactNode } from 'react';
import Link from 'next/link';
import { InfoPage, InfoSection } from '@/components/layout/InfoPage';
import { isSupabaseEnv } from '@/data/supabaseClient';

/** Production (supabase): tiền thật qua PayOS; local/demo: mô phỏng. */
const REAL_MONEY = isSupabaseEnv();

/**
 * Public user guide - Phase 9Y, polished in Phase 9Z-Fix-4.
 *
 * Server component. Renders a substantial walk-through for both
 * audiences - workers and employers - using the existing `<InfoPage>`
 * shell. The step content matches the actual product flows
 * (verification gate, deposit ratios, cancellation windows,
 * reputation arithmetic, etc.) so it's not generic AI filler.
 *
 * Phase 9Z-Fix-4 changes:
 *   - All raw route paths (/register, /worker/profile, /worker/dashboard,
 *     /worker/schedule, /employer/profile, /employer/shifts/new,
 *     /employer/shifts/[id], /shifts, /disputes) removed from
 *     user-facing copy. Replaced with the visible page / menu /
 *     button labels a normal user would actually look for.
 *   - Five new feature-anchor sections added so the public nav can
 *     deep-link to a specific feature explanation:
 *       #worker-schedule       - Lịch cá nhân
 *       #worker-reputation     - Điểm uy tín
 *       #employer-post-shift   - Đăng ca tuyển
 *       #employer-applicants   - Quản lý ứng viên
 *       #employer-payments     - Đảm bảo thanh toán
 *     Each section has `scroll-mt-24` so the sticky nav doesn't
 *     cover the heading when a hash deep-link lands.
 *
 * No `'use client'` - the FAQ accordion uses native `<details>` /
 * `<summary>` so JS isn't needed.
 */

interface Step {
  title: string;
  body: string;
}

// ---------------------------------------------------------------------------
// Worker timeline (9 steps, in order)
// ---------------------------------------------------------------------------

const WORKER_STEPS: Step[] = [
  {
    title: 'Đăng ký tài khoản người lao động.',
    body:
      'Mở trang Đăng ký, chọn "Tôi muốn tìm ca làm", nhập họ tên, email, số điện thoại, mật khẩu (≥ 8 ký tự). Sau khi đăng ký xong, hệ thống đăng nhập tự động.',
  },
  {
    title: 'Hoàn thiện hồ sơ.',
    body:
      'Mở mục Hồ sơ trong menu Người lao động và bổ sung giới thiệu ngắn, kỹ năng, loại công việc ưa thích, khu vực ưa thích. Hồ sơ đầy đủ giúp nhà tuyển dụng tin tưởng và duyệt nhanh hơn.',
  },
  {
    title: 'Xác minh thông tin.',
    body:
      'Bật xác minh số điện thoại, CMND/CCCD, thẻ sinh viên (nếu có) ngay trong trang Hồ sơ. Trong bản dùng thử (MVP) các xác minh được giả lập; người lao động cần xác minh số điện thoại trước khi có thể ứng tuyển ca đầu tiên.',
  },
  {
    title: 'Tìm ca làm.',
    body:
      'Bấm "Tìm ca làm" trên thanh điều hướng để xem các ca đang tuyển. Hệ thống chỉ hiển thị ca đã được nhà tuyển dụng đảm bảo thanh toán, còn vị trí trống và chưa quá giờ bắt đầu. Có thể lọc theo khu vực, ngày, lương và loại công việc.',
  },
  {
    title: 'Ứng tuyển ca phù hợp.',
    body:
      'Bấm vào ca để xem chi tiết, sau đó bấm nút "Ứng tuyển". Bạn sẽ không thể ứng tuyển nếu chưa xác minh số điện thoại, có điểm uy tín dưới 50, ca bị trùng giờ, ca đã đủ người hoặc bạn đã ứng tuyển ca đó trước đây.',
  },
  {
    title: 'Chờ nhà tuyển dụng duyệt.',
    body:
      'Đơn ứng tuyển bắt đầu ở trạng thái Chờ duyệt. Khi được duyệt, đơn chuyển sang Đã duyệt và bạn nhận thông báo. Nếu bị từ chối, bạn xem lý do tại mục "Đơn bị từ chối gần đây" trên trang Tổng quan của người lao động.',
  },
  {
    title: 'Đi làm - check-in / check-out.',
    body:
      'Đến giờ ca, mở trang Tổng quan của người lao động, chọn ca sắp diễn ra và bấm "Check-in". Khi xong ca bấm "Check-out". Hệ thống sẽ chuyển trạng thái thành Đã check-out và chờ nhà tuyển dụng xác nhận.',
  },
  {
    title: 'Nhận thanh toán.',
    body:
      REAL_MONEY
        ? 'Khi nhà tuyển dụng bấm “Xác nhận hoàn thành”, tiền công được chuyển ngay vào ví của bạn và có thể rút về tài khoản ngân hàng. Nếu nhà tuyển dụng không xác nhận, hệ thống tự xác nhận sau 24 giờ kể từ khi ca kết thúc.'
        : 'Khi nhà tuyển dụng bấm “Xác nhận hoàn thành”, ca được ghi nhận là hoàn thành và tiền công được chuyển cho bạn. Trong bản MVP, việc chuyển tiền chỉ được mô phỏng. Ô "Tổng thu nhập" trên trang Tổng quan tăng tương ứng.',
  },
  {
    title: 'Theo dõi điểm uy tín.',
    body:
      'Mỗi ca hoàn thành cộng +5 điểm. Vắng mặt không báo trước trừ 20 điểm. Huỷ ca trong vòng 24 giờ trước giờ bắt đầu trừ 10 điểm. Điểm dưới 50 sẽ bị hạn chế ứng tuyển. Bấm vào ô "Điểm uy tín" trên trang Tổng quan để xem dòng thời gian chi tiết.',
  },
];

// ---------------------------------------------------------------------------
// Employer timeline (9 steps, in order)
// ---------------------------------------------------------------------------

const EMPLOYER_STEPS: Step[] = [
  {
    title: 'Đăng ký tài khoản nhà tuyển dụng.',
    body:
      'Mở trang Đăng ký, chọn "Tôi cần tuyển người lao động", rồi chọn loại tài khoản: Cá nhân/Freelance hoặc Doanh nghiệp. Trước khi ca được hiển thị cho người lao động, nhà tuyển dụng cần thanh toán trước toàn bộ tiền công của ca; cấp độ tin cậy giúp tăng độ ưu tiên hiển thị và giảm phí dịch vụ trong tương lai.',
  },
  {
    title: 'Hoàn thiện hồ sơ doanh nghiệp.',
    body:
      'Mở mục Hồ sơ trong menu Nhà tuyển dụng và bổ sung mô tả, loại hình kinh doanh, logo (nếu có). Trong bản MVP, xác minh doanh nghiệp được giả lập.',
  },
  {
    title: 'Đăng ca tuyển.',
    body:
      'Trong menu Nhà tuyển dụng, chọn "Đăng ca tuyển". Điền tên ca, mô tả, yêu cầu, loại công việc, khu vực, ngày, giờ bắt đầu/kết thúc, lương theo giờ (đ) và số lượng vị trí cần.',
  },
  {
    title: 'Đảm bảo thanh toán tiền công.',
    body:
      'Hệ thống yêu cầu nhà tuyển dụng thanh toán trước 100% tổng tiền công cho mọi cấp độ tin cậy trong bản MVP. Bấm “Xác nhận đã thanh toán” để hoàn tất bước thanh toán trước trong bản MVP. Sau đó, ca sẽ chuyển từ Bản nháp sang Đang tuyển. Cấp độ tin cậy ảnh hưởng đến độ ưu tiên hiển thị và phí dịch vụ trong tương lai.',
  },
  {
    title: 'Nhận đơn ứng tuyển.',
    body:
      'Đơn ứng tuyển hiển thị trong trang quản lý chi tiết của ca tuyển và trong ô "Đơn chờ duyệt" trên Tổng quan của nhà tuyển dụng. Bấm "Xem hồ sơ" để xem chi tiết người ứng tuyển kèm điểm uy tín, lịch sử và xác minh.',
  },
  {
    title: 'Duyệt người lao động.',
    body:
      'Bấm "Duyệt" để chấp nhận đơn, hoặc "Từ chối" và nhập lý do (bắt buộc). Người lao động sẽ nhận thông báo kèm lý do từ chối.',
  },
  {
    title: 'Theo dõi ca làm.',
    body:
      'Khi đến giờ, ca tự chuyển sang Đang diễn ra. Sau giờ kết thúc, nếu có người check-out, ca chuyển sang Chờ xác nhận.',
  },
  {
    title: 'Xác nhận hoàn thành.',
    body:
      REAL_MONEY
        ? 'Bấm "Xác nhận hoàn thành" trên từng người lao động: tiền công vào ví người đó ngay. Nếu người lao động không đến, bấm "Vắng mặt" (sau giờ bắt đầu 15 phút) - phần cọc của vị trí đó được hoàn về ví của bạn khi ca chốt. Nếu bạn không xác nhận, hệ thống tự xác nhận sau 24 giờ kể từ khi ca kết thúc.'
        : 'Bấm "Xác nhận hoàn thành" trên từng người lao động. Tiền công được chuyển cho người lao động và ca chuyển sang trạng thái Đã hoàn thành. Trong bản MVP, giao dịch này chỉ được mô phỏng. Nếu người lao động vắng mặt, bấm "Vắng mặt" - bạn được tặng 1 lượt boost cho ca tiếp theo.',
  },
  {
    title: 'Đánh giá sau ca.',
    body:
      'Sau khi ca hoàn thành, đánh giá người lao động từ 1–5 sao và nhận xét ngắn. Đánh giá hai chiều - người lao động cũng có thể đánh giá nhà tuyển dụng.',
  },
];

// ---------------------------------------------------------------------------
// Inline helpers (server components, scoped to this file)
// ---------------------------------------------------------------------------

function StepNumber({ n }: { n: number }) {
  // Mirrors the homepage `<StepNumber />` from `src/app/page.tsx` so
  // both surfaces feel like one product.
  return (
    <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-bold text-white shadow-md ring-4 ring-orange-50">
      {n}
    </span>
  );
}

function StepCard({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="relative flex items-start gap-3">
      <StepNumber n={n} />
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-gray-900">{title}</p>
        <p className="mt-1 text-sm text-justify leading-relaxed text-gray-700">{body}</p>
      </div>
    </li>
  );
}

function RoleColumn({
  title,
  eyebrow,
  steps,
}: {
  title: string;
  eyebrow: string;
  steps: Step[];
}) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-orange-50/40 p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-bold text-gray-900">{title}</h2>
      <ol className="mt-5 flex flex-col gap-5">
        {steps.map((step, idx) => (
          <StepCard
            key={step.title}
            n={idx + 1}
            title={step.title}
            body={step.body}
          />
        ))}
      </ol>
    </div>
  );
}

function FaqEntry({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-gray-900">
        <span>{question}</span>
        <span
          aria-hidden="true"
          className="text-xs text-gray-500 transition-transform group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <p className="mt-3 text-sm text-justify leading-relaxed text-gray-700">{answer}</p>
    </details>
  );
}

/**
 * FeatureGuide - Phase 9Z-Fix-4, extended in Phase 9Z-Fix-5.
 *
 * Anchored card targeted by deep links from the public nav (e.g.
 * `/user-guide#worker-schedule`) and from in-app `<HelpPopover>` CTAs
 * (e.g. `/user-guide#worker-total-income`). Renders an `id`-anchored
 * section with `scroll-mt-24` so the sticky nav doesn't cover the
 * heading, a soft warm card surface, optional concrete example block,
 * optional next-action line, and an optional CTA row.
 *
 * Phase 9Z-Fix-5 additions:
 *   - `example` prop renders a tinted "Ví dụ" callout so real users
 *     can see exactly how the feature works on a representative case.
 *   - `nextAction` prop renders a small "Tiếp theo" line so users
 *     know what to do once they understand the concept.
 *   - `primaryCta` is now optional. Sections targeted by in-app
 *     HelpPopover CTAs don't need a redundant "Đăng nhập" pill - the
 *     user is already authenticated when they open the help.
 */
function FeatureGuide({
  id,
  eyebrow,
  title,
  bullets,
  example,
  nextAction,
  primaryCta,
  secondaryCta,
}: {
  id: string;
  eyebrow: string;
  title: string;
  bullets: string[];
  example?: string;
  nextAction?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}) {
  const showCtas = primaryCta !== undefined || secondaryCta !== undefined;
  return (
    <section
      id={id}
      // `scroll-mt-24` (~96px) clears the sticky header (`z-30`,
      // ~64–72px tall) plus a small breathing margin so the heading
      // is comfortably visible after a deep-link jump.
      className="scroll-mt-24 rounded-2xl border border-orange-100 bg-orange-50/30 p-5 shadow-sm sm:p-6"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-bold text-gray-900">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2 text-sm leading-relaxed text-gray-700">
            <span
              aria-hidden="true"
              className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500"
            />
            <span className="text-justify">{b}</span>
          </li>
        ))}
      </ul>
      {example && (
        <div className="mt-3 rounded-lg border border-orange-200 bg-white/70 p-3 text-sm text-justify leading-relaxed text-gray-700">
          <span className="mr-1 font-semibold text-orange-700">Ví dụ:</span>
          {example}
        </div>
      )}
      {nextAction && (
        <p className="mt-3 text-sm text-justify leading-relaxed text-gray-700">
          <span className="mr-1 font-semibold text-orange-700">Tiếp theo:</span>
          {nextAction}
        </p>
      )}
      {showCtas && (
        <div className="mt-4 flex flex-wrap gap-2">
          {primaryCta && (
            <Link
              href={primaryCta.href}
              className="cta-arrow-nudge inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-gradient-to-b from-orange-500 to-orange-600 px-4 text-sm font-semibold text-white shadow-sm hover:from-orange-500 hover:to-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {primaryCta.label}
              <span className="cta-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          )}
          {secondaryCta && (
            <Link
              href={secondaryCta.href}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-orange-300 bg-white px-4 text-sm font-semibold text-orange-700 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              {secondaryCta.label}
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * GuideGroup - Phase 9Z-Fix-5.
 *
 * Visual grouping for related `<FeatureGuide>` cards. Adds an orange
 * eyebrow + title + lead so the guide reads as three distinct
 * audiences rather than one wall of cards.
 */
function GuideGroup({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-700">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-xl font-bold text-gray-900">{title}</h2>
        {lead && (
          <p className="mt-1 text-sm text-justify leading-relaxed text-gray-600">{lead}</p>
        )}
      </div>
      {children}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UserGuidePage() {
  return (
    <InfoPage
      eyebrow="Hướng dẫn sử dụng"
      title="Cách dùng CaLẻ"
      intro="Hướng dẫn từng bước cho người lao động và nhà tuyển dụng. Mỗi bước gắn liền với thao tác thật trên ứng dụng - không phải mô tả chung chung."
      ctas={[
        { label: 'Tìm ca làm ngay', href: '/shifts' },
        {
          label: 'Đăng ca tuyển',
          href: '/register?role=employer',
          variant: 'secondary',
        },
      ]}
    >
      {/* Hero summary - what is CaLê / Now */}
      <section>
        <p className="text-justify leading-relaxed text-gray-700">
          CaLẻ là nền tảng kết nối ca làm ngắn hạn tại Việt Nam.
          Người muốn tìm việc theo ca như sinh viên, người lao động tự do hoặc người cần kiếm thêm thu nhập có thể tìm ca phù hợp với lịch cá nhân; nhà tuyển dụng đảm bảo thanh
          toán trước khi đăng ca, giúp người lao động yên tâm về thanh toán.
        </p>
        <p className="mt-3 text-justify leading-relaxed text-gray-700">
          Toàn bộ giao dịch trong bản dùng thử (MVP) đều được giả lập trong
          trình duyệt - không có thanh toán thật, không có xác minh thật.
          Trang hướng dẫn này mô tả luồng đầy đủ để bạn hình dung sản phẩm
          khi triển khai chính thức.
        </p>
      </section>

      {/* Phase 9Z-Fix-4 - feature anchor sections.
          Public nav deep-links land here; `scroll-mt-24` clears the
          sticky header. Each section explains a specific feature in
          plain Vietnamese with a CTA inviting login or further
          reading.

          Phase 9Z-Fix-5 - extended with 9 more dashboard-stat
          anchors, grouped under three thematic <GuideGroup> blocks
          (Người lao động / Nhà tuyển dụng / Thanh toán & uy tín) so
          the guide reads as three distinct audiences rather than a
          long flat list. */}

      <GuideGroup
        eyebrow="Dành cho người lao động"
        title="Tính năng cho người tìm việc"
        lead="Các tính năng giúp bạn tìm ca, quản lý lịch và giữ điểm uy tín tốt."
      >
        <FeatureGuide
          id="worker-schedule"
          eyebrow="Người lao động"
          title="Lịch cá nhân hoạt động như thế nào?"
          bullets={[
            'Người lao động có thể khai báo các khung giờ bận hoặc rảnh trong tuần.',
            'Hệ thống dùng lịch cá nhân để tránh ứng tuyển trùng giờ với việc khác.',
            'Khi bạn ứng tuyển một ca, hệ thống kiểm tra ca đó có trùng lịch cá nhân hoặc trùng ca đã được duyệt không. Nếu trùng, đơn ứng tuyển bị chặn để bạn không nhận quá nhiều ca cùng lúc.',
            'Tính năng Lịch cá nhân yêu cầu đăng nhập với vai trò người lao động.',
          ]}
          example="Bạn có lịch học từ 14:00–16:00 thứ Ba. Khi bạn cố ứng tuyển một ca diễn ra 15:00–17:00 cùng thứ Ba, hệ thống sẽ chặn đơn ứng tuyển và báo trùng lịch."
          nextAction="Trong Lịch cá nhân, đánh dấu các khung giờ bạn bận trong tuần để hệ thống lọc giúp bạn các ca phù hợp."
          primaryCta={{ label: 'Đăng nhập để mở Lịch cá nhân', href: '/login' }}
          secondaryCta={{ label: 'Tìm ca làm phù hợp', href: '/shifts' }}
        />

        <FeatureGuide
          id="worker-reputation"
          eyebrow="Người lao động"
          title="Điểm uy tín của người lao động"
          bullets={[
            'Điểm uy tín phản ánh mức độ đáng tin cậy của bạn dựa trên lịch sử thực tế. Mọi người lao động bắt đầu với 100 điểm.',
            'Hoàn thành ca tốt cộng +5 điểm cho mỗi ca.',
            'Vắng mặt không báo trước trừ 20 điểm; huỷ trong vòng 24 giờ trước giờ bắt đầu trừ 10 điểm.',
            'Điểm dưới 50 sẽ bị hạn chế ứng tuyển ca mới cho đến khi điểm phục hồi.',
          ]}
          example="Bạn bắt đầu với 100 điểm và đây cũng là mức hiển thị tối đa. Vì vậy, sau khi hoàn thành thêm các ca tốt, điểm vẫn hiển thị là 100. Nếu bạn vắng mặt một ca và bị trừ 20 điểm, điểm sẽ giảm còn 80."
          nextAction="Bấm vào ô “Điểm uy tín” trên Tổng quan người lao động để xem toàn bộ dòng thời gian cộng / trừ điểm."
          primaryCta={{ label: 'Đăng nhập để xem điểm của bạn', href: '/login' }}
          secondaryCta={{ label: 'Hồ sơ & điểm uy tín', href: '/worker/reputation-guide' }}
        />

        <FeatureGuide
          id="worker-completed-shifts"
          eyebrow="Người lao động"
          title="Ca đã hoàn thành là gì?"
          bullets={[
            'Đây là số ca bạn đã làm xong và được nhà tuyển dụng xác nhận hoàn thành.',
            'Một ca chỉ tính vào "Đã hoàn thành" sau khi cả người lao động và nhà tuyển dụng đều xác nhận xong.',
            'Số liệu này được dùng cùng với điểm uy tín và đánh giá để xây dựng hồ sơ làm việc của bạn.',
          ]}
          example="Tuần này bạn làm 3 ca: 2 ca đã được nhà tuyển dụng bấm Xác nhận hoàn thành, 1 ca vẫn đang chờ xác nhận. Ô “Ca đã hoàn thành” chỉ đếm 2 ca; ca còn lại sẽ chuyển sang đếm khi nhà tuyển dụng xác nhận."
          nextAction="Bấm vào ô “Ca đã hoàn thành” trên Tổng quan người lao động để xem danh sách 5 ca gần nhất."
        />

        <FeatureGuide
          id="worker-total-income"
          eyebrow="Người lao động"
          title="Tổng thu nhập được tính như thế nào?"
          bullets={[
            'Tổng thu nhập là tổng tiền công từ những ca bạn đã hoàn thành và đã được nhà tuyển dụng xác nhận thanh toán.',
            REAL_MONEY
              ? 'Một ca chỉ tính vào tổng thu nhập sau khi được xác nhận hoàn thành - tiền công khi đó vào ví của bạn.'
              : 'Một ca chỉ tính vào tổng thu nhập sau khi nhà tuyển dụng bấm Xác nhận hoàn thành - tiền sẽ được giải ngân (mô phỏng trong bản MVP).',
            'Số tiền này không bao gồm các ca đang diễn ra hoặc đang chờ xác nhận.',
          ]}
          example="Bạn hoàn thành 2 ca: một ca 4 giờ với lương 45.000 đ/giờ (tổng 180.000 đ) và một ca 5 giờ với lương 60.000 đ/giờ (tổng 300.000 đ). Sau khi cả hai được xác nhận, ô “Tổng thu nhập” tăng thêm 480.000 đ."
          nextAction="Bấm vào ô “Tổng thu nhập” trên Tổng quan người lao động để xem danh sách các ca và số tiền nhận được gần đây."
        />

        <FeatureGuide
          id="worker-cancellation-quota"
          eyebrow="Người lao động"
          title="Hạn mức huỷ tuần là gì?"
          bullets={[
            'Đây là số lần bạn còn có thể huỷ ca trong 7 ngày gần nhất, theo quy định điểm uy tín.',
            'Hạn mức cơ bản: 3 lượt huỷ trong 7 ngày và 10 lượt trong 30 ngày.',
            'Khi điểm uy tín cao (80–94 điểm), bạn được tăng nhẹ hạn mức (4/tuần, 12/tháng); rất cao (95–100 điểm) tăng hơn nữa (5/tuần, 14/tháng).',
            'Hạn mức tính trên các đơn ứng tuyển bị huỷ thực tế, không tính các yêu cầu huỷ vẫn đang chờ duyệt hoặc bị nhà tuyển dụng từ chối.',
          ]}
          example="Trong 7 ngày qua, bạn đã huỷ 2 ca nên còn 1 lượt huỷ. Sau khi sử dụng lượt thứ 3, bạn sẽ không thể huỷ thêm cho đến khi một lần huỷ cũ không còn nằm trong khoảng 7 ngày gần nhất."
          nextAction="Bấm vào ô “Hạn mức huỷ tuần” trên Tổng quan người lao động để xem chi tiết các lần huỷ trong 7 và 30 ngày gần nhất."
        />
      </GuideGroup>

      <GuideGroup
        eyebrow="Dành cho nhà tuyển dụng"
        title="Tính năng cho nhà tuyển dụng"
        lead="Các tính năng giúp bạn đăng ca, duyệt ứng viên và theo dõi tiến độ."
      >
        <FeatureGuide
          id="employer-post-shift"
          eyebrow="Nhà tuyển dụng"
          title="Đăng ca tuyển diễn ra như thế nào?"
          bullets={[
            'Nhà tuyển dụng nhập tên ca, thời gian, địa điểm, mức lương theo giờ và số lượng người cần tuyển.',
            'Trước khi ca được hiển thị cho người lao động, nhà tuyển dụng cần thanh toán trước toàn bộ tiền công của ca. Cấp độ tin cậy ảnh hưởng đến độ ưu tiên hiển thị và phí dịch vụ trong tương lai.',
            'Ca chỉ hiển thị cho người lao động sau khi đảm bảo thanh toán thành công - đảm bảo tiền công được bảo đảm trước khi ai đó đến nhận việc.',
            'Trong bản MVP, thanh toán và đảm bảo thanh toán được giả lập trong trình duyệt - không có giao dịch tiền thật.',
          ]}
          example="Bạn đăng một ca phục vụ 4 giờ tối thứ Bảy, lương 35.000 đ/giờ, cần 2 người. Tổng tiền công là 280.000 đ. Hệ thống yêu cầu đảm bảo thanh toán 100% tức 280.000 đ trước khi ca công khai. Cấp độ tin cậy của bạn ảnh hưởng đến độ ưu tiên hiển thị, không ảnh hưởng đến khoản đảm bảo thanh toán."
          nextAction="Trong menu Nhà tuyển dụng, chọn Đăng ca tuyển và điền đầy đủ thông tin để tiến hành đảm bảo thanh toán."
          primaryCta={{ label: 'Đăng nhập để đăng ca tuyển', href: '/login' }}
          secondaryCta={{ label: 'Xem cách đảm bảo thanh toán', href: '/employer/payments' }}
        />

        <FeatureGuide
          id="employer-applicants"
          eyebrow="Nhà tuyển dụng"
          title="Quản lý ứng viên như thế nào?"
          bullets={[
            'Khi có người ứng tuyển, nhà tuyển dụng xem hồ sơ, điểm uy tín, kỹ năng và lịch sử làm việc của ứng viên ngay trên trang quản lý ca.',
            'Bấm Duyệt để chấp nhận đơn ứng tuyển, hoặc Từ chối kèm lý do (bắt buộc) để người lao động hiểu vì sao.',
            'Sau khi duyệt, người lao động sẽ nhận thông báo và đến giờ thực hiện ca.',
            REAL_MONEY
              ? 'Sau khi ca hoàn thành, nhà tuyển dụng bấm Xác nhận hoàn thành - tiền công vào ví người lao động.'
              : 'Sau khi ca hoàn thành, nhà tuyển dụng bấm Xác nhận hoàn thành - tiền công được giải ngân (mô phỏng) cho người lao động.',
          ]}
          example="Có 3 người ứng tuyển ca tối nay. Bạn xem hồ sơ từng người: ứng viên A có điểm uy tín 95 và 12 ca hoàn thành, ứng viên B có 75 và 4 ca, ứng viên C mới (100 điểm, chưa có ca). Bạn duyệt A và B, từ chối C kèm lý do «Ưu tiên người có kinh nghiệm cho ca này»."
          nextAction="Trong Tổng quan nhà tuyển dụng, bấm vào ô “Đơn chờ duyệt” để xử lý các đơn còn chờ."
          primaryCta={{ label: 'Đăng nhập để quản lý ứng viên', href: '/login' }}
          secondaryCta={{ label: 'Xem quy trình tuyển dụng', href: '/how-it-works' }}
        />

        <FeatureGuide
          id="employer-active-shifts"
          eyebrow="Nhà tuyển dụng"
          title="Ca đang hoạt động là gì?"
          bullets={[
            'Đây là các ca đã đăng, đã đảm bảo thanh toán và đang trong quá trình tuyển hoặc làm việc.',
            'Bao gồm các trạng thái: Đang tuyển (còn vị trí), Đã đủ người (đủ ứng viên đã duyệt), Đang diễn ra (đến giờ ca), và Chờ xác nhận (đã check-out, chờ xác nhận hoàn thành).',
            'Số liệu này không bao gồm ca Bản nháp, Đã huỷ, Hết hạn hoặc Đã hoàn thành.',
          ]}
          example="Hôm nay bạn có 4 ca: 2 ca đang tuyển thêm người, 1 ca đã đủ người và sắp diễn ra, 1 ca đã hoàn thành tuần trước. Ô “Ca đang hoạt động” đếm 3, không tính ca đã hoàn thành."
          nextAction="Bấm vào ô “Ca đang hoạt động” trên Tổng quan để mở danh sách và quản lý từng ca."
        />

        <FeatureGuide
          id="employer-pending-applications"
          eyebrow="Nhà tuyển dụng"
          title="Đơn chờ duyệt là gì?"
          bullets={[
            'Đây là các đơn ứng tuyển đang chờ nhà tuyển dụng quyết định Duyệt hoặc Từ chối.',
            'Trong khoảng thời gian này, ứng viên thấy đơn của mình ở trạng thái Chờ duyệt và chưa nhận thông báo kết quả.',
            'Sau khi bạn xử lý, đơn sẽ chuyển sang Đã duyệt hoặc Bị từ chối, và ứng viên nhận thông báo kèm lý do (nếu từ chối).',
          ]}
          example="Có 2 người ứng tuyển vào ca phục vụ tối nay. Trước khi ca bắt đầu, bạn mở từng đơn để xem hồ sơ, điểm uy tín và kỹ năng, rồi chọn Duyệt hoặc Từ chối."
          nextAction="Nên xử lý đơn ứng tuyển sớm để người lao động có thời gian chuẩn bị, đặc biệt khi ca diễn ra trong vòng 24 giờ."
        />

        <FeatureGuide
          id="employer-posted-shifts"
          eyebrow="Nhà tuyển dụng"
          title="Ca đã đăng gồm những gì?"
          bullets={[
            'Đây là tổng số ca bạn đã tạo trên hệ thống - bao gồm Bản nháp, Đang tuyển, Đã đủ người, Đang diễn ra, Chờ xác nhận, Đã hoàn thành và Đã huỷ.',
            'Là chỉ số tổng hợp xuyên suốt thời gian, không chỉ tuần hiện tại.',
            'Dùng để theo dõi quy mô tuyển dụng của bạn theo thời gian dài.',
          ]}
          example="Trong 6 tháng qua bạn đã tạo 24 ca: 18 đã hoàn thành, 4 đang hoạt động, 1 bản nháp chưa đảm bảo thanh toán, 1 đã huỷ. Ô “Ca đã đăng” đếm cả 24."
          nextAction="Bấm vào ô “Ca đã đăng” để xem danh sách đầy đủ và lọc theo trạng thái."
        />

        <FeatureGuide
          id="employer-completed-shifts"
          eyebrow="Nhà tuyển dụng"
          title="Ca đã hoàn thành là gì?"
          bullets={[
            'Đây là các ca đã được xác nhận hoàn thành sau khi người lao động check-in / check-out và bạn bấm Xác nhận hoàn thành.',
            REAL_MONEY
              ? 'Tiền công cho các ca này đã được chuyển vào ví người lao động.'
              : 'Tiền công cho các ca này đã được giải ngân (mô phỏng trong bản MVP).',
            'Số liệu này dùng để xây dựng hồ sơ uy tín nhà tuyển dụng - càng nhiều ca hoàn thành thành công, càng dễ thu hút người lao động chất lượng.',
          ]}
          example="Tháng này bạn đã đăng 6 ca. 4 ca đã chạy xong và bạn đã bấm Xác nhận hoàn thành cho từng người lao động. Ô “Ca đã hoàn thành” đếm 4; 2 ca còn lại vẫn ở trạng thái Đang diễn ra hoặc Chờ xác nhận."
          nextAction="Sau mỗi ca, nhớ vào trang quản lý ca và bấm Xác nhận hoàn thành để tiền công được giải ngân cho người lao động."
        />
      </GuideGroup>

      <GuideGroup
        eyebrow="Thanh toán, đảm bảo thanh toán và uy tín"
        title="Cách hệ thống đảm bảo thanh toán hoạt động"
        lead="Cơ chế giữ tiền tạm và giải ngân khi ca hoàn thành - bảo đảm cho cả hai phía."
      >
        <FeatureGuide
          id="employer-payments"
          eyebrow="Nhà tuyển dụng"
          title="Đảm bảo thanh toán"
          bullets={[
            'Nhà tuyển dụng thanh toán trước tiền công trước khi ca được công khai trên hệ thống.',
            'Tiền công chỉ được giải ngân cho người lao động sau khi ca hoàn thành và được xác nhận hai chiều.',
            'Cơ chế thanh toán trước giúp người lao động yên tâm về thanh toán mà không phải trả trước bất kỳ khoản nào.',
            REAL_MONEY
              ? 'Nạp và rút tiền là giao dịch thật qua cổng thanh toán PayOS.'
              : 'Trong bản MVP, mọi giao dịch được mô phỏng trong trình duyệt; không có thanh toán thật.',
          ]}
          example="Bạn đăng một ca trị giá 280.000 đ. Hệ thống yêu cầu đảm bảo thanh toán 100% tức 280.000 đ. Số tiền này được giữ tạm trong hệ thống đến khi ca hoàn thành - lúc đó tiền sẽ được chuyển cho người lao động. Cấp độ tin cậy ảnh hưởng đến độ ưu tiên hiển thị và phí dịch vụ tương lai, không ảnh hưởng đến tỷ lệ đảm bảo thanh toán."
          nextAction="Xem cấp độ tin cậy hiện tại của bạn và cách nâng cấp để được ưu tiên hiển thị và giảm phí dịch vụ trong tương lai."
          primaryCta={{ label: 'Tìm hiểu cấp độ tin cậy', href: '/employer/payments' }}
          secondaryCta={{ label: 'Đăng nhập', href: '/login' }}
        />

        <FeatureGuide
          id="employer-total-deposit"
          eyebrow="Nhà tuyển dụng"
          title="Tổng tiền công chờ thanh toán được tính như thế nào?"
          bullets={[
            'Đây là tổng tiền công đang được hệ thống giữ tạm chờ thanh toán.',
            'Bao gồm khoản tiền công chờ thanh toán của các ca đang tuyển, đã đủ người, đang diễn ra và chờ xác nhận.',
            'Đây chưa phải là khoản tiền đã chi trả. Hệ thống đang giữ tạm số tiền này và sẽ chuyển cho người lao động sau khi ca được xác nhận hoàn thành.',
            REAL_MONEY
              ? 'Tiền cọc được giữ thật từ ví nhà tuyển dụng; phần không sử dụng được hoàn về ví.'
              : 'Trong bản MVP, thao tác giữ tiền chờ thanh toán chỉ là mô phỏng, chưa có giao dịch thật.',
          ]}
          example="Bạn đăng một ca 4 giờ, lương 35.000 đ/giờ, cần 2 người. Tổng tiền công là 280.000 đ. Hệ thống sẽ giữ tạm 100% là 280.000 đ. Sau khi đăng ca, ô “Tổng tiền công chờ thanh toán” tăng thêm 280.000 đ."
          nextAction="Bấm vào ô “Tổng tiền công chờ thanh toán” trên Tổng quan nhà tuyển dụng để xem danh sách các ca đang giữ tiền."
        />

        <FeatureGuide
          id="employer-total-paid"
          eyebrow="Nhà tuyển dụng"
          title="Tổng tiền công đã thanh toán là gì?"
          bullets={[
            'Đây là tổng tiền đã giải ngân cho người lao động sau khi ca hoàn thành và được xác nhận.',
            'Số tiền này tăng mỗi khi bạn bấm Xác nhận hoàn thành cho một người lao động trong ca đã chạy xong.',
            'Đây là tổng tiền công đã được chuyển cho người lao động sau khi các ca hoàn thành. Chỉ những khoản đã được nhà tuyển dụng xác nhận hoàn thành mới được tính vào số liệu này.',
          ]}
          example="Tuần trước bạn xác nhận hoàn thành cho 4 người, tiền công lần lượt 140.000 đ, 140.000 đ, 180.000 đ và 180.000 đ. Ô “Tổng tiền công đã thanh toán” tăng thêm 640.000 đ."
          nextAction="Bấm vào ô “Tổng tiền công đã thanh toán” trên Tổng quan nhà tuyển dụng để xem các giao dịch giải ngân gần đây."
        />
      </GuideGroup>

      <GuideGroup
        eyebrow="Xác minh và quyền riêng tư"
        title="Cách hệ thống xác minh người dùng"
        lead="Quản trị viên duyệt giấy tờ - nhà tuyển dụng và người lao động chỉ thấy huy hiệu xác minh, không thấy ảnh giấy tờ gốc."
      >
        <FeatureGuide
          id="verification-overview"
          eyebrow="Quyền riêng tư"
          title="Cách xác minh hoạt động"
          bullets={[
            'Người lao động có thể xác minh bằng CCCD/CMND, thẻ sinh viên hoặc bằng lái xe - không bắt buộc chọn loại nào cụ thể.',
            'Nhà tuyển dụng có thể đăng ký dưới dạng Cá nhân thuê ngắn hạn, Hộ kinh doanh, Doanh nghiệp hoặc Agency / Sự kiện - mỗi loại nộp tài liệu khác nhau.',
            'Chỉ quản trị viên được xem đầy đủ giấy tờ bạn gửi. Người dùng khác chỉ nhìn thấy trạng thái đã xác minh, loại giấy tờ và một phần số giấy tờ đã được che.',
            'Một số ca có thể yêu cầu người lao động mang theo giấy tờ đã xác minh để đối chiếu khi nhận ca.',
          ]}
          example="Bạn xác minh bằng CCCD. Trong danh sách ứng viên của nhà tuyển dụng, họ sẽ thấy chip xanh «Đã xác minh · CCCD / CMND · 0791•••••234». Họ KHÔNG thấy ảnh CCCD đầy đủ của bạn."
          nextAction="Vào trang Hồ sơ tương ứng (người lao động hoặc nhà tuyển dụng) và gửi tài liệu xác minh để quản trị viên duyệt."
        />
      </GuideGroup>

      {/* Two-column timeline */}
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        <RoleColumn
          title="Dành cho người lao động"
          eyebrow="Worker"
          steps={WORKER_STEPS}
        />
        <RoleColumn
          title="Dành cho nhà tuyển dụng"
          eyebrow="Employer"
          steps={EMPLOYER_STEPS}
        />
      </div>

      {/* FAQ accordion */}
      <InfoSection title="Câu hỏi thường gặp">
        <div className="mt-2 flex flex-col gap-3">
          <FaqEntry
            question="Tôi có phải trả trước khi ứng tuyển không?"
            answer="Không. Người lao động không bao giờ phải trả trước bất kỳ khoản nào. Chỉ nhà tuyển dụng đảm bảo thanh toán tiền công trước khi đăng ca công khai."
          />
          <FaqEntry
            question="Tôi có thể huỷ ca đã được duyệt không?"
            answer="Bạn có thể huỷ ca đã được duyệt. Nếu huỷ trước giờ bắt đầu hơn 3 tiếng, yêu cầu được xử lý ngay. Nếu còn dưới 3 tiếng, nhà tuyển dụng cần đồng ý. Việc huỷ trong vòng 24 giờ trước khi ca bắt đầu sẽ làm giảm 10 điểm uy tín."
          />
          <FaqEntry
            question="Tỷ lệ đảm bảo thanh toán của nhà tuyển dụng được tính như thế nào?"
            answer="Trước khi ca được hiển thị cho người lao động, nhà tuyển dụng cần thanh toán trước toàn bộ tiền công của ca cho mọi cấp độ tin cậy trong bản MVP. Khoản này giữ trong hệ thống, chỉ giải ngân khi ca hoàn thành. Cấp độ tin cậy (thấp, trung bình, cao) ảnh hưởng đến độ ưu tiên hiển thị ca và phí dịch vụ trong tương lai, không ảnh hưởng đến tỷ lệ đảm bảo thanh toán."
          />
          <FaqEntry
            question="Phiên bản này có giao dịch tiền thật không?"
            answer="Không. Đây là bản dùng thử (MVP). Toàn bộ thanh toán, xác minh và đăng nhập đều giả lập trong trình duyệt. Khi triển khai thật, các luồng này sẽ được thay bằng dịch vụ tương ứng."
          />
          <FaqEntry
            question="Tôi cần làm gì khi có tranh chấp?"
            answer="Bấm Báo cáo vấn đề trên trang quản lý ca. Quản trị viên sẽ vào xem xét và quyết định giải ngân hoặc hoàn tiền theo trang Chính sách xử lý tranh chấp."
          />
        </div>
      </InfoSection>
    </InfoPage>
  );
}
