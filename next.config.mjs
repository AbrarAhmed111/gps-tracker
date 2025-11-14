/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Do not fail the build on ESLint errors (formatting etc.)
    ignoreDuringBuilds: true,
  },
  images: {
    // This allows Next.js to serve images from the local 'public' folder
    // You can also specify external domains if needed
    // domains: ['your-external-domain.com'],
    unoptimized: false, // Set to true if you want to skip image optimization
  },
}

export default nextConfig
