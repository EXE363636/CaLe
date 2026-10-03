import { GuideHero } from '@/components/landing/GuideHero';
import { LandingHelp, LandingRules } from '@/components/landing/LandingSections';
import { MoneyFlowDiagram } from '@/components/landing/MoneyFlowDiagram';
import { RoleBand } from '@/components/landing/RoleBand';
import { shiftMilestones } from '@/components/landing/shiftMilestones';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { TypeOnView } from '@/components/landing/TypeOnView';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { getTx } from '@/i18n/server';

/**
 * Thanh toán / giữ tiền ca làm (nhà tuyển dụng). 03/10 — làm lại theo ngôn ngữ landing:
 * sơ đồ dòng tiền của trang chủ (`MoneyFlowDiagram`), luật trả / hoàn, quy định huỷ ca
 * theo một ca ví dụ 17:00 (`shiftMilestones`).
 *   - Bản thật: tiền thật qua PayOS (nạp, giữ tiền công + 10% phí khi đăng ca, trả khi
 *     xác nhận hoặc tự chốt sau 24 giờ, hoàn phần không dùng kể cả phí, rút về ngân hàng).
 *     Menu đã ẩn mục này ở bản thật nhưng trang vẫn mở được bằng đường dẫn → câu chữ đúng.
 *   - Bản demo: mọi khoản là mô phỏng; tranh chấp do quản trị viên quyết; lượt boost.
 */
const START = '17:00';

export default async function EmployerPaymentsGuidePage() {
  const tx = await getTx();
  const live = isSupabaseEnv();
  const cancelBy = shiftMilestones(START, '22:00')?.employerCancelBy.time ?? '11:00';

  return (
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      <GuideHero
        eyebrow={tx('Dành cho nhà tuyển dụng')}
        title={live ? tx('Thanh toán') : tx('Giữ tiền ca làm (mô phỏng)')}
        lead={
          live
            ? tx('Nạp tiền vào ví bằng chuyển khoản qua PayOS. Khi đăng ca, hệ thống giữ tiền công cùng phí dịch vụ 10% từ ví; tiền công chỉ trả cho người đã làm.')
            : tx('Khi đăng ca, tiền công được giữ từ ví; tiền chỉ trả cho người lao động khi ca hoàn thành. Trong bản demo mọi khoản tiền là mô phỏng, không có giao dịch thật.')
        }
        actions={[
          { href: '/employer/shifts/new', label: tx('Đăng ca tuyển'), primary: true },
          { href: '/pricing', label: tx('Bảng phí') },
        ]}
      />

      <section aria-labelledby="pay-flow" data-tone="peach" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 id="pay-flow" className="max-w-2xl text-balance text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            <TypeOnView text={tx('Tiền của một ca đi về đâu?')} />
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-gray-600">
            {tx('Mọi đồng giữ lúc đăng ca đi về đúng một trong ba nơi: người đã làm, phí CaLẻ, hoặc hoàn về ví nhà tuyển dụng.')}
          </p>
          <MoneyFlowDiagram />
        </div>
      </section>

      <LandingRules
        id="pay-when"
        tone="paper"
        title={tx('Khi nào tiền được trả hoặc hoàn?')}
        items={
          live
            ? [
                { value: tx('Xác nhận'), tone: 'good', title: tx('Trả công'), body: tx('Bạn bấm "Xác nhận hoàn thành" cho từng người: tiền công vào ví người đó ngay.') },
                { value: '24h', tone: 'neutral', title: tx('Tự chốt'), body: tx('Không ai bấm thì hệ thống tự xác nhận 24 giờ sau khi ca kết thúc.') },
                { value: tx('Hoàn'), tone: 'good', title: tx('Phần không dùng'), body: tx('Vị trí trống, người vắng mặt, ca huỷ: phần tiền tương ứng, kể cả phí, hoàn về ví của bạn.') },
                { value: tx('Rút'), tone: 'neutral', title: tx('Về ngân hàng'), body: tx('Số dư ví rút về tài khoản ngân hàng khi bạn cần.') },
              ]
            : [
                { value: tx('Xác nhận'), tone: 'good', title: tx('Trả công (mô phỏng)'), body: tx('Bạn xác nhận hoàn thành ca: khoản tiền giữ chuyển thành tiền công cho người lao động.') },
                { value: tx('Hoàn'), tone: 'good', title: tx('Huỷ đúng quy định'), body: tx('Huỷ ca đúng mốc thì khoản tiền giữ được hoàn về ví.') },
                { value: '!', tone: 'warn', title: tx('Tranh chấp'), body: tx('Quản trị viên xem bằng chứng rồi quyết định trả hay hoàn khoản tiền giữ.') },
                { value: 'Boost', tone: 'neutral', title: tx('Lượt boost'), body: tx('Người lao động vắng mặt không báo: bạn được tặng 1 lượt boost cho ca sau, giúp ca hiện ưu tiên.') },
              ]
        }
      />

      <LandingRules
        id="pay-cancel"
        tone="apricot"
        title={tx('Quy định huỷ ca')}
        lead={tx('Ví dụ một ca bắt đầu lúc {start}.').replace('{start}', START)}
        items={[
          { value: tx('Trước {time}').replace('{time}', cancelBy), tone: 'good', title: tx('Huỷ được'), body: tx('Còn hơn 6 giờ nữa mới bắt đầu: bạn huỷ, khoản tiền giữ hoàn về ví.') },
          {
            value: `${cancelBy}–${START}`,
            tone: 'warn',
            title: tx('Tuỳ có người ứng tuyển chưa'),
            body: tx('Trong 6 giờ trước ca: đã có người ứng tuyển thì không huỷ được, để bảo vệ người lao động; chưa có ai thì vẫn huỷ được.'),
          },
          { value: tx('Sau {time}').replace('{time}', START), tone: 'bad', title: tx('Không huỷ được'), body: tx('Ca đã bắt đầu.') },
        ]}
        note={live ? tx('Nạp tiền vào ví bằng chuyển khoản qua PayOS. Trong đợt miễn phí dịch vụ, phí là 0 đ.') : undefined}
      />

      <div data-tone="paper" className="pt-14 sm:pt-20">
        <LandingHelp
          id="pay-help"
          title={tx('An toàn và hỗ trợ')}
          items={[
            { href: '/pricing', icon: 'money', title: tx('Bảng phí'), body: tx('Phí dịch vụ và ví dụ cho một ca.') },
            { href: '/support', icon: 'help', title: tx('Cần hỗ trợ?'), body: tx('Email, hotline và cách phản ánh khi có vấn đề trong ca.') },
          ]}
        />
      </div>
      <RoleBand audience="employer" />
    </ToneScroll>
  );
}
