import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Docker 部署使用 standalone 輸出，映像檔只帶必要檔案
    output: "standalone",
    poweredByHeader: false,
    // 允許區網其他裝置存取開發伺服器（生產環境的 standalone 輸出不受影響）
    allowedDevOrigins: ["192.168.50.135"],
    serverExternalPackages: ["@prisma/adapter-pg", "pg", "ioredis", "google-auth-library"],
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
