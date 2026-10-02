import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cho phép chạy thêm một `next dev` song song (vd chế độ local ở cổng khác):
  // Next 16 khoá `<distDir>/dev/lock`, nên bản thứ hai cần thư mục build riêng.
  // Mặc định vẫn là `.next`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // 30/09 — trang giới thiệu theo vai trò đổi sang đường dẫn tiếng Anh cho khớp các
  // route khác. Giữ chuyển hướng vĩnh viễn để link/QR cũ không hỏng.
  async redirects() {
    return [
      { source: "/viec-lam", destination: "/for-workers", permanent: true },
      { source: "/tuyen-dung", destination: "/for-employers", permanent: true },
    ];
  },
};

export default nextConfig;
