import { NextRequest } from "next/server";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { jsonOk, handleApiError } from "@/lib/api";
import { contactSchema } from "@/lib/validations";
import { requireAdmin } from "@/lib/auth";
import { notifyAdmins } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = contactSchema.parse(body);

    const [msg] = await db
      .insert(contactMessages)
      .values({
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        subject: data.subject || null,
        message: data.message,
      })
      .returning();

    await notifyAdmins({
      type: "system",
      title: "New Contact Message",
      message: `From ${data.name}: ${data.subject || data.message.slice(0, 80)}`,
      link: "/admin/messages",
    });

    return jsonOk({ message: "Message sent successfully", id: msg.id }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db
      .select()
      .from(contactMessages)
      .orderBy(desc(contactMessages.createdAt))
      .limit(100);
    return jsonOk(rows);
  } catch (err) {
    return handleApiError(err);
  }
}
