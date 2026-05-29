/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["chrome-extension://onhogfjeacnfoofkfgppdlbmlmnplgbn"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
