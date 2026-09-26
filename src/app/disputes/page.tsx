import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';

export default function DisputesPage() {
  return (
    <InfoPage
      eyebrow="Pháp lý"
      title="Chính sách xử lý tranh chấp"
      intro="Khi một ca làm xảy ra mâu thuẫn về chất lượng công việc, giờ giấc, thái độ hoặc thanh toán, hai bên có thể mở yêu cầu xử lý tranh chấp với CaLẻ. Tài liệu này mô tả quy trình."
      ctas={[
        { label: 'Liên hệ hỗ trợ', href: '/support', variant: 'secondary' },
      ]}
    >
      <InfoSection title="Khi nào nên mở tranh chấp">
        <InfoList
          items={[
            'Người lao động vắng mặt không báo trước.',
            'Nhà tuyển dụng yêu cầu công việc khác xa so với mô tả ca.',
            'Mâu thuẫn về giờ làm thực tế hoặc số lượng vị trí được bố trí.',
            'Có dấu hiệu hành vi không phù hợp giữa các bên.',
          ]}
        />
      </InfoSection>

      <InfoSection title="Cách mở yêu cầu">
        Vào trang chi tiết ca làm liên quan và bấm &quot;Báo cáo sự cố&quot;. Mô
        tả tình huống cụ thể, thời điểm xảy ra, và đính kèm chứng cứ
        nếu có (ảnh màn hình, lịch check-in/out, đoạn hội thoại trong
        app).
      </InfoSection>

      <InfoSection title="Quy trình xét xử">
        <InfoList
          items={[
            'Quản trị viên CaLẻ nhận yêu cầu và liên hệ cả hai bên trong vòng 24–48 giờ.',
            'Cả hai bên có quyền cung cấp giải trình và bằng chứng.',
            'Quản trị viên đối chiếu với lịch sử ca, điểm uy tín và đánh giá liên quan.',
            'Quyết định cuối cùng có thể là giải ngân khoản đảm bảo thanh toán cho người lao động, hoàn khoản đảm bảo thanh toán cho nhà tuyển dụng, hoặc giải pháp khác phù hợp.',
          ]}
        />
      </InfoSection>

      <InfoSection title="Hệ quả với điểm uy tín">
        Tuỳ kết quả tranh chấp, điểm uy tín có thể được giữ nguyên,
        điều chỉnh hoặc tạm khoá tài khoản nếu có vi phạm nghiêm trọng.
        Mọi điều chỉnh điểm đều được ghi lại trong lịch sử tài khoản
        cùng lý do.
      </InfoSection>

      <InfoSection title="Phản hồi quyết định">
        Nếu bạn cho rằng quyết định chưa hợp lý, có thể gửi phản hồi
        bằng văn bản về{' '}
        <a
          href="mailto:nguyenphuonganh98113@gmail.com"
          className="text-orange-700 hover:underline"
        >
          nguyenphuonganh98113@gmail.com
        </a>
        . Quản trị viên cấp cao sẽ xem xét lại trong vòng 7 ngày.
      </InfoSection>
    </InfoPage>
  );
}
