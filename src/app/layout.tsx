import type { Metadata } from "next";
import { Noto_Sans_Thai_Looped } from "next/font/google";
import "./globals.css";

// ฟอนต์เดียวทั้งเว็บ (หัวข้อ+เนื้อหา) — ทรงกลม นุ่มกว่าฟอนต์ราชการ
const notoSansThaiLooped = Noto_Sans_Thai_Looped({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-thai",
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
    <html lang="th" className={notoSansThaiLooped.variable}>
      <body className="font-sans bg-surface text-ink min-h-screen antialiased">{children}</body>
    </html>
  );
}
