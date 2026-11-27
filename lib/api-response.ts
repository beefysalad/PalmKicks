import { NextResponse } from "next/server";

export function apiError(status: number, message: string): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function apiOk<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}
