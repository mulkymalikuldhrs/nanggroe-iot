import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Default: standalone output for server deployment
  output: "standalone",
  // For Capacitor/Android mobile builds, uncomment the line below and comment out 'standalone':
  // output: 'export',
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
