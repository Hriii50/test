import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appDirectory, "../..");
const replitDevDomain = process.env.REPLIT_DEV_DOMAIN;

const nextConfig: NextConfig = {
  outputFileTracingRoot: workspaceRoot,
  allowedDevOrigins: ["127.0.0.1", ...(replitDevDomain ? [replitDevDomain] : [])],
  transpilePackages: [
    "@workspace/api-client-react",
    "@workspace/api-zod",
    "@workspace/mizan-api",
  ],
  serverExternalPackages: ["bcryptjs", "mongodb"],
};

export default nextConfig;
