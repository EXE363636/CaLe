import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
