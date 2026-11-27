import { describe, it, expect } from "vitest";
import { validateImageFile } from "@/lib/upload-validation";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const JPG = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0];
const WEBP = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];
const mk = (bytes: number[], type = "image/png", name = "a.png") =>
  new File([new Uint8Array(bytes)], name, { type });

describe("validateImageFile", () => {
  it("accepts png/jpeg/webp by magic bytes", async () => {
    const png = await validateImageFile(mk(PNG));
    expect(png).toMatchObject({ ok: true, mime: "image/png" });
    const jpg = await validateImageFile(mk(JPG, "application/octet-stream"));
    expect(jpg).toMatchObject({ ok: true, mime: "image/jpeg" });
    const webp = await validateImageFile(mk(WEBP, "image/png"));
    expect(webp).toMatchObject({ ok: true, mime: "image/webp" });
  });
  it("rejects non-File", async () => {
    expect(await validateImageFile("hello")).toMatchObject({ ok: false, status: 400 });
    expect(await validateImageFile(null)).toMatchObject({ ok: false, status: 400 });
  });
  it("rejects empty file", async () => {
    expect(await validateImageFile(mk([]))).toMatchObject({ ok: false, status: 400 });
  });
  it("rejects > 5MB with 413", async () => {
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    big.set(PNG);
    const f = new File([big], "b.png", { type: "image/png" });
    expect(await validateImageFile(f)).toMatchObject({ ok: false, status: 413 });
  });
  it("rejects magic mismatch even if declared image/png", async () => {
    const r = await validateImageFile(mk([0x3c, 0x73, 0x76, 0x67, 0, 0, 0, 0, 0, 0, 0, 0]));
    expect(r).toMatchObject({ ok: false, status: 415 });
  });
  it("rejects RIFF that is not WEBP", async () => {
    const wav = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45];
    expect(await validateImageFile(mk(wav))).toMatchObject({ ok: false, status: 415 });
  });
  it("rejects high-bit bytes that ascii decoding would fold into RIFF/WEBP", async () => {
    const fake = [0xd2, 0xc9, 0xc6, 0xc6, 1, 2, 3, 4, 0xd7, 0xc5, 0xc2, 0xd0];
    expect(await validateImageFile(mk(fake))).toMatchObject({ ok: false, status: 415 });
  });
});
