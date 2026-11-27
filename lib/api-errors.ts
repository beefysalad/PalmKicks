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

/** Thrown by parseJsonBody when the request body is not valid JSON. */
export class InvalidJsonError extends DomainError {
  constructor() {
    super("Invalid JSON body", 400);
    this.name = "InvalidJsonError";
  }
}

/**
 * Reads the request body as JSON. A malformed body throws InvalidJsonError,
 * which handleRouteError answers with 400 "Invalid JSON body" instead of 500.
 */
export async function parseJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new InvalidJsonError();
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

export interface HandleRouteErrorOptions {
  /**
   * false logs only the error's name for unexpected errors, for routes whose
   * errors may carry sensitive context (e.g. password changes).
   */
  logDetails?: boolean;
}

/**
 * Maps a thrown error to a safe response. Only fixed strings, validation
 * messages and DomainError messages ever reach the client; anything else is
 * logged server-side and answered with `fallback`.
 */
export function handleRouteError(
  error: unknown,
  fallback: string,
  options: HandleRouteErrorOptions = {},
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
  if (options.logDetails === false) {
    console.error(fallback, error instanceof Error ? error.name : typeof error);
  } else {
    console.error(fallback, error);
  }
  return apiError(500, fallback);
}
