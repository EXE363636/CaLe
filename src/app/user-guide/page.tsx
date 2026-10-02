import { getTx } from '@/i18n/server';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { InfoPage, InfoSection } from '@/components/layout/InfoPage';
import { isSupabaseEnv } from '@/data/supabaseClient';

/** Production (supabase): tiền thật qua PayOS; local/demo: mô phỏng. */
const REAL_MONEY = isSupabaseEnv();

/**
 * Public user guide - Phase 9Y, polished in Phase 9Z-Fix-4.
 *
 * P1 feedback F3 (29/09/2026) — bớt chữ, lời thường, nói đúng từng chế độ:
 *   - Mỗi mục tối đa 3 ý ngắn + 1 ví dụ ngắn; 2 dòng thời gian còn 5 bước.
 *   - Production: tiền thật qua PayOS, cọc 100% tiền công + 10% phí, tự chốt
 *     ~24 giờ sau ca; cờ bắt buộc SĐT/CCCD mặc định tắt; server không chặn
 *     ứng tuyển theo điểm uy tín. Local/demo: mô phỏng.
 *   - Giữ nguyên mọi anchor `#…` (nav, footer, ô thống kê dashboard link vào).
 *
 * No `'use client'` - the FAQ accordion uses native `<details>` /
 * `<summary>` so JS isn't needed.
 */

interface Step {
  title: string;
  body: string;
}

/** Chữ theo ngôn ngữ của request (gọi trong trang với `tx` từ getTx). */
type Tx = (viText: string) => string;

const workerSteps = (tx: Tx): Step[] => [
  {
    title: tx('Đăng ký và làm hồ sơ.'),
    body: tx('Chọn "Tôi muốn tìm ca làm" khi đăng ký. Thêm kỹ năng và khu vực muốn làm trong trang Hồ sơ.'),
  },
  {
    title: tx('Tìm và ứng tuyển ca.'),
    body: tx('Bấm "Tìm ca làm", mở ca phù hợp rồi bấm "Ứng tuyển". Ca trùng giờ với lịch của bạn sẽ bị chặn.'),
  },
  {
    title: tx('Chờ duyệt.'),
    body: tx('Bạn nhận thông báo khi nhà tuyển dụng duyệt hoặc từ chối (kèm lý do).'),
  },
  {
    title: tx('Đi làm.'),
    body: tx('Đến nơi thì bấm "Check-in" trên trang Tổng quan, làm xong bấm "Check-out".'),
  },
  {
    title: tx('Nhận tiền công.'),
    body: REAL_MONEY
      ? tx('Nhà tuyển dụng xác nhận hoàn thành thì tiền công vào ví, rút về ngân hàng khi cần. Không ai bấm thì hệ thống tự chốt khoảng 24 giờ sau ca.')
      : tx('Nhà tuyển dụng xác nhận hoàn thành thì tiền công vào ví (mô phỏng trong bản demo).'),
  },
];

const employerSteps = (tx: Tx): Step[] => [
  {
    title: tx('Đăng ký và chọn loại tài khoản.'),
    body: tx('Chọn "Tôi cần tuyển người lao động", rồi chọn Cá nhân hoặc Doanh nghiệp.'),
  },
  {
    title: tx('Đăng ca và giữ cọc.'),
    body: REAL_MONEY
      ? tx('Nhập giờ, địa điểm, lương và số người cần. Hệ thống giữ cọc tiền công + 10% phí từ ví rồi mới công khai ca.')
      : tx('Nhập giờ, địa điểm, lương và số người cần. Bấm "Mô phỏng giữ cọc" để công khai ca.'),
  },
  {
    title: tx('Duyệt người ứng tuyển.'),
    body: tx('Xem hồ sơ và điểm uy tín, bấm "Duyệt" hoặc "Từ chối" kèm lý do.'),
  },
  {
    title: tx('Theo dõi ca.'),
    body: tx('Ca tự chuyển sang Đang diễn ra khi đến giờ. Người lao động check-in khi đến và check-out khi xong.'),
  },
  {
    title: tx('Xác nhận hoàn thành.'),
    body: REAL_MONEY
      ? tx('Bấm "Xác nhận hoàn thành" để trả tiền công. Ai không đến thì bấm "Vắng mặt": phần cọc đó hoàn về ví của bạn.')
      : tx('Bấm "Xác nhận hoàn thành" để trả tiền công (mô phỏng). Ai không đến thì bấm "Vắng mặt".'),
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
      <p className="text-xs font-semibold uppercase tracking-wider text-orange-700">
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
      <p className="text-xs font-semibold uppercase tracking-wider text-orange-700">
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
        <p className="text-xs font-semibold uppercase tracking-wider text-orange-700">
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

export default async function UserGuidePage() {
  const tx = await getTx();
  return (
    <InfoPage
      eyebrow={tx('Hướng dẫn sử dụng')}
      title={tx('Cách dùng CaLẻ')}
      intro={
        REAL_MONEY
          ? tx('Hướng dẫn ngắn cho người lao động và nhà tuyển dụng. Nạp, giữ cọc, trả công và rút tiền là giao dịch thật qua PayOS.')
          : tx('Hướng dẫn ngắn cho người lao động và nhà tuyển dụng. Đây là bản demo: tiền và xác minh đều là mô phỏng.')
      }
      ctas={[
        { label: tx('Tìm ca làm ngay'), href: '/shifts' },
        {
          label: tx('Đăng ca tuyển'),
          href: '/register?role=employer',
          variant: 'secondary',
        },
      ]}
    >
      {/* 5 bước cho mỗi bên */}
      <div className="grid gap-6 md:grid-cols-2 md:gap-8">
        <RoleColumn
          title={tx('Dành cho người lao động')}
          eyebrow="Worker"
          steps={workerSteps(tx)}
        />
        <RoleColumn
          title={tx('Dành cho nhà tuyển dụng')}
          eyebrow="Employer"
          steps={employerSteps(tx)}
        />
      </div>

      {/* Các mục chi tiết — nav, footer và ô thống kê dashboard link vào #id. */}
      <GuideGroup eyebrow={tx('Dành cho người lao động')} title={tx('Tính năng cho người tìm việc')}>
        <FeatureGuide
          id="worker-schedule"
          eyebrow={tx('Người lao động')}
          title={tx('Lịch cá nhân')}
          bullets={[
            tx('Đánh dấu giờ bận / rảnh trong tuần.'),
            tx('Khi bạn ứng tuyển, ca trùng lịch bận hoặc trùng ca đã được duyệt sẽ bị chặn.'),
          ]}
          example={tx('Bạn học 14:00–16:00 thứ Ba. Ca 15:00–17:00 thứ Ba sẽ báo trùng lịch.')}
          primaryCta={{ label: tx('Đăng nhập để mở Lịch cá nhân'), href: '/login' }}
          secondaryCta={{ label: tx('Tìm ca làm phù hợp'), href: '/shifts' }}
        />

        <FeatureGuide
          id="worker-reputation"
          eyebrow={tx('Người lao động')}
          title={tx('Điểm uy tín')}
          bullets={[
            tx('Bắt đầu 100 điểm (tạm tính từ lịch sử ca). Hoàn thành ca +5, vắng mặt không báo −20, huỷ trong 24 giờ trước ca −10.'),
            REAL_MONEY
              ? tx('Nhà tuyển dụng xem điểm này khi duyệt người.')
              : tx('Điểm dưới 50 bị tạm khoá ứng tuyển (bản demo).'),
          ]}
          example={tx('Bạn đang 100 điểm, vắng một ca không báo thì còn 80.')}
          primaryCta={{ label: tx('Đăng nhập để xem điểm của bạn'), href: '/login' }}
          secondaryCta={{ label: tx('Hồ sơ & điểm uy tín'), href: '/worker/reputation-guide' }}
        />

        <FeatureGuide
          id="worker-completed-shifts"
          eyebrow={tx('Người lao động')}
          title={tx('Ca đã hoàn thành')}
          bullets={[tx('Số ca bạn làm xong và đã được nhà tuyển dụng xác nhận. Ca đang chờ xác nhận chưa được đếm.')]}
          example={tx('Tuần này làm 3 ca, 2 ca đã xác nhận → ô này hiện 2.')}
        />

        <FeatureGuide
          id="worker-total-income"
          eyebrow={tx('Người lao động')}
          title={tx('Tổng thu nhập')}
          bullets={[
            REAL_MONEY
              ? tx('Tổng tiền công đã vào ví từ các ca đã được xác nhận.')
              : tx('Tổng tiền công từ các ca đã được xác nhận (mô phỏng).'),
            tx('Không tính ca đang diễn ra hoặc đang chờ xác nhận.'),
          ]}
          example={tx('Ca 4 giờ × 45.000đ + ca 5 giờ × 60.000đ → tăng 480.000đ.')}
        />

        <FeatureGuide
          id="worker-cancellation-quota"
          eyebrow={tx('Người lao động')}
          title={tx('Hạn mức huỷ ca')}
          bullets={[
            tx('Tối đa 3 lần huỷ trong 7 ngày và 10 lần trong 30 ngày.'),
            tx('Điểm uy tín 80–94: 4/tuần, 12/tháng. Điểm 95–100: 5/tuần, 14/tháng.'),
          ]}
          example={tx('7 ngày qua đã huỷ 2 ca → còn 1 lượt.')}
        />
      </GuideGroup>

      <GuideGroup eyebrow={tx('Dành cho nhà tuyển dụng')} title={tx('Tính năng cho nhà tuyển dụng')}>
        <FeatureGuide
          id="employer-post-shift"
          eyebrow={tx('Nhà tuyển dụng')}
          title={tx('Đăng ca tuyển')}
          bullets={[
            tx('Nhập tên ca, giờ, địa điểm, lương theo giờ và số người cần.'),
            REAL_MONEY
              ? tx('Ca chỉ hiện cho người lao động sau khi hệ thống giữ cọc tiền công + 10% phí từ ví.')
              : tx('Ca chỉ hiện cho người lao động sau khi giữ cọc (mô phỏng).'),
          ]}
          example={
            REAL_MONEY
              ? tx('Ca 4 giờ, 35.000đ/giờ, cần 2 người: tiền công 280.000đ → giữ 308.000đ (gồm 28.000đ phí).')
              : tx('Ca 4 giờ, 35.000đ/giờ, cần 2 người: giữ cọc 280.000đ (mô phỏng).')
          }
          primaryCta={{ label: tx('Đăng nhập để đăng ca tuyển'), href: '/login' }}
          secondaryCta={{ label: tx('Xem cách giữ cọc'), href: '/employer/payments' }}
        />

        <FeatureGuide
          id="employer-applicants"
          eyebrow={tx('Nhà tuyển dụng')}
          title={tx('Quản lý người ứng tuyển')}
          bullets={[
            tx('Xem hồ sơ, điểm uy tín và số ca đã làm ngay trên trang quản lý ca.'),
            tx('Bấm "Duyệt", hoặc "Từ chối" kèm lý do để người lao động hiểu.'),
          ]}
          example={tx('3 người ứng tuyển: bạn duyệt 2 người nhiều kinh nghiệm, từ chối 1 người kèm lý do.')}
          primaryCta={{ label: tx('Đăng nhập để quản lý người ứng tuyển'), href: '/login' }}
          secondaryCta={{ label: tx('Xem quy trình tuyển dụng'), href: '/how-it-works' }}
        />

        <FeatureGuide
          id="employer-active-shifts"
          eyebrow={tx('Nhà tuyển dụng')}
          title={tx('Ca đang hoạt động')}
          bullets={[tx('Ca đã giữ cọc và đang tuyển, đã đủ người, đang diễn ra hoặc chờ xác nhận. Không tính nháp, đã huỷ, hết hạn, đã hoàn thành.')]}
        />

        <FeatureGuide
          id="employer-pending-applications"
          eyebrow={tx('Nhà tuyển dụng')}
          title={tx('Đơn chờ duyệt')}
          bullets={[tx('Đơn bạn chưa duyệt hoặc từ chối. Nên xử lý sớm, nhất là ca diễn ra trong 24 giờ tới.')]}
        />

        <FeatureGuide
          id="employer-posted-shifts"
          eyebrow={tx('Nhà tuyển dụng')}
          title={tx('Ca đã đăng')}
          bullets={[tx('Tổng số ca bạn từng tạo, gồm mọi trạng thái.')]}
        />

        <FeatureGuide
          id="employer-completed-shifts"
          eyebrow={tx('Nhà tuyển dụng')}
          title={tx('Ca đã hoàn thành')}
          bullets={[
            REAL_MONEY
              ? tx('Ca bạn đã xác nhận hoàn thành; tiền công đã vào ví người lao động.')
              : tx('Ca bạn đã xác nhận hoàn thành; tiền công đã được trả (mô phỏng).'),
          ]}
        />
      </GuideGroup>

      <GuideGroup eyebrow={tx('Tiền cọc')} title={tx('Cách giữ cọc hoạt động')}>
        <FeatureGuide
          id="employer-payments"
          eyebrow={tx('Nhà tuyển dụng')}
          title={tx('Giữ cọc')}
          bullets={[
            tx('Tiền công được giữ cọc trước khi ca hiện ra, và chỉ trả cho người lao động khi ca xong.'),
            tx('Phần không dùng (vị trí trống, người vắng mặt, ca huỷ) hoàn về ví của bạn.'),
            REAL_MONEY
              ? tx('Nạp và rút tiền là giao dịch thật qua PayOS.')
              : tx('Trong bản demo, mọi giao dịch đều là mô phỏng.'),
          ]}
          primaryCta={{ label: tx('Xem chi tiết giữ cọc'), href: '/employer/payments' }}
          secondaryCta={{ label: tx('Đăng nhập'), href: '/login' }}
        />

        <FeatureGuide
          id="employer-total-deposit"
          eyebrow={tx('Nhà tuyển dụng')}
          title={tx('Tổng tiền công chờ thanh toán')}
          bullets={[tx('Tiền cọc đang giữ cho các ca chưa xong. Chưa phải tiền đã trả.')]}
          example={tx('Đăng ca 280.000đ tiền công → ô này tăng 280.000đ.')}
        />

        <FeatureGuide
          id="employer-total-paid"
          eyebrow={tx('Nhà tuyển dụng')}
          title={tx('Tổng tiền công đã thanh toán')}
          bullets={[tx('Tiền đã trả cho người lao động, tăng mỗi lần bạn xác nhận hoàn thành.')]}
        />
      </GuideGroup>

      <GuideGroup eyebrow={tx('Quyền riêng tư')} title={tx('Xác minh người dùng')}>
        <FeatureGuide
          id="verification-overview"
          eyebrow={tx('Quyền riêng tư')}
          title={tx('Cách xác minh hoạt động')}
          bullets={[
            tx('Gửi giấy tờ trong trang Hồ sơ; quản trị viên duyệt.'),
            tx('Người dùng khác chỉ thấy huy hiệu "Đã xác minh" và số giấy tờ đã che, không thấy ảnh gốc.'),
          ]}
        />
      </GuideGroup>

      <InfoSection title={tx('Câu hỏi thường gặp')}>
        <div className="mt-2 flex flex-col gap-3">
          <FaqEntry
            question={tx('Người lao động có phải trả trước không?')}
            answer={tx('Không. Chỉ nhà tuyển dụng giữ cọc tiền công trước khi đăng ca.')}
          />
          <FaqEntry
            question={tx('Tôi có huỷ được ca đã được duyệt không?')}
            answer={tx('Được. Còn hơn 3 giờ trước ca thì huỷ ngay; dưới 3 giờ cần nhà tuyển dụng đồng ý. Huỷ trong 24 giờ trước ca bị trừ 10 điểm uy tín.')}
          />
          <FaqEntry
            question={tx('Có giao dịch tiền thật không?')}
            answer={
              REAL_MONEY
                ? tx('Có. Nạp, giữ cọc, trả công và rút tiền là giao dịch thật qua cổng thanh toán PayOS.')
                : tx('Không. Đây là bản demo, mọi giao dịch đều là mô phỏng.')
            }
          />
          <FaqEntry
            question={tx('Có vướng mắc thì làm gì?')}
            answer={
              REAL_MONEY
                ? tx('Vào trang Liên hệ hỗ trợ, đội ngũ CaLẻ sẽ xem và phản hồi.')
                : tx('Bấm "Báo cáo vấn đề" trên trang quản lý ca; quản trị viên xem xét theo Chính sách xử lý tranh chấp.')
            }
          />
        </div>
      </InfoSection>
    </InfoPage>
  );
}
