import { expect, it } from "vitest";
import { parseOrderFilters, serializeOrderFilters, reconcileOrderFilterDraft } from "@/lib/orders/filters-url";

it("round-trips every filter with encoded literal search characters", () => {
  const filters = { q: "O'Reilly %_", status: "cancelled" as const, paymentStatus: "refunded" as const,
    from: "2026-11-01", to: "2026-11-05", page: 3, pageSize: 10 };
  expect(parseOrderFilters(new URLSearchParams(serializeOrderFilters(filters)))).toEqual(filters);
});
it("ignores invalid values, trims search, and defaults page to 1", () => {
  expect(parseOrderFilters(new URLSearchParams({ status: "other", paymentStatus: "other", q: "x".repeat(101),
    from: "2026-02-30", to: "bad", page: "-2", pageSize: "bad" }))).toEqual({ page: 1 });
  expect(parseOrderFilters(new URLSearchParams("q=%20Buyer%20"))).toEqual({ page: 1, q: "Buyer" });
});
it("omits empty fields and the default page", () => {
  expect(serializeOrderFilters({ q: "  ", from: "", to: "", page: 1 })).toBe("");
  expect(parseOrderFilters(new URLSearchParams())).toEqual({ page: 1 });
});
it("retains valid reversed dates so the API can report the range error", () => {
  expect(parseOrderFilters(new URLSearchParams("from=2026-11-06&to=2026-11-05")))
    .toEqual({ page: 1, from: "2026-11-06", to: "2026-11-05" });
});
it("does not discard newer typing when an older requested URL arrives", () => {
  const draft = { url: "", values: { page: 1, q: "newer text" }, pending: ["q=older"], generation: 0 };
  const next = reconcileOrderFilterDraft(draft, { page: 1, q: "older" });
  expect(next.values.q).toBe("newer text"); expect(next.pending).toEqual([]); expect(next.generation).toBe(0);
});
it("browser navigation restores URL filters and invalidates an old pending debounce", () => {
  const draft = { url: "q=newer", values: { page: 1, q: "unsent typing" }, pending: [], generation: 0 };
  const next = reconcileOrderFilterDraft(draft, { page: 2, q: "older" });
  expect(next.values).toEqual({ page: 2, q: "older" }); expect(next.generation).toBe(1);
});
