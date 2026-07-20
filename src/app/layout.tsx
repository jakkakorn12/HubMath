import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai, Noto_Serif_Thai } from "next/font/google";
import "./globals.css";

const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-plex-thai",
});

const notoSerifThai = Noto_Serif_Thai({
  subsets: ["thai", "latin"],
  weight: ["500", "600"],
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
    <html lang="th" className={`${plexThai.variable} ${notoSerifThai.variable}`}>
      <body className="font-sans bg-surface text-ink min-h-screen antialiased">{children}</body>
    </html>
  );
}
