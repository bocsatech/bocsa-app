/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: "/arbeitsprotokol",
        destination: "/arbeitsauftrag",
        permanent: true,
      },
      {
        source: "/persoenliche-sache",
        destination: "/stammdaten",
        permanent: true,
      },
      {
        source: "/persoenliche-sache/:path*",
        destination: "/stammdaten",
        permanent: true,
      },
      {
        source: "/filialen",
        destination: "/firma",
        permanent: true,
      },
      {
        source: "/filialen/:path*",
        destination: "/firma",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
