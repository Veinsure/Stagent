/** @type {import('next').NextConfig} */
const EDGE_URL = process.env.NEXT_PUBLIC_EDGE_URL ?? "http://localhost:8787"

export default {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${EDGE_URL}/api/:path*` },
    ]
  },
}
