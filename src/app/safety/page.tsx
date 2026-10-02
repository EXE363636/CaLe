import { getTx } from '@/i18n/server';
import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';
import { isSupabaseEnv } from '@/data/supabaseClient';

/**
 * P1 feedback F3 — bớt chữ: mỗi mục tối đa 2 câu, chỉ nói điều hệ thống
 * đang làm thật. Production: cờ bắt buộc SĐT/CCCD mặc định tắt, server không
 * chặn ứng tuyển theo điểm uy tín → không hứa các điều đó.
 */
export default async function SafetyPage() {
  const tx = await getTx();
  const live = isSupabaseEnv();
  return (
    <InfoPage
      eyebrow={tx('Hỗ trợ')}
      title={tx('Bảo vệ người dùng')}
      intro={tx('CaLẻ giữ tiền công trước và ghi lại từng bước của ca để hai bên yên tâm.')}
    >
      <InfoSection title={tx('Tiền công được giữ trước')}>
        {live
          ? tx('Nhà tuyển dụng giữ cọc đủ tiền công trước khi ca hiện ra. Tiền chỉ trả cho người lao động khi ca xong; phần không dùng hoàn về ví nhà tuyển dụng.')
          : tx('Nhà tuyển dụng giữ cọc đủ tiền công trước khi ca hiện ra (mô phỏng). Tiền chỉ trả khi ca xong; phần không dùng được hoàn lại.')}
      </InfoSection>

      {/* 03/10 — bản thật: nhãn xác thực, điểm uy tín không hiện cho bên kia (thẻ ứng viên
          chỉ có số ca đã làm với nhà tuyển dụng, số lần vắng, sao đánh giá). */}
      <InfoSection title={tx('Xác minh tài khoản')}>
        {live
          ? tx('Xác thực số điện thoại bằng mã gửi qua tin nhắn và CCCD (quản trị viên duyệt) trong trang hồ sơ. Ảnh giấy tờ nằm ở kho riêng tư, chỉ quản trị viên xem để duyệt.')
          : tx('Bạn có thể xác minh số điện thoại và giấy tờ tuỳ thân trong trang hồ sơ. Hồ sơ đã xác minh giúp bên kia yên tâm hơn khi nhận việc hoặc duyệt người.')}
      </InfoSection>

      <InfoSection title={live ? tx('Đánh giá sau ca') : tx('Điểm uy tín')}>
        {live
          ? tx('Sau mỗi ca, hai bên chấm sao và viết nhận xét cho nhau trong 14 ngày. Nhà tuyển dụng thấy điểm sao trung bình, số ca đã làm với mình và số lần vắng mặt của người ứng tuyển; người lao động thấy nhận xét về quán trước khi nhận ca.')
          : tx('Điểm uy tín tạm tính từ lịch sử ca và đánh giá sau ca. Điểm dưới 50 bị tạm khoá ứng tuyển (bản demo).')}
      </InfoSection>

      <InfoSection title={tx('Lưu ý an toàn')}>
        <InfoList
          items={[
            // Bản thật có cọc khi ứng tuyển (0028, quản trị viên bật / tắt).
            live
              ? tx('CaLẻ không thu phí của người lao động. Khoản cọc khi ứng tuyển (nếu có) hoàn đủ khi ca hoàn thành hoặc khi bạn không được chọn.')
              : tx('CaLẻ không thu phí và không giữ tiền của người lao động.'),
            tx('Chỉ nhận tiền công trong ứng dụng, không nhận tiền mặt ngoài luồng.'),
            tx('Gặp nguy hiểm: rời khỏi địa điểm, gọi 113, sau đó báo cho CaLẻ qua trang Liên hệ hỗ trợ.'),
          ]}
        />
      </InfoSection>
    </InfoPage>
  );
}
