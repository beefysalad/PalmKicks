import { expect, it } from "vitest";
import { getApiErrorMessage, isApiClientError } from "@/lib/api-error-message";

it("does not offer retries for client errors while keeping network/server errors retryable", () => {
  for (const status of [400, 401, 403, 404, 409, 422, 429, 499]) {
    expect(isApiClientError({ isAxiosError: true, response: { status, data: { error: "Invalid date range" } } })).toBe(true);
  }
  for (const error of [null, new Error("Offline"), { isAxiosError: true }, { isAxiosError: true, response: { status: 500 } }]) {
    expect(isApiClientError(error)).toBe(false);
  }
});

it("prefers the server error on Axios failures", () => {
  expect(getApiErrorMessage({ isAxiosError: true, message: "Request failed with status code 409",
    response: { data: { error: "Remove stock first" } } }, "Save failed")).toBe("Remove stock first");
});
it("handles missing, empty, and malformed server errors without exposing objects", () => {
  for (const error of [undefined, "", { internal: "detail" }]) {
    expect(getApiErrorMessage({ isAxiosError: true, response: { data: { error } } }, "Save failed")).toBe("Save failed");
  }
  expect(getApiErrorMessage(new Error("Offline"), "Save failed")).toBe("Offline");
  expect(getApiErrorMessage(null, "Save failed")).toBe("Save failed");
});
