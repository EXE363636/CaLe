import {
  LegalArticle,
  LegalCards,
  LegalDefs,
  LegalEnd,
  LegalHero,
  LegalMail,
  type LegalSection,
} from '@/components/landing/LegalArticle';
import { legalChrome } from '@/components/legal/legalChrome';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { isSupabaseEnv } from '@/data/supabaseClient';
import { getTx } from '@/i18n/server';

/**
 * Chính sách bảo mật. 03/10 — khung pháp lý chung (`LegalHero` + `LegalArticle` có mục lục
 * sáng theo cuộn + `LegalEnd`). Câu chữ pháp lý GIỮ NGUYÊN văn (kể cả đoạn "Lưu trữ trong
 * phiên bản dùng thử" còn viết cứng ngoài `tx`); chỉ đổi cách trình bày: "Thông tin chúng
 * tôi thu thập" thành bảng nhãn / nội dung, "Quyền của bạn" thành thẻ ✓.
 */
export default async function PrivacyPage() {
  const tx = await getTx();
  const live = isSupabaseEnv();
  const chrome = legalChrome(tx, 'privacy', live);
  const sections: LegalSection[] = [
    {
      id: 'thong-tin-thu-thap',
      title: tx('Thông tin chúng tôi thu thập'),
      body: (
        <LegalDefs
          items={[
            tx('Thông tin tài khoản: tên, email, số điện thoại, vai trò (người lao động hoặc nhà tuyển dụng).'),
            tx('Thông tin xác minh tuỳ chọn: CMND/CCCD, thẻ sinh viên, đăng ký kinh doanh — chỉ khi bạn chủ động cung cấp.'),
            tx('Hoạt động trong ứng dụng: ca đã ứng tuyển, ca đã đăng, đánh giá đã nhận, lịch sử huỷ.'),
            // 03/10 — bản thật lưu trên máy chủ, có giao dịch thật và Google Analytics
            // (chủ dự án duyệt câu, xác nhận có bật GA).
            ...(live
              ? [
                  tx('Thông tin giao dịch: lịch sử nạp, giữ cọc, trả công, hoàn và rút tiền; tài khoản ngân hàng bạn nhập để rút tiền.'),
                  tx('Thông tin kỹ thuật: phiên đăng nhập lưu trong trình duyệt để giữ bạn đăng nhập.'),
                  tx('Thống kê truy cập: CaLẻ dùng Google Analytics để đếm lượt xem trang và cải thiện sản phẩm.'),
                ]
              : [tx('Thông tin kỹ thuật: dữ liệu lưu cục bộ trong trình duyệt, không gửi lên máy chủ ngoài.')]),
          ]}
        />
      ),
    },
    {
      id: 'cach-su-dung',
      title: tx('Cách chúng tôi sử dụng thông tin'),
      body: (
        <p>
          {/* Bản thật chưa tính điểm uy tín → không nhắc. */}
          {live
            ? tx('Thông tin được dùng để vận hành dịch vụ: cho phép ứng tuyển, duyệt người lao động, xử lý thanh toán, gửi thông báo trong ứng dụng. Chúng tôi không bán thông tin cá nhân cho bên thứ ba.')
            : tx('Thông tin được dùng để vận hành dịch vụ — cho phép ứng tuyển, duyệt người lao động, tính điểm uy tín, gửi thông báo trong ứng dụng. Chúng tôi không bán thông tin cá nhân cho bên thứ ba.')}
        </p>
      ),
    },
    {
      id: 'luu-tru',
      title: live ? tx('Lưu trữ và bảo vệ dữ liệu') : tx('Lưu trữ trong phiên bản dùng thử'),
      body: live ? (
        <p>
          {tx('Dữ liệu tài khoản, ca làm và giao dịch được lưu trên máy chủ cơ sở dữ liệu của CaLẻ (Supabase); mỗi người chỉ đọc được dữ liệu của mình và phần cần cho ca làm chung (ví dụ nhà tuyển dụng xem hồ sơ người ứng tuyển ca của mình). Ảnh giấy tờ tuỳ thân nằm ở kho lưu trữ riêng tư, chỉ quản trị viên xem để duyệt. Nạp và rút tiền được xử lý qua cổng thanh toán PayOS; mã xác thực số điện thoại được gửi qua nhà cung cấp tin nhắn SpeedSMS. Khi đăng nhập bằng Google, CaLẻ chỉ dùng tên và email từ tài khoản Google của bạn.')}
        </p>
      ) : (
        <p>
          {/* Khoảng trắng: bản cũ dính "trình duyệtcủa bạn" (JSX bỏ xuống dòng). */}
          {tx('Phiên bản hiện tại lưu dữ liệu trong localStorage trình duyệt')}{' '}
          của bạn. Khi bạn xoá dữ liệu trình duyệt hoặc bấm &quot;Đăng xuất&quot;
          rồi clear storage, dữ liệu sẽ trở về trạng thái khởi tạo.
          Phiên bản chính thức sẽ chuyển sang lưu trữ máy chủ với mã hoá
          và sẽ được công bố rõ trước khi áp dụng.
        </p>
      ),
    },
    {
      id: 'quyen-cua-ban',
      title: tx('Quyền của bạn'),
      body: (
        <LegalCards
          tone="good"
          mark="check"
          items={[
            tx('Quyền xem và chỉnh sửa thông tin cá nhân của mình.'),
            tx('Quyền xoá tài khoản và dữ liệu liên quan bằng cách liên hệ tổ hỗ trợ.'),
            tx('Quyền yêu cầu giải thích về cách dữ liệu được sử dụng.'),
          ].map((text) => ({ text }))}
        />
      ),
    },
    {
      id: 'lien-he',
      title: tx('Liên hệ về quyền riêng tư'),
      body: (
        <p>
          {tx('Email phụ trách quyền riêng tư:')} <LegalMail address="nguyenphuonganh98113@gmail.com" />.
        </p>
      ),
    },
  ];

  return (
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      <LegalHero
        current="privacy"
        docs={chrome.docs}
        switcherLabel={chrome.switcherLabel}
        eyebrow={chrome.eyebrow}
        title={tx('Chính sách bảo mật')}
        lead={
          live
            ? tx('Tài liệu này mô tả thông tin chúng tôi thu thập, cách dùng và cách bảo vệ. Áp dụng cho giai đoạn thử nghiệm giới hạn (Beta) của CaLẻ.')
            : tx('Tài liệu này mô tả thông tin chúng tôi thu thập, cách dùng và cách bảo vệ. Áp dụng cho phiên bản dùng thử của CaLẻ.')
        }
        meta={[chrome.appliesTo, chrome.sectionCount(sections.length)]}
      />

      <LegalArticle tocLabel={chrome.tocLabel} sections={sections} />
      <LegalEnd {...chrome.end} />
    </ToneScroll>
  );
}
