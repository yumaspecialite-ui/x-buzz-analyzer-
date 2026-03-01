import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // X のアバター画像をそのまま表示するために外部ドメインを許可
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pbs.twimg.com" },
      { protocol: "https", hostname: "abs.twimg.com" },
    ],
  },
};

export default nextConfig;
