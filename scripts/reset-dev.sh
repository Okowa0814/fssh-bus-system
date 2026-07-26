#!/usr/bin/env bash
# 開發環境重置腳本：停止容器、清空本機資料（Postgres／Redis），
# 再重新建置並啟動，容器啟動時會自動套用最新的 schema.prisma（prisma db push）。
set -euo pipefail
cd "$(dirname "$0")/.."

echo "停止開發環境容器..."
docker compose -f docker-compose.dev.yml down

echo "清空本機資料（./data/dev-db, ./data/dev-redis）..."
# data/dev-db、data/dev-redis 是容器內 postgres/redis 使用者建立的檔案，
# 目前使用者權限刪不動，借一個一次性容器以相同權限清空後移除。
docker run --rm -v "$(pwd)/data:/data" alpine:3 sh -c 'rm -rf /data/dev-db /data/dev-redis'

echo "重新建置並啟動（會自動 prisma db push 套用新的 schema）..."
docker compose -f docker-compose.dev.yml up --build -d

echo ""
echo "服務狀態："
docker compose -f docker-compose.dev.yml ps
