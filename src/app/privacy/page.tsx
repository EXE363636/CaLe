import { GuideHero } from '@/components/landing/GuideHero';
import { LegalArticle, LegalList, LegalMail } from '@/components/landing/LegalArticle';
import { ToneScroll } from '@/components/landing/ToneScroll';
import { getTx } from '@/i18n/server';

/**
 * Chính sách bảo mật. 03/10 — làm lại theo ngôn ngữ landing (`GuideHero` + cột đọc có
 * mục lục, `LegalArticle`). Câu chữ pháp lý GIỮ NGUYÊN văn bản trước đó; chỉ đổi khung
 * (kể cả đoạn "Lưu trữ trong phiên bản dùng thử" còn viết cứng ngoài `tx`).
 */
export default async function PrivacyPage() {
  const tx = await getTx();
  return (
    <ToneScroll initial="cream" className="flex min-w-0 flex-col">
      <GuideHero
        eyebrow={tx('Pháp lý')}
        title={tx('Chính sách bảo mật')}
        lead={tx('Tài liệu này mô tả thông tin chúng tôi thu thập, cách dùng và cách bảo vệ. Áp dụng cho phiên bản dùng thử của CaLẻ.')}
      />

      <LegalArticle
        tocLabel={tx('Mục lục')}
        sections={[
          {
            id: 'thong-tin-thu-thap',
            title: tx('Thông tin chúng tôi thu thập'),
            body: (
              <LegalList
                items={[
                  tx('Thông tin tài khoản: tên, email, số điện thoại, vai trò (người lao động hoặc nhà tuyển dụng).'),
                  tx('Thông tin xác minh tuỳ chọn: CMND/CCCD, thẻ sinh viên, đăng ký kinh doanh — chỉ khi bạn chủ động cung cấp.'),
                  tx('Hoạt động trong ứng dụng: ca đã ứng tuyển, ca đã đăng, đánh giá đã nhận, lịch sử huỷ.'),
                  tx('Thông tin kỹ thuật: dữ liệu lưu cục bộ trong trình duyệt, không gửi lên máy chủ ngoài.'),
                ]}
              />
            ),
          },
          {
            id: 'cach-su-dung',
            title: tx('Cách chúng tôi sử dụng thông tin'),
            body: (
              <p>
                {tx('Thông tin được dùng để vận hành dịch vụ — cho phép ứng tuyển, duyệt người lao động, tính điểm uy tín, gửi thông báo trong ứng dụng. Chúng tôi không bán thông tin cá nhân cho bên thứ ba.')}
              </p>
            ),
          },
          {
            id: 'luu-tru',
            title: tx('Lưu trữ trong phiên bản dùng thử'),
            body: (
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
              <LegalList
                items={[
                  tx('Quyền xem và chỉnh sửa thông tin cá nhân của mình.'),
                  tx('Quyền xoá tài khoản và dữ liệu liên quan bằng cách liên hệ tổ hỗ trợ.'),
                  tx('Quyền yêu cầu giải thích về cách dữ liệu được sử dụng.'),
                ]}
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
        ]}
      />
    </ToneScroll>
  );
}
