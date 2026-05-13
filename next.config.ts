import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@keyhole-koro/paper-in-paper', '@synthify/proto-ts'],
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    externalDir: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
