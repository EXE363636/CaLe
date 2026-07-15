import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppHydrator } from "@/components/layout/AppHydrator";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";
import { ToastHost } from "@/components/layout/ToastHost";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CaLẻ / Now — Kết nối ca làm linh hoạt tại Việt Nam",
  description:
    "Nền tảng kết nối nhà tuyển dụng và người làm cho các ca làm ngắn hạn tại Việt Nam. An toàn, minh bạch, thanh toán đảm bảo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/*
         * Inline script to apply saved theme BEFORE first paint.
         * This prevents FOUC (flash of un-themed content) when the user
         * has a saved dark mode preference. The script runs synchronously
         * in the <head> so it executes before the browser paints.
         *
         * We use a dangerouslySetInnerHTML script rather than a
         * suppressHydrationWarning trick because this must run before
         * React hydrates, not after.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var saved = localStorage.getItem('cale-theme');
                if (saved === 'dark') {
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body
        className="min-w-0 min-h-full flex flex-col font-sans"
        style={{ color: 'var(--foreground)', background: 'var(--background)' }}
        suppressHydrationWarning
      >
        <AppHydrator>
          <NavBar />
          <main className="min-w-0 flex-1">
            {children}
          </main>
          <Footer />
          <ToastHost />
        </AppHydrator>
      </body>
    </html>
  );
}
