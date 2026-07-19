import { requireStudent, isResponse } from "@/server/auth";
import { getBookingWindow } from "@/server/settings";
import { ok } from "@/server/http";

/** GET /api/student/booking-window — 登記開放時間與目前是否開放（僅限學生；管理端見 /api/admin/booking-window） */
export async function GET(request: Request) {
    const auth = await requireStudent(request);
    if (isResponse(auth)) {
        return auth;
    }
    return ok(await getBookingWindow());
}
