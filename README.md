# 🚌 鳳山高中專車登記系統（fssh-bus）

鳳山高中放學專車的線上登記系統。學生使用學校 Google 帳號登入後，可在開放時間內選擇路線、上車站點與座位；管理員則能管理路線、開放時間與所有登記紀錄。

---

## ✨ 功能特色

### 🎓 學生端
- Google OAuth 登入，僅限指定網域（`ALLOWED_EMAIL_DOMAIN`）的帳號可登入
- 登記開放時間倒數計時，未開放 / 已結束會有明確提示
- 選路線 → 選站點 → 選座位 → 完成，四步驟登記流程（`Stepper`）
- 視覺化座位圖（`SeatMap`），即時顯示已被登記的座位
- 登記成功後產生電子車票（`Ticket`），可隨時查看 / 取消登記
- 路線滿位後自動轉為候補登記（免選座位，名額不設上限），可查看候補排名或自行取消候補
- 查看所有路線與停靠站資訊、發車時間
- 使用說明頁面（Help Guide）

### 🛠️ 管理端
- 檢視所有登記紀錄，支援依路線 / 關鍵字篩選；每筆登記可透過「⋮」選單標記已繳清或刪除
- 使用者管理：檢視所有使用者、修改姓名
- 設定登記開放的起訖時間
- 路線管理：新增 / 編輯 / 啟用停用路線與停靠站，滿位路線會顯示「已滿」標籤
- 權限隔離：管理員帳號無法使用學生端登記功能，反之學生也無法碰管理端 API（未授權存取一律回傳 404，不洩漏端點是否存在）

### 🔒 核心防搶票機制
- **不超賣由資料庫唯一約束保證，與鎖無關**：同一路線同一座位以 `@@unique([routeId, seatNumber])` 強制唯一、一人一筆有效登記以 `@@unique([studentId])` 強制，就算應用層邏輯有漏洞、就算完全不加鎖，都不可能超賣或一人多位
- **登記選位 / 加入候補為無鎖並行**：這是尖峰「驚群」路徑，刻意不加鎖讓不同座位的請求並行，尖峰不卡；併發衝突直接由唯一約束仲裁（撞 `P2002` 轉成友善 409），且不會因 blocking 鎖佔住連線池
- **是否滿位改為即時計算**：以 `count(bookings) >= 42` 判斷，不再儲存旗標，從根本消滅「實際已滿但旗標顯示沒滿」的誤判
- **取消 / 遞補 / 退出候補以 PostgreSQL advisory 鎖序列化**：取消登記直接刪除該列，若候補名單仍有人，最舊一筆會在同一交易內遞補到剛釋出的座位（`server/booking.ts` 的 `cancelBookingAndPromote`）；這些低頻路徑在交易內以 `pg_advisory_xact_lock(routeId)` 序列化（交易結束自動釋放），避免兩筆同時取消搶同一位候補者、或退出候補時被重複遞補

---

## 🛠️ 技術棧

| 分類 | 技術 |
|---|---|
| 前端框架 | [Next.js 16](https://nextjs.org/)（App Router）+ React 19 + TypeScript |
| 樣式 | Tailwind CSS 4 |
| 後端 | Next.js Route Handlers（`app/api/**/route.ts`） |
| 資料庫 | PostgreSQL 18 + [Prisma ORM 7](https://www.prisma.io/)（`@prisma/adapter-pg`，連線池 max 25） |
| 併發控制 | DB 唯一約束 + PostgreSQL advisory 鎖（`pg_advisory_xact_lock`） |
| 身份驗證 | Google OAuth 2.0 + JWT（[jose](https://github.com/panva/jose)，30 分鐘過期） |
| 反向代理 | Nginx（含 rate limit、SSL / certbot 自動續期） |
| 容器化 | Docker + docker-compose（dev / prod 分離） |

---

## 🏗️ 系統架構

```
瀏覽器（學生 / 管理）
    │  HTTPS
    ▼
Nginx（反向代理 + rate limit + SSL）
    │
    ▼
Next.js（App Router + Route Handlers）
    │
    └──▶ PostgreSQL（使用者 / 路線 / 登記紀錄 / 設定）
             唯一約束防超賣 + advisory 鎖序列化取消/遞補
```

### 🔑 登入流程
1. 前端取得 Google 憑證（`GoogleLoginButton`）
2. 後端 `/api/auth/google` 驗證憑證網域是否為 `ALLOWED_EMAIL_DOMAIN`，並以學號 Upsert `User` 資料
3. 若 email 在 `ADMIN_EMAILS` 名單中，自動標記為管理員
4. 簽發 30 分鐘效期的 JWT，前端存於 `localStorage`，之後每次請求帶 `Authorization: Bearer <token>`
5. `server/auth.ts` 的 `requireStudent` / `requireAdmin` 在 API 端做權限把關；管理端 API 對非管理員一律回 404

### 💺 劃位流程
1. 學生送出「路線 + 站點 + 座位」
2. **登記為無鎖並行**：交易內以 `count(bookings) >= 42` 做滿位／重複的友善檢查後，直接 `INSERT` `Booking`
3. 併發正確性完全交給資料庫唯一約束仲裁——`@@unique([routeId, seatNumber])`（同座位只能一人）與 `@@unique([studentId])`（一人只能一筆）；撞約束回 `P2002`，轉成對應的 409 訊息，絕不超賣
4. 加入候補同為無鎖並行，一人一筆候補由 `@@unique([studentId])` 保證，名額不設上限
5. **取消登記／退出候補**在交易最前面呼叫 `server/lock.ts` 的 `lockRoute(tx, routeId)` 取得 `pg_advisory_xact_lock(routeId)`，序列化同路線的取消與遞補；鎖在交易 commit/rollback 時由資料庫自動釋放，無需手動解鎖、無 TTL

---

## 📂 目錄結構

```
fssh-bus/
├── app/
│   ├── (student)/           # 學生端頁面（首頁、登記、路線、說明）
│   ├── admin/                # 管理端頁面（登記管理、路線管理）
│   ├── login/                 # 登入頁
│   └── api/
│       ├── auth/              # Google 登入
│       ├── public/            # 免登入可查詢的公開資訊（路線、統計）
│       ├── student/           # 學生端 API（登記、座位、我的資料）
│       └── admin/              # 管理端 API（登記管理、路線管理、開放時間）
├── components/                # UI 元件（SeatMap、Ticket、Stepper 等）
├── hooks/                      # React hooks（useAuth）
├── lib/                        # 型別定義、座位邏輯、Prisma 產生的 client
├── server/                     # 伺服端專用模組（auth、db、lock、google…）
├── services/                   # 前端呼叫 API 的封裝（services/api.ts）
├── schema.prisma               # 資料庫 Schema
├── nginx.conf                  # Nginx 主設定
├── Dockerfile                  # 多階段建置（builder / preview / migrate / runner）
├── docker-compose.yml           # 正式環境（nginx + nextjs + db + certbot）
├── docker-compose.preview.yml   # 本機預覽環境（使用 build 後的產物，無熱重載）
└── scripts/
    ├── preview.sh               # 一鍵建置並啟動本機預覽環境
    └── deploy.sh                 # 一鍵部署正式環境
```

---

## 🗄️ 資料庫結構

| 資料表 | 說明 |
|---|---|
| `User` | 使用者，以學號 `studentId` 為主鍵，Google 登入時自動 Upsert |
| `Route` | 路線（一條路線即一台車），`stations` 為 JSON 陣列 `[{ name, arriveAt, monthlyPrice }]`；是否滿位不存旗標，一律由即時 `count(bookings) >= 42` 計算 |
| `Booking` | 登記紀錄，`(routeId, seatNumber)` 唯一、`studentId` 唯一（一人一位），取消即刪除該筆資料；`monthlyPrice` / `arriveAt` 為登記當下的站點快照，不受之後路線編輯影響 |
| `WaitlistEntry` | 候補名單，路線滿位後才開放登記，`studentId` 唯一（一人一候補），名額不設上限，依 `createdAt` 排序、座位釋出時最舊的一筆自動遞補 |
| `Setting` | Key-Value 系統設定，用於存放 `bookingStart` / `bookingEnd` 登記開放時間 |

---

## 🔐 環境變數

`scripts/preview.sh` / `scripts/deploy.sh` 會在找不到 `.env` 時自動幫你複製並產生隨機密碼 / 密鑰：


| 變數 | 說明 |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | PostgreSQL 帳密與資料庫名稱 |
| `DATABASE_URL` | Prisma 連線字串（容器內用服務名稱 `db`，本機開發改 `localhost`） |
| `JWT_SECRET` | JWT 簽章密鑰，30 分鐘過期，請用 `openssl rand -base64 48` 產生 |
| `GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth 用戶端 ID |
| `ALLOWED_EMAIL_DOMAIN` / `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN` | 僅允許此網域的 Google 帳號登入 |
| `ADMIN_EMAILS` | 管理員信箱清單（逗號分隔），登入時自動賦予管理員權限 |

---

## 🚀 快速啟動

### 方法一：Docker 預覽環境（推薦）

一鍵建置並啟動 `db + nextjs`（preview target：先 `next build`，再用建置後的產物 `next start`，不掛載原始碼、沒有熱重載，啟動時自動 `prisma db push`）。改了程式後重新執行一次即可重新建置：

```bash
./scripts/preview.sh
```

首次執行會自動建立 `.env` 並隨機產生 `POSTGRES_PASSWORD` / `JWT_SECRET`。登入需要真實的 Google 登入，請自行到 GCP Console 建立 OAuth 用戶端並填入 `GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID`。

啟動後可於 <http://localhost:3000> 開啟。

### 方法二：本機直接執行（不透過 Docker 跑 Next.js）

需要自行準備可連線的 PostgreSQL（例如用 `docker compose -f docker-compose.preview.yml up db -d` 只啟動資料庫服務）。

```bash
npm install          # 安裝套件（會自動執行 prisma generate）
npm run db:push       # 同步資料庫結構（prisma db push）
npm run dev            # 啟動開發伺服器
```

### 🏭 正式環境部署

```bash
./scripts/deploy.sh
```

流程：`nginx`（含 SSL / rate limit）→ `migrate`（一次性同步 DB schema）→ `nextjs`（production build）→ `db`。首次執行同樣會自動建立 `.env`，但**務必手動編輯**填入正式的 `GOOGLE_CLIENT_ID`、`ALLOWED_EMAIL_DOMAIN`、`ADMIN_EMAILS` 等變數後再重新執行部署。

> ⚠️ nginx rate limit 等細節請參考 `nginx.conf`。

#### 🔒 首次簽發 SSL 憑證並啟用 HTTPS

`nginx.conf` 目前只開 80 埠：因為 certbot 的 HTTP-01 驗證方式需要先有一個能回應的 HTTP server，
443 區塊引用的憑證檔案在簽發前並不存在，若先啟用會導致 nginx 直接啟動失敗。正確順序：

1. 確認網域 DNS 已指向這台主機，且 `docker compose up -d nginx` 已在跑（80 埠可正常回應）。
2. 首次簽發憑證：
   ```bash
   docker compose run --rm certbot certonly --webroot -w /var/www/certbot -d bus.fssh.khc.edu.tw
   ```
3. 簽發成功後，取消 `nginx.conf` 中 443 `server {}` 區塊的註解，並把 80 區塊的 `location / { proxy_pass ...; }` 換成：
   ```nginx
   location / { return 301 https://$host$request_uri; }
   ```
4. `docker compose restart nginx` 套用設定。之後 `certbot` 服務會依既有排程自動續期，不需要再手動介入。

#### 💾 資料庫備份與還原

`backup` 服務會每 24 小時對 PostgreSQL 執行一次 `pg_dump`，壓縮後存到 `./data/backups/`，並自動清除 14 天前的舊備份。還原：

```bash
gunzip -c ./data/backups/<檔名>.sql.gz | docker compose exec -T db psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}
```

建議再搭配異地保存（例如排程同步到雲端物件儲存），本機 bind mount 只能防止「表格被誤刪」，無法防止整台主機故障或磁碟損毀。

---

## 📡 API 路由總覽

| 路徑 | 說明 |
|---|---|
| `POST /api/auth/google` | Google 登入，驗證網域並簽發 JWT |
| `GET /api/public/routes` | 公開查詢所有路線（免登入），含 `isFull` 滿位狀態 |
| `GET /api/public/stats` | 公開統計資訊（路線數、剩餘座位等） |
| `GET /api/student/me` | 取得目前登入學生資料、有效登記與候補紀錄 |
| `GET /api/student/booking-window` | 查詢登記開放時間 |
| `POST /api/student/bookings` | 建立我的登記（路線已滿位時會被拒絕，需改走候補） |
| `DELETE /api/student/bookings/[id]` | 取消單筆登記（若路線已滿位，候補第一位會自動遞補） |
| `GET /api/student/routes/[id]/seats` | 查詢某路線座位配置狀態 |
| `POST /api/student/waitlist` | 加入候補名單（路線需已滿位，名額不設上限） |
| `DELETE /api/student/waitlist/[id]` | 自行取消候補 |
| `GET /api/admin/bookings` | 管理員查詢所有登記紀錄 |
| `PATCH/DELETE /api/admin/bookings/[id]` | 管理員標記繳費 / 刪除單筆登記（刪除時同樣觸發候補遞補） |
| `GET/POST /api/admin/routes` | 管理員查詢 / 新增路線 |
| `PATCH/DELETE /api/admin/routes/[id]` | 管理員編輯 / 刪除路線 |
| `GET/PUT /api/admin/booking-window` | 管理員查詢 / 設定登記開放時間 |
| `GET /api/admin/user` | 管理員查詢所有使用者 |
| `PATCH /api/admin/user/[id]` | 管理員修改使用者姓名 |
| `GET /api/admin/waitlist` | 管理員查詢候補名單總覽 |

> 🔒 所有 `/api/admin/**` 端點對非管理員一律回傳 `404`，`/api/student/**` 端點對管理員帳號回傳 `403`。

---

## 📜 常用指令

```bash
npm run dev        # 啟動開發伺服器
npm run build       # 產生 Prisma Client 並建置正式版
npm run start        # 啟動正式版伺服器
npm run lint          # ESLint 檢查
npm run db:push        # 同步 Prisma Schema 到資料庫
```

---

## 🗃️ 關於 `prisma db push`

`Dockerfile` 的 `migrate` stage 目前執行 `prisma db push`：schema 有變動時直接依目前定義覆蓋資料庫結構，
沒有版本化的遷移紀錄，也無法針對「這欄位怎麼從舊資料轉換過來」寫自訂邏輯，正式環境有資料損壞風險。
待專案穩定、需要更嚴謹的 schema 變更流程時，建議改用 Prisma Migrate：

1. 本機對照正式環境的資料庫結構，執行一次 `npx prisma migrate dev --name init` 建立第一份 migration（`prisma/migrations/`）。
2. 把 `Dockerfile` 的 `migrate` stage 的 `CMD` 由 `npx prisma db push` 改成 `npx prisma migrate deploy`。
3. 之後每次改 `schema.prisma`，都用 `npx prisma migrate dev --name <說明>` 產生新的 migration 並一併提交。

這個切換需要實際連線到資料庫執行指令產生 migration 檔案，本次沒有代為執行。
