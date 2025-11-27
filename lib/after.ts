import { after } from "next/server";

/**
 * Run a task after the response has been sent (Next.js `after()`), so slow
 * side effects such as email never hold up the request. Never throws: errors
 * from the task are logged, and so is a failure to register it (`after()`
 * throws synchronously outside a request scope). A failed side effect must
 * never surface as a request failure.
 */
export function runAfterResponse(
  label: string,
  task: () => unknown | Promise<unknown>
): void {
  try {
    after(async () => {
      try {
        await task();
      } catch (error) {
        console.error(`Deferred task "${label}" failed:`, error);
      }
    });
  } catch (error) {
    console.error(`Could not schedule deferred task "${label}":`, error);
  }
}
