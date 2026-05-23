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
  title: "CaLẻ / ShiftNow",
  description:
    "Nền tảng kết nối nhà tuyển dụng và người làm cho các ca làm ngắn hạn tại Việt Nam.",
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
    >
      {/* Phase 9U — `overflow-x: hidden` and `width: 100%` are applied
          on `html, body` in `globals.css`. We pair that with
          `min-w-0` here so any flex / grid descendant whose intrinsic
          minimum content width exceeds the viewport (long Vietnamese
          labels, monospace timestamps, the hero mockup at 360 px) can
          shrink instead of forcing the body wider. The combination is
          what kills the "page looks sliced in half when the drawer
          opens" symptom from manual screenshot QA. */}
      <body className="min-w-0 min-h-full flex flex-col font-sans text-slate-900">
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
