import { GuideHero } from '@/components/landing/GuideHero';
import { LegalArticle, LegalList, LegalMail } from '@/components/landing/LegalArticle';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { getTx } from '@/i18n/server';

/**
 * Điều khoản sử dụng. 03/10 — làm lại theo ngôn ngữ landing (`GuideHero` + cột đọc có
 * mục lục, `LegalArticle`). Câu chữ pháp lý GIỮ NGUYÊN văn bản trước đó; chỉ đổi khung.
 */
export default async function TermsPage() {
  const tx = await getTx();
  return (
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      <GuideHero
        eyebrow={tx('Pháp lý')}
        title={tx('Điều khoản sử dụng')}
        lead={tx('Bằng việc tạo tài khoản hoặc sử dụng dịch vụ CaLẻ, bạn đồng ý với các điều khoản dưới đây. Tài liệu áp dụng cho phiên bản dùng thử của sản phẩm.')}
      />

      <LegalArticle
        tocLabel={tx('Mục lục')}
        sections={[
          {
            id: 'pham-vi-dich-vu',
            title: tx('1. Phạm vi dịch vụ'),
            body: (
              <p>
                {tx('CaLẻ là nền tảng kết nối nhà tuyển dụng cần người lao động ngắn hạn với người lao động linh hoạt. Chúng tôi không phải là người sử dụng lao động trực tiếp; quan hệ lao động được hai bên trao đổi tự nguyện thông qua nền tảng.')}
              </p>
            ),
          },
          {
            id: 'tao-tai-khoan',
            title: tx('2. Tạo tài khoản'),
            body: (
              <p>
                {tx('Bạn cần cung cấp thông tin chính xác và cập nhật. Bạn chịu trách nhiệm bảo mật mật khẩu của mình. CaLẻ có thể tạm khoá tài khoản nếu phát hiện hành vi gian lận, mạo danh, hoặc vi phạm pháp luật.')}
              </p>
            ),
          },
          {
            id: 'hanh-vi-khong-duoc-phep',
            title: tx('3. Hành vi không được phép'),
            body: (
              <LegalList
                items={[
                  tx('Đăng ca giả, ca không có thật, hoặc ca vi phạm pháp luật.'),
                  tx('Mạo danh người khác, sử dụng giấy tờ giả để xác minh.'),
                  tx('Yêu cầu/hứa thanh toán ngoài luồng nền tảng.'),
                  tx('Quấy rối, đe doạ hoặc có hành vi không phù hợp với người dùng khác.'),
                ]}
              />
            ),
          },
          {
            id: 'giu-coc',
            title: tx('4. Giữ cọc'),
            body: (
              <p>
                {isSupabaseEnv()
                  ? tx('Nhà tuyển dụng giữ cọc tiền công cùng phí dịch vụ 10% trước khi ca công khai. Tiền công được chuyển vào ví người lao động khi ca được xác nhận hoàn thành, hoặc được hệ thống tự xác nhận sau 24 giờ kể từ khi ca kết thúc. Phần cọc không sử dụng (vị trí trống, người lao động vắng mặt, ca bị huỷ) được hoàn về ví nhà tuyển dụng, kèm phần phí tương ứng. Nạp và rút tiền được xử lý qua cổng thanh toán PayOS. Tiền thưởng nạp ví (nếu có chương trình) chỉ dùng để trả phí dịch vụ, không dùng trả tiền công, không rút được và không quy đổi thành tiền mặt; phần phí trả bằng tiền thưởng khi được hoàn sẽ quay lại tiền thưởng. Khi CaLẻ áp dụng cọc người lao động: người lao động chưa xác thực CCCD và chưa làm đủ số ca yêu cầu trong 30 ngày gần nhất phải đặt cọc một phần tiền công khi ứng tuyển (mức cọc hiện trước khi xác nhận). Cọc được hoàn đủ khi ca hoàn thành, khi bị từ chối, hoặc khi huỷ trước giờ bắt đầu. Nếu nhà tuyển dụng xác nhận người lao động vắng mặt không báo, cọc được chuyển cho nhà tuyển dụng sau 72 giờ, trừ khi người lao động khiếu nại trong thời hạn đó và quản trị viên quyết định hoàn lại. Trường hợp hệ thống tự ghi vắng mặt vì nhà tuyển dụng không xác nhận, quản trị viên xem xét trước khi xử lý tiền cọc.')
                  : tx('Nhà tuyển dụng giữ cọc trước khi ca công khai. Tiền cọc được trả hoặc hoàn lại theo trạng thái ca. Trong phiên bản dùng thử hiện tại, mọi giao dịch tiền tệ là mô phỏng và không tạo nghĩa vụ tài chính thực tế giữa các bên.')}
              </p>
            ),
          },
          {
            id: 'thay-doi-dieu-khoan',
            title: tx('5. Thay đổi điều khoản'),
            body: (
              <p>
                {tx('CaLedo Tech có thể cập nhật điều khoản theo thời gian. Người dùng sẽ được thông báo trước khi điều khoản mới có hiệu lực, và có quyền ngừng sử dụng dịch vụ nếu không đồng ý với phiên bản mới.')}
              </p>
            ),
          },
          {
            id: 'lien-he',
            title: tx('6. Liên hệ'),
            body: (
              <p>
                {tx('Mọi thắc mắc về điều khoản, vui lòng gửi về')} <LegalMail address="nguyenphuonganh98113@gmail.com" />.
              </p>
            ),
          },
        ]}
      />
    </ToneScroll>
  );
}
