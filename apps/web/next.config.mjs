/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@kandy-cabs/shared'],
  images: {
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
