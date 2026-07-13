import type { NextConfig } from "next";
import os from "os";

const getLocalIPs = (): string[] => {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(interfaces)) {
    const netList = interfaces[name];
    if (netList) {
      for (const net of netList as any[]) {
        // Support node 18+ family check
        const family = typeof net.family === "string" ? net.family : `IPv${net.family}`;
        if (family === "IPv4" && !net.internal) {
          ips.push(net.address);
        }
      }
    }
  }
  return ips;
};

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: [...getLocalIPs(), "localhost:3000"],
};

export default nextConfig;
