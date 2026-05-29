/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow wallet browser extensions (e.g. MetaMask) to communicate with the Next.js dev server
  allowedDevOrigins: ["chrome-extension://onhogfjeacnfoofkfgppdlbmlmnplgbn"],
};

export default nextConfig;
