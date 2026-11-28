import { beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }));
vi.mock("@/lib/axios", () => ({ api }));
import { productsApi } from "@/lib/products/api";

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset().mockRejectedValue({
    isAxiosError: true, message: "Request failed with status code 409",
    response: { data: { error: "Remove stock first" } },
  });
});
it.each([
  ["create", () => productsApi.createProduct({} as never)],
  ["update", () => productsApi.updateProduct("p1", {})],
  ["delete", () => productsApi.deleteProduct("p1")],
  ["featured", () => productsApi.toggleFeatured("p1", true)],
  ["latest", () => productsApi.toggleLatest("p1", true)],
] as const)("%s surfaces the server message", async (_name, action) => {
  await expect(action()).rejects.toThrow("Remove stock first");
});
it("preserves successful delete responses with no data", async () => {
  api.delete.mockResolvedValue({ data: { success: true } });
  await expect(productsApi.deleteProduct("p1")).resolves.toBeUndefined();
});
