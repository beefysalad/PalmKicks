import { expect, it } from "vitest";
import { formatOrderDate, formatOrderTime, formatOrderDateTime } from "@/lib/orders/date-format";

it("uses the Manila calendar day and time across admin order displays", () => {
  const instant = "2026-11-04T16:30:00Z";
  expect(formatOrderDate(instant)).toBe("Nov 5, 2026");
  expect(formatOrderTime(instant)).toBe("12:30 AM");
  expect(formatOrderDateTime(instant)).toBe("November 5, 2026 at 12:30 AM");
});
it("keeps the date before the Manila midnight boundary", () => {
  expect(formatOrderDate("2026-11-04T15:59:00Z")).toBe("Nov 4, 2026");
});
