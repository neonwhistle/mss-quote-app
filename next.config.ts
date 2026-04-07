import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Smaller production deploys (Docker, some PaaS). See Dockerfile. */
  output: "standalone",
};

export default nextConfig;
