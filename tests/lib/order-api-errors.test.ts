import { beforeEach, expect, it, vi } from "vitest";
const h = vi.hoisted(() => ({ delete: vi.fn(), toastError: vi.fn() }));
vi.mock("@/lib/axios", () => ({ api: { delete: h.delete } }));
vi.mock("sonner", () => ({ toast: { error: h.toastError } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({}), useMutation: (options: unknown) => options,
}));
import { ordersApi } from "@/lib/orders/api";
import { useDeleteOrder } from "@/lib/orders/hooks";

const conflict = { isAxiosError: true, message: "Request failed with status code 409",
  response: { status: 409, data: { error: "Cancel the order before deleting" } } };
beforeEach(() => vi.clearAllMocks());
it("surfaces the safe server message for a failed order delete", async () => {
  h.delete.mockRejectedValueOnce(conflict);
  await expect(ordersApi.deleteOrderById("o1")).rejects.toThrow("Cancel the order before deleting");
});
it("shows the server message in the delete error toast", () => {
  const mutation = useDeleteOrder() as unknown as { onError: (error: unknown) => void };
  mutation.onError(conflict);
  expect(h.toastError).toHaveBeenCalledWith("Cancel the order before deleting");
});
it("preserves successful delete responses with no data", async () => {
  h.delete.mockResolvedValueOnce({ data: { success: true } });
  await expect(ordersApi.deleteOrderById("o1")).resolves.toBeUndefined();
});
