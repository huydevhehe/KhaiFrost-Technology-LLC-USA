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

// Loopback and private-network (RFC 1918) hosts, e.g. a test server reached by its LAN address
const PRIVATE_HOST = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|::1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/;

const isPrivateHost = mediaOrigin ? PRIVATE_HOST.test(mediaOrigin.hostname) : false;

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
    // The optimizer refuses private hosts unless allowed; only enabled when media lives on localhost or a LAN address.
    dangerouslyAllowLocalIP: isPrivateHost,
  },
};

export default nextConfig;
