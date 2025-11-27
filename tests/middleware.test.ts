import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth/jwt", () => ({ getToken: vi.fn() }));
import { getToken } from "next-auth/jwt";
import { middleware } from "@/middleware";

const mockedGetToken = vi.mocked(getToken);
const req = (path: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  new NextRequest(`http://localhost${path}`, init);

describe("middleware", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    mockedGetToken.mockReset();
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("redirects to login when there is no token", async () => {
    mockedGetToken.mockResolvedValueOnce(null);
    const res = await middleware(req("/admin/dashboard"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/admin/login");
  });

  it("fails closed (redirect, not 500) when getToken throws", async () => {
    mockedGetToken.mockRejectedValueOnce(new Error("MissingSecret"));
    const res = await middleware(req("/admin/dashboard"));
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/admin/login");
  });

  it("redirects a signed-in admin from login to dashboard", async () => {
    mockedGetToken.mockResolvedValueOnce({ sub: "a1" });
    const res = await middleware(req("/admin/login"));
    expect(new URL(res.headers.get("location")!).pathname).toBe("/admin/dashboard");
  });

  it("uses the __Secure- cookie name when AUTH_URL is https", async () => {
    process.env.AUTH_URL = "https://shop.example.com";
    mockedGetToken.mockResolvedValueOnce(null);
    await middleware(req("/admin/dashboard"));
    expect(mockedGetToken.mock.calls[0][0]).toMatchObject({
      secureCookie: true,
      cookieName: "__Secure-authjs.session-token",
      salt: "__Secure-authjs.session-token",
    });
  });

  it("does not forward the Authorization header to getToken", async () => {
    mockedGetToken.mockResolvedValueOnce(null);
    await middleware(req("/admin/dashboard", { headers: { authorization: "Bearer x" } }));
    const passed = mockedGetToken.mock.calls[0][0].req as { headers: Headers };
    expect(passed.headers.get("authorization")).toBeNull();
  });
});
