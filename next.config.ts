import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Avatar alumni disimpan di Supabase Storage bucket publik. Host-nya harus
    // didaftarkan supaya next/image mau mengoptimalkannya.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cbepplpvlizwyaalndas.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
