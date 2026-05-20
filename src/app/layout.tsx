import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppHydrator } from "@/components/layout/AppHydrator";
import { NavBar } from "@/components/layout/NavBar";
import { Footer } from "@/components/layout/Footer";

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
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900">
        <AppHydrator>
          <NavBar />
          <main className="flex-1 bg-slate-50">
            {children}
          </main>
          <Footer />
        </AppHydrator>
      </body>
    </html>
  );
}
