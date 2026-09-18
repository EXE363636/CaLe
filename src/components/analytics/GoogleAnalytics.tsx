'use client';

/**
 * Google Analytics 4 — nhúng gtag.js đúng cách cho Next.js App Router.
 *
 * Thay cho việc dán tay đoạn <script> vào <head> (như hướng dẫn của Google),
 * ta dùng `next/script` để tag tự nạp một lần trên MỌI route, sau khi trang
 * tương tác được (`afterInteractive`) nên không chặn render.
 *
 * Measurement ID (`G-XXXXXXXXXX`) là dữ liệu CÔNG KHAI — nó xuất hiện nguyên
 * văn trong HTML client của trang live — nên không phải secret. Ta đọc từ
 * `NEXT_PUBLIC_GA_ID` để có thể override khi đổi tài khoản, và để mặc định là
 * ID của luồng CaLẻ để chạy ngay trên mọi môi trường mà không cần cấu hình
 * thêm. Nếu ID rỗng thì không render gì (ví dụ tắt GA ở môi trường dev).
 *
 * Riêng tư: chỉ nạp gtag mặc định (đo lường trang). Không thu thập PII, không
 * bật quảng cáo cá nhân hoá. Nếu cần chuẩn đồng ý (EEA) có thể bổ sung banner
 * consent + Consent Mode sau — tách khỏi phạm vi tích hợp cơ bản này.
 */

import Script from 'next/script';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? 'G-8FJ6SRHVVZ';

export function GoogleAnalytics() {
  // Không có ID → không nhúng (cho phép tắt GA bằng NEXT_PUBLIC_GA_ID="").
  if (!GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
