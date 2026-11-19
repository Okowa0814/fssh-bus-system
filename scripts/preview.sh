#!/usr/bin/env bash
# 本機預覽環境部署腳本
# 先 next build，再用建置後的產物啟動（next start），不讀原始碼、沒有即時編譯、沒有熱重載
# 改了程式要看到變化，請重新執行這支腳本（會重新 build）
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
    echo "找不到 .env，從 .env.example 建立並自動產生隨機密碼..."
    cp .env.example .env
    DB_PASSWORD=$(openssl rand -hex 16)
    JWT_SECRET=$(openssl rand -base64 48)
    sed -i "s#請改成高強度密碼#${DB_PASSWORD}#g" .env
    sed -i "s#請改成隨機密鑰#${JWT_SECRET}#g" .env
    echo "已產生 .env，POSTGRES_PASSWORD / JWT_SECRET 已自動隨機產生。"
    echo "請自行修改 .env 的 GOOGLE_CLIENT_ID / NEXT_PUBLIC_GOOGLE_CLIENT_ID 以啟用 Google 登入。"
fi

echo "建置並啟動預覽環境（docker-compose.preview.yml）..."
docker compose -f docker-compose.preview.yml up --build -d --remove-orphans "$@"

echo ""
echo "服務狀態："
docker compose -f docker-compose.preview.yml ps
