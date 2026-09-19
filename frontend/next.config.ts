import type { NextConfig } from "next";

// Media served by the backend (absolute URLs such as http://localhost:4000/uploads/...) must be allowed for
// next/image. The origin is derived from the API base URL, or NEXT_PUBLIC_MEDIA_BASE_URL when media is
// hosted somewhere else (CDN / object storage).
const mediaOrigin = (() => {
  try {
    return new URL(
      process.env.NEXT_PUBLIC_MEDIA_BASE_URL ??
        process.env.NEXT_PUBLIC_API_BASE_URL ??
        "http://localhost:4000/api/v1",
    );
  } catch {
    return null;
  }
})();

const isLoopbackHost = mediaOrigin
  ? ["localhost", "127.0.0.1", "[::1]", "::1"].includes(mediaOrigin.hostname)
  : false;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: mediaOrigin
      ? [
          {
            protocol: mediaOrigin.protocol === "https:" ? "https" : "http",
            hostname: mediaOrigin.hostname,
            port: mediaOrigin.port,
          },
        ]
      : [],
    // The optimizer refuses loopback hosts unless allowed; only enabled when media lives on localhost (dev).
    dangerouslyAllowLocalIP: isLoopbackHost,
  },
};

export default nextConfig;
