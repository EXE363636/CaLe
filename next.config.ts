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
      // 03/10 — 7 trang hướng dẫn nhỏ gộp vào hai trang vai trò; link cũ (menu cũ,
      // thông báo, bookmark) về đúng khối. Tạm thời (307) để còn đổi được nếu cần.
      { source: "/worker/reputation-guide", destination: "/for-workers#worker-reputation", permanent: false },
      { source: "/worker/schedule-guide", destination: "/for-workers#worker-schedule", permanent: false },
      { source: "/worker/cancellation-policy", destination: "/for-workers#worker-cancel", permanent: false },
      { source: "/employer/post-shift-guide", destination: "/for-employers#employer-post", permanent: false },
      { source: "/employer/applicants-guide", destination: "/for-employers#employer-applicants", permanent: false },
      { source: "/employer/payments", destination: "/for-employers#employer-payments", permanent: false },
      { source: "/employer/reviews", destination: "/for-employers#employer-reviews", permanent: false },
      // 03/10 — bốn trang thông tin gộp vào trang chủ / trang nhà tuyển dụng / hỗ trợ.
      { source: "/about", destination: "/#home-about", permanent: false },
      { source: "/how-it-works", destination: "/#home-how", permanent: false },
      { source: "/pricing", destination: "/for-employers#employer-pricing", permanent: false },
      { source: "/safety", destination: "/support#support-safety", permanent: false },
    ];
  },
};

export default nextConfig;
