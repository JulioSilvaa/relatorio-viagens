import type { NextConfig } from "next";

const apiInternalUrl = process.env.API_INTERNAL_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  output: "standalone",
  // Permite acessar o dev server (e o HMR) pelo IP da rede local, para
  // testar em celular real durante o desenvolvimento. Next.js bloqueia
  // isso por padrão (proteção contra DNS rebinding); ignorado fora de
  // `next dev`. Ajuste/adicione o IP se a máquina de desenvolvimento mudar.
  allowedDevOrigins: ["192.168.1.134"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiInternalUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
