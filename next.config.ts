import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config: any) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };
    return config;
  },
};

export default nextConfig;
