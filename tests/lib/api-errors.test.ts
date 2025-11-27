import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { handleRouteError, DomainError } from "@/lib/api-errors";

beforeEach(() => vi.spyOn(console, "error").mockImplementation(() => {}));

const body = async (r: Response) => r.json();

describe("handleRouteError", () => {
  it("maps ZodError to 400 with first issue message", async () => {
    const err = z.object({ a: z.string("A is required") }).safeParse({}).error!;
    const res = handleRouteError(err, "fallback");
    expect(res.status).toBe(400);
    expect(await body(res)).toEqual({ success: false, error: "A is required" });
  });

  it.each([
    ["P2025", 404, "Not found"],
    ["P2002", 409, "Already exists"],
    ["P2003", 409, "Resource is in use"],
  ])("maps prisma %s", async (code, status, msg) => {
    const err = Object.assign(new Error("raw prisma text"), {
      code,
      name: "PrismaClientKnownRequestError",
    });
    const res = handleRouteError(err, "fallback");
    expect(res.status).toBe(status);
    expect(await body(res)).toEqual({ success: false, error: msg });
  });

  it("maps DomainError to its status and message", async () => {
    class Boom extends DomainError {
      constructor() {
        super("nope", 409);
      }
    }
    const res = handleRouteError(new Boom(), "fallback");
    expect(res.status).toBe(409);
    expect(await body(res)).toEqual({ success: false, error: "nope" });
  });

  it("returns only the fallback for unknown errors", async () => {
    const res = handleRouteError(new Error("db password leaked"), "Failed to x");
    expect(res.status).toBe(500);
    const text = JSON.stringify(await body(res));
    expect(text).toBe(JSON.stringify({ success: false, error: "Failed to x" }));
    expect(text).not.toContain("leaked");
  });
});
