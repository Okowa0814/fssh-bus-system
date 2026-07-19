import "server-only";
import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200): NextResponse {
    return NextResponse.json(data as object, { status });
}

export function fail(status: number, message: string): NextResponse {
    return NextResponse.json({ message }, { status });
}

/** 業務流程中可直接丟出的錯誤，由路由層轉成對應的 HTTP 回應 */
export class ApiFailure extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}
