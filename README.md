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
- 路線滿位後自動轉為候補登記（免選座位，最多 10 人），可查看候補排名或自行取消候補
- 查看所有路線與停靠站資訊、發車時間
- 使用說明頁面（Help Guide）

### 🛠️ 管理端
- 檢視所有登記紀錄，支援依路線 / 關鍵字篩選；每筆登記可透過「⋮」選單標記已繳清或刪除
- 使用者管理：檢視所有使用者、修改姓名
- 設定登記開放的起訖時間
- 路線管理：新增 / 編輯 / 啟用停用路線與停靠站，滿位路線會顯示「已滿」標籤
- 權限隔離：管理員帳號無法使用學生端登記功能，反之學生也無法碰管理端 API（未授權存取一律回傳 404，不洩漏端點是否存在）

### 🔒 核心防搶票機制
- 同一路線同一座位在資料庫層以 `@@unique([routeId, seatNumber])` 強制唯一，就算應用層邏輯有漏洞也不會超賣
- 劃位前先用 Redis 分散式鎖（`SET NX PX`）搶鎖，避免同一秒大量請求打到資料庫造成 race condition
- 取消登記直接刪除該筆資料列；路線滿位後座位釋出時，候補名單中最舊的一筆會在同一個交易內自動遞補到該座位（`server/booking.ts` 的 `cancelBookingAndPromote`），並用路線層級的 Redis 鎖序列化候補加入與遞補，避免候補名額超收
- 路線滿位（`Route.isFull`）是單向旗標，由系統在座位滿 42 位時自動設定，之後一般登記入口永久關閉，只能透過候補遞補填補釋出的座位

---

## 🛠️ 技術棧

| 分類 | 技術 |
|---|---|
| 前端框架 | [Next.js 16](https://nextjs.org/)（App Router）+ React 19 + TypeScript |
| 樣式 | Tailwind CSS 4 |
| 後端 | Next.js Route Handlers（`app/api/**/route.ts`） |
| 資料庫 | PostgreSQL 18 + [Prisma ORM 7](https://www.prisma.io/) |
| 快取 / 分散式鎖 | Redis 7（ioredis） |
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
    ├──▶ PostgreSQL（使用者 / 路線 / 登記紀錄 / 設定）
    │
    └──▶ Redis（座位搶鎖 SET NX PX）
```

### 🔑 登入流程
1. 前端取得 Google 憑證（`GoogleLoginButton`），或開發模式使用「測試登入」（`/api/auth/dev-login`）略過真實 Google 驗證
2. 後端 `/api/auth/google` 驗證憑證網域是否為 `ALLOWED_EMAIL_DOMAIN`，並以學號 Upsert `User` 資料
3. 若 email 在 `ADMIN_EMAILS` 名單中，自動標記為管理員
4. 簽發 30 分鐘效期的 JWT，前端存於 `localStorage`，之後每次請求帶 `Authorization: Bearer <token>`
5. `server/auth.ts` 的 `requireStudent` / `requireAdmin` 在 API 端做權限把關；管理端 API 對非管理員一律回 404

### 💺 劃位流程
1. 學生送出「路線 + 站點 + 座位」
2. `server/lock.ts` 以 `lock:seat:{routeId}:{seatNumber}` 為 key 嘗試 `SET NX PX` 取鎖，同一秒只有一個請求能拿到鎖
3. 拿到鎖後才查詢 / 寫入 `Booking`，資料庫的 `@@unique([routeId, seatNumber])` 是最終防線
4. 無論成功或失敗都會釋放鎖（`releaseLock`），鎖也有 TTL 保底自動過期

---

## 📂 目錄結構

```
fssh-bus/
├── app/
│   ├── (student)/           # 學生端頁面（首頁、登記、路線、說明）
│   ├── admin/                # 管理端頁面（登記管理、路線管理）
│   ├── login/                 # 登入頁
│   └── api/
│       ├── auth/              # Google 登入、開發測試登入
│       ├── public/            # 免登入可查詢的公開資訊（路線、統計）
│       ├── student/           # 學生端 API（登記、座位、我的資料）
│       └── admin/              # 管理端 API（登記管理、路線管理、開放時間）
├── components/                # UI 元件（SeatMap、Ticket、Stepper 等）
├── hooks/                      # React hooks（useAuth）
├── lib/                        # 型別定義、座位邏輯、Prisma 產生的 client
├── server/                     # 伺服端專用模組（auth、db、redis、lock、google…）
├── services/                   # 前端呼叫 API 的封裝（services/api.ts）
├── schema.prisma               # 資料庫 Schema
├── nginx.conf                  # Nginx 主設定
├── Dockerfile                  # 多階段建置（dev / builder / migrate / runner）
├── docker-compose.yml           # 正式環境（nginx + nextjs + db + redis + certbot）
├── docker-compose.dev.yml       # 開發環境（熱重載、掛載原始碼）
└── scripts/
    ├── dev.sh                   # 一鍵啟動開發環境
    └── deploy.sh                 # 一鍵部署正式環境
```

---

## 🗄️ 資料庫結構

| 資料表 | 說明 |
|---|---|
| `User` | 使用者，以學號 `studentId` 為主鍵，Google 登入時自動 Upsert |
| `Route` | 路線（一條路線即一台車），`stations` 為 JSON 陣列 `[{ name, arriveAt, monthlyPrice }]`；`isFull` 為座位滿位後系統自動設定的單向旗標 |
| `Booking` | 登記紀錄，`(routeId, seatNumber)` 唯一，取消即刪除該筆資料 |
| `WaitlistEntry` | 候補名單，路線滿位後才開放登記，最多 10 人，依 `createdAt` 排序、座位釋出時最舊的一筆自動遞補 |
| `Setting` | Key-Value 系統設定，用於存放 `bookingStart` / `bookingEnd` 登記開放時間 |

---

## 🔐 環境變數

`scripts/dev.sh` / `scripts/deploy.sh` 會在找不到 `.env` 時自動幫你複製並產生隨機密碼 / 密鑰：


| 變數 | 說明 |
|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | PostgreSQL 帳密與資料庫名稱 |
| `DATABASE_URL` | Prisma 連線字串（容器內用服務名稱 `db`，本機開發改 `localhost`） |
| `REDIS_URL` | Redis 連線字串 |
| `JWT_SECRET` | JWT 簽章密鑰，30 分鐘過期，請用 `openssl rand -base64 48` 產生 |
| `GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth 用戶端 ID |
| `ALLOWED_EMAIL_DOMAIN` / `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN` | 僅允許此網域的 Google 帳號登入 |
| `ADMIN_EMAILS` | 管理員信箱清單（逗號分隔），登入時自動賦予管理員權限 |

---

## 🚀 快速啟動

### 方法一：Docker 開發環境（推薦）

一鍵啟動 `db + redis + nextjs`（dev target，熱重載、掛載原始碼、啟動時自動 `prisma db push`）：

```bash
./scripts/dev.sh
```

首次執行會自動建立 `.env` 並隨機產生 `POSTGRES_PASSWORD` / `JWT_SECRET`。登入頁有「測試登入」按鈕可略過 Google OAuth 直接測試；若要測試真實 Google 登入，需自行到 GCP Console 建立 OAuth 用戶端並填入 `GOOGLE_CLIENT_ID` / `NEXT_PUBLIC_GOOGLE_CLIENT_ID`。

啟動後可於 <http://localhost:3000> 開啟。

### 方法二：本機直接執行（不透過 Docker 跑 Next.js）

需要自行準備可連線的 PostgreSQL 與 Redis（例如用 `docker compose -f docker-compose.dev.yml up db redis -d` 只啟動這兩個服務）。

```bash
npm install          # 安裝套件（會自動執行 prisma generate）
npm run db:push       # 同步資料庫結構（prisma db push）
npm run dev            # 啟動開發伺服器
```

### 🏭 正式環境部署

```bash
./scripts/deploy.sh
```

流程：`nginx`（含 SSL / rate limit）→ `migrate`（一次性同步 DB schema）→ `nextjs`（production build）→ `db` / `redis`。首次執行同樣會自動建立 `.env`，但**務必手動編輯**填入正式的 `GOOGLE_CLIENT_ID`、`ALLOWED_EMAIL_DOMAIN`、`ADMIN_EMAILS` 等變數後再重新執行部署。

> ⚠️ SSL 憑證簽發 / nginx rate limit 等細節請參考 `nginx.conf` 與 `docker-compose.yml` 中的 `certbot` 服務設定。

---

## 📡 API 路由總覽

| 路徑 | 說明 |
|---|---|
| `POST /api/auth/google` | Google 登入，驗證網域並簽發 JWT |
| `POST /api/auth/dev-login` | 開發用測試登入（略過 Google 驗證） |
| `GET /api/public/routes` | 公開查詢所有路線（免登入），含 `isFull` 滿位狀態 |
| `GET /api/public/stats` | 公開統計資訊（路線數、剩餘座位等） |
| `GET /api/student/me` | 取得目前登入學生資料、有效登記與候補紀錄 |
| `GET /api/student/booking-window` | 查詢登記開放時間 |
| `POST /api/student/bookings` | 建立我的登記（路線已滿位時會被拒絕，需改走候補） |
| `DELETE /api/student/bookings/[id]` | 取消單筆登記（若路線已滿位，候補第一位會自動遞補） |
| `GET /api/student/routes/[id]/seats` | 查詢某路線座位配置狀態 |
| `POST /api/student/waitlist` | 加入候補名單（路線需已滿位，最多 10 人） |
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
