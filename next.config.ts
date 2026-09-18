import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // archiver is ESM-only and pulls in native-ish stream plumbing; bundling it
  // into the server build breaks on Vercel, so leave it to Node's resolver.
  serverExternalPackages: ["archiver", "@prisma/client", "prisma"],
};

export default nextConfig;
