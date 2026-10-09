import { NextRequest } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { jsonError, jsonOk, handleApiError } from "@/lib/api";
import { db } from "@/db";
import { licenseVerifications, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Customer booking license upload. This stores the selected JPG/JPEG file
// locally; it does not claim to verify the driver's identity.
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) return jsonError("Please select a license image.", 400);

    const type = file.type.toLowerCase();
    if (type !== "image/jpeg" && type !== "image/jpg") {
      return jsonError("Only JPG and JPEG images are allowed.", 400);
    }
    if (file.size <= 0) return jsonError("The selected file is empty.", 400);
    if (file.size > MAX_FILE_SIZE) {
      return jsonError("License image must be 10 MB or smaller.", 400);
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "licenses");
    await mkdir(uploadDir, { recursive: true });
    const filename = `${Date.now()}-${randomUUID()}.jpg`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    await writeFile(path.join(uploadDir, filename), bytes);

    // Also create/update the admin-facing verification record so every
    // uploaded license appears in Admin > License Verification.
    const session = await getSession();
    let fullName = typeof formData.get("fullName") === "string" ? String(formData.get("fullName")).trim() : "";
    let email = typeof formData.get("email") === "string" ? String(formData.get("email")).trim().toLowerCase() : "";
    const cnic = typeof formData.get("cnic") === "string" ? String(formData.get("cnic")).trim() : "";
    if (!cnic) return jsonError("CNIC is required.", 400);

    let userId: number | null = session?.id ?? null;
    if (session) {
      fullName = session.fullName || fullName;
      email = session.email || email;
    } else if (email) {
      const [existingUser] = await db
        .select({ id: users.id, fullName: users.fullName, email: users.email })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (existingUser) {
        userId = existingUser.id;
        fullName = existingUser.fullName || fullName;
        email = existingUser.email;
      }
    }

    const url = `/uploads/licenses/${filename}`;

    if (userId !== null) {
      const [existing] = await db
        .select({ id: licenseVerifications.id })
        .from(licenseVerifications)
        .where(eq(licenseVerifications.userId, userId))
        .limit(1);

      if (existing) {
        await db
          .update(licenseVerifications)
          .set({
            fullName: fullName || null,
            cnic,
            documentUrl: url,
            status: "submitted",
            reviewedBy: null,
            reviewedAt: null,
            rejectionReason: null,
            updatedAt: new Date(),
          })
          .where(eq(licenseVerifications.id, existing.id));
      } else {
        // The user_id column is unique, so use a conflict-safe insert. This
        // prevents duplicate-submit/race errors from blocking the upload.
        await db
          .insert(licenseVerifications)
          .values({
            userId,
            fullName: fullName || null,
            cnic,
            documentUrl: url,
            status: "submitted",
          })
          .onConflictDoUpdate({
            target: licenseVerifications.userId,
            set: {
              fullName: fullName || null,
              cnic,
              documentUrl: url,
              status: "submitted",
              reviewedBy: null,
              reviewedAt: null,
              rejectionReason: null,
              updatedAt: new Date(),
            },
          });
      }
    } else {
      // Guest booking: the verification table now permits a nullable userId
      // so the admin can still review the submitted document.
      await db.insert(licenseVerifications).values({
        userId: null,
        fullName: fullName || null,
        cnic,
        documentUrl: url,
        status: "submitted",
      });
    }

    return jsonOk({ url, filename, message: "License submitted for verification." }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
