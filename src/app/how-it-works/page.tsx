import { InfoPage, InfoSection, InfoList, InfoStep } from '@/components/layout/InfoPage';
import { isSupabaseEnv } from '@/data/supabaseClient';

/**
 * P1 feedback F3 — bớt chữ: 4 bước, mỗi bước tối đa 2 câu, lời thường.
 * Nói đúng luồng: production giữ cọc 100% tiền công + 10% phí từ ví (0018),
 * tự chốt ~24 giờ sau ca (0019); local/demo là mô phỏng.
 */
export default function HowItWorksPage() {
  const live = isSupabaseEnv();
  return (
    <InfoPage
      eyebrow="Hướng dẫn"
      title="Cách hoạt động"
      intro="Một ca làm đi qua 4 bước, từ lúc đăng ca đến lúc trả tiền công."
      ctas={[{ label: 'Xem ca đang tuyển', href: '/shifts' }]}
    >
      <InfoStep n={1} title="Nhà tuyển dụng đăng ca">
        Nhập giờ làm, địa điểm, lương theo giờ và số người cần.{' '}
        {live
          ? 'Ca chỉ hiện cho người lao động sau khi hệ thống giữ cọc tiền công và 10% phí từ ví.'
          : 'Ca chỉ hiện cho người lao động sau khi giữ cọc (mô phỏng).'}
      </InfoStep>

      <InfoStep n={2} title="Người lao động ứng tuyển">
        Chọn ca hợp lịch rồi bấm Ứng tuyển. Hệ thống cảnh báo nếu ca trùng giờ với
        lịch của bạn.
      </InfoStep>

      <InfoStep n={3} title="Duyệt và làm ca">
        Nhà tuyển dụng xem hồ sơ và duyệt người phù hợp. Người lao động bấm check-in
        khi đến và check-out khi xong.
      </InfoStep>

      <InfoStep n={4} title="Xác nhận và trả tiền công">
        {live
          ? 'Nhà tuyển dụng xác nhận hoàn thành, tiền công vào ví người lao động. Nếu không ai bấm, hệ thống tự chốt khoảng 24 giờ sau ca.'
          : 'Nhà tuyển dụng xác nhận hoàn thành, tiền công vào ví người lao động (mô phỏng).'}
      </InfoStep>

      <InfoSection title="Cần nhớ">
        <InfoList
          items={[
            'Người lao động dùng CaLẻ miễn phí.',
            'Phần tiền không dùng (vị trí trống, người vắng mặt, ca huỷ) được hoàn về ví nhà tuyển dụng.',
            'Có vướng mắc: vào trang Liên hệ hỗ trợ.',
          ]}
        />
      </InfoSection>
    </InfoPage>
  );
}
