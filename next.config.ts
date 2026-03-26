import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

loadEnvConfig(process.cwd());

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
  },
});

/** Comma-separated hosts or full origins (e.g. 192.168.1.12,http://192.168.1.12:3000). See Next.js allowedDevOrigins. */
const allowedDevOrigins =
  process.env.NEXT_DEV_ALLOWED_ORIGINS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? [];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
};

export default withPWA(nextConfig);
