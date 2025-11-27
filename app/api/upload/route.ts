import { requireAdmin } from "@/lib/require-admin";
import { apiError } from "@/lib/api-response";
import { validateImageFile } from "@/lib/upload-validation";
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

    const formData = await request.formData();
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
