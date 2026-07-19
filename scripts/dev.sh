#!/usr/bin/env bash
# 開發環境部署腳本
# 啟動 db + redis + nextjs（dev target：熱重載、掛載原始碼、自動 prisma db push）
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
    echo "登入頁有「測試登入」按鈕可略過 Google OAuth；若要測試真的 Google 登入，請自行修改 GOOGLE_CLIENT_ID / NEXT_PUBLIC_GOOGLE_CLIENT_ID。"
fi

echo "啟動開發環境（docker-compose.dev.yml）..."
docker compose -f docker-compose.dev.yml up --build "$@"
