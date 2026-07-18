import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      // route เดิมก่อนเปลี่ยนชื่อ — กัน bookmark เก่าของนักเรียนเจอ 404
      {
        source: "/assignments",
        destination: "/grades",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
