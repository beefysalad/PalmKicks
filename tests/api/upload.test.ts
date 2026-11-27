import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: {}, prisma: {} }));
vi.mock("cloudinary", () => ({
  v2: { config: vi.fn(), uploader: { upload: vi.fn() } },
}));

import { v2 as cloudinary } from "cloudinary";
import { auth } from "@/lib/auth";
import { POST } from "@/app/api/upload/route";

const upload = cloudinary.uploader.upload as unknown as ReturnType<typeof vi.fn>;
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

function req(value: FormDataEntryValue) {
  const fd = new FormData();
  fd.set("file", value);
  return new NextRequest("http://localhost/api/upload", {
    method: "POST",
    body: fd,
    headers: { "content-length": "1024" },
  });
}
const admin = () =>
  (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id: "1", role: "ADMIN" },
  });

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CLOUDINARY_CLOUD_NAME = "c";
  process.env.CLOUDINARY_API_KEY = "k";
  process.env.CLOUDINARY_API_SECRET = "s";
});

describe("POST /api/upload", () => {
  it("401 without session, no upload", async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await POST(req(new File([PNG], "a.png", { type: "image/png" })));
    expect(res.status).toBe(401);
    expect(upload).not.toHaveBeenCalled();
  });
  it("rejects invalid file without uploading", async () => {
    admin();
    const res = await POST(
      req(new File([new Uint8Array([1, 2, 3, 4])], "a.png", { type: "image/png" }))
    );
    expect(res.status).toBe(415);
    expect(upload).not.toHaveBeenCalled();
  });
  it("rejects string field", async () => {
    admin();
    const res = await POST(req("nope"));
    expect(res.status).toBe(400);
    expect(upload).not.toHaveBeenCalled();
  });
  it("uploads valid file with sniffed mime", async () => {
    admin();
    upload.mockResolvedValue({ secure_url: "https://x/y.png", public_id: "products/y" });
    const res = await POST(req(new File([PNG], "a.jpg", { type: "image/jpeg" })));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://x/y.png", fileName: "products/y" });
    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0][0]).toMatch(/^data:image\/png;base64,/);
  });
  it("500 with fixed message on failure", async () => {
    admin();
    upload.mockRejectedValue(new Error("secret internal detail"));
    const res = await POST(req(new File([PNG], "a.png", { type: "image/png" })));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("secret internal");
  });
  it("413 on oversized Content-Length without parsing the body", async () => {
    admin();
    const r = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      headers: { "content-length": String(10 * 1024 * 1024) },
      body: "x",
    });
    const spy = vi.spyOn(r, "formData");
    const res = await POST(r);
    expect(res.status).toBe(413);
    expect(spy).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });
  it("411 when Content-Length is missing", async () => {
    admin();
    const r = new NextRequest("http://localhost/api/upload", { method: "POST" });
    const spy = vi.spyOn(r, "formData");
    const res = await POST(r);
    expect(res.status).toBe(411);
    expect(spy).not.toHaveBeenCalled();
  });
  it("411 when Content-Length is not a number", async () => {
    admin();
    const r = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      headers: { "content-length": "abc" },
      body: "x",
    });
    expect((await POST(r)).status).toBe(411);
  });
  it("400 on malformed multipart body", async () => {
    admin();
    const r = new NextRequest("http://localhost/api/upload", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=zzz", "content-length": "5" },
      body: "junk!",
    });
    const res = await POST(r);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid form data" });
    expect(upload).not.toHaveBeenCalled();
  });
});
