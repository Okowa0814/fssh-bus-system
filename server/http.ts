import "server-only";
import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200): NextResponse {
    return NextResponse.json(data as object, { status });
}

export function fail(status: number, message: string): NextResponse {
    return NextResponse.json({ message }, { status });
}

// Custom error class for API failures, allowing for structured error handling
export class ApiFailure extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}
