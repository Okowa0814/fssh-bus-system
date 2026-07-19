import "server-only";
import { prisma } from "./db";

export interface BookingWindow {
    start: string | null;
    end: string | null;
    open: boolean;
}

export async function getBookingWindow(): Promise<BookingWindow> {
    const rows = await prisma.setting.findMany({
        where: { key: { in: ["bookingStart", "bookingEnd"] } },
    });
    const start = rows.find((row) => row.key === "bookingStart")?.value ?? null;
    const end = rows.find((row) => row.key === "bookingEnd")?.value ?? null;

    const now = Date.now();
    const open =
        start !== null &&
        end !== null &&
        now >= new Date(start).getTime() &&
        now <= new Date(end).getTime();

    return { start, end, open };
}

export async function setBookingWindow(start: string, end: string): Promise<void> {
    await prisma.$transaction([
        prisma.setting.upsert({
            where: { key: "bookingStart" },
            update: { value: start },
            create: { key: "bookingStart", value: start },
        }),
        prisma.setting.upsert({
            where: { key: "bookingEnd" },
            update: { value: end },
            create: { key: "bookingEnd", value: end },
        }),
    ]);
}
