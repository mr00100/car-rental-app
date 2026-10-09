import { db } from "@/db";
import { notifications } from "@/db/schema";

type NotificationType =
  | "booking_submitted"
  | "payment_submitted"
  | "payment_verified"
  | "booking_confirmed"
  | "booking_rejected"
  | "booking_cancelled"
  | "rental_starting"
  | "rental_ending"
  | "new_booking"
  | "new_payment"
  | "maintenance"
  | "system";

export async function createNotification(params: {
  userId?: number | null;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isAdmin?: boolean;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.insert(notifications).values({
      userId: params.userId ?? null,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link ?? null,
      isAdmin: params.isAdmin ?? false,
      metadata: params.metadata ?? null,
    });
  } catch (err) {
    console.error("Failed to create notification:", err);
  }
}

export async function notifyAdmins(params: {
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}) {
  await createNotification({
    ...params,
    isAdmin: true,
  });
}
