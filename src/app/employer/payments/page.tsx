import { getTx } from '@/i18n/server';
import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';
import { isSupabaseEnv } from '@/data/supabaseClient';

export default async function EmployerPaymentsPage() {
  const tx = await getTx();
  // Supabase/production: giữ cọc + trả công + hoàn cọc là tiền THẬT (0016–0019).
  // Mô tả đúng luồng server; quy định huỷ ca do server enforce.
  if (isSupabaseEnv()) {
    return (
      <InfoPage
        eyebrow={tx('Dành cho nhà tuyển dụng')}
        title={tx('Thanh toán')}
        intro={tx('Nạp tiền vào ví bằng chuyển khoản (PayOS). Khi đăng ca, hệ thống giữ cọc tiền công cùng phí dịch vụ 10% từ ví của bạn; tiền công chỉ được trả cho người lao động khi ca hoàn thành.')}
        ctas={[
          { label: tx('Đăng ca tuyển'), href: '/employer/shifts/new' },
          { label: tx('Quản lý người ứng tuyển'), href: '/employer/dashboard', variant: 'secondary' },
        ]}
      >
        <InfoSection title={tx('Khi nào tiền được trả hoặc hoàn')}>
          <InfoList
            items={[
              tx('Bạn bấm "Xác nhận hoàn thành" cho từng người: tiền công vào ví người đó ngay.'),
              tx('Nếu bạn không xác nhận, hệ thống tự xác nhận sau 24 giờ kể từ khi ca kết thúc.'),
              tx('Vị trí không có người làm, người lao động bị đánh dấu vắng mặt, hoặc ca bị huỷ: phần cọc tương ứng (kể cả phí) được hoàn về ví của bạn.'),
              tx('Số dư ví rút về tài khoản ngân hàng bất cứ lúc nào.'),
            ]}
          />
        </InfoSection>

        <InfoSection title={tx('Quy định huỷ ca cho nhà tuyển dụng')}>
          <InfoList
            items={[
              tx('Trước 6 giờ: được huỷ.'),
              tx('Trong vòng 6 giờ trước giờ bắt đầu và đã có người ứng tuyển chờ duyệt/đã duyệt: chặn huỷ để bảo vệ người lao động.'),
              tx('Trong vòng 6 giờ và chưa có người ứng tuyển nào: vẫn được huỷ.'),
              tx('Sau giờ bắt đầu: không được huỷ.'),
            ]}
          />
        </InfoSection>
      </InfoPage>
    );
  }

  return (
    <InfoPage
      eyebrow={tx('Dành cho nhà tuyển dụng')}
      title={tx('Giữ tiền ca làm (mô phỏng)')}
      intro={tx('Nhà tuyển dụng giữ cọc tiền công trước; tiền chỉ trả cho người lao động khi ca hoàn thành. Trong MVP/demo không có giao dịch thật.')}
      ctas={[
        { label: tx('Đăng ca tuyển'), href: '/employer/shifts/new' },
        { label: tx('Quản lý người ứng tuyển'), href: '/employer/dashboard', variant: 'secondary' },
      ]}
    >
      <InfoSection title={tx('Cấp độ tin cậy và tỷ lệ giữ tiền ca làm')}>
        <InfoList
          items={[
            tx('Trong giai đoạn dùng thử, mọi nhà tuyển dụng đều giữ trước 100% tiền công của ca, không phụ thuộc cấp độ tin cậy.'),
            tx('Cấp độ tin cậy (Mới / Đã xác minh / Tin cậy cao) sẽ ảnh hưởng đến hiển thị, ưu tiên và phí dịch vụ trong tương lai, nhưng không làm giảm tỷ lệ cọc.'),
            tx('Mục tiêu là bảo vệ tiền công cho người lao động ngay cả khi nhà tuyển dụng không liên hệ được.'),
          ]}
        />
        {tx('Tổng khoản tiền ca được giữ = mức theo giờ × số giờ × số vị trí. Toàn bộ khoản này được giữ trong ví cho đến khi ca hoàn thành hoặc được hoàn theo quy định huỷ.')}
      </InfoSection>

      <InfoSection title={tx('Khi nào tiền được trả')}>
        <InfoList
          items={[
            tx('Khi bạn xác nhận hoàn thành ca, hệ thống chuyển khoản tiền ca được giữ thành tiền công cho người lao động.'),
            tx('Khi bạn huỷ ca đúng quy định (trước 6 giờ và chưa có người ứng tuyển), tiền được hoàn về ví.'),
            tx('Khi xảy ra tranh chấp, quản trị viên quyết định trả hoặc hoàn khoản tiền ca được giữ dựa trên bằng chứng.'),
          ]}
        />
      </InfoSection>

      <InfoSection title={tx('Quy định huỷ ca cho nhà tuyển dụng')}>
        <InfoList
          items={[
            tx('Trước 6 giờ: huỷ tự do, hoàn 100% khoản tiền ca được giữ.'),
            tx('Trong vòng 6 giờ trước giờ bắt đầu, có người ứng tuyển đang chờ duyệt hoặc đã được duyệt: chặn huỷ để bảo vệ người lao động.'),
            tx('Trong vòng 6 giờ và chưa có người ứng tuyển nào: vẫn được phép huỷ.'),
            tx('Sau giờ bắt đầu: không được phép huỷ.'),
          ]}
        />
      </InfoSection>

      <InfoSection title={tx('Lượt boost')}>
        {tx('Khi người lao động vắng mặt không báo trước, bạn được tặng 1 lượt boost để dùng cho ca tiếp theo, giúp ca hiển thị ưu tiên trong danh sách tìm việc.')}
      </InfoSection>

      <InfoSection title={tx('Lưu ý phiên bản dùng thử')}>
        {tx('Mọi giao dịch tiền tệ trên CaLẻ hiện tại là mô phỏng. Khi phiên bản chính thức ra mắt, chúng tôi sẽ thông báo rõ về cổng thanh toán hỗ trợ và các điều khoản tài chính áp dụng.')}
      </InfoSection>
    </InfoPage>
  );
}
