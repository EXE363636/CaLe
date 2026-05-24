import { InfoPage, InfoSection, InfoList } from '@/components/layout/InfoPage';

export const metadata = { title: 'Chính sách bảo mật — CaLẻ / Now' };

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Pháp lý"
      title="Chính sách bảo mật"
      intro="Tài liệu này mô tả thông tin chúng tôi thu thập, cách dùng và cách bảo vệ. Áp dụng cho phiên bản dùng thử của CaLẻ / Now."
    >
      <InfoSection title="Thông tin chúng tôi thu thập">
        <InfoList
          items={[
            'Thông tin tài khoản: tên, email, số điện thoại, vai trò (người làm hoặc nhà tuyển dụng).',
            'Thông tin xác minh tuỳ chọn: CMND/CCCD, thẻ sinh viên, đăng ký kinh doanh — chỉ khi bạn chủ động cung cấp.',
            'Hoạt động trong ứng dụng: ca đã ứng tuyển, ca đã đăng, đánh giá đã nhận, lịch sử huỷ.',
            'Thông tin kỹ thuật: dữ liệu lưu cục bộ trong trình duyệt, không gửi lên máy chủ ngoài.',
          ]}
        />
      </InfoSection>

      <InfoSection title="Cách chúng tôi sử dụng thông tin">
        Thông tin được dùng để vận hành dịch vụ — cho phép ứng tuyển,
        duyệt người làm, tính điểm uy tín, gửi thông báo trong ứng dụng.
        Chúng tôi không bán thông tin cá nhân cho bên thứ ba.
      </InfoSection>

      <InfoSection title="Lưu trữ trong phiên bản dùng thử">
        Phiên bản hiện tại lưu dữ liệu trong localStorage trình duyệt
        của bạn. Khi bạn xoá dữ liệu trình duyệt hoặc bấm "Đăng xuất"
        rồi clear storage, dữ liệu sẽ trở về trạng thái khởi tạo.
        Phiên bản chính thức sẽ chuyển sang lưu trữ máy chủ với mã hoá
        và sẽ được công bố rõ trước khi áp dụng.
      </InfoSection>

      <InfoSection title="Quyền của bạn">
        <InfoList
          items={[
            'Quyền xem và chỉnh sửa thông tin cá nhân của mình.',
            'Quyền xoá tài khoản và dữ liệu liên quan bằng cách liên hệ tổ hỗ trợ.',
            'Quyền yêu cầu giải thích về cách dữ liệu được sử dụng.',
          ]}
        />
      </InfoSection>

      <InfoSection title="Liên hệ về quyền riêng tư">
        Email phụ trách quyền riêng tư:{' '}
        <a
          href="mailto:support@caledo.vn"
          className="text-orange-600 hover:underline"
        >
          support@caledo.vn
        </a>
        .
      </InfoSection>
    </InfoPage>
  );
}
