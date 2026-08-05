import "server-only";

export const MAX_WAITLIST = 10;

export function waitlistLockKey(routeId: number): string {
    return `lock:waitlist:${routeId}`;
}
