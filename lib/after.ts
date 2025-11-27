import { after } from "next/server";

/**
 * Run a task after the response has been sent (Next.js `after()`), so slow
 * side effects such as email never hold up the request. Errors are logged and
 * swallowed: a failed side effect must never surface as a request failure.
 */
export function runAfterResponse(
  label: string,
  task: () => unknown | Promise<unknown>
): void {
  after(async () => {
    try {
      await task();
    } catch (error) {
      console.error(`Deferred task "${label}" failed:`, error);
    }
  });
}
