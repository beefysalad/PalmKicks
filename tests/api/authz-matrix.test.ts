import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { readdirSync } from "node:fs";
import path from "node:path";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => null),
  refreshAdminVerification: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
}));
vi.mock("@/lib/send-mail", () => ({ sendOrderConfirmation: vi.fn(), sendOrderStatusEmail: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: {}, prisma: {} }));
vi.mock("cloudinary", () => ({
  v2: { config: vi.fn(), uploader: { upload_stream: vi.fn(), upload: vi.fn() } },
}));
vi.mock("@/app/api/brands/brands-service");
vi.mock("@/app/api/products/products-service");
vi.mock("@/app/api/orders/orders-service");
vi.mock("@/app/api/settings/settings-service");

import * as brandsSvc from "@/app/api/brands/brands-service";
import * as productsSvc from "@/app/api/products/products-service";
import * as ordersSvc from "@/app/api/orders/orders-service";
import * as settingsSvc from "@/app/api/settings/settings-service";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@/lib/auth";

const table: [string, string][] = [
  ["@/app/api/brands/route", "POST"],
  ["@/app/api/brands/[id]/route", "PUT"],
  ["@/app/api/brands/[id]/route", "DELETE"],
  ["@/app/api/products/route", "POST"],
  ["@/app/api/products/[id]/route", "PUT"],
  ["@/app/api/products/[id]/route", "PATCH"],
  ["@/app/api/products/[id]/route", "DELETE"],
  ["@/app/api/orders/[id]/route", "DELETE"],
  ["@/app/api/orders/[id]/route", "PATCH"],
  ["@/app/api/orders/route", "GET"],
  ["@/app/api/orders/stats/route", "GET"],
  ["@/app/api/settings/route", "POST"],
  ["@/app/api/settings/[id]/route", "PUT"],
  ["@/app/api/settings/[id]/route", "DELETE"],
  ["@/app/api/upload/route", "POST"],
];

const services = [brandsSvc, productsSvc, ordersSvc, settingsSvc];

async function expectUnauthenticated401(mod: string, name: string) {
  const handler = (await import(mod))[name] as (
    req: NextRequest,
    ctx: { params: Promise<{ id: string }> },
  ) => Promise<Response>;
  const method = name;
  const req = new NextRequest("http://localhost/api/x", {
    method,
    ...(method === "GET" ? {} : { body: "{}", headers: { "content-type": "application/json" } }),
  });
  const res = await handler(req, { params: Promise.resolve({ id: "x" }) });
  expect(res.status).toBe(401);
  for (const svc of services) {
    for (const fn of Object.values(svc)) {
      if (typeof fn === "function" && "mock" in fn) {
        expect((fn as ReturnType<typeof vi.fn>).mock).toHaveProperty("calls", []);
      }
    }
  }
  expect(cloudinary.uploader.upload_stream).not.toHaveBeenCalled();
  expect(cloudinary.uploader.upload).not.toHaveBeenCalled();
}

describe("authz matrix: unauthenticated requests", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(table)("%s %s returns 401 and touches nothing", expectUnauthenticated401);
});

// ---- generated from the filesystem -----------------------------------------
// Every route handler under app/api is discovered, so a new route that forgets
// requireAdmin() fails here until it is guarded or explicitly allowlisted.

const API_DIR = path.resolve(__dirname, "../../app/api");
const MUTATIONS = ["POST", "PUT", "PATCH", "DELETE"] as const;
const HTTP_METHODS = ["GET", "HEAD", "OPTIONS", ...MUTATIONS];

/** Mutations that are intentionally reachable without an admin session. */
const PUBLIC_MUTATIONS = new Set([
  "@/app/api/orders/route POST", // anonymous checkout
  "@/app/api/auth/[...nextauth]/route POST", // Auth.js sign-in/out
]);
/** GET handlers that must require an admin session. */
const ADMIN_GETS = new Set([
  "@/app/api/orders/route GET",
  "@/app/api/orders/stats/route GET",
]);
/** GET handlers that are intentionally public. */
const PUBLIC_GETS = new Set([
  "@/app/api/auth/[...nextauth]/route GET",
  "@/app/api/brands/route GET",
  "@/app/api/brands/[id]/route GET",
  "@/app/api/products/route GET",
  "@/app/api/products/[id]/route GET",
  "@/app/api/settings/route GET",
  // Without a session it returns the public order view only.
  "@/app/api/orders/[id]/route GET",
]);

function findRouteFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findRouteFiles(full);
    return entry.name === "route.ts" ? [full] : [];
  });
}

const routeModules = findRouteFiles(API_DIR)
  .map((file) =>
    "@/" +
    path
      .relative(path.resolve(__dirname, "../.."), file)
      .split(path.sep)
      .join("/")
      .replace(/\.ts$/, ""),
  )
  .sort();

const handlers: string[] = [];
for (const mod of routeModules) {
  const exports = await import(mod);
  for (const name of Object.keys(exports)) {
    if (HTTP_METHODS.includes(name) && typeof exports[name] === "function") {
      handlers.push(`${mod} ${name}`);
    }
  }
}

const split = (key: string) => key.split(" ") as [string, string];
const guardedMutations = handlers
  .filter((h) => (MUTATIONS as readonly string[]).includes(split(h)[1]))
  .filter((h) => !PUBLIC_MUTATIONS.has(h))
  .map(split);
const adminGets = handlers.filter((h) => ADMIN_GETS.has(h)).map(split);

describe("authz matrix (generated from app/api/**/route.ts)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("discovers the route files", () => {
    expect(routeModules.length).toBeGreaterThanOrEqual(13);
    expect(guardedMutations.length).toBeGreaterThanOrEqual(table.length - 2);
  });

  it.each(guardedMutations)("%s %s returns 401 without a session", expectUnauthenticated401);

  it.each(adminGets)("%s %s (admin GET) returns 401 without a session", expectUnauthenticated401);

  it("classifies every GET/HEAD/OPTIONS handler as admin or public", () => {
    const reads = handlers.filter((h) => !(MUTATIONS as readonly string[]).includes(split(h)[1]));
    const unclassified = reads.filter((h) => !ADMIN_GETS.has(h) && !PUBLIC_GETS.has(h));
    expect(unclassified).toEqual([]);
  });

  it("has no stale allowlist entries", () => {
    for (const key of [...PUBLIC_MUTATIONS, ...ADMIN_GETS, ...PUBLIC_GETS]) {
      expect(handlers).toContain(key);
    }
  });

  it("keeps every explicit case above covered by the generated matrix", () => {
    const generated = new Set([...guardedMutations, ...adminGets].map((p) => p.join(" ")));
    for (const [mod, name] of table) expect(generated).toContain(`${mod} ${name}`);
  });
});

describe("first-login guard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("orders stats returns 403 until the password is changed", async () => {
    vi.mocked(auth as unknown as () => Promise<unknown>).mockResolvedValueOnce({
      user: { id: "a1", firstTimeLogin: true },
    });
    const { GET } = await import("@/app/api/orders/stats/route");
    const res = await GET();
    expect(res.status).toBe(403);
    expect(ordersSvc.getOrderStats).not.toHaveBeenCalled();
  });
});

describe("positive controls", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin session reaches the service (brands POST)", async () => {
    vi.mocked(auth as unknown as () => Promise<unknown>).mockResolvedValueOnce({ user: { id: "a1" } });
    vi.mocked(brandsSvc.addBrand).mockResolvedValueOnce({ id: "b1", name: "Nike" } as never);
    const { POST } = await import("@/app/api/brands/route");
    const res = await POST(
      new NextRequest("http://localhost/api/brands", {
        method: "POST",
        body: JSON.stringify({ name: "Nike" }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).not.toBe(401);
    expect(brandsSvc.addBrand).toHaveBeenCalled();
  });

  it("public products GET works without a session", async () => {
    vi.mocked(productsSvc.getProducts).mockResolvedValueOnce([] as never);
    const { GET } = await import("@/app/api/products/route");
    const res = await GET(new NextRequest("http://localhost/api/products"));
    expect(res.status).not.toBe(401);
    expect(productsSvc.getProducts).toHaveBeenCalled();
  });
});
