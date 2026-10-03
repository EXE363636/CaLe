import {
  LegalArticle,
  LegalCallout,
  LegalCards,
  LegalEnd,
  LegalHero,
  LegalMail,
  LegalSteps,
  type LegalSection,
} from '@/components/landing/LegalArticle';
import { legalChrome } from '@/components/legal/legalChrome';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { getTx } from '@/i18n/server';

/**
 * Chính sách xử lý tranh chấp. 03/10 — khung pháp lý chung (`LegalHero` + `LegalArticle`
 * có mục lục sáng theo cuộn + `LegalEnd`). Câu chữ pháp lý GIỮ NGUYÊN văn (kể cả các câu đổi
 * theo chế độ dữ liệu); chỉ đổi cách trình bày: "Khi nào nên mở" thành 4 thẻ icon, "Quy
 * trình xét xử" thành dòng thời gian, "Phản hồi quyết định" thành ô nổi bật mốc 7 ngày.
 */
export default async function DisputesPage() {
  const tx = await getTx();
  const live = isSupabaseEnv();
  const chrome = legalChrome(tx, 'disputes', live);
  const sections: LegalSection[] = [
    {
      id: 'khi-nao',
      title: tx('Khi nào nên mở tranh chấp'),
      body: (
        <LegalCards
          items={[
            { icon: 'attendance', text: tx('Người lao động vắng mặt không báo trước.') },
            { icon: 'status', text: tx('Nhà tuyển dụng yêu cầu công việc khác xa so với mô tả ca.') },
            { icon: 'clock', text: tx('Mâu thuẫn về giờ làm thực tế hoặc số lượng vị trí được bố trí.') },
            { icon: 'shield', text: tx('Có dấu hiệu hành vi không phù hợp giữa các bên.') },
          ]}
        />
      ),
    },
    {
      id: 'cach-mo-yeu-cau',
      title: tx('Cách mở yêu cầu'),
      body: (
        <p>
          {/* Bản thật chưa có nút "Báo cáo sự cố" (capabilities.disputes = false) và chưa có
              nhắn tin trong app → mở yêu cầu qua đội hỗ trợ. */}
          {live
            ? tx('Liên hệ đội hỗ trợ CaLẻ qua trang Liên hệ hỗ trợ. Mô tả tình huống cụ thể, thời điểm xảy ra, và đính kèm chứng cứ nếu có (ảnh màn hình, giờ check-in/out).')
            : tx('Vào trang chi tiết ca làm liên quan và bấm "Báo cáo sự cố". Mô tả tình huống cụ thể, thời điểm xảy ra, và đính kèm chứng cứ nếu có (ảnh màn hình, lịch check-in/out, đoạn hội thoại trong app).')}
        </p>
      ),
    },
    {
      id: 'quy-trinh',
      title: tx('Quy trình xét xử'),
      body: (
        <LegalSteps
          items={[
            tx('Quản trị viên CaLẻ nhận yêu cầu và liên hệ cả hai bên trong vòng 24–48 giờ.'),
            tx('Cả hai bên có quyền cung cấp giải trình và bằng chứng.'),
            tx('Quản trị viên đối chiếu với lịch sử ca, điểm uy tín và đánh giá liên quan.'),
            tx('Quyết định cuối cùng có thể là trả tiền cọc cho người lao động, hoàn tiền cọc cho nhà tuyển dụng, hoặc giải pháp khác phù hợp.'),
          ]}
        />
      ),
    },
    {
      // Bản thật: điểm uy tín chỉ tạm tính phía người dùng, chưa có điều chỉnh / lịch sử điểm.
      id: 'he-qua',
      title: live ? tx('Hệ quả với tài khoản') : tx('Hệ quả với điểm uy tín'),
      body: (
        <p>
          {live
            ? tx('Tuỳ kết quả xem xét, quản trị viên có thể tạm khoá tài khoản nếu có vi phạm nghiêm trọng.')
            : tx('Tuỳ kết quả tranh chấp, điểm uy tín có thể được giữ nguyên, điều chỉnh hoặc tạm khoá tài khoản nếu có vi phạm nghiêm trọng. Mọi điều chỉnh điểm đều được ghi lại trong lịch sử tài khoản cùng lý do.')}
        </p>
      ),
    },
    {
      id: 'phan-hoi-quyet-dinh',
      title: tx('Phản hồi quyết định'),
      body: (
        <LegalCallout big="7" unit={tx('ngày')}>
          {tx('Nếu bạn cho rằng quyết định chưa hợp lý, có thể gửi phản hồi bằng văn bản về')}{' '}
          <LegalMail address="nguyenphuonganh98113@gmail.com" />
          {tx('. Quản trị viên cấp cao sẽ xem xét lại trong vòng 7 ngày.')}
        </LegalCallout>
      ),
    },
  ];

  return (
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      <LegalHero
        current="disputes"
        docs={chrome.docs}
        switcherLabel={chrome.switcherLabel}
        eyebrow={chrome.eyebrow}
        title={tx('Chính sách xử lý tranh chấp')}
        lead={tx('Khi một ca làm xảy ra mâu thuẫn về chất lượng công việc, giờ giấc, thái độ hoặc thanh toán, hai bên có thể mở yêu cầu xử lý tranh chấp với CaLẻ. Tài liệu này mô tả quy trình.')}
        meta={[chrome.appliesTo, chrome.sectionCount(sections.length)]}
      />

      <LegalArticle tocLabel={chrome.tocLabel} sections={sections} />
      <LegalEnd {...chrome.end} />
    </ToneScroll>
  );
}
