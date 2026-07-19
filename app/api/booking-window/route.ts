import { requireAuth, isResponse } from "@/server/auth";
import { getBookingWindow } from "@/server/settings";
import { ok } from "@/server/http";

/** GET /api/booking-window — 登記開放時間與目前是否開放 */
export async function GET(request: Request) {
    const auth = await requireAuth(request);
    if (isResponse(auth)) {
        return auth;
    }
    return ok(await getBookingWindow());
}
