export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type ImageMime = "image/jpeg" | "image/png" | "image/webp";

export type ImageValidation =
  | { ok: true; buffer: Buffer; mime: ImageMime }
  | { ok: false; status: 400 | 413 | 415; error: string };

function sniff(b: Buffer): ImageMime | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    b.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)
  ) {
    return "image/png";
  }
  if (
    b.length >= 12 &&
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export async function validateImageFile(file: unknown): Promise<ImageValidation> {
  if (!(file instanceof File)) {
    return { ok: false, status: 400, error: "No file provided" };
  }
  if (file.size === 0) {
    return { ok: false, status: 400, error: "File is empty" };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, status: 413, error: "File too large (max 5 MB)" };
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = sniff(buffer);
  if (!mime) {
    return { ok: false, status: 415, error: "Unsupported image type" };
  }
  return { ok: true, buffer, mime };
}
