import Image from 'next/image';
import Link from 'next/link';
import { RoleSwitch } from '@/components/landing/RoleSwitch';
import { RoleHomeCta } from '@/components/landing/RoleHomeCta';
import { EmployerPreview } from '@/components/landing/LandingPreview';
import {
  LandingChecks,
  LandingFaq,
  LandingFeatures,
  LandingMoneyFlow,
  LandingSteps,
} from '@/components/landing/LandingSections';
import { getT, getTx } from '@/i18n/server';
import { isSupabaseEnv } from '@/data/supabaseClient';

/**
 * Trang cho nhà tuyển dụng. Trước đây (P1 feedback F4) giới hạn 4 khối; từ 02/10
 * chủ dự án yêu cầu trình bày đủ thông tin để khách ở lại, nên trang có:
 *   1. Hero: câu chính + CTA + minh hoạ giao diện quản lý ca.
 *   2. Cách hoạt động: 4 bước từ đăng ca tới trả tiền.
 *   3. 3 lợi ích có ảnh.
 *   4. Tiền đi đâu: ví dụ số + quy định huỷ ca (phí / mô phỏng theo chế độ).
 *   5. Những gì bạn kiểm soát được.
 *   6. Phí dịch vụ (rút gọn; chi tiết ở /pricing).
 *   7. Câu hỏi thường gặp.
 *   8. Khối mực: CTA + chuyển sang trang người lao động.
 * Chỉ nói tính năng chạy ở CẢ demo lẫn production (`data/capabilities.ts`).
 * Không hiện "quán đang dùng" / số liệu khách cho tới khi có khách thật đồng ý.
 */
export default async function EmployerHomePage() {
  const t = await getT();
  const tx = await getTx();
  const supabase = isSupabaseEnv();
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
    <div className="flex min-w-0 flex-col">
      {/* 1. Hero — nền kem, chữ bên trái + minh hoạ giao diện bên phải */}
      <section className="hero-decor relative px-4 pb-14 pt-8 sm:px-6 sm:pb-20 lg:px-8">
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
            </div>
            <EmployerPreview />
          </div>
        </div>
      </section>

      {/* 2. Cách hoạt động — nền trắng */}
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
      />

      {/* 3. 3 lợi ích có ảnh — nền kem */}
      <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="employer-benefits">
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

      {/* 4. Tiền đi đâu — nền trắng */}
      <LandingMoneyFlow
        id="employer-money"
        title={tx('Tiền của bạn đi đâu')}
        lead={
          supabase
            ? tx('Ví dụ một ca có tiền công 200.000 đ. Phí 10% chỉ tính trên phần ca có người làm.')
            : tx('Ví dụ một ca có tiền công 200.000 đ. Bản demo chưa thu phí và mọi khoản tiền đều là mô phỏng.')
        }
        stages={[
          {
            label: tx('Khi đăng ca'),
            amount: supabase ? '220.000 đ' : '200.000 đ',
            body: supabase
              ? tx('được giữ từ ví: 200.000 đ tiền công + 20.000 đ phí.')
              : tx('được giữ từ ví (mô phỏng).'),
          },
          {
            label: tx('Khi ca xong'),
            amount: '200.000 đ',
            body: supabase
              ? tx('vào ví người lao động. 20.000 đ còn lại là phí CaLẻ.')
              : tx('được ghi vào ví người lao động (mô phỏng).'),
          },
          {
            label: tx('Nếu không dùng hết'),
            amount: tx('Hoàn về ví'),
            body: supabase
              ? tx('Vị trí trống, người vắng mặt, ca huỷ: hoàn cả tiền công lẫn phí của phần đó.')
              : tx('Vị trí trống, người vắng mặt, ca huỷ: hoàn phần tiền đó (mô phỏng).'),
          },
        ]}
        rulesTitle={tx('Huỷ ca')}
        rules={[
          tx('Còn hơn 6 giờ nữa mới bắt đầu: bạn huỷ được.'),
          tx('Trong vòng 6 giờ, nếu đã có người ứng tuyển: không huỷ được, để bảo vệ người lao động.'),
          tx('Sau giờ bắt đầu: không huỷ được.'),
        ]}
        footnote={supabase ? tx('Nạp tiền vào ví bằng chuyển khoản qua PayOS. Số dư rút về ngân hàng khi cần.') : undefined}
      />

      {/* 5. Những gì bạn kiểm soát — nền kem */}
      <LandingFeatures
        id="employer-control"
        title={tx('Bạn nắm được mọi thứ trong ca')}
        lead={tx('Không phải gọi điện hỏi từng người: thông tin nằm sẵn trên trang quản lý ca.')}
        items={[
          {
            icon: 'profile',
            title: tx('Hồ sơ trước khi duyệt'),
            body: tx('Kỹ năng, đánh giá từ nhà tuyển dụng khác và trạng thái xác minh SĐT, CCCD của từng người.'),
          },
          {
            icon: 'status',
            title: tx('Trạng thái ca rõ ràng'),
            body: tx('Mỗi ca có một nhãn trạng thái thống nhất ở mọi trang: đã đăng, sắp bắt đầu, đang diễn ra, chờ xác nhận, hoàn thành.'),
          },
          {
            icon: 'attendance',
            title: tx('Ai có mặt, ai vắng'),
            body: tx('Check-in của người lao động và xác nhận có mặt của bạn được ghi lại cho từng người.'),
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
      />

      {/* 6. Phí dịch vụ — nền trắng */}
      <section className="bg-white px-4 py-14 sm:px-6 sm:py-20 lg:px-8" aria-labelledby="employer-pricing">
        <div className="mx-auto max-w-3xl rounded-3xl bg-orange-50 p-6 text-center ring-1 ring-orange-100 sm:p-10">
          <h2 id="employer-pricing" className="text-lg font-semibold text-gray-900">
            {t('employerHome.pricing.title')}
          </h2>
          <p className="mt-3 text-5xl font-extrabold tracking-tight text-gray-900 tabular-nums sm:text-6xl">
            {supabase ? '10%' : '0đ'}
          </p>
          <p className="mt-2 text-base text-gray-600">
            {t(supabase ? 'employerHome.pricing.unit' : 'employerHome.pricing.unit.demo')}
          </p>
          <p className="mx-auto mt-5 max-w-md rounded-xl bg-white px-4 py-3 text-sm text-gray-700">
            {t(supabase ? 'employerHome.pricing.example' : 'employerHome.pricing.example.demo')}
          </p>
          <Link
            href="/pricing"
            className="mt-5 inline-flex min-h-[44px] items-center text-sm font-semibold text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            {t('employerHome.pricing.more')} →
          </Link>
        </div>
      </section>

      {/* 7. Câu hỏi thường gặp — nền kem */}
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
              ? tx('Khi nhà tuyển dụng xác nhận hoàn thành. Nếu nhà tuyển dụng không xác nhận, hệ thống tự chốt khoảng 24 giờ sau giờ kết thúc ca: người đã check-in được trả công, người không check-in bị tính vắng mặt. Ca đang có tranh chấp chờ quản trị viên xử lý.')
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
              ? tx('Xác thực số điện thoại và CCCD (quản trị viên duyệt), rồi nạp tiền vào ví để giữ tiền công khi đăng ca.')
              : tx('Chọn loại tài khoản và nộp giấy tờ xác minh theo loại (mô phỏng), rồi đăng ca.'),
          },
          {
            q: tx('Tôi có huỷ ca được không?'),
            a: tx('Được, nếu ca còn hơn 6 giờ nữa mới bắt đầu. Trong vòng 6 giờ mà đã có người ứng tuyển thì không huỷ được, để bảo vệ người lao động.'),
          },
        ]}
      />

      {/* 8. Khối mực — CTA + chuyển vai trò */}
      <section className="bg-ink px-4 py-10 text-white sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-lg font-semibold">{t('employerHome.final.text')}</p>
            <p className="mt-1 text-sm text-white/70">
              {t('employerHome.switch.text')}{' '}
              <Link href="/for-workers" className="font-semibold text-white underline-offset-2 hover:underline">
                {t('employerHome.switch.cta')}
              </Link>
            </p>
          </div>
          <RoleHomeCta audience="employer" placement="band">
            <Link
              href="/register?role=employer"
              className="cta-arrow-nudge inline-flex min-h-[48px] items-center gap-1.5 rounded-xl bg-orange-500 px-5 text-sm font-semibold text-gray-900 hover:bg-orange-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
            >
              {t('employerHome.hero.cta')} <span className="cta-arrow" aria-hidden="true">→</span>
            </Link>
          </RoleHomeCta>
        </div>
      </section>
    </div>
  );
}
