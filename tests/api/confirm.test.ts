import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
const h = vi.hoisted(() => {
  const state = { row: null as Record<string, unknown> | null };
  return { state, findUnique: vi.fn(async () => state.row), updateMany: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
    if (!state.row) return { count: 0 };
    Object.assign(state.row, data); return { count: 1 };
  }) };
});
vi.mock("@/lib/prisma", () => ({ default: { order: { findUnique: h.findUnique, updateMany: h.updateMany } } }));
vi.mock("@/lib/send-mail", () => ({ sendOrderConfirmation: vi.fn(), sendOrderStatusEmail: vi.fn() }));

import { auth } from "@/lib/auth";
import { sendOrderConfirmation, sendOrderStatusEmail } from "@/lib/send-mail";
import { POST } from "@/app/api/orders/confirm/route";

const req = (body: unknown) =>
  new NextRequest("http://localhost/api/orders/confirm", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  vi.clearAllMocks();
  h.state.row = { id: "PK-1", status: "confirmed", total: "10", items: [], confirmedEmailAt: null, shippedEmailAt: null,
    courier: "Courier", trackingNumber: "TRACK-1" };
  vi.mocked(auth).mockResolvedValue({ user: { id: "1" } } as never);
  vi.mocked(sendOrderConfirmation).mockResolvedValue({ sent: true });
  vi.mocked(sendOrderStatusEmail).mockResolvedValue({ sent: true });
});

describe("POST /api/orders/confirm", () => {
  it.each([
    ["confirmed", "pending"], ["confirmed", "cancelled"],
    ["shipped", "pending"], ["shipped", "confirmed"], ["shipped", "processing"], ["shipped", "cancelled"],
  ])("rejects %s resend on %s without sending or stamping flags", async (type, status) => {
    h.state.row!.status = status;
    const response = await POST(req({ orderId: "PK-1", type }));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toEqual(expect.any(String));
    expect(sendOrderStatusEmail).not.toHaveBeenCalled();
    expect(h.updateMany).not.toHaveBeenCalled();
    expect(h.state.row).toMatchObject({ confirmedEmailAt: null, shippedEmailAt: null });
  });
  it.each(["confirmed", "processing", "shipped", "delivered"])("allows confirmed resend on %s", async (status) => {
    h.state.row!.status = status;
    expect((await POST(req({ orderId: "PK-1", type: "confirmed" }))).status).toBe(200);
    expect(sendOrderStatusEmail).toHaveBeenCalledOnce();
  });
  it.each(["shipped", "delivered"])("allows shipped resend on %s", async (status) => {
    h.state.row!.status = status;
    expect((await POST(req({ orderId: "PK-1", type: "shipped" }))).status).toBe(200);
    expect(sendOrderStatusEmail).toHaveBeenCalledOnce();
  });
  it.each(["pending", "confirmed", "processing", "shipped", "delivered"])("keeps original confirmation available on %s", async (status) => {
    h.state.row!.status = status;
    expect((await POST(req({ orderId: "PK-1" }))).status).toBe(200);
    expect(sendOrderConfirmation).toHaveBeenCalledOnce(); expect(h.updateMany).not.toHaveBeenCalled();
  });
  it("401 without session and sends nothing", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(req({ orderId: "PK-1" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ success: false, error: "Unauthorized" });
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });

  it("admin resend returns emailSent", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "1" } } as never);
    const res = await POST(req({ orderId: "PK-1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { emailSent: true } });
    expect(sendOrderConfirmation).toHaveBeenCalledTimes(1);
    expect(sendOrderConfirmation).toHaveBeenCalledWith(expect.objectContaining({ id: "PK-1", total: 10 }));
  });

  it("404 for unknown order, 400 for bad body", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "1" } } as never);
    h.state.row = null;
    expect((await POST(req({ orderId: "nope" }))).status).toBe(404);
    expect((await POST(req({}))).status).toBe(400);
  });
  it.each(["confirmed", "shipped"] as const)("resends %s and stamps only on success", async (type) => {
    h.state.row!.status = type;
    const res = await POST(req({ orderId: "PK-1", type }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { emailSent: true } });
    expect(sendOrderStatusEmail).toHaveBeenCalledWith(expect.objectContaining({ id: "PK-1" }), type);
    expect(h.state.row![type === "confirmed" ? "confirmedEmailAt" : "shippedEmailAt"]).toBeInstanceOf(Date);
    expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });
  it("does not stamp failed sends, and permits an explicit resend of an already sent email", async () => {
    vi.mocked(sendOrderStatusEmail).mockResolvedValueOnce({ sent: false });
    expect(await (await POST(req({ orderId: "PK-1", type: "confirmed" }))).json())
      .toEqual({ success: true, data: { emailSent: false } });
    expect(h.state.row!.confirmedEmailAt).toBeNull();
    h.state.row!.confirmedEmailAt = new Date();
    await POST(req({ orderId: "PK-1", type: "confirmed" }));
    expect(sendOrderStatusEmail).toHaveBeenCalledTimes(2);
  });
  it("rejects unknown types and shipping emails without saved tracking", async () => {
    expect((await POST(req({ orderId: "PK-1", type: "other" }))).status).toBe(400);
    h.state.row!.status = "shipped";
    h.state.row!.trackingNumber = " ";
    expect((await POST(req({ orderId: "PK-1", type: "shipped" }))).status).toBe(400);
    expect(sendOrderStatusEmail).not.toHaveBeenCalled(); expect(sendOrderConfirmation).not.toHaveBeenCalled();
  });
  it("does not send notifications for cancelled orders", async () => {
    h.state.row!.status = "cancelled";
    expect((await POST(req({ orderId: "PK-1", type: "confirmed" }))).status).toBe(409);
    expect(sendOrderStatusEmail).not.toHaveBeenCalled();
  });
});
