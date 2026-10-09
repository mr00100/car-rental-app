import { NextRequest } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { requireAdmin, canManageVehicles } from "@/lib/auth";
import { jsonError, jsonOk, handleApiError } from "@/lib/api";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!canManageVehicles(admin.role)) {
      return jsonError("Forbidden", 403);
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("No image file was provided.", 400);
    }

    const allowed = new Set(["image/jpeg", "image/jpg"]);
    if (!allowed.has(file.type.toLowerCase())) {
      return jsonError("Only JPG and JPEG images are allowed.", 400);
    }

    if (file.size <= 0) {
      return jsonError("The selected image is empty.", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return jsonError("Image must be 10 MB or smaller.", 400);
    }

    const extension = file.type.toLowerCase() === "image/jpg" ? "jpg" : "jpg";
    const filename = `${Date.now()}-${randomUUID()}.${extension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "vehicles");
    await mkdir(uploadDir, { recursive: true });

    const bytes = new Uint8Array(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), bytes);

    return jsonOk({
      url: `/uploads/vehicles/${filename}`,
      filename,
      size: file.size,
    }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
