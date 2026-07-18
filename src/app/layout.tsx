import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import "./globals.css";

const plexThai = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
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
  themeColor: "#2563eb",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${plexThai.className} bg-gray-50 min-h-screen`}>{children}</body>
    </html>
  );
}
