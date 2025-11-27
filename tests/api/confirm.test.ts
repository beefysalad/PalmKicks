import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/lib/prisma", () => ({ default: {}, prisma: {} }));
vi.mock("@/app/api/orders/orders-service");
vi.mock("@/lib/send-mail", () => ({ sendOrderConfirmation: vi.fn(async () => ({ sent: true })) }));

import { auth } from "@/lib/auth";
import * as svc from "@/app/api/orders/orders-service";
import { sendOrderConfirmation } from "@/lib/send-mail";
import { POST } from "@/app/api/orders/confirm/route";

const req = (body: unknown) =>
  new NextRequest("http://localhost/api/orders/confirm", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => vi.clearAllMocks());

describe("POST /api/orders/confirm", () => {
  it("401 without session and sends nothing", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(req({ orderId: "PK-1" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ success: false, error: "Unauthorized" });
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("admin resend returns emailSent", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "1" } } as never);
    vi.mocked(svc.getOrderById).mockResolvedValue({ id: "PK-1" } as never);
    const res = await POST(req({ orderId: "PK-1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { emailSent: true } });
  });

  it("404 for unknown order, 400 for bad body", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "1" } } as never);
    vi.mocked(svc.getOrderById).mockResolvedValue(null);
    expect((await POST(req({ orderId: "nope" }))).status).toBe(404);
    expect((await POST(req({}))).status).toBe(400);
  });
});
