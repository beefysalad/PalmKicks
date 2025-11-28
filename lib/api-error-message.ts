import { isAxiosError } from "axios";

/** API error envelopes take precedence over Axios's generic HTTP status text. */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<{ error?: unknown }>(error)) {
    const message = error.response?.data?.error;
    return typeof message === "string" && message.trim() ? message : fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
