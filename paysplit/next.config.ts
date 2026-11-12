import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Emit a self-contained server (.next/standalone/server.js) for the Docker
  // image deployed to Cloud Run. See Dockerfile.
  output: "standalone",
}

export default nextConfig
