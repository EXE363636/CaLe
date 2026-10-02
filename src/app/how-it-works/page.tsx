import { getTx } from '@/i18n/server';
import { InfoPage, InfoSection, InfoList, InfoStep } from '@/components/layout/InfoPage';
import { isSupabaseEnv } from '@/data/supabaseClient';

/**
 * P1 feedback F3 — bớt chữ: 4 bước, mỗi bước tối đa 2 câu, lời thường.
 * Nói đúng luồng: production giữ cọc 100% tiền công + 10% phí từ ví (0018),
 * tự chốt ~24 giờ sau ca (0019); local/demo là mô phỏng.
 */
export default async function HowItWorksPage() {
  const tx = await getTx();
  const live = isSupabaseEnv();
  return (
    <InfoPage
      eyebrow={tx('Hướng dẫn')}
      title={tx('Cách hoạt động')}
      intro={tx('Một ca làm đi qua 4 bước, từ lúc đăng ca đến lúc trả tiền công.')}
      ctas={[{ label: tx('Xem ca đang tuyển'), href: '/shifts' }]}
    >
      <InfoStep n={1} title={tx('Nhà tuyển dụng đăng ca')}>
        {tx('Nhập giờ làm, địa điểm, lương theo giờ và số người cần.')}{' '}
        {live
          ? tx('Ca chỉ hiện cho người lao động sau khi hệ thống giữ cọc tiền công và 10% phí từ ví.')
          : tx('Ca chỉ hiện cho người lao động sau khi giữ cọc (mô phỏng).')}
      </InfoStep>

      <InfoStep n={2} title={tx('Người lao động ứng tuyển')}>
        {tx('Chọn ca hợp lịch rồi bấm Ứng tuyển. Hệ thống cảnh báo nếu ca trùng giờ với lịch của bạn.')}
      </InfoStep>

      <InfoStep n={3} title={tx('Duyệt và làm ca')}>
        {tx('Nhà tuyển dụng xem hồ sơ và duyệt người phù hợp. Người lao động bấm check-in khi đến và check-out khi xong.')}
      </InfoStep>

      <InfoStep n={4} title={tx('Xác nhận và trả tiền công')}>
        {live
          ? tx('Nhà tuyển dụng xác nhận hoàn thành, tiền công vào ví người lao động. Nếu không ai bấm, hệ thống tự chốt khoảng 24 giờ sau ca.')
          : tx('Nhà tuyển dụng xác nhận hoàn thành, tiền công vào ví người lao động (mô phỏng).')}
      </InfoStep>

      <InfoSection title={tx('Cần nhớ')}>
        <InfoList
          items={[
            tx('Người lao động dùng CaLẻ miễn phí.'),
            tx('Phần tiền không dùng (vị trí trống, người vắng mặt, ca huỷ) được hoàn về ví nhà tuyển dụng.'),
            tx('Có vướng mắc: vào trang Liên hệ hỗ trợ.'),
          ]}
        />
      </InfoSection>
    </InfoPage>
  );
}
