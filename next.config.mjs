/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bills can be a few MB; allow generous server action / route body sizes.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
