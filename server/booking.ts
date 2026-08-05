import "server-only";
import { Prisma } from "@/lib/generated/prisma/client";
import { TOTAL_SEATS } from "@/lib/seat";
import type { StationDto } from "@/lib/types";

/**
 * 座位滿位（等於 TOTAL_SEATS）時把 route.isFull 設為 true。
 *
 * 呼叫端必須在整個交易期間持有 routeLockKey(routeId) 這把 Redis 鎖：
 * 若同路線有其他建立登記的交易同時在跑，這裡的 count() 在 PostgreSQL READ COMMITTED
 * 隔離層級下看不到對方尚未 commit 的 insert，可能兩邊都算出「還沒滿」而都不設定 isFull，
 * 即使資料庫實際上已經 42/42 滿座——因為 isFull 不會自動校正，只能靠取消登記時的
 * cancelBookingAndPromote 或下一次呼叫本函式時重新計算。
 */
export async function markRouteFullIfNeeded(
    tx: Prisma.TransactionClient,
    routeId: number,
): Promise<void> {
    const count = await tx.booking.count({ where: { routeId } });
    if (count >= TOTAL_SEATS) {
        await tx.route.update({ where: { id: routeId }, data: { isFull: true } });
    }
}

function findStation(stations: unknown, name: string): StationDto | undefined {
    return (stations as StationDto[]).find((s) => s.name === name);
}

/**
 * 刪除一筆登記；若該路線已滿位，讓候補名單最舊的一筆直接遞補到剛釋出的座位。
 * 候補名單為空時，代表座位已經空出但已無人排隊，把 isFull 重設為 false，
 * 否則一般登記入口會永久誤判「已滿」而卡死這個空位（座位容量損失）。
 *
 * 遞補建立訂位若撞上 @@unique([studentId])（該候補者已經透過其他管道持有訂位，
 * 只會在極端併發下發生），視為這筆候補已失效、移除後改遞補下一位，而不是讓整個取消交易失敗。
 */
export async function cancelBookingAndPromote(
    tx: Prisma.TransactionClient,
    booking: { id: number; routeId: number; seatNumber: number },
): Promise<void> {
    await tx.booking.delete({ where: { id: booking.id } });

    const route = await tx.route.findUnique({ where: { id: booking.routeId } });
    if (!route?.isFull) {
        return;
    }

    for (;;) {
        const next = await tx.waitlistEntry.findFirst({
            where: { routeId: booking.routeId },
            orderBy: { createdAt: "asc" },
        });
        if (!next) {
            await tx.route.update({ where: { id: booking.routeId }, data: { isFull: false } });
            return;
        }

        const boardingStation = findStation(route.stations, next.station);
        try {
            await tx.booking.create({
                data: {
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
