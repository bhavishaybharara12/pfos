import type { NextConfig } from "next";

// STATIC_EXPORT=1 produces a fully static build for GitHub Pages
// (https://<user>.github.io/pfos/). Engines run client-side; data is the
// build-time seed snapshot. Without the flag: normal server build for local dev.
const isExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  ...(isExport
    ? {
        output: "export" as const,
        basePath: "/pfos",
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;
