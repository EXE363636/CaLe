import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';
import { isSupabaseEnv } from '@/data/supabaseClient';

/**
 * P1 feedback F3 — bớt chữ: mỗi mục tối đa 2 câu, chỉ nói điều hệ thống
 * đang làm thật. Production: cờ bắt buộc SĐT/CCCD mặc định tắt, server không
 * chặn ứng tuyển theo điểm uy tín → không hứa các điều đó.
 */
export default function SafetyPage() {
  const live = isSupabaseEnv();
  return (
    <InfoPage
      eyebrow="Hỗ trợ"
      title="Bảo vệ người dùng"
      intro="CaLẻ giữ tiền công trước và ghi lại từng bước của ca để hai bên yên tâm."
    >
      <InfoSection title="Tiền công được giữ trước">
        {live
          ? 'Nhà tuyển dụng giữ cọc đủ tiền công trước khi ca hiện ra. Tiền chỉ trả cho người lao động khi ca xong; phần không dùng hoàn về ví nhà tuyển dụng.'
          : 'Nhà tuyển dụng giữ cọc đủ tiền công trước khi ca hiện ra (mô phỏng). Tiền chỉ trả khi ca xong; phần không dùng được hoàn lại.'}
      </InfoSection>

      <InfoSection title="Xác minh tài khoản">
        Bạn có thể xác minh số điện thoại và giấy tờ tuỳ thân trong trang hồ sơ.
        Hồ sơ đã xác minh giúp bên kia yên tâm hơn khi nhận việc hoặc duyệt người.
      </InfoSection>

      <InfoSection title="Điểm uy tín">
        {live
          ? 'Mỗi người có điểm uy tín tạm tính từ lịch sử ca: hoàn thành, huỷ, vắng mặt. Nhà tuyển dụng xem điểm này khi duyệt người.'
          : 'Điểm uy tín tạm tính từ lịch sử ca và đánh giá sau ca. Điểm dưới 50 bị tạm khoá ứng tuyển (bản demo).'}
      </InfoSection>

      <InfoSection title="Lưu ý an toàn">
        <InfoList
          items={[
            'CaLẻ không thu phí và không giữ tiền của người lao động.',
            'Chỉ nhận tiền công trong ứng dụng, không nhận tiền mặt ngoài luồng.',
            'Gặp nguy hiểm: rời khỏi địa điểm, gọi 113, sau đó báo cho CaLẻ qua trang Liên hệ hỗ trợ.',
          ]}
        />
      </InfoSection>
    </InfoPage>
  );
}
