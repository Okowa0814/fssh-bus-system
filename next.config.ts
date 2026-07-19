import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Docker 部署使用 standalone 輸出，映像檔只帶必要檔案
    output: "standalone",
    poweredByHeader: false,
    serverExternalPackages: ["@prisma/client", "ioredis", "google-auth-library"],
    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    { key: "X-Content-Type-Options", value: "nosniff" },
                    { key: "X-Frame-Options", value: "DENY" },
                    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
                ],
            },
        ];
    },
};

export default nextConfig;
