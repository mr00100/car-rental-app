import { NextRequest } from "next/server";
import { db } from "@/db";
import { licenseVerifications, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { jsonOk, jsonError, handleApiError } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { decryptString } from "@/lib/crypto";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/services/notifications";

// Admin/staff only: list verifications (raw license number NOT included).
export async function GET() {
  try {
    await requireAdmin();
    const rows = await db
      .select({
        id: licenseVerifications.id,
        userId: licenseVerifications.userId,
        status: licenseVerifications.status,
        fullName: licenseVerifications.fullName,
        licenseNumberMasked: licenseVerifications.licenseNumberMasked,
        expiryDate: licenseVerifications.expiryDate,
        documentUrl: licenseVerifications.documentUrl,
        rejectionReason: licenseVerifications.rejectionReason,
        createdAt: licenseVerifications.createdAt,
        reviewedAt: licenseVerifications.reviewedAt,
        userEmail: users.email,
      })
      .from(licenseVerifications)
      .leftJoin(users, eq(licenseVerifications.userId, users.id))
      .orderBy(desc(licenseVerifications.createdAt));

    return jsonOk(rows);
  } catch (err) {
    return handleApiError(err);
  }
}

// Admin action: approve / reject. Can optionally reveal decrypted number
// only to an authorized admin for a single review action.
export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const { id, action, rejectionReason, reveal } = body as {
      id: number;
      action?: "verify" | "reject" | "review";
      rejectionReason?: string;
      reveal?: boolean;
    };

    const [row] = await db
      .select()
      .from(licenseVerifications)
      .where(eq(licenseVerifications.id, id))
      .limit(1);
    if (!row) return jsonError("Verification not found", 404);

    if (reveal) {
      const number = row.licenseNumberEncrypted
        ? decryptString(row.licenseNumberEncrypted)
        : null;
      await logAudit({
        admin,
        action: "Revealed license number for review",
        targetType: "license_verification",
        targetId: id,
      });
      return jsonOk({ licenseNumber: number });
    }

    let status = row.status;
    if (action === "verify") status = "verified";
    else if (action === "reject") status = "rejected";
    else if (action === "review") status = "under_review";

    await db
      .update(licenseVerifications)
      .set({
        status,
        reviewedBy: admin.id,
        reviewedAt: new Date(),
        rejectionReason: action === "reject" ? rejectionReason ?? "Rejected" : null,
        updatedAt: new Date(),
      })
      .where(eq(licenseVerifications.id, id));

    if (action === "verify" || action === "reject") {
      const u = row.userId
        ? (await db
            .select({ email: users.email })
            .from(users)
            .where(eq(users.id, row.userId))
            .limit(1))[0]
        : null;
      if (row.userId) await createNotification({
        userId: row.userId,
        type: "system",
        title:
          action === "verify" ? "License Verified" : "License Rejected",
        message:
          action === "verify"
            ? "Your driving license has been verified. You can now complete bookings."
            : `Your license verification was rejected. ${rejectionReason || ""}`,
        link: "/profile",
      });
      if (u?.email) {
        await sendEmail({
          to: u.email,
          subject: "Driving License Verification Update",
          template: "license_result",
          data: { status },
        });
      }
    }

    await logAudit({
      admin,
      action: `License ${action}`,
      targetType: "license_verification",
      targetId: id,
      newValue: { status },
    });

    return jsonOk({ status });
  } catch (err) {
    return handleApiError(err);
  }
}
