// k6 壓測腳本：最多 1000 位學生搶位
//
// 每個 VU = 一位學生（用 tokens.json 的第 N 個 token），只跑一輪完整流程：
//   載入座位圖 → 隨機挑空位 POST 登記 → 若被搶（409）重選，最多 MAX_ATTEMPTS 次 → 路線滿了就改候補
//
// 用 Docker 執行（在專案根目錄；預覽環境直接打 localhost:3000，不經 nginx，所以不會被 rate limit 擋）：
//   docker run --rm -i --network host -v "$PWD/loadtest:/work" \
//       -e BASE_URL=http://localhost:3000 \
//       grafana/k6 run /work/k6-booking.js
//
// 可調參數（用 -e 傳入）：
//   BASE_URL        目標網址，預設 http://localhost:3000
//   VUS             同時人數，預設 200（不得超過 tokens.json 內的 token 數）
//   MODE            single＝全部人搶同一條路線（隨機座位）；sameseat＝全部人搶同一路線的同一個座位（SEAT，預設 1）；
//                   spread＝平均分散到所有路線；realistic＝60% 擠熱門路線、其餘分散，預設 single
//   SEAT            MODE=sameseat 時第一次指定的座位號碼，預設 1
//   ROUTE_ID        MODE=single 時指定路線 id；不指定則用第一條路線
//   SPREAD_SECONDS  每個人在 0~N 秒內隨機時間點才開始，0＝同一瞬間全部衝進來（最嚴苛），預設 0
//   MAX_ATTEMPTS    座位被搶時最多重選幾次，預設 3
import http from "k6/http";
import { check, sleep } from "k6";
import { Counter } from "k6/metrics";
import { SharedArray } from "k6/data";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const VUS = Number(__ENV.VUS || 200);
const MODE = __ENV.MODE || "single";
const ROUTE_ID = __ENV.ROUTE_ID ? Number(__ENV.ROUTE_ID) : null;
const SPREAD_SECONDS = Number(__ENV.SPREAD_SECONDS || 0);
const MAX_ATTEMPTS = Number(__ENV.MAX_ATTEMPTS || 3);
const SEAT = Number(__ENV.SEAT || 1);
const TOTAL_SEATS = 42;

const tokens = new SharedArray("tokens", () => JSON.parse(open("./tokens.json")));

// 結果計數：用來對照資料庫最終狀態
const bookingOk = new Counter("booking_ok"); // 登記成功 (201)
const seatConflict = new Counter("booking_seat_conflict"); // 座位被搶 (409)，預期內
const waitlisted = new Counter("waitlist_ok"); // 候補成功 (201)
const gaveUp = new Counter("gave_up"); // 重試用完仍沒搶到
const unexpected = new Counter("unexpected_status"); // 非 200/201/409，例如 429 / 500，應為 0

// 200/201/409 視為預期，其餘（429、500…）才算 http_req_failed
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 201 }, 409));

export const options = {
    scenarios: {
        students: {
            executor: "per-vu-iterations",
            vus: VUS,
            iterations: 1,
            maxDuration: "5m",
        },
    },
    thresholds: {
        http_req_duration: ["p(95)<1000"], // 95% 的請求在 1 秒內
        http_req_failed: ["rate<0.01"], // 非預期錯誤 < 1%
        unexpected_status: ["count==0"], // 不應出現 429 / 500
    },
};

// 取得路線與站點（公開 API，不需登入）
export function setup() {
    if (tokens.length < VUS) {
        throw new Error(`tokens.json 只有 ${tokens.length} 個 token，少於 VUS=${VUS}`);
    }
    const res = http.get(`${BASE_URL}/api/public/routes`);
    if (res.status !== 200) {
        throw new Error(`取得路線失敗：HTTP ${res.status}`);
    }
    const routes = res.json().filter((r) => r.stations.length > 0);
    if (routes.length === 0) {
        throw new Error("資料庫沒有任何路線，請先建立路線（scripts/seed-routes.sql）");
    }
    return { routes };
}

function pickRoute(routes, vu) {
    if (MODE === "spread") {
        return routes[(vu - 1) % routes.length];
    }
    if (MODE === "realistic") {
        // 60% 的人擠進前 3 條熱門路線，其餘 40% 均勻分散到所有路線
        const hot = routes.slice(0, Math.min(3, routes.length));
        return Math.random() < 0.6 ? randomItem(hot) : randomItem(routes);
    }
    return ROUTE_ID ? routes.find((r) => r.id === ROUTE_ID) || routes[0] : routes[0];
}

function randomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
}

export default function (data) {
    const token = tokens[__VU - 1];
    const route = pickRoute(data.routes, __VU);
    const params = (name) => ({
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        tags: { name },
    });

    // 模擬大家不是同一毫秒點下去
    if (SPREAD_SECONDS > 0) {
        sleep(Math.random() * SPREAD_SECONDS);
    }

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        // 1. 看座位圖
        const seatsRes = http.get(`${BASE_URL}/api/student/routes/${route.id}/seats`, params("GET seats"));
        if (!check(seatsRes, { "seats 200": (r) => r.status === 200 })) {
            unexpected.add(1);
            return;
        }
        const taken = new Set(seatsRes.json().takenSeats);
        const free = [];
        for (let s = 1; s <= TOTAL_SEATS; s++) {
            if (!taken.has(s)) {
                free.push(s);
            }
        }

        const station = randomItem(route.stations).name;

        // 2. 滿位 → 直接候補
        if (free.length === 0) {
            const wRes = http.post(
                `${BASE_URL}/api/student/waitlist`,
                JSON.stringify({ routeId: route.id, station }),
                params("POST waitlist"),
            );
            if (wRes.status === 201) {
                waitlisted.add(1);
            } else if (wRes.status !== 409) {
                unexpected.add(1);
            }
            return;
        }

        // 3. 隨機挑一個空位登記（隨機而非固定挑最小號，才會模擬出真實的撞位情形）
        // sameseat：第一次大家都指定同一個座位（極端撞位）；被搶後的重試才改選隨機空位
        const seatNumber = MODE === "sameseat" && attempt === 1 ? SEAT : randomItem(free);
        const bRes = http.post(
            `${BASE_URL}/api/student/bookings`,
            JSON.stringify({ routeId: route.id, seatNumber, station }),
            params("POST booking"),
        );

        if (bRes.status === 201) {
            bookingOk.add(1);
            return;
        }
        if (bRes.status === 409) {
            const message = String(bRes.json("message") || "");
            if (message.includes("已登記過")) {
                return; // 已有訂位，不用再試
            }
            seatConflict.add(1); // 座位被搶或剛好滿位，下一輪重新看座位圖
            sleep(0.2 + Math.random() * 0.3);
            continue;
        }
        unexpected.add(1);
        return;
    }
    gaveUp.add(1);
}
