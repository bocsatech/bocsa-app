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
        source: "/arbeitsprotokol/:path*",
        destination: "/arbeitsauftrag",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
