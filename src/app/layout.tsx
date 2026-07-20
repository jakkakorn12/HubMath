import type { Metadata } from "next";
import { Noto_Serif_Thai } from "next/font/google";
import "./globals.css";

// ฟอนต์เดียวทั้งเว็บ (หัวข้อ+เนื้อหา) — โหลดครบทุกน้ำหนักที่ใช้จริงในเว็บ
const notoSerifThai = Noto_Serif_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto-serif-thai",
});

export const metadata: Metadata = {
  title: "HubMath",
  description: "ระบบจัดการงานและห้องเรียนคณิตศาสตร์",
  icons: {
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "HubMath",
    statusBarStyle: "default",
  },
};

export const viewport = {
  themeColor: "#042c53",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={notoSerifThai.variable}>
      <body className="font-sans bg-surface text-ink min-h-screen antialiased">{children}</body>
    </html>
  );
}
