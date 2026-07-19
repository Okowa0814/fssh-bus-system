import { requireAdmin, isResponse } from "@/server/auth";
import { getBookingWindow, setBookingWindow } from "@/server/settings";
import { ok, fail } from "@/server/http";

/** PUT /api/admin/booking-window — 設定登記開放時間 */
export async function PUT(request: Request) {
    const auth = await requireAdmin(request);
    if (isResponse(auth)) {
        return auth;
    }

    let body: { start?: unknown; end?: unknown };
    try {
        body = await request.json();
    } catch {
        return fail(400, "請求格式錯誤");
    }

    if (typeof body.start !== "string" || typeof body.end !== "string") {
        return fail(400, "請提供開始與結束時間");
    }

    const start = new Date(body.start);
    const end = new Date(body.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return fail(400, "時間格式錯誤");
    }
    if (start.getTime() >= end.getTime()) {
        return fail(400, "結束時間必須晚於開始時間");
    }

    await setBookingWindow(start.toISOString(), end.toISOString());
    return ok(await getBookingWindow());
}
