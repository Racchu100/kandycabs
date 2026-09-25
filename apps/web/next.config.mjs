/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@kandy-cabs/shared', '@kandy-cabs/db'],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
