import Image from 'next/image';
import Link from 'next/link';
import { FeeCampaignNote } from '@/components/landing/FeeCampaignNote';
import { ApplicantPreview, ShiftControlPreview } from '@/components/landing/GuidePreviews';
import { EmployerPaymentsSection } from '@/components/landing/EmployerPaymentsSection';
import { EmployerPricingSection } from '@/components/landing/EmployerPricingSection';
import { shiftMilestones } from '@/components/landing/shiftMilestones';
import { ReviewFlowPreview } from '@/components/landing/ReviewFlowPreview';
import { ShiftPostPlayground } from '@/components/landing/ShiftPostPlayground';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { VerifyPreview } from '@/components/landing/VerifyPreview';
import { RoleSwitch } from '@/components/landing/RoleSwitch';
import { RoleBand } from '@/components/landing/RoleBand';
import { RoleHomeCta } from '@/components/landing/RoleHomeCta';
import { LandingProofView } from '@/components/landing/LandingProof';
import { proofCopy } from '@/components/landing/proofData';
import { TypeOnView } from '@/components/landing/TypeOnView';
import { EmployerPreview } from '@/components/landing/LandingPreview';
import {
  LandingChecks,
  LandingFaq,
  LandingFeatures,
  LandingHelp,
  LandingSteps,
} from '@/components/landing/LandingSections';
import { getLocale, getT, getTx } from '@/i18n/server';
import { shareMeta } from '@/lib/shareMeta';
import { isSupabaseEnv } from '@/data/supabaseClient';

/**
 * Trang cho nhà tuyển dụng. Trước đây (P1 feedback F4) giới hạn 4 khối; từ 02/10
 * chủ dự án yêu cầu trình bày đủ thông tin để khách ở lại. 03/10 sắp lại theo câu
 * chủ quán hỏi (làm sao → tốn bao nhiêu → cần chuẩn bị gì → nắm được gì):
 *   1. Hero: câu chính + CTA + minh hoạ quản lý ca (tự diễn, có ca huỷ / người vắng)
 *      + dòng "đang miễn phí dịch vụ" khi có đợt (production, `FeeCampaignNote`).
 *   2. Cách hoạt động: 4 bước từ đăng ca tới trả tiền.
 *   3. Thử đăng một ca: form tự gõ ví dụ rồi cho sửa giờ / lương / số người, tính
 *      tiền giữ, phí, phần hoàn khi có người vắng (`ShiftPostPlayground`) + quy định
 *      huỷ ca. Thay hai khối cũ "Tiền đi đâu" (ví dụ cố định) và "Phí dịch vụ".
 *      (`#employer-post`, gộp /employer/post-shift-guide 03/10: thêm mốc sửa ca).
 *   4. Xác thực tài khoản: thẻ SĐT / CCCD tự gõ ví dụ.
 *   5. Quản lý người ứng tuyển (`#employer-applicants`, gộp /employer/applicants-guide):
 *      thẻ ứng viên đúng theo bản (`ApplicantPreview`).
 *   6. Những gì bạn kiểm soát được.
 *   7. Tiền giữ, trả, hoàn (`#employer-payments`, gộp /employer/payments): sơ đồ dòng
 *      tiền của trang chủ + 4 luật.
 *   8. Đánh giá hai chiều (`#employer-reviews`, gộp /employer/reviews: gợi ý tiêu chí,
 *      có sự cố thì sao) — một thẻ 4 bước (`ReviewFlowPreview`).
 *   9. 3 lợi ích có ảnh.
 *  10. Câu hỏi thường gặp + an toàn / hỗ trợ.
 *  11. Khối mực: CTA + chuyển sang trang người lao động.
 * Bốn trang hướng dẫn nhỏ cũ chuyển hướng về đúng khối (next.config.ts). Nền xen kẽ
 * trắng / giấy (`cream` / `paper`) dưới da `.public-skin`.
 * Nền cả trang đổi màu theo khối đang xem (`ToneScroll`, như trang chủ).
 * Chỉ nói tính năng chạy ở CẢ demo lẫn production (`data/capabilities.ts`).
 * Không hiện "quán đang dùng" / số liệu khách cho tới khi có khách thật đồng ý.
 */
// Thẻ chia sẻ link (ảnh: opengraph-image.png cạnh file này).
export const metadata = shareMeta(
  'Cần người làm theo ca? | CaLẻ',
  'Đăng ca theo giờ, duyệt từng người, chỉ trả cho người đã làm. Phần không dùng được hoàn về ví.',
);

export default async function EmployerHomePage() {
  const t = await getT();
  const tx = await getTx();
  const locale = await getLocale();
  const supabase = isSupabaseEnv();
  // Mốc sửa / huỷ tính từ ca ví dụ 17:00 bằng đúng hằng số của app (`domain/timeGates`).
  const ms = shiftMilestones('17:00', '22:00');
  const benefits = [
    {
      img: '/images/landing/employer-su-kien.webp',
      alt: t('employerHome.benefit.attendance.alt'),
      title: t('employerHome.benefit.attendance.title'),
      desc: t('employerHome.benefit.attendance.desc'),
    },
    {
      img: '/images/landing/employer-bep.webp',
      alt: t('employerHome.benefit.payWorked.alt'),
      title: t('employerHome.benefit.payWorked.title'),
      desc: t(supabase ? 'employerHome.benefit.payWorked.desc' : 'employerHome.benefit.payWorked.desc.demo'),
    },
    {
      img: '/images/landing/employer-kiem-tra.webp',
      alt: t('employerHome.benefit.refund.alt'),
      title: t('employerHome.benefit.refund.title'),
      desc: t(supabase ? 'employerHome.benefit.refund.desc' : 'employerHome.benefit.refund.desc.demo'),
    },
  ];

  return (
    // Nền đổi màu theo khối đang xem (data-tone trên từng khối) — ToneScroll.
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      {/* 1. Hero — chữ bên trái + minh hoạ giao diện bên phải */}
      <section data-tone="cream" className="hero-decor relative px-4 pb-14 pt-8 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <RoleSwitch active="employer" />
          <div className="mt-10 grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-16">
            <div className="text-center lg:text-left">
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-balance text-gray-900 sm:text-4xl lg:text-5xl">
                {t('employerHome.hero.title')}
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base text-gray-600 sm:text-lg lg:mx-0">
                {t('employerHome.hero.lead')}{' '}
                {supabase
                  ? tx('Tiền công được giữ trên CaLẻ khi đăng ca và chỉ trả cho người thật sự làm.')
                  : tx('Tiền công được giữ khi đăng ca (mô phỏng) và chỉ trả cho người thật sự làm.')}
              </p>
              <div className="mt-8 flex flex-col items-center gap-3 lg:items-start">
                {/* Đã đăng nhập → không mời đăng ký nữa (RoleHomeCta). */}
                <RoleHomeCta audience="employer" placement="hero">
                  <Link
                    href="/register?role=employer"
                    className="cta-arrow-nudge motion-press inline-flex min-h-[52px] items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-8 text-base font-semibold text-gray-900 shadow-md hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2"
                  >
                    {t('employerHome.hero.cta')} <span className="cta-arrow" aria-hidden="true">→</span>
                  </Link>
                  <p className="text-sm text-gray-600">
                    {t('employerHome.hero.haveAccount')}{' '}
                    <Link href="/login" className="font-semibold text-orange-700 hover:underline">
                      {t('nav.login')}
                    </Link>
                  </p>
                </RoleHomeCta>
              </div>
              <LandingChecks
                items={[
                  tx('Đăng ca miễn phí'),
                  tx('Duyệt từng người'),
                  supabase ? tx('Phí 10% chỉ trên phần ca có người làm') : tx('Chưa thu phí trong giai đoạn thử nghiệm'),
                ]}
              />
              <FeeCampaignNote />
            </div>
            <EmployerPreview />
          </div>
        </div>
      </section>

      {/* 3 lợi ích có ảnh — ngay sau hero (03/10, chủ dự án) */}
      <section data-tone="paper" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="employer-benefits">
        <div className="mx-auto max-w-6xl">
          <h2 id="employer-benefits" className="sr-only">{t('employerHome.benefits.title')}</h2>
          <ul className="grid gap-6 sm:grid-cols-3">
            {benefits.map((b) => (
              <li key={b.title} className="overflow-hidden rounded-3xl bg-white shadow-card">
                <Image
                  src={b.img}
                  alt={b.alt}
                  width={960}
                  height={640}
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="aspect-[3/2] w-full object-cover"
                />
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900">{b.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">{b.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 2. Cách hoạt động */}
      <LandingSteps
        id="employer-how"
        title={tx('Từ lúc đăng ca đến lúc trả tiền')}
        lead={tx('Mỗi ca đi qua cùng một quy trình, và bạn luôn thấy ca đang ở bước nào.')}
        steps={[
          {
            title: tx('Đăng ca và giữ tiền công'),
            body: supabase
              ? tx('Nhập giờ, số người, mức lương. Tiền công cộng phí được giữ từ ví; ca chỉ hiện cho người lao động khi đã giữ đủ.')
              : tx('Nhập giờ, số người, mức lương. Tiền công được giữ từ ví (mô phỏng); ca chỉ hiện cho người lao động khi đã giữ đủ.'),
          },
          {
            title: tx('Duyệt người phù hợp'),
            body: tx('Xem hồ sơ, kỹ năng, đánh giá và trạng thái xác minh của từng người ứng tuyển rồi mới nhận.'),
          },
          {
            title: tx('Theo dõi ngày làm'),
            body: tx('Người lao động check-in khi đến, bạn xác nhận có mặt. Ai không đến, bạn đánh dấu vắng mặt.'),
          },
          {
            title: tx('Xác nhận và trả công'),
            body: supabase
              ? tx('Bấm xác nhận hoàn thành là tiền công vào ví người làm. Không thao tác thì hệ thống tự chốt sau 24 giờ kể từ khi ca kết thúc.')
              : tx('Bấm xác nhận hoàn thành là tiền công được ghi vào ví người làm (mô phỏng).'),
          },
        ]}
        tone="cream"
      />

      {/* 3. Thử đăng một ca — form tự gõ ví dụ, sửa được số; tiền giữ / phí / hoàn */}
      <section id="employer-post" aria-labelledby="employer-money" data-tone="paper" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-16">
          <div>
            <h2 id="employer-money" className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              <TypeOnView text={tx('Một ca tốn bao nhiêu?')} />
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              {tx('Thử đăng một ca: sửa giờ, lương, số người là thấy ngay số tiền giữ từ ví.')}
            </p>
            <ol className="mt-6 flex flex-col gap-5">
              <MoneyPoint
                n={1}
                title={tx('Khi đăng ca')}
                body={
                  supabase
                    ? tx('Tiền công cộng phí được giữ từ ví. Ca chỉ hiện cho người lao động khi đã giữ đủ.')
                    : tx('Tiền công được giữ từ ví (mô phỏng). Ca chỉ hiện cho người lao động khi đã giữ đủ.')
                }
              />
              <MoneyPoint
                n={2}
                title={tx('Khi ca xong')}
                body={
                  supabase
                    ? tx('Tiền công vào ví người đã làm. Phí 10% chỉ tính trên phần ca có người làm.')
                    : tx('Tiền công được ghi vào ví người đã làm (mô phỏng). Bản demo chưa thu phí.')
                }
              />
              <MoneyPoint
                n={3}
                title={tx('Nếu không dùng hết')}
                body={
                  supabase
                    ? tx('Vị trí trống, người vắng mặt, ca huỷ: hoàn cả tiền công lẫn phí của phần đó.')
                    : tx('Vị trí trống, người vắng mặt, ca huỷ: hoàn phần tiền đó (mô phỏng).')
                }
              />
            </ol>
            <h3 className="mt-8 text-base font-semibold text-gray-900">{tx('Sửa và huỷ ca đã đăng')}</h3>
            <ul className="mt-3 flex flex-col gap-3 text-sm leading-relaxed text-gray-700">
              {[
                tx('Sửa ca được khi còn hơn 24 giờ nữa mới bắt đầu (ca 17:00 thì tới {time} hôm trước).').replace('{time}', ms?.editBy.time ?? '17:00'),
                tx('Còn hơn 6 giờ nữa mới bắt đầu: bạn huỷ được.'),
                tx('Trong vòng 6 giờ, nếu đã có người ứng tuyển: không huỷ được, để bảo vệ người lao động.'),
                tx('Sau giờ bắt đầu: không huỷ được.'),
                tx('Ca lặp lại hằng tuần: tạo ca mới từ ca cũ, chỉ cần chọn lại ngày giờ.'),
              ].map((r) => (
                <li key={r} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
            {supabase && (
              <p className="mt-6 text-xs leading-relaxed text-gray-600">
                {tx('Nạp tiền vào ví bằng chuyển khoản qua PayOS. Số dư rút về ngân hàng khi cần.')}
              </p>
            )}
          </div>
          <ShiftPostPlayground />
        </div>
      </section>

      {/* 4. Xác thực tài khoản — thẻ xác thực tự gõ thông tin ví dụ */}
      <section aria-labelledby="employer-verify" data-tone="cream" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="lg:order-last">
            <h2 id="employer-verify" className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {tx('Xác thực tài khoản trước ca đầu tiên')}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              {supabase
                ? tx('Làm một lần trong trang Hồ sơ, mất vài phút.')
                : tx('Bản demo dùng giấy tờ mô phỏng; minh hoạ là luồng xác thực của bản thật.')}
            </p>
            <ol className="mt-6 flex flex-col gap-5">
              <MoneyPoint n={1} title={tx('Số điện thoại')} body={tx('Nhập số, nhận mã 6 số qua tin nhắn.')} />
              <MoneyPoint
                n={2}
                title={tx('CCCD')}
                body={tx('Gửi họ tên, số CCCD và ba ảnh; quản trị viên duyệt tay. Khi CaLẻ bật yêu cầu này, cần xác thực xong mới đăng được ca.')}
              />
              {supabase && (
                <MoneyPoint n={3} title={tx('Ảnh giấy tờ được để riêng')} body={tx('Ảnh CCCD nằm ở kho riêng tư, chỉ quản trị viên xem để duyệt.')} />
              )}
            </ol>
          </div>
          <VerifyPreview audience="employer" />
        </div>
      </section>

      {/* 5. Quản lý người ứng tuyển — gộp từ /employer/applicants-guide (03/10) */}
      <section aria-labelledby="employer-applicants" data-tone="paper" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 id="employer-applicants" className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {tx('Duyệt người, theo dõi ngày làm trên một trang')}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600">
              {supabase
                ? tx('Thẻ ứng viên cho biết người đó đã làm bao nhiêu ca với bạn, vắng mấy lần và được chấm bao nhiêu sao.')
                : tx('Thẻ ứng viên cho biết điểm uy tín, số ca đã làm, điểm sao, kỹ năng và giấy tờ đã xác minh.')}
            </p>
            <ol className="mt-6 flex flex-col gap-5">
              <MoneyPoint n={1} title={tx('Duyệt hoặc từ chối')} body={tx('Bấm "Duyệt" từng người; từ chối thì ghi lý do để người đó hiểu.')} />
              <MoneyPoint n={2} title={tx('Xác nhận có mặt')} body={tx('Ngày làm, người lao động check-in khi tới; bạn xác nhận có mặt từng người.')} />
              <MoneyPoint n={3} title={tx('Đánh dấu vắng mặt')} body={tx('Ai không đến, bạn đánh dấu vắng; phần tiền của vị trí đó hoàn về ví.')} />
              <MoneyPoint
                n={4}
                title={tx('Xác nhận hoàn thành')}
                body={
                  supabase
                    ? tx('Sau giờ kết thúc, bấm xác nhận là tiền công vào ví người làm; không bấm thì tự chốt sau 24 giờ.')
                    : tx('Sau giờ kết thúc, bấm xác nhận là tiền công được ghi vào ví người làm (mô phỏng).')
                }
              />
            </ol>
          </div>
          <ApplicantPreview />
        </div>
      </section>

      {/* 6. Những gì bạn kiểm soát */}
      <LandingFeatures
        id="employer-control"
        aside={<ShiftControlPreview />}
        title={tx('Bạn nắm được mọi thứ trong ca')}
        lead={tx('Không phải gọi điện hỏi từng người: thông tin nằm sẵn trên trang quản lý ca.')}
        items={[
          {
            icon: 'status',
            title: tx('Trạng thái ca rõ ràng'),
            body: tx('Mỗi ca có một nhãn trạng thái thống nhất ở mọi trang: đã đăng, sắp bắt đầu, đang diễn ra, chờ xác nhận, hoàn thành.'),
          },
          {
            icon: 'calendar',
            title: tx('Lịch tuyển dụng'),
            body: tx('Xem các ca đã đăng theo tuần hoặc theo ngày, bấm vào là tới trang quản lý.'),
          },
          {
            icon: 'repeat',
            title: tx('Đăng lại ca cũ'),
            body: tx('Ca lặp lại hằng tuần? Tạo ca mới từ ca cũ, chỉ cần chọn lại ngày giờ.'),
          },
          {
            icon: 'wallet',
            title: tx('Ví có lịch sử'),
            body: supabase
              ? tx('Mỗi khoản giữ, trả, hoàn đều có một dòng trong lịch sử ví.')
              : tx('Mỗi khoản giữ, trả, hoàn đều có một dòng trong lịch sử ví (mô phỏng).'),
          },
        ]}
        tone="cream"
      />

      {/* 7. Tiền giữ, trả, hoàn — gộp từ /employer/payments (03/10) */}
      <EmployerPaymentsSection tone="paper" />

      {/* 7b. Phí dịch vụ — gộp từ /pricing (03/10) */}
      <EmployerPricingSection tone="cream" />

      {/* 8. Đánh giá hai chiều + uy tín / kỹ năng (bản thật: "Sắp có") */}
      <section aria-labelledby="employer-reviews" data-tone="paper" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 id="employer-reviews" className="text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {tx('Đánh giá hai chiều sau mỗi ca')}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-600">{tx('Ca sau bạn biết người mình sắp duyệt đã làm thế nào.')}</p>
            <ol className="mt-6 flex flex-col gap-5">
              <MoneyPoint n={1} title={tx('Hai bên chấm nhau')} body={tx('Trong 14 ngày sau ca, bạn chấm sao cho người lao động và họ chấm quán. Gửi rồi không sửa được.')} />
              <MoneyPoint n={2} title={tx('Điểm sao trên thẻ ứng viên')} body={tx('Khi duyệt người ở ca sau, bạn thấy điểm sao trung bình từ các nhà tuyển dụng trước.')} />
              <MoneyPoint
                n={3}
                title={tx('Uy tín và kỹ năng')}
                body={
                  supabase
                    ? tx('Sắp có: điểm uy tín theo lịch sử ca và cấp kỹ năng theo từng loại việc của người lao động.')
                    : tx('Điểm uy tín của người lao động cộng trừ theo lịch sử ca; kỹ năng lên cấp theo số ca và số sao.')
                }
              />
            </ol>
            {/* Gộp từ /employer/reviews: gợi ý tiêu chí + có sự cố thì sao. */}
            <h3 className="mt-8 text-base font-semibold text-gray-900">{tx('Viết nhận xét cụ thể')}</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">{tx('"Pha chế nhanh, gọn quầy" hữu ích hơn "Tốt". Nên nói về:')}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {[tx('Đúng giờ'), tx('Thái độ'), tx('Chất lượng công việc'), tx('Giao tiếp')].map((c) => (
                <li key={c} className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-gray-800 ring-1 ring-black/10">
                  {c}
                </li>
              ))}
            </ul>
            <p className="mt-6 rounded-xl bg-white px-4 py-3 text-sm leading-relaxed text-gray-700 ring-1 ring-black/5">
              {supabase
                ? tx('Gặp hành vi không phù hợp hay mất an toàn thì đừng chỉ chấm sao thấp: liên hệ đội hỗ trợ CaLẻ để quản trị viên xem xét.')
                : tx('Gặp hành vi không phù hợp hay mất an toàn thì đừng chỉ chấm sao thấp: mở "Báo cáo sự cố" để quản trị viên xem xét.')}
            </p>
          </div>
          <ReviewFlowPreview audience="employer" />
        </div>
      </section>

      {/* 10. Câu hỏi thường gặp */}
      <LandingFaq
        id="employer-faq"
        title={tx('Câu hỏi thường gặp')}
        more={{ href: '/faq', label: tx('Xem tất cả câu hỏi') }}
        items={[
          {
            q: tx('Đăng ca có mất phí không?'),
            a: supabase
              ? tx('Đăng ca và duyệt người miễn phí. Phí 10% chỉ tính trên tiền công của phần ca có người làm.')
              : tx('Trong giai đoạn thử nghiệm, CaLẻ chưa thu phí và mọi giao dịch đều là mô phỏng.'),
          },
          {
            q: tx('Khi nào người lao động nhận tiền?'),
            a: supabase
              ? tx('Khi nhà tuyển dụng xác nhận hoàn thành. Nếu nhà tuyển dụng không xác nhận, hệ thống tự chốt khoảng 24 giờ sau giờ kết thúc ca: người đã check-in được trả công, người không check-in bị tính vắng mặt.')
              : tx('Khi bạn xác nhận hoàn thành ca, tiền công được ghi vào ví người làm (mô phỏng).'),
          },
          {
            q: tx('Người lao động không đến thì sao?'),
            a: supabase
              ? tx('Bạn đánh dấu vắng mặt. Người đó không nhận tiền công; phần tiền giữ cho vị trí đó, kể cả phí, hoàn về ví của bạn khi ca chốt.')
              : tx('Bạn đánh dấu vắng mặt. Người đó không nhận tiền công; phần tiền giữ cho vị trí đó hoàn về ví của bạn (mô phỏng).'),
          },
          {
            q: tx('Tôi cần chuẩn bị gì để đăng ca?'),
            a: supabase
              ? tx('Xác thực số điện thoại; khi CaLẻ yêu cầu thì xác thực thêm CCCD (quản trị viên duyệt). Rồi nạp tiền vào ví để giữ tiền công khi đăng ca.')
              : tx('Chọn loại tài khoản và nộp giấy tờ xác minh theo loại (mô phỏng), rồi đăng ca.'),
          },
          {
            q: tx('Tôi có huỷ ca được không?'),
            a: tx('Được, nếu ca còn hơn 6 giờ nữa mới bắt đầu. Trong vòng 6 giờ mà đã có người ứng tuyển thì không huỷ được, để bảo vệ người lao động.'),
          },
          { q: tx('Có gói trả phí nào khác không?'), a: tx('Chưa. Hiện chỉ có mức phí ở trên.') },
        ]}
        tone="cream"
      />

      {/* An toàn & hỗ trợ — lối tắt tới /support (03/10: /safety gộp vào /support) */}
      <LandingHelp
        id="employer-help"
        title={tx('An toàn và hỗ trợ')}
        items={[
          {
            href: '/support#support-safety',
            icon: 'shield',
            title: tx('An toàn khi làm theo ca'),
            body: tx('Xác minh tài khoản, nhận tiền trong ứng dụng và cách xử lý khi gặp nguy hiểm.'),
          },
          {
            href: '/support',
            icon: 'help',
            title: tx('Cần hỗ trợ?'),
            body: tx('Email, hotline và cách phản ánh khi có vấn đề trong ca.'),
          },
        ]}
        tone="cream"
      />

      {/* Ảnh tự chụp + lời chia sẻ thật của phía này — tự ẩn khi chưa có (proofData.ts). */}
      <LandingProofView id="employer-proof" copy={proofCopy(tx)} locale={locale} audience="employer" tone="paper" />

      {/* 11. Dải mực cuối trang — chữ và nút theo người đang xem (RoleBand) */}
      <RoleBand audience="employer" />
    </ToneScroll>
  );
}

/** Một ý có số thứ tự ở các khối hai cột (tiền của một ca, xác thực). */
function MoneyPoint({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white tabular-nums">
        {n}
      </span>
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-gray-600">{body}</p>
      </div>
    </li>
  );
}
