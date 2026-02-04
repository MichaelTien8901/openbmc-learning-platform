import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone for Docker deployment
  output: "standalone",

  // Strict mode for development
  reactStrictMode: true,

  // Image optimization domains (add external domains as needed)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.githubusercontent.com",
      },
    ],
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_APP_NAME: "OpenBMC Learning Platform",
  },
};

export default nextConfig;
