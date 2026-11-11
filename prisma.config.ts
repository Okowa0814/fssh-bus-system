import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Docker build 的 deps 階段（npm install 觸發 postinstall: prisma generate）此時還沒有 .env，
// 但產生型別碼不需要真的連線，用假值避免建置失敗；實際執行時由 docker compose 的 env_file 提供真正的 DATABASE_URL。
function resolveDatabaseUrl(): string {
    try {
        return env("DATABASE_URL");
    } catch {
        return "postgresql://build:build@localhost:5432/build";
    }
}

export default defineConfig({
    schema: "schema.prisma",
    engine: "classic",
    datasource: {
        url: resolveDatabaseUrl(),
    },
});
