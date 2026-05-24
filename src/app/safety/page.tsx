import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';

export const metadata = { title: 'An toàn & xác minh — CaLẻ / Now' };

export default function SafetyPage() {
  return (
    <InfoPage
      eyebrow="An toàn"
      title="An toàn & xác minh"
      intro="An toàn của người lao động và nhà tuyển dụng là ưu tiên đầu tiên của CaLẻ. Chúng tôi xây dựng nhiều lớp kiểm tra trước khi một ca làm được công khai."
    >
      <InfoSection title="Xác minh tài khoản">
        Mọi người dùng cần xác minh số điện thoại để có thể ứng tuyển hoặc
        đăng ca. Người lao động có thể bổ sung CMND/CCCD và thẻ sinh viên
        để mở khoá nhiều ca hơn. Nhà tuyển dụng có thể đăng ký xác minh
        doanh nghiệp để giảm tỷ lệ đặt cọc.
      </InfoSection>

      <InfoSection title="Đặt cọc trước khi công khai ca">
        Nhà tuyển dụng phải đặt cọc đủ tiền công trước khi ca được công
        khai. Khoản cọc này được giữ trong ví ký quỹ mô phỏng và chỉ
        được giải ngân sau khi ca hoàn thành hoặc hoàn lại nếu ca bị
        huỷ đúng quy định.
      </InfoSection>

      <InfoSection title="Điểm uy tín hai chiều">
        Cả người lao động và nhà tuyển dụng đều có hồ sơ uy tín, được
        cộng/trừ điểm dựa trên hành vi thực tế: hoàn thành ca, huỷ
        đúng/sai quy định, đánh giá sau ca. Điểm dưới ngưỡng 50 sẽ tạm
        khoá quyền ứng tuyển.
      </InfoSection>

      <InfoSection title="Cảnh báo và bảo vệ người dùng">
        <InfoList
          items={[
            'CaLẻ không bao giờ thu phí đăng ký hoặc giữ tiền của người lao động.',
            'Mọi giao dịch tiền tệ đều diễn ra trong ứng dụng — không nhận tiền mặt ngoài luồng.',
            'Báo cáo tranh chấp ngay khi phát hiện hành vi không phù hợp; quản trị viên sẽ xem xét trong thời gian sớm nhất.',
            'Khi gặp tình huống đe doạ an toàn, ưu tiên rời khỏi địa điểm và liên hệ cơ quan chức năng trước, sau đó báo cho CaLẻ.',
          ]}
        />
      </InfoSection>
    </InfoPage>
  );
}
