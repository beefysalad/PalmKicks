import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api-response";

/**
 * Base class for errors whose message is safe to show to API clients.
 * Subclasses carry the HTTP status they map to.
 */
export class DomainError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "DomainError";
    this.status = status;
  }
}

function isZodError(error: unknown): error is z.ZodError {
  return (
    error instanceof z.ZodError ||
    (error instanceof Error &&
      error.name === "ZodError" &&
      Array.isArray((error as { issues?: unknown }).issues))
  );
}

function prismaCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    /^P\d{4}$/.test((error as { code: string }).code)
  ) {
    return (error as { code: string }).code;
  }
  return null;
}

/**
 * Maps a thrown error to a safe response. Only fixed strings, validation
 * messages and DomainError messages ever reach the client; anything else is
 * logged server-side and answered with `fallback`.
 */
export function handleRouteError(
  error: unknown,
  fallback: string,
): NextResponse {
  if (isZodError(error)) {
    return apiError(400, error.issues[0]?.message || "Invalid request");
  }
  if (error instanceof DomainError) {
    return apiError(error.status, error.message);
  }
  switch (prismaCode(error)) {
    case "P2025":
      return apiError(404, "Not found");
    case "P2002":
      return apiError(409, "Already exists");
    case "P2003":
      return apiError(409, "Resource is in use");
  }
  console.error(fallback, error);
  return apiError(500, fallback);
}
