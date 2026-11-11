import { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/server/db";
import { requireStudent, isResponse } from "@/server/auth";
import { ok, fail, ApiFailure } from "@/server/http";
import { getBookingWindow } from "@/server/settings";
import { isValidSeat } from "@/lib/seat";
import { isRouteFull } from "@/server/booking";
import type { StationDto } from "@/lib/types";

/**
 * POST /api/student/bookings — 自由選位防超賣流程（無鎖並行）
 *
 * 這是尖峰「驚群」路徑，刻意不加路線鎖／學生鎖，讓不同座位的登記並行，尖峰不卡；
 * 正確性完全由 DB 唯一約束把關：
 *   - @@unique([routeId, seatNumber])：同座位全庫只能一筆 → 不可能超賣
 *   - @@unique([enrollmentYear, studentId])：一人只能一筆有效登記 → 不可能一人多位
 * 交易內的滿位／重複檢查只是為了回傳友善訊息，真正的保證是下方 catch 對 P2002 的處理。
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

    try {
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

            // 滿位／重複檢查：僅用於回傳友善訊息，最終保證在 catch 的 P2002
            const bookingCount = await tx.booking.count({ where: { routeId } });
            if (isRouteFull(bookingCount)) {
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

            // 直接 INSERT，由唯一約束仲裁併發：同座位撞 P2002、一人多位撞 P2002
            return tx.booking.create({
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
        });

        return ok(booking, 201);
    } catch (error) {
        if (error instanceof ApiFailure) {
            return fail(error.status, error.message);
        }
        // ── 唯一約束衝突：最終防線，發生也絕不超賣 ──
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            const target = Array.isArray(error.meta?.target) ? error.meta.target.join(",") : "";
            if (target.includes("enrollmentYear") && target.includes("studentId")) {
                return fail(409, "你已登記過座位，請先於身份頁取消原登記");
            }
            return fail(409, "此座位剛被其他同學登記，請改選其他座位");
        }
        console.error("劃位失敗:", error);
        return fail(500, "劃位失敗，請稍後再試");
    }
}

const bookingInclude = {
    route: {
        select: { id: true, name: true, stations: true },
    },
} satisfies Prisma.BookingInclude;
