-- 壓力測試用資料：建立 1000 個測試學生，並把登記時間窗設成「開放中」
-- 學號一律 LOAD0001 ~ LOAD1000、入學年 98，與真實學生不會衝突，壓完可整批清除。
--
-- 用法（預覽環境，在專案根目錄執行）：
--   docker compose -f docker-compose.preview.yml exec -T db \
--       psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 < loadtest/seed.sql
--
-- 注意：
--   * 本檔可重複執行（idempotent）。
--   * 會覆寫 Setting 的 bookingStart / bookingEnd，壓完請自行還原（見最下方查詢）。
--   * User 表的 updatedAt 由 Prisma 在應用層寫入、資料庫沒有預設值，所以這裡要手動帶 now()。

BEGIN;

INSERT INTO "User" ("enrollmentYear", "studentId", "name", "email", "isAdmin", "createdAt", "updatedAt")
SELECT
    '98',
    'LOAD' || lpad(n::text, 4, '0'),
    '壓測學生' || lpad(n::text, 4, '0'),
    'load' || lpad(n::text, 4, '0') || '@fssh.khc.edu.tw',
    false,
    now(),
    now()
FROM generate_series(1, 1000) AS n
ON CONFLICT ("enrollmentYear", "studentId") DO NOTHING;

-- 登記時間窗：現在起往後 24 小時
INSERT INTO "Setting" ("key", "value")
VALUES
    ('bookingStart', to_char(now() - interval '1 minute', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
    ('bookingEnd',   to_char(now() + interval '24 hours',  'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value";

COMMIT;

-- ─────────────────────────────────────────────────────────────
-- 【壓測前】先備份原本的時間窗，之後好還原：
--   SELECT * FROM "Setting" WHERE "key" IN ('bookingStart', 'bookingEnd');
--
-- 【壓測後：正確性檢查】每條路線登記數不得超過 42：
--   SELECT "routeId", count(*) AS booked FROM "Booking"
--   WHERE "studentId" LIKE 'LOAD%' GROUP BY "routeId" ORDER BY "routeId";
--
-- 【壓測後：重複座位檢查】應回傳 0 列：
--   SELECT "routeId", "seatNumber", count(*) FROM "Booking"
--   GROUP BY 1, 2 HAVING count(*) > 1;
--
-- 【壓測後：一人多筆檢查】應回傳 0 列：
--   SELECT "enrollmentYear", "studentId", count(*) FROM "Booking"
--   GROUP BY 1, 2 HAVING count(*) > 1;
--
-- 【清除壓測資料】（先刪有外鍵關聯的 Booking / WaitlistEntry）：
--   BEGIN;
--   DELETE FROM "Booking"       WHERE "enrollmentYear" = '98' AND "studentId" LIKE 'LOAD%';
--   DELETE FROM "WaitlistEntry" WHERE "enrollmentYear" = '98' AND "studentId" LIKE 'LOAD%';
--   DELETE FROM "User"          WHERE "enrollmentYear" = '98' AND "studentId" LIKE 'LOAD%';
--   COMMIT;
-- ─────────────────────────────────────────────────────────────
