import { expect, it } from "vitest";
import { getApiErrorMessage } from "@/lib/api-error-message";

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
