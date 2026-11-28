import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const state = { row: null as Row | null, inTransaction: false, failStamp: false };
  const tasks: (() => unknown)[] = [];
  const registrations: boolean[] = [];
  const order = {
    findUnique: vi.fn(async () => structuredClone(state.row)),
    updateMany: vi.fn(async ({ where, data }: { where: Row; data: Row }) => {
      if (state.failStamp && (data.confirmedEmailAt || data.shippedEmailAt)) throw new Error("stamp failed");
      if (!state.row || !Object.entries(where).every(([key, value]) =>
        value && typeof value === "object" && "not" in value
          ? state.row![key] !== value.not
          : value && typeof value === "object" && "in" in value
            ? (value.in as unknown[]).includes(state.row![key]) : state.row![key] === value)) return { count: 0 };
      Object.assign(state.row, data); return { count: 1 };
    }),
  };
  const prisma = { order, $transaction: vi.fn(async (fn: (tx: { order: typeof order }) => unknown) => {
    const before = structuredClone(state.row); state.inTransaction = true;
    try { return await fn({ order }); }
    catch (error) { state.row = before; throw error; }
    finally { state.inTransaction = false; }
  }) };
  return { state, order, prisma, tasks, registrations, send: vi.fn(async () => ({ sent: true })),
    after: vi.fn((_label: string, task: () => unknown) => { registrations.push(state.inTransaction); tasks.push(task); }) };
});
vi.mock("@/lib/prisma", () => ({ default: h.prisma }));
vi.mock("@/lib/send-mail", () => ({ sendOrderConfirmation: vi.fn(), sendOrderStatusEmail: h.send }));
vi.mock("@/lib/after", () => ({ runAfterResponse: h.after }));
import { updateOrderAdmin, getOrderById, sendAndRecordOrderStatusEmail } from "@/app/api/orders/orders-service";

const runTasks = async () => { while (h.tasks.length) await h.tasks.shift()!(); };
beforeEach(() => {
  vi.clearAllMocks(); h.send.mockReset().mockResolvedValue({ sent: true }); h.tasks.length = 0; h.registrations.length = 0;
  h.state.inTransaction = false; h.state.failStamp = false;
  h.state.row = { id: "o1", status: "pending", paymentStatus: "unpaid", total: "100.00", items: [],
    confirmedEmailAt: null, shippedEmailAt: null, shippedAt: null, restockedAt: new Date(),
    trackingNumber: "TRACK-1", courier: "Courier", customerName: "Buyer", customerEmail: "buyer@example.test" };
});

describe("status emails after commit", () => {
  it("an explicit resend is not swallowed by a concurrent automatic skip", async () => {
    h.state.row!.status = "confirmed";
    h.state.row!.confirmedEmailAt = new Date();
    const order = (await getOrderById("o1"))!;
    const [automatic, explicit] = await Promise.all([
      sendAndRecordOrderStatusEmail(order, "confirmed"), sendAndRecordOrderStatusEmail(order, "confirmed", true),
    ]);
    expect(automatic).toEqual({ sent: false });
    expect(explicit).toEqual({ sent: true });
    expect(h.send).toHaveBeenCalledOnce();
  });
  it.each(["confirmed", "shipped"] as const)("skips queued %s after rollback and permits the next real transition", async (type) => {
    const back = type === "confirmed" ? "pending" : "processing";
    h.state.row!.status = back;
    await updateOrderAdmin("o1", { status: type });
    await updateOrderAdmin("o1", { status: back });
    await runTasks();
    const flag = type === "confirmed" ? "confirmedEmailAt" : "shippedEmailAt";
    expect(h.send).not.toHaveBeenCalled(); expect(h.state.row![flag]).toBeNull();
    await updateOrderAdmin("o1", { status: type, ...(type === "shipped" ? { courier: "Courier", trackingNumber: "TRACK-1" } : {}) });
    await runTasks();
    expect(h.send).toHaveBeenCalledOnce(); expect(h.state.row![flag]).toBeInstanceOf(Date);
  });
  it.each(["confirmed", "shipped"] as const)("does not stamp %s if rolled back while SMTP is in flight", async (type) => {
    const back = type === "confirmed" ? "pending" : "processing";
    h.state.row!.status = back;
    await updateOrderAdmin("o1", { status: type });
    h.send.mockImplementationOnce(async () => { h.state.row!.status = back; return { sent: true }; });
    await runTasks();
    expect(h.send).toHaveBeenCalledOnce();
    expect(h.state.row![type === "confirmed" ? "confirmedEmailAt" : "shippedEmailAt"]).toBeNull();
  });
  it("rechecks status even for forced sends if the route's earlier read became stale", async () => {
    h.state.row!.status = "confirmed";
    const order = (await getOrderById("o1"))!;
    h.state.row!.status = "pending";
    expect(await sendAndRecordOrderStatusEmail(order, "confirmed", true)).toEqual({ sent: false });
    expect(h.send).not.toHaveBeenCalled(); expect(h.order.updateMany).not.toHaveBeenCalled();
  });
  it("queues a confirmation after the successful transition, and stamps only after success", async () => {
    await updateOrderAdmin("o1", { status: "confirmed" });
    expect(h.state.inTransaction).toBe(false);
    expect(h.registrations).toEqual([false]);
    expect(h.tasks).toHaveLength(1); expect(h.send).not.toHaveBeenCalled();
    expect(h.state.row!.confirmedEmailAt).toBeNull();
    h.send.mockImplementationOnce(async () => {
      expect(h.state.inTransaction).toBe(false);
      expect(h.state.row!.status).toBe("confirmed");
      expect(h.state.row!.confirmedEmailAt).toBeNull();
      return { sent: true };
    });
    await runTasks();
    expect(h.send).toHaveBeenCalledWith(expect.objectContaining({ id: "o1" }), "confirmed");
    expect(h.state.row!.confirmedEmailAt).toBeInstanceOf(Date);
  });
  it("leaves failed sends unstamped and retries on the next forward transition", async () => {
    h.send.mockResolvedValueOnce({ sent: false });
    await updateOrderAdmin("o1", { status: "confirmed" }); await runTasks();
    expect(h.state.row!.confirmedEmailAt).toBeNull();
    await updateOrderAdmin("o1", { status: "pending" });
    await updateOrderAdmin("o1", { status: "confirmed" }); await runTasks();
    expect(h.send).toHaveBeenCalledTimes(2); expect(h.state.row!.confirmedEmailAt).toBeInstanceOf(Date);
  });
  it("does not resend successful confirmation after back-step then forward", async () => {
    await updateOrderAdmin("o1", { status: "confirmed" }); await runTasks();
    await updateOrderAdmin("o1", { status: "processing" });
    await updateOrderAdmin("o1", { status: "confirmed" }); await runTasks();
    expect(h.send).toHaveBeenCalledOnce();
  });
  it("coalesces pending sends when two forward transitions happen before after() runs", async () => {
    await updateOrderAdmin("o1", { status: "confirmed" });
    await updateOrderAdmin("o1", { status: "pending" });
    await updateOrderAdmin("o1", { status: "confirmed" });
    await Promise.all(h.tasks.splice(0).map((task) => task()));
    expect(h.send).toHaveBeenCalledOnce();
  });
  it("ships once with tracking, keeps the flag over back-steps, and resends changed tracking", async () => {
    h.state.row!.status = "processing";
    await updateOrderAdmin("o1", { status: "shipped" }); await runTasks();
    expect(h.send).toHaveBeenLastCalledWith(expect.objectContaining({ trackingNumber: "TRACK-1" }), "shipped");
    expect(h.state.row!.shippedEmailAt).toBeInstanceOf(Date);
    await updateOrderAdmin("o1", { status: "processing" });
    await updateOrderAdmin("o1", { status: "shipped", courier: "Courier", trackingNumber: "TRACK-1" }); await runTasks();
    expect(h.send).toHaveBeenCalledOnce();
    await updateOrderAdmin("o1", { status: "processing" });
    await updateOrderAdmin("o1", { trackingNumber: "TRACK-2" });
    expect(h.state.row!.shippedEmailAt).toBeNull();
    await updateOrderAdmin("o1", { status: "shipped", courier: "Courier", trackingNumber: "TRACK-2" }); await runTasks();
    expect(h.send).toHaveBeenCalledTimes(2);
    expect(h.send).toHaveBeenLastCalledWith(expect.objectContaining({ trackingNumber: "TRACK-2" }), "shipped");
  });
  it("mark paid alone and failed transitions schedule nothing", async () => {
    await updateOrderAdmin("o1", { paymentStatus: "paid" });
    await expect(updateOrderAdmin("o1", { status: "shipped" })).rejects.toMatchObject({ status: 409 });
    expect(h.after).not.toHaveBeenCalled(); expect(h.send).not.toHaveBeenCalled();
  });
  it("does not register a job when the transaction rolls back after its write", async () => {
    h.order.findUnique.mockResolvedValueOnce(structuredClone(h.state.row)).mockRejectedValueOnce(new Error("read failed"));
    await expect(updateOrderAdmin("o1", { status: "confirmed" })).rejects.toThrow("read failed");
    expect(h.state.row!.status).toBe("pending");
    expect(h.tasks).toHaveLength(0); expect(h.send).not.toHaveBeenCalled();
  });
  it("clears failed in-flight jobs so a later transition can retry", async () => {
    h.send.mockRejectedValueOnce(new Error("sender failed"));
    await updateOrderAdmin("o1", { status: "confirmed" }); await runTasks();
    expect(h.state.row!.confirmedEmailAt).toBeNull();
    await updateOrderAdmin("o1", { status: "pending" });
    await updateOrderAdmin("o1", { status: "confirmed" }); await runTasks();
    expect(h.send).toHaveBeenCalledTimes(2);
    expect(h.state.row!.confirmedEmailAt).toBeInstanceOf(Date);
  });
  it("mark paid and confirm schedules the confirmed email", async () => {
    await updateOrderAdmin("o1", { markPaidAndConfirm: true }); await runTasks();
    expect(h.send).toHaveBeenCalledWith(expect.objectContaining({ status: "confirmed", paymentStatus: "paid" }), "confirmed");
  });
  it("suppresses a queued notification if the order is cancelled before delivery", async () => {
    await updateOrderAdmin("o1", { status: "confirmed" });
    await updateOrderAdmin("o1", { status: "cancelled" }); await runTasks();
    expect(h.send).not.toHaveBeenCalled(); expect(h.state.row!.confirmedEmailAt).toBeNull();
  });
  it("does not stamp an obsolete tracking number after an in-flight send", async () => {
    h.state.row!.status = "processing";
    await updateOrderAdmin("o1", { status: "shipped" });
    h.send.mockImplementationOnce(async () => { h.state.row!.trackingNumber = "NEW"; return { sent: true }; });
    await runTasks(); expect(h.state.row!.shippedEmailAt).toBeNull();
  });
  it("does not fail a committed transition if scheduling throws", async () => {
    h.after.mockImplementationOnce(() => { throw new Error("No request scope"); });
    await expect(updateOrderAdmin("o1", { status: "confirmed" })).resolves.toMatchObject({ status: "confirmed" });
  });
  it("logs stamp failure without rejecting the background job", async () => {
    await updateOrderAdmin("o1", { status: "confirmed" }); h.state.failStamp = true;
    await expect(runTasks()).resolves.toBeUndefined();
    expect(h.send).toHaveBeenCalledOnce(); expect(h.state.row!.confirmedEmailAt).toBeNull();
  });
});
