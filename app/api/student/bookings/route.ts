import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/server/db";
import { requireStudent, isResponse } from "@/server/auth";
import { ok, fail, ApiFailure } from "@/server/http";
import { acquireLock, releaseLock, seatLockKey } from "@/server/lock";
import { getBookingWindow } from "@/server/settings";
import { isValidSeat } from "@/lib/seat";
import { markRouteFullIfNeeded } from "@/server/booking";
import type { StationDto } from "@/lib/types";

const LOCK_TTL_MS = 5000;

/**
 * POST /api/student/bookings — 自由選位「零失誤」防超賣流程
 * 第一道防線：Redis 分散式鎖（同座位僅放行第 1 個請求，其餘回 423）
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

    // ── 第一道防線：Redis 記憶體鎖 ──
    // Redis 連線短暫抖動時重試一次，避免單次瞬斷就讓使用者看到系統忙碌
    const lockKey = seatLockKey(routeId, seatNumber);
    let lockToken: string | null;
    try {
        lockToken = await acquireLock(lockKey, LOCK_TTL_MS);
    } catch {
        try {
            await new Promise((resolve) => setTimeout(resolve, 80));
            lockToken = await acquireLock(lockKey, LOCK_TTL_MS);
        } catch (error) {
            console.error("取得座位鎖失敗:", error);
            return fail(503, "系統忙碌中，請稍後再試");
        }
    }
    if (!lockToken) {
        return fail(423, "座位選取中／已被選取，請改選其他座位");
    }

    try {
        // ── 第二道防線：資料庫交易內雙重檢查 ──
        const booking = await prisma.$transaction(async (tx) => {
            const route = await tx.route.findUnique({ where: { id: routeId } });
            if (!route) {
                throw new ApiFailure(404, "查無此路線");
            }

            const stations = route.stations as unknown as StationDto[];
            if (!stations.some((s) => s.name === station)) {
                throw new ApiFailure(400, "查無此站點");
            }

            if (route.isFull) {
                throw new ApiFailure(409, "此路線座位已滿，請改用候補登記");
            }

            const mine = await tx.booking.findFirst({
                where: { studentId: auth.studentId },
            });
            if (mine) {
                throw new ApiFailure(409, "你已登記過座位，請先於身份頁取消原登記");
            }

            const waitlisted = await tx.waitlistEntry.findFirst({
                where: { studentId: auth.studentId },
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
                data: { studentId: auth.studentId, routeId, seatNumber, station },
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
            return fail(409, "此座位剛被其他同學登記，請改選其他座位");
        }
        console.error("劃位失敗:", error);
        return fail(500, "劃位失敗，請稍後再試");
    } finally {
        // ── 解鎖釋放：無論成功或失敗都釋放座位操作權 ──
        await releaseLock(lockKey, lockToken);
    }
}

const bookingInclude = {
    route: {
        select: { id: true, name: true, stations: true },
    },
} satisfies Prisma.BookingInclude;
