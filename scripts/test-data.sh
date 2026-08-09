#!/usr/bin/env bash
# 測試資料工具：直接操作 docker 內的 Postgres，模擬路線塞滿座位 / 清除測試資料
# 所有測試資料的學號一律以 TEST 開頭（例如 TEST0001），方便辨識與清除，不會動到真實學生資料
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
    echo "找不到 .env，請先執行 scripts/dev.sh 或 scripts/deploy.sh 產生 .env"
    exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

echo "=== 選擇目標環境 ==="
echo "1) 開發環境 (docker-compose.dev.yml / fssh-bus-db-dev)"
echo "2) 正式環境 (docker-compose.yml / fssh-bus-db)"
read -rp "請輸入數字: " env_choice

case "$env_choice" in
    1) COMPOSE_FILE="docker-compose.dev.yml" ;;
    2) COMPOSE_FILE="docker-compose.yml" ;;
    *) echo "無效選項"; exit 1 ;;
esac

if [ "$COMPOSE_FILE" = "docker-compose.yml" ]; then
    echo ""
    echo "⚠️  你選的是正式環境，這支工具會寫入/刪除真實資料庫的資料列。"
    read -rp "確定要繼續嗎？請輸入 yes 確認: " confirm_prod
    if [ "$confirm_prod" != "yes" ]; then
        echo "已取消。"
        exit 1
    fi
fi

psql_exec() {
    docker compose -f "$COMPOSE_FILE" exec -T db \
        psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 "$@"
}

list_routes() {
    echo ""
    echo "=== 目前路線與已登記人數 ==="
    psql_exec -c "
        SELECT r.id, r.name, r.\"isFull\",
               count(b.id) AS booked,
               42 - count(b.id) AS free_seats
        FROM \"Route\" r
        LEFT JOIN \"Booking\" b ON b.\"routeId\" = r.id
        GROUP BY r.id, r.name, r.\"isFull\"
        ORDER BY r.id;
    "
}

# 依 isFull 定義（count(*) >= 42）重新計算單一路線的 isFull 旗標，
# 保持與 server/booking.ts 的 markRouteFullIfNeeded 邏輯一致
sync_is_full() {
    local route_id="$1"
    psql_exec -c "
        UPDATE \"Route\" SET \"isFull\" = (
            SELECT count(*) >= 42 FROM \"Booking\" WHERE \"routeId\" = ${route_id}
        )
        WHERE id = ${route_id};
    "
}

fill_route() {
    list_routes
    read -rp "要填入測試登記的路線 ID: " route_id
    if ! [[ "$route_id" =~ ^[0-9]+$ ]]; then
        echo "路線 ID 必須是數字"
        return
    fi

    read -rp "要填入幾人？(預設 40): " fill_count
    fill_count="${fill_count:-40}"
    if ! [[ "$fill_count" =~ ^[0-9]+$ ]] || [ "$fill_count" -lt 1 ] || [ "$fill_count" -gt 42 ]; then
        echo "人數必須是 1~42 的數字"
        return
    fi

    echo "建立 ${fill_count} 位測試學生（TESTxxxx，若已存在則略過）..."
    psql_exec -c "
        INSERT INTO \"User\" (\"studentId\", name, email, \"enrollmentYear\", \"isAdmin\", \"createdAt\", \"updatedAt\")
        SELECT 'TEST' || lpad(gs::text, 4, '0'),
               '測試學生' || gs,
               'test' || lpad(gs::text, 4, '0') || '@test.local',
               '00',
               false,
               now(), now()
        FROM generate_series(1, ${fill_count}) AS gs
        ON CONFLICT (\"studentId\") DO NOTHING;
    "

    echo "把測試學生塞進路線 ${route_id} 目前還空著的座位..."
    psql_exec -c "
        WITH station AS (
            SELECT (stations->0->>'name') AS name,
                   COALESCE((stations->0->>'monthlyPrice')::int, 0) AS price,
                   COALESCE(stations->0->>'arriveAt', '') AS arrive
            FROM \"Route\" WHERE id = ${route_id}
        ),
        free_seats AS (
            SELECT gs AS seat
            FROM generate_series(1, 42) AS gs
            WHERE gs NOT IN (
                SELECT \"seatNumber\" FROM \"Booking\" WHERE \"routeId\" = ${route_id}
            )
            ORDER BY gs
            LIMIT ${fill_count}
        ),
        numbered AS (
            SELECT seat, row_number() OVER (ORDER BY seat) AS rn FROM free_seats
        ),
        available_test_students AS (
            SELECT \"studentId\", row_number() OVER (ORDER BY \"studentId\") AS rn
            FROM \"User\"
            WHERE \"studentId\" LIKE 'TEST%'
              AND \"studentId\" NOT IN (SELECT \"studentId\" FROM \"Booking\")
            LIMIT ${fill_count}
        )
        INSERT INTO \"Booking\" (\"studentId\", \"routeId\", \"seatNumber\", station, \"monthlyPrice\", \"arriveAt\", \"isPaid\", \"createdAt\", \"updatedAt\")
        SELECT a.\"studentId\", ${route_id}, n.seat, station.name, station.price, station.arrive, false, now(), now()
        FROM numbered n
        JOIN available_test_students a ON a.rn = n.rn
        CROSS JOIN station;
    "

    sync_is_full "$route_id"
    echo "完成。"
    list_routes
}

clear_test_data() {
    echo ""
    echo "將刪除所有 studentId 以 TEST 開頭的登記、候補與測試學生帳號。"
    read -rp "確定要清除嗎？請輸入 yes 確認: " confirm
    if [ "$confirm" != "yes" ]; then
        echo "已取消。"
        return
    fi

    echo "受影響的路線先記下來，刪除後要重算 isFull..."
    affected_routes=$(psql_exec -t -A -c "
        SELECT DISTINCT \"routeId\" FROM \"Booking\" WHERE \"studentId\" LIKE 'TEST%';
    ")

    psql_exec -c "DELETE FROM \"Booking\" WHERE \"studentId\" LIKE 'TEST%';"
    psql_exec -c "DELETE FROM \"WaitlistEntry\" WHERE \"studentId\" LIKE 'TEST%';"
    psql_exec -c "DELETE FROM \"User\" WHERE \"studentId\" LIKE 'TEST%';"

    for route_id in $affected_routes; do
        sync_is_full "$route_id"
    done

    echo "已清除所有測試資料。"
    list_routes
}

while true; do
    echo ""
    echo "=== fssh-bus 測試資料工具 ==="
    echo "1) 將指定路線填入測試登記（模擬接近/整條滿座，預設 40 人）"
    echo "2) 刪除所有測試登記（清除 TEST 開頭的測試學生與登記）"
    echo "0) 離開"
    read -rp "請輸入數字: " choice

    case "$choice" in
        1) fill_route ;;
        2) clear_test_data ;;
        0) exit 0 ;;
        *) echo "無效選項" ;;
    esac
done
