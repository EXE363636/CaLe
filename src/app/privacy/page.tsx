import { getTx } from '@/i18n/server';
import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';

export default async function PrivacyPage() {
  const tx = await getTx();
  return (
    <InfoPage
      eyebrow={tx('Pháp lý')}
      title={tx('Chính sách bảo mật')}
      intro={tx('Tài liệu này mô tả thông tin chúng tôi thu thập, cách dùng và cách bảo vệ. Áp dụng cho phiên bản dùng thử của CaLẻ.')}
    >
      <InfoSection title={tx('Thông tin chúng tôi thu thập')}>
        <InfoList
          items={[
            tx('Thông tin tài khoản: tên, email, số điện thoại, vai trò (người lao động hoặc nhà tuyển dụng).'),
            tx('Thông tin xác minh tuỳ chọn: CMND/CCCD, thẻ sinh viên, đăng ký kinh doanh — chỉ khi bạn chủ động cung cấp.'),
            tx('Hoạt động trong ứng dụng: ca đã ứng tuyển, ca đã đăng, đánh giá đã nhận, lịch sử huỷ.'),
            tx('Thông tin kỹ thuật: dữ liệu lưu cục bộ trong trình duyệt, không gửi lên máy chủ ngoài.'),
          ]}
        />
      </InfoSection>

      <InfoSection title={tx('Cách chúng tôi sử dụng thông tin')}>
        {tx('Thông tin được dùng để vận hành dịch vụ — cho phép ứng tuyển, duyệt người lao động, tính điểm uy tín, gửi thông báo trong ứng dụng. Chúng tôi không bán thông tin cá nhân cho bên thứ ba.')}
      </InfoSection>

      <InfoSection title={tx('Lưu trữ trong phiên bản dùng thử')}>
        {tx('Phiên bản hiện tại lưu dữ liệu trong localStorage trình duyệt')}
        của bạn. Khi bạn xoá dữ liệu trình duyệt hoặc bấm &quot;Đăng xuất&quot;
        rồi clear storage, dữ liệu sẽ trở về trạng thái khởi tạo.
        Phiên bản chính thức sẽ chuyển sang lưu trữ máy chủ với mã hoá
        và sẽ được công bố rõ trước khi áp dụng.
      </InfoSection>

      <InfoSection title={tx('Quyền của bạn')}>
        <InfoList
          items={[
            tx('Quyền xem và chỉnh sửa thông tin cá nhân của mình.'),
            tx('Quyền xoá tài khoản và dữ liệu liên quan bằng cách liên hệ tổ hỗ trợ.'),
            tx('Quyền yêu cầu giải thích về cách dữ liệu được sử dụng.'),
          ]}
        />
      </InfoSection>

      <InfoSection title={tx('Liên hệ về quyền riêng tư')}>
        {tx('Email phụ trách quyền riêng tư:')}{' '}
        <a
          href="mailto:nguyenphuonganh98113@gmail.com"
          className="text-orange-700 hover:underline"
        >
          nguyenphuonganh98113@gmail.com
        </a>
        .
      </InfoSection>
    </InfoPage>
  );
}
