import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';

export const metadata = {
  title: 'Đánh giá sau ca — CaLẻ / Now',
};

export default function EmployerReviewsPage() {
  return (
    <InfoPage
      eyebrow="Dành cho nhà tuyển dụng"
      title="Đánh giá sau ca"
      intro="Đánh giá hai chiều giúp xây dựng cộng đồng tin cậy. Sau mỗi ca hoàn thành, bạn nên dành 1–2 phút để chấm điểm và viết một câu nhận xét cho người lao động."
      ctas={[
        { label: 'Mở dashboard nhà tuyển dụng', href: '/employer/dashboard' },
      ]}
    >
      <InfoSection title="Khi nào cần đánh giá">
        Sau khi người lao động check-out, ứng dụng nhắc bạn xác nhận hoàn
        thành ca. Tại bước đó, bạn có thể chấm 1–5 sao và viết nhận
        xét ngắn. Đánh giá là bắt buộc để khoản đảm bảo thanh toán được
        giải ngân thành tiền công cho người lao động.
      </InfoSection>

      <InfoSection title="Tiêu chí gợi ý">
        <InfoList
          items={[
            'Đúng giờ: người lao động có check-in trong cửa sổ ±15 phút quanh giờ bắt đầu không?',
            'Thái độ: lịch sự, hợp tác với khách và đồng nghiệp?',
            'Chất lượng công việc: có hoàn thành đúng yêu cầu trong mô tả ca?',
            'Giao tiếp: trả lời tin nhắn kịp thời, báo trước nếu có vấn đề?',
          ]}
        />
      </InfoSection>

      <InfoSection title="Đánh giá xây dựng">
        Hãy viết nhận xét cụ thể. &quot;Bạn pha chế nhanh, gọn quầy&quot; hữu ích
        hơn &quot;Tốt&quot;. Người lao động sau này sẽ tham khảo nhận xét của bạn để
        biết quán cần gì, và người lao động hiện tại sẽ biết phần nào cần
        cải thiện.
      </InfoSection>

      <InfoSection title="Khi cần báo cáo thay vì đánh giá">
        Nếu có hành vi không phù hợp (vắng mặt không báo, gây mất an
        toàn), không nên chỉ đánh giá thấp — hãy mở &quot;Báo cáo sự cố&quot; để
        quản trị viên xem xét. Đánh giá vẫn nên trung thực nhưng tranh
        chấp cần luồng riêng.
      </InfoSection>
    </InfoPage>
  );
}
