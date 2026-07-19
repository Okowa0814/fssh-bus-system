import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import { requireStudent, isResponse } from "@/server/auth";
import { ok, fail, ApiFailure } from "@/server/http";
import { acquireLock, releaseLock, seatLockKey } from "@/server/lock";
import { getBookingWindow } from "@/server/settings";
import { isValidSeat } from "@/lib/seat";

const LOCK_TTL_MS = 5000;

/**
 * POST /api/student/bookings — 自由選位「零失誤」防超賣流程
 * 第一道防線：Redis 分散式鎖（同座位僅放行第 1 個請求，其餘回 423）
 * 第二道防線：PostgreSQL 交易內雙重檢查
 * 第三道防線：@@unique([scheduleId, seatNumber]) 唯一約束
 */
export async function POST(request: Request) {
    const auth = await requireStudent(request);
    if (isResponse(auth)) {
        return auth;
    }

    let body: { scheduleId?: unknown; seatNumber?: unknown };
    try {
        body = await request.json();
    } catch {
        return fail(400, "請求格式錯誤");
    }

    const scheduleId = Number(body.scheduleId);
    const seatNumber = Number(body.seatNumber);
    if (!Number.isInteger(scheduleId) || !isValidSeat(seatNumber)) {
        return fail(400, "班次或座位號碼格式錯誤");
    }

    const window = await getBookingWindow();
    if (!window.open) {
        return fail(403, "目前不在登記時間");
    }

    // ── 第一道防線：Redis 記憶體鎖 ──
    const lockKey = seatLockKey(scheduleId, seatNumber);
    let lockToken: string | null;
    try {
        lockToken = await acquireLock(lockKey, LOCK_TTL_MS);
    } catch {
        return fail(503, "系統忙碌中，請稍後再試");
    }
    if (!lockToken) {
        return fail(423, "座位選取中／已被選取，請改選其他座位");
    }

    try {
        // ── 第二道防線：資料庫交易內雙重檢查 ──
        const booking = await prisma.$transaction(async (tx) => {
            const schedule = await tx.schedule.findUnique({
                where: { id: scheduleId },
                include: { route: { select: { enabled: true } } },
            });
            if (!schedule || !schedule.route.enabled) {
                throw new ApiFailure(404, "查無此班次或路線已停開");
            }

            const mine = await tx.booking.findFirst({
                where: { studentId: auth.studentId, status: "SUCCESS" },
            });
            if (mine) {
                throw new ApiFailure(409, "你已登記過座位，請先於身份頁取消原登記");
            }

            const existing = await tx.booking.findUnique({
                where: { scheduleId_seatNumber: { scheduleId, seatNumber } },
            });
            if (existing?.status === "SUCCESS") {
                throw new ApiFailure(409, "此座位剛被其他同學登記，請改選其他座位");
            }

            // 取消過的座位保留原列直接更新，唯一約束（第三道防線）恆成立
            if (existing) {
                return tx.booking.update({
                    where: { id: existing.id },
                    data: { studentId: auth.studentId, status: "SUCCESS" },
                    include: bookingInclude,
                });
            }
            return tx.booking.create({
                data: { studentId: auth.studentId, scheduleId, seatNumber },
                include: bookingInclude,
            });
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
    schedule: {
        select: {
            id: true,
            label: true,
            departAt: true,
            route: { select: { id: true, name: true } },
        },
    },
} satisfies Prisma.BookingInclude;
