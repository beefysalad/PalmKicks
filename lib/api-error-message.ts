import { isAxiosError } from "axios";

export function isApiClientError(error: unknown): boolean {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  return status !== undefined && status >= 400 && status < 500;
}

/** API error envelopes take precedence over Axios's generic HTTP status text. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<{ error?: unknown }>(error)) {
    const message = error.response?.data?.error;
    return typeof message === "string" && message.trim() ? message : fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
