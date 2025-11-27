import { requireAdmin } from "@/lib/require-admin";
import { apiError } from "@/lib/api-response";
import { MAX_UPLOAD_BYTES, validateImageFile } from "@/lib/upload-validation";
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multipart framing/field overhead allowed on top of the file cap.
const MULTIPART_OVERHEAD_BYTES = 64 * 1024;

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      console.error("Cloudinary environment variables are not set");
      return apiError(500, "Cloudinary configuration missing");
    }

    const declared = Number(request.headers.get("content-length"));
    if (!request.headers.get("content-length") || !Number.isFinite(declared) || declared < 0) {
      return apiError(411, "Content-Length required");
    }
    if (declared > MAX_UPLOAD_BYTES + MULTIPART_OVERHEAD_BYTES) {
      return apiError(413, "File too large (max 5 MB)");
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return apiError(400, "Invalid form data");
    }
    const result = await validateImageFile(formData.get("file"));
    if (!result.ok) {
      return apiError(result.status, result.error);
    }

    const dataURI = `data:${result.mime};base64,${result.buffer.toString("base64")}`;

    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      folder: "products",
      resource_type: "image",
    });

    return NextResponse.json({
      url: uploadResult.secure_url,
      fileName: uploadResult.public_id,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return apiError(500, "Failed to upload file");
  }
}
