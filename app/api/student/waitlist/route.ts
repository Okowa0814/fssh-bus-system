import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/server/db";
import { requireStudent, isResponse } from "@/server/auth";
import { ok, fail, ApiFailure } from "@/server/http";
import { getBookingWindow } from "@/server/settings";
import { isRouteFull } from "@/server/booking";
import type { StationDto } from "@/lib/types";

/**
 * POST /api/student/waitlist — 路線滿位後加入候補名單（僅限學生，名額不設上限）
 *
 * 同為尖峰路徑，無鎖並行：一人一筆候補由 @@unique([enrollmentYear, studentId]) 保證，撞 P2002 即代表重複。
 * 「是否已滿」以即時 count 判斷，僅作友善提示。
 */
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

    try {
        const entry = await prisma.$transaction(async (tx) => {
            const route = await tx.route.findUnique({ where: { id: routeId } });
            if (!route) {
                throw new ApiFailure(404, "查無此路線");
            }

            const bookingCount = await tx.booking.count({ where: { routeId } });
            if (!isRouteFull(bookingCount)) {
                throw new ApiFailure(409, "此路線尚未滿位，請直接登記座位");
            }

            const stations = route.stations as unknown as StationDto[];
            if (!stations.some((s) => s.name === station)) {
                throw new ApiFailure(400, "查無此站點");
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
                throw new ApiFailure(409, "你已在候補名單中");
            }

            return tx.waitlistEntry.create({
                data: { enrollmentYear: auth.enrollmentYear, studentId: auth.studentId, routeId, station },
                include: { route: { select: { id: true, name: true, stations: true } } },
            });
        });

        return ok(entry, 201);
    } catch (error) {
        if (error instanceof ApiFailure) {
            return fail(error.status, error.message);
        }
        // ── 唯一約束衝突：一人一筆候補的最終防線 ──
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            return fail(409, "你已在候補名單中");
        }
        console.error("候補登記失敗:", error);
        return fail(500, "候補登記失敗，請稍後再試");
    }
}
