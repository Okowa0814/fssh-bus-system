import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/server/db";
import { requireStudent, isResponse } from "@/server/auth";
import { ok, fail, ApiFailure } from "@/server/http";
import { acquireLockResilient, releaseLock, routeLockKey, studentLockKey } from "@/server/lock";
import { getBookingWindow } from "@/server/settings";
import { isValidSeat } from "@/lib/seat";
import { markRouteFullIfNeeded } from "@/server/booking";
import type { StationDto } from "@/lib/types";

const LOCK_TTL_MS = 5000;

/**
 * POST /api/student/bookings — 自由選位「零失誤」防超賣流程
 * 第一道防線：Redis 分散式鎖，由外而內依序取得——
 *   學生鎖（序列化同一學生的登記／候補寫入，避免併發請求繞過「一人一位」限制）
 *   → 路線鎖（序列化同一路線的所有登記寫入，確保座位計數／isFull 判斷在併發下仍然正確）
 * 第二道防線：PostgreSQL 交易內雙重檢查
 * 第三道防線：@@unique([routeId, seatNumber]) 唯一約束
 */
export async function POST(request: Request) {
    const auth = await requireStudent(request);
    if (isResponse(auth)) {
        return auth;
    }

    let body: { routeId?: unknown; seatNumber?: unknown; station?: unknown };
    try {
        body = await request.json();
    } catch {
        return fail(400, "請求格式錯誤");
    }

    const routeId = Number(body.routeId);
    const seatNumber = Number(body.seatNumber);
    const station = typeof body.station === "string" ? body.station : "";
    if (!Number.isInteger(routeId) || !isValidSeat(seatNumber) || !station) {
        return fail(400, "路線、座位或站點格式錯誤");
    }

    const window = await getBookingWindow();
    if (!window.open) {
        return fail(403, "目前不在登記時間");
    }

    // ── 第一道防線：Redis 分散式鎖 ──
    const studentLock = studentLockKey(auth.enrollmentYear, auth.studentId);
    const routeLock = routeLockKey(routeId);

    let studentToken: string | null = null;
    let routeToken: string | null = null;

    try {
        try {
            studentToken = await acquireLockResilient(studentLock, LOCK_TTL_MS);
        } catch (error) {
            console.error("取得學生鎖失敗:", error);
            return fail(503, "系統忙碌中，請稍後再試");
        }
        if (!studentToken) {
            return fail(423, "你有其他登記或候補要求正在處理中，請稍後再試");
        }

        try {
            routeToken = await acquireLockResilient(routeLock, LOCK_TTL_MS);
        } catch (error) {
            console.error("取得路線鎖失敗:", error);
            return fail(503, "系統忙碌中，請稍後再試");
        }
        if (!routeToken) {
            return fail(423, "座位操作中，請稍後再試");
        }

        // ── 第二道防線：資料庫交易內雙重檢查 ──
        const booking = await prisma.$transaction(async (tx) => {
            const route = await tx.route.findUnique({ where: { id: routeId } });
            if (!route) {
                throw new ApiFailure(404, "查無此路線");
            }

            const stations = route.stations as unknown as StationDto[];
            const boardingStation = stations.find((s) => s.name === station);
            if (!boardingStation) {
                throw new ApiFailure(400, "查無此站點");
            }

            if (route.isFull) {
                throw new ApiFailure(409, "此路線座位已滿，請改用候補登記");
            }

            const mine = await tx.booking.findFirst({
                where: { enrollmentYear: auth.enrollmentYear, studentId: auth.studentId },
            });
            if (mine) {
                throw new ApiFailure(409, "你已登記過座位，請先於身份頁取消原登記");
            }

            const waitlisted = await tx.waitlistEntry.findFirst({
                where: { enrollmentYear: auth.enrollmentYear, studentId: auth.studentId },
            });
            if (waitlisted) {
                throw new ApiFailure(409, "你已在候補名單中，請先取消候補後再登記");
            }

            const existing = await tx.booking.findUnique({
                where: { routeId_seatNumber: { routeId, seatNumber } },
            });
            if (existing) {
                throw new ApiFailure(409, "此座位剛被其他同學登記，請改選其他座位");
            }

            const created = await tx.booking.create({
                data: {
                    enrollmentYear: auth.enrollmentYear,
                    studentId: auth.studentId,
                    routeId,
                    seatNumber,
                    station,
                    monthlyPrice: boardingStation.monthlyPrice,
                    arriveAt: boardingStation.arriveAt,
                },
                include: bookingInclude,
            });
            await markRouteFullIfNeeded(tx, routeId);
            return created;
        });

        return ok(booking, 201);
    } catch (error) {
        if (error instanceof ApiFailure) {
            return fail(error.status, error.message);
        }
        // ── 第三道防線：唯一約束衝突（理論上不會發生，發生也絕不超賣） ──
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : "";
            if (target.includes("enrollmentYear") && target.includes("studentId")) {
                return fail(409, "你已登記過座位，請先於身份頁取消原登記");
            }
            return fail(409, "此座位剛被其他同學登記，請改選其他座位");
        }
        console.error("劃位失敗:", error);
        return fail(500, "劃位失敗，請稍後再試");
    } finally {
        // ── 解鎖釋放：無論成功或失敗都要釋放，且順序與取得時相反 ──
        if (routeToken) {
            await releaseLock(routeLock, routeToken);
        }
        if (studentToken) {
            await releaseLock(studentLock, studentToken);
        }
    }
}

const bookingInclude = {
    route: {
        select: { id: true, name: true, stations: true },
    },
} satisfies Prisma.BookingInclude;
