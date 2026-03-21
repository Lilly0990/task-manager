import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tcigprodygsajrjqhopv.supabase.co',
      },
    ],
  },
}

export default nextConfig
