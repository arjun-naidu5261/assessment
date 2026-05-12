import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Satisfies `next dev --turbopack` when a `webpack` hook also exists (avoids the
  // "Webpack is configured while Turbopack is not" warning).
  turbopack: {},

  // Used by `next build` and by `next dev` without `--turbopack`. Disabling the
  // persistent cache in Webpack dev avoids stale chunks / HMR desync that surfaces as
  // "__webpack_modules__[moduleId] is not a function".
  webpack: (config, { dev }) => {
    if (dev && !process.env.TURBOPACK) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
