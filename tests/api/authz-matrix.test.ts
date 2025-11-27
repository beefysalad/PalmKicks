import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
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
  ["@/app/api/settings/route", "POST"],
  ["@/app/api/settings/[id]/route", "PUT"],
  ["@/app/api/settings/[id]/route", "DELETE"],
  ["@/app/api/upload/route", "POST"],
];

const services = [brandsSvc, productsSvc, ordersSvc, settingsSvc];

describe("authz matrix: unauthenticated requests", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(table)("%s %s returns 401 and touches nothing", async (mod, name) => {
    const handler = (await import(mod))[name] as (
      req: NextRequest,
      ctx: { params: Promise<{ id: string }> },
    ) => Promise<Response>;
    const method = name === "GET" ? "GET" : name;
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
  });
});
