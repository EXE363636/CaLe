import { getTx } from '@/i18n/server';
import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';
import { isSupabaseEnv } from '@/data/supabaseClient';

export default async function DisputesPage() {
  const tx = await getTx();
  return (
    <InfoPage
      eyebrow={tx('Pháp lý')}
      title={tx('Chính sách xử lý tranh chấp')}
      intro={tx('Khi một ca làm xảy ra mâu thuẫn về chất lượng công việc, giờ giấc, thái độ hoặc thanh toán, hai bên có thể mở yêu cầu xử lý tranh chấp với CaLẻ. Tài liệu này mô tả quy trình.')}
      ctas={[
        { label: tx('Liên hệ hỗ trợ'), href: '/support', variant: 'secondary' },
      ]}
    >
      <InfoSection title={tx('Khi nào nên mở tranh chấp')}>
        <InfoList
          items={[
            tx('Người lao động vắng mặt không báo trước.'),
            tx('Nhà tuyển dụng yêu cầu công việc khác xa so với mô tả ca.'),
            tx('Mâu thuẫn về giờ làm thực tế hoặc số lượng vị trí được bố trí.'),
            tx('Có dấu hiệu hành vi không phù hợp giữa các bên.'),
          ]}
        />
      </InfoSection>

      <InfoSection title={tx('Cách mở yêu cầu')}>
        {/* Bản thật chưa có nút "Báo cáo sự cố" (capabilities.disputes = false) và chưa có
            nhắn tin trong app → mở yêu cầu qua đội hỗ trợ. */}
        {isSupabaseEnv()
          ? tx('Liên hệ đội hỗ trợ CaLẻ qua trang Liên hệ hỗ trợ. Mô tả tình huống cụ thể, thời điểm xảy ra, và đính kèm chứng cứ nếu có (ảnh màn hình, giờ check-in/out).')
          : tx('Vào trang chi tiết ca làm liên quan và bấm "Báo cáo sự cố". Mô tả tình huống cụ thể, thời điểm xảy ra, và đính kèm chứng cứ nếu có (ảnh màn hình, lịch check-in/out, đoạn hội thoại trong app).')}
      </InfoSection>

      <InfoSection title={tx('Quy trình xét xử')}>
        <InfoList
          items={[
            tx('Quản trị viên CaLẻ nhận yêu cầu và liên hệ cả hai bên trong vòng 24–48 giờ.'),
            tx('Cả hai bên có quyền cung cấp giải trình và bằng chứng.'),
            tx('Quản trị viên đối chiếu với lịch sử ca, điểm uy tín và đánh giá liên quan.'),
            tx('Quyết định cuối cùng có thể là trả tiền cọc cho người lao động, hoàn tiền cọc cho nhà tuyển dụng, hoặc giải pháp khác phù hợp.'),
          ]}
        />
      </InfoSection>

      {/* Bản thật: điểm uy tín chỉ tạm tính phía người dùng, chưa có điều chỉnh / lịch sử điểm. */}
      <InfoSection title={isSupabaseEnv() ? tx('Hệ quả với tài khoản') : tx('Hệ quả với điểm uy tín')}>
        {isSupabaseEnv()
          ? tx('Tuỳ kết quả xem xét, quản trị viên có thể tạm khoá tài khoản nếu có vi phạm nghiêm trọng.')
          : tx('Tuỳ kết quả tranh chấp, điểm uy tín có thể được giữ nguyên, điều chỉnh hoặc tạm khoá tài khoản nếu có vi phạm nghiêm trọng. Mọi điều chỉnh điểm đều được ghi lại trong lịch sử tài khoản cùng lý do.')}
      </InfoSection>

      <InfoSection title={tx('Phản hồi quyết định')}>
        {tx('Nếu bạn cho rằng quyết định chưa hợp lý, có thể gửi phản hồi bằng văn bản về')}{' '}
        <a
          href="mailto:nguyenphuonganh98113@gmail.com"
          className="text-orange-700 hover:underline"
        >
          nguyenphuonganh98113@gmail.com
        </a>
        {tx('. Quản trị viên cấp cao sẽ xem xét lại trong vòng 7 ngày.')}
      </InfoSection>
    </InfoPage>
  );
}
