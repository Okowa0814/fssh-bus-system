import { prisma } from "@/server/db";
import { requireStudent, isResponse } from "@/server/auth";
import { ok, fail, ApiFailure } from "@/server/http";
import { acquireLock, releaseLock } from "@/server/lock";
import { getBookingWindow } from "@/server/settings";
import { waitlistLockKey, MAX_WAITLIST } from "@/server/waitlist";
import type { StationDto } from "@/lib/types";

const LOCK_TTL_MS = 5000;

/** POST /api/student/waitlist — 路線滿位後加入候補名單（僅限學生，最多 10 人） */
export async function POST(request: Request) {
    const auth = await requireStudent(request);
    if (isResponse(auth)) {
        return auth;
    }

    let body: { routeId?: unknown; station?: unknown };
    try {
        body = await request.json();
    } catch {
        return fail(400, "請求格式錯誤");
    }

    const routeId = Number(body.routeId);
    const station = typeof body.station === "string" ? body.station : "";
    if (!Number.isInteger(routeId) || !station) {
        return fail(400, "路線或站點格式錯誤");
    }

    const window = await getBookingWindow();
    if (!window.open) {
        return fail(403, "目前不在登記時間");
    }

    // 用路線層級的鎖序列化候補加入與座位遞補，避免候補名額超收
    const lockKey = waitlistLockKey(routeId);
    const lockToken = await acquireLock(lockKey, LOCK_TTL_MS);
    if (!lockToken) {
        return fail(423, "候補名單操作中，請稍後再試");
    }

    try {
        const entry = await prisma.$transaction(async (tx) => {
            const route = await tx.route.findUnique({ where: { id: routeId } });
            if (!route) {
                throw new ApiFailure(404, "查無此路線");
            }
            if (!route.isFull) {
                throw new ApiFailure(409, "此路線尚未滿位，請直接登記座位");
            }

            const stations = route.stations as unknown as StationDto[];
            if (!stations.some((s) => s.name === station)) {
                throw new ApiFailure(400, "查無此站點");
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
                throw new ApiFailure(409, "你已在候補名單中");
            }

            const count = await tx.waitlistEntry.count({ where: { routeId } });
            if (count >= MAX_WAITLIST) {
                throw new ApiFailure(409, "候補名單已額滿");
            }

            return tx.waitlistEntry.create({
                data: { studentId: auth.studentId, routeId, station },
                include: { route: { select: { id: true, name: true, stations: true } } },
            });
        });

        return ok(entry, 201);
    } catch (error) {
        if (error instanceof ApiFailure) {
            return fail(error.status, error.message);
        }
        console.error("候補登記失敗:", error);
        return fail(500, "候補登記失敗，請稍後再試");
    } finally {
        await releaseLock(lockKey, lockToken);
    }
}
