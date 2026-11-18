-- 115 學年度下學期 學生專車路線／站點／月價（來源：4.115-2 學生專車開車時間.收費表(三車版)115.1111.xlsx）
-- monthlyPrice 使用「雙程(單月)」欄位的金額
--
-- ⚠️ 會清空 Route 以及依賴它的 Booking、WaitlistEntry（CASCADE），並讓 Route.id 從 1 重新編號。
-- User 資料表不受影響。整段在同一個 transaction 內，任何一步失敗都會整體還原。
--
-- 本機（預覽環境）執行方式：
--   docker compose -f docker-compose.preview.yml exec -T db \
--       psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 < scripts/seed-routes.sql

BEGIN;

TRUNCATE TABLE "Route" RESTART IDENTITY CASCADE;

INSERT INTO "Route" (name, stations) VALUES
(
    '梓官右昌',
    $json$[
        {"name": "彌陀國小", "arriveAt": "06:30", "monthlyPrice": 2760},
        {"name": "台17線/梓官加油站", "arriveAt": "06:38", "monthlyPrice": 2760},
        {"name": "梓官農會", "arriveAt": "06:40", "monthlyPrice": 2650},
        {"name": "典寶廟(台17線與嘉展路口)", "arriveAt": "06:43", "monthlyPrice": 2650},
        {"name": "右昌德民路口(台17線)", "arriveAt": "06:51", "monthlyPrice": 2505},
        {"name": "右昌街、盛昌街口", "arriveAt": "06:52", "monthlyPrice": 2385},
        {"name": "右昌果菜市場", "arriveAt": "06:55", "monthlyPrice": 2385},
        {"name": "右昌外環路口(教練場對面)", "arriveAt": "06:57", "monthlyPrice": 2385},
        {"name": "後勁國中", "arriveAt": "07:03", "monthlyPrice": 2385}
    ]$json$::jsonb
),
(
    '高楠1線',
    $json$[
        {"name": "全能外語(文慈路)", "arriveAt": "06:50", "monthlyPrice": 1985},
        {"name": "夾子園(興楠路)", "arriveAt": "07:05", "monthlyPrice": 2384}
    ]$json$::jsonb
),
(
    '高楠2線',
    $json$[
        {"name": "大中路口(民族路)", "arriveAt": "07:00", "monthlyPrice": 1985},
        {"name": "天祥路口(民族路)", "arriveAt": "07:02", "monthlyPrice": 1960},
        {"name": "裕誠路口(民族路)", "arriveAt": "07:03", "monthlyPrice": 1960}
    ]$json$::jsonb
);

-- 結果確認
SELECT r.id, r.name, jsonb_array_length(r.stations::jsonb) AS station_count FROM "Route" r ORDER BY r.id;

COMMIT;
