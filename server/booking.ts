import "server-only";
import { Prisma } from "@/lib/generated/prisma/client";
import { TOTAL_SEATS } from "@/lib/seat";
import type { StationDto } from "@/lib/types";

/**
 * 路線是否滿位：一律以即時 count(bookings) >= TOTAL_SEATS 判斷，不再儲存 isFull 旗標。
 * 這樣就不可能出現「實際 42/42 但旗標還是沒滿」的誤判。
 */
export function isRouteFull(bookingCount: number): boolean {
    return bookingCount >= TOTAL_SEATS;
}

function findStation(stations: unknown, name: string): StationDto | undefined {
    return (stations as StationDto[]).find((s) => s.name === name);
}

/**
 * 刪除一筆登記；若候補名單還有人，讓最舊的一筆直接遞補到剛釋出的座位。
 * 能出現在候補名單代表當時該路線已滿，所以有候補＝有人該遞補，不需要再讀任何滿位旗標。
 *
 * 呼叫端必須在同一個交易內、於本函式之前呼叫 lockRoute(tx, routeId) 取得路線 advisory 鎖，
 * 以序列化同路線的取消/遞補與候補退出，避免兩筆同時取消搶到同一位候補者、或退出候補時被重複遞補。
 *
 * 遞補建立訂位若撞上 @@unique([enrollmentYear, studentId])（該候補者已透過其他管道持有訂位，僅極端併發下發生），
 * 視為這筆候補已失效、移除後改遞補下一位，而不是讓整個取消交易失敗。
 */
export async function cancelBookingAndPromote(
    tx: Prisma.TransactionClient,
    booking: { id: number; routeId: number; seatNumber: number },
): Promise<void> {
    await tx.booking.delete({ where: { id: booking.id } });

    const route = await tx.route.findUnique({ where: { id: booking.routeId } });
    if (!route) {
        return;
    }

    for (;;) {
        const next = await tx.waitlistEntry.findFirst({
            where: { routeId: booking.routeId },
            orderBy: { createdAt: "asc" },
        });
        if (!next) {
            return;
        }

        const boardingStation = findStation(route.stations, next.station);
        try {
            await tx.booking.create({
                data: {
                    enrollmentYear: next.enrollmentYear,
                    studentId: next.studentId,
                    routeId: booking.routeId,
                    seatNumber: booking.seatNumber,
                    station: next.station,
                    monthlyPrice: boardingStation?.monthlyPrice ?? 0,
                    arriveAt: boardingStation?.arriveAt ?? "",
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                await tx.waitlistEntry.delete({ where: { id: next.id } });
                continue;
            }
            throw error;
        }
        await tx.waitlistEntry.delete({ where: { id: next.id } });
        return;
    }
}
