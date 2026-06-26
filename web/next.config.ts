import type { NextConfig } from "next";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "dgxxlp1vy";

const nextConfig: NextConfig = {
  images: {
    // Only images we control (uploaded to Cloudinary) are optimized through
    // the Next.js image pipeline. Photos scraped from arbitrary external hosts
    // are rendered as plain lazy <img> in PersonPhoto, so they don't need to be
    // allow-listed here and can't trip the optimizer's 400 on unknown hosts.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: `/${cloudName}/**`,
      },
    ],
  },
};

export default nextConfig;
