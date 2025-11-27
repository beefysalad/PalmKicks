import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/lib/prisma", () => ({ default: {}, prisma: {} }));
vi.mock("@/app/api/orders/orders-service");

import * as ordersSvc from "@/app/api/orders/orders-service";
import { auth } from "@/lib/auth";
import { GET } from "@/app/api/orders/[id]/route";

const full = {
  id: "PK-2026-X",
  customerName: "Juan Dela Cruz",
  customerEmail: "juan@secret-mail.test",
  customerPhone: "09171234567",
  shippingAddress: "123 Private Street",
  shippingCity: "Manila",
  shippingZipCode: "1000",
  meetupLocation: null,
  total: 100,
  status: "pending",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  items: [
    {
      id: "i1", orderId: "PK-2026-X", productId: "p1", name: "Shoe", price: 50,
      image: "/a.png", size: "9", color: "red", quantity: 2,
      createdAt: "2026-01-01T00:00:00.000Z", product: { id: "p1", name: "Shoe" },
    },
  ],
};

const call = (id: string) =>
  GET(new NextRequest(`http://localhost/api/orders/${id}`), {
    params: Promise.resolve({ id }),
  });

describe("GET /api/orders/[id] privacy", () => {
  beforeEach(() => {
    vi.mocked(auth).mockReset();
    vi.mocked(auth).mockResolvedValue(null as never);
    vi.mocked(ordersSvc.getOrderById).mockReset();
    vi.mocked(ordersSvc.getPublicOrderById).mockReset();
  });

  it("anonymous gets no PII", async () => {
    vi.mocked(ordersSvc.getPublicOrderById).mockResolvedValue({
      id: "PK-2026-X", status: "pending", total: 100,
      createdAt: full.createdAt, meetupLocation: null, shippingCity: "Manila",
      customerFirstName: "Juan",
      items: [{ name: "Shoe", price: 50, image: "/a.png", size: "9", color: "red", quantity: 2 }],
    });
    vi.mocked(ordersSvc.getOrderById).mockResolvedValue(full as never);
    const res = await call("PK-2026-X");
    expect(res.status).toBe(200);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("juan@secret-mail.test");
    expect(text).not.toContain("09171234567");
    expect(text).not.toContain("123 Private Street");
    expect(text).not.toContain("Dela Cruz");
    expect(text).toContain("Juan");
    expect(ordersSvc.getOrderById).not.toHaveBeenCalled();
  });

  it("admin session gets full record", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin" } } as never);
    vi.mocked(ordersSvc.getOrderById).mockResolvedValue(full as never);
    const res = await call("PK-2026-X");
    const body = await res.json();
    expect(body.data.customerEmail).toBe("juan@secret-mail.test");
    expect(body.data.shippingAddress).toBe("123 Private Street");
  });

  it("unknown id is 404 for anonymous and admin", async () => {
    vi.mocked(ordersSvc.getPublicOrderById).mockResolvedValue(null);
    vi.mocked(ordersSvc.getOrderById).mockResolvedValue(null);
    expect((await call("nope")).status).toBe(404);
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin" } } as never);
    expect((await call("nope")).status).toBe(404);
  });

  it("?view=public returns public shape even with admin session", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin" } } as never);
    vi.mocked(ordersSvc.getPublicOrderById).mockResolvedValue({
      id: "PK-2026-X", status: "pending", total: 100, createdAt: full.createdAt,
      meetupLocation: null, shippingCity: "Manila", customerFirstName: "Juan",
      items: [],
    });
    const res = await GET(
      new NextRequest("http://localhost/api/orders/PK-2026-X?view=public"),
      { params: Promise.resolve({ id: "PK-2026-X" }) }
    );
    const body = await res.json();
    expect(body.data.customerFirstName).toBe("Juan");
    expect(ordersSvc.getOrderById).not.toHaveBeenCalled();
  });

  it("admin session still on first login gets 403, not the full record", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "admin", firstTimeLogin: true } } as never);
    const res = await call("PK-2026-X");
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Password change required");
    expect(ordersSvc.getOrderById).not.toHaveBeenCalled();
  });
});
