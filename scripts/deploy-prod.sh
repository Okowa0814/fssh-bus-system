#!/usr/bin/env bash
# 正式環境部署腳本
# 啟動 nginx + nextjs（runner target）+ migrate（一次性 prisma db push）+ db + redis
set -euo pipefail
cd "$(dirname "$0")/.."

SKIP_CONFIRM=false
for arg in "$@"; do
    if [ "$arg" = "-y" ] || [ "$arg" = "--yes" ]; then
        SKIP_CONFIRM=true
    fi
done

if [ ! -f .env ]; then
    echo "找不到 .env，從 .env.example 建立並自動產生隨機密碼..."
    cp .env.example .env
    DB_PASSWORD=$(openssl rand -hex 24)
    JWT_SECRET=$(openssl rand -base64 48)
    sed -i "s#請改成高強度密碼#${DB_PASSWORD}#g" .env
    sed -i "s#請改成隨機密鑰#${JWT_SECRET}#g" .env
    echo "已產生 .env，POSTGRES_PASSWORD / JWT_SECRET 已自動隨機產生。"
    echo "請務必手動編輯 .env，填入正式的 GOOGLE_CLIENT_ID / NEXT_PUBLIC_GOOGLE_CLIENT_ID / ALLOWED_EMAIL_DOMAIN / ADMIN_EMAILS，確認無誤後再重新執行本腳本進行部署。"
    exit 0
fi

if [ "$SKIP_CONFIRM" = false ]; then
    read -rp "即將部署到正式環境，確定要繼續嗎？(y/N) " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "已取消。"
        exit 1
    fi
fi

echo "建置並啟動正式環境服務（docker-compose.yml）..."
docker compose -f docker-compose.yml up -d --build

echo ""
echo "服務狀態："
docker compose -f docker-compose.yml ps
