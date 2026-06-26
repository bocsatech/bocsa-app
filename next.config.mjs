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
