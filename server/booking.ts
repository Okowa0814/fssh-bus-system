import "server-only";
import type { Prisma } from "@/lib/generated/prisma/client";
import { TOTAL_SEATS } from "@/lib/seat";

/**
 * 座位滿位（等於 TOTAL_SEATS）時把 route.isFull 設為 true。
 * 單向旗標：這裡是全專案唯一會把 isFull 寫為 true 的地方，沒有任何路徑會把它改回 false。
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

/**
 * 刪除一筆登記；若該路線已滿位，讓候補名單最舊的一筆直接遞補到剛釋出的座位。
 * 路線滿位是單向旗標，因此這裡永遠不會把 isFull 改回 false —— 沒有候補者時座位就單純空著。
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

    const next = await tx.waitlistEntry.findFirst({
        where: { routeId: booking.routeId },
        orderBy: { createdAt: "asc" },
    });
    if (!next) {
        return;
    }

    await tx.booking.create({
        data: {
            studentId: next.studentId,
            routeId: booking.routeId,
            seatNumber: booking.seatNumber,
            station: next.station,
        },
    });
    await tx.waitlistEntry.delete({ where: { id: next.id } });
}
