import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  decimal,
  pgEnum,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", [
  "CUSTOMER",
  "STAFF",
  "ADMIN",
  "SUPER_ADMIN",
]);

export const vehicleTypeEnum = pgEnum("vehicle_type", ["car", "bike"]);

export const availabilityStatusEnum = pgEnum("availability_status", [
  "available",
  "reserved",
  "rented",
  "maintenance",
  "disabled",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "payment_pending",
  "payment_submitted",
  "confirmed",
  "active",
  "completed",
  "cancelled",
  "rejected",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "submitted",
  "verified",
  "rejected",
  "refunded",
]);

export const ownerStatusEnum = pgEnum("owner_status", [
  "active",
  "inactive",
  "suspended",
]);

export const rentalModeEnum = pgEnum("rental_mode", [
  "self_drive",
  "with_driver",
]);

export const cancellationTypeEnum = pgEnum("cancellation_type", [
  "free",
  "late",
]);

export const refundStatusEnum = pgEnum("refund_status", [
  "pending",
  "processing",
  "refunded",
  "failed",
  "manual_required",
  "not_applicable",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "booking_submitted",
  "payment_submitted",
  "payment_verified",
  "booking_confirmed",
  "booking_rejected",
  "booking_cancelled",
  "rental_starting",
  "rental_ending",
  "new_booking",
  "new_payment",
  "maintenance",
  "system",
]);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 30 }),
    cnic: varchar("cnic", { length: 20 }),
    role: userRoleEnum("role").default("CUSTOMER").notNull(),
    city: varchar("city", { length: 100 }),
    address: text("address"),
    avatarUrl: text("avatar_url"),
    isActive: boolean("is_active").default(true).notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    index("users_role_idx").on(t.role),
  ]
);

export const owners = pgTable("owners", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 30 }).notNull(),
  email: varchar("email", { length: 255 }),
  city: varchar("city", { length: 100 }),
  address: text("address"),
  status: ownerStatusEnum("status").default("active").notNull(),
  notes: text("notes"),
  publicDisplayName: varchar("public_display_name", { length: 255 }),
  showContactToCustomers: boolean("show_contact_to_customers")
    .default(false)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const vehicles = pgTable(
  "vehicles",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    brand: varchar("brand", { length: 100 }).notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    modelYear: integer("model_year").notNull(),
    color: varchar("color", { length: 50 }).notNull(),
    vehicleType: vehicleTypeEnum("vehicle_type").notNull(),
    registrationNumber: varchar("registration_number", { length: 50 }),
    description: text("description"),
    shortDescription: varchar("short_description", { length: 500 }),
    transmission: varchar("transmission", { length: 50 }),
    fuelType: varchar("fuel_type", { length: 50 }),
    seatingCapacity: integer("seating_capacity"),
    availability: availabilityStatusEnum("availability")
      .default("available")
      .notNull(),
    ownerId: integer("owner_id").references(() => owners.id, {
      onDelete: "set null",
    }),
    isFeatured: boolean("is_featured").default(false).notNull(),
    isPopular: boolean("is_popular").default(false).notNull(),
    viewCount: integer("view_count").default(0).notNull(),
    bookingCount: integer("booking_count").default(0).notNull(),
    averageRating: decimal("average_rating", { precision: 3, scale: 2 }).default(
      "0"
    ),
    reviewCount: integer("review_count").default(0).notNull(),
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    coverImage: text("cover_image"),
    isArchived: boolean("is_archived").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("vehicles_slug_idx").on(t.slug),
    index("vehicles_type_idx").on(t.vehicleType),
    index("vehicles_brand_idx").on(t.brand),
    index("vehicles_availability_idx").on(t.availability),
  ]
);

export const vehicleImages = pgTable("vehicle_images", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id")
    .references(() => vehicles.id, { onDelete: "cascade" })
    .notNull(),
  url: text("url").notNull(),
  alt: varchar("alt", { length: 255 }),
  category: varchar("category", { length: 50 }).default("exterior").notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vehicleFeatures = pgTable("vehicle_features", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id")
    .references(() => vehicles.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rentalPrices = pgTable(
  "rental_prices",
  {
    id: serial("id").primaryKey(),
    vehicleId: integer("vehicle_id")
      .references(() => vehicles.id, { onDelete: "cascade" })
      .notNull(),
    label: varchar("label", { length: 100 }).notNull(),
    durationHours: integer("duration_hours").notNull(),
    price: integer("price").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("rental_prices_vehicle_idx").on(t.vehicleId)]
);

export const bookings = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    bookingId: varchar("booking_id", { length: 30 }).notNull(),
    // Hashed verification code; the raw code is shown once to the customer.
    // Combined with `bookingId` it forms the two-factor lookup credential.
    verificationCodeHash: text("verification_code_hash"),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    vehicleId: integer("vehicle_id")
      .references(() => vehicles.id, { onDelete: "restrict" })
      .notNull(),
    customerName: varchar("customer_name", { length: 255 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 30 }).notNull(),
    customerEmail: varchar("customer_email", { length: 255 }),
    customerCnic: varchar("customer_cnic", { length: 20 }),
    city: varchar("city", { length: 100 }).notNull(),
    pickupDate: timestamp("pickup_date").notNull(),
    returnDate: timestamp("return_date").notNull(),
    durationHours: integer("duration_hours").notNull(),
    durationLabel: varchar("duration_label", { length: 100 }).notNull(),
    unitPrice: integer("unit_price").notNull(),
    totalAmount: integer("total_amount").notNull(),
    status: bookingStatusEnum("status").default("pending").notNull(),
    notes: text("notes"),
    adminNotes: text("admin_notes"),
    cancellationReason: text("cancellation_reason"),
    // Rental mode: self-drive vs with-driver
    rentalMode: rentalModeEnum("rental_mode").default("self_drive").notNull(),
    driverId: integer("driver_id"),
    driverFee: integer("driver_fee").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("bookings_booking_id_idx").on(t.bookingId),
    index("bookings_vehicle_idx").on(t.vehicleId),
    index("bookings_status_idx").on(t.status),
    index("bookings_user_idx").on(t.userId),
    index("bookings_dates_idx").on(t.pickupDate, t.returnDate),
    index("bookings_driver_idx").on(t.driverId),
  ]
);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id")
      .references(() => bookings.id, { onDelete: "cascade" })
      .notNull(),
    amount: integer("amount").notNull(),
    method: varchar("method", { length: 50 }).default("easypaisa").notNull(),
    status: paymentStatusEnum("status").default("pending").notNull(),
    transactionId: varchar("transaction_id", { length: 100 }),
    senderPhone: varchar("sender_phone", { length: 30 }),
    screenshotUrl: text("screenshot_url"),
    paymentDate: timestamp("payment_date"),
    verifiedAt: timestamp("verified_at"),
    verifiedBy: integer("verified_by").references(() => users.id, {
      onDelete: "set null",
    }),
    rejectionReason: text("rejection_reason"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("payments_booking_idx").on(t.bookingId),
    index("payments_status_idx").on(t.status),
  ]
);

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    vehicleId: integer("vehicle_id")
      .references(() => vehicles.id, { onDelete: "cascade" })
      .notNull(),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    bookingId: integer("booking_id").references(() => bookings.id, {
      onDelete: "set null",
    }),
    rating: integer("rating").notNull(),
    title: varchar("title", { length: 255 }),
    comment: text("comment"),
    photoUrl: text("photo_url"),
    customerName: varchar("customer_name", { length: 255 }),
    isApproved: boolean("is_approved").default(false).notNull(),
    isHidden: boolean("is_hidden").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("reviews_vehicle_idx").on(t.vehicleId),
    index("reviews_approved_idx").on(t.isApproved),
  ]
);

export const favorites = pgTable(
  "favorites",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" }),
    vehicleId: integer("vehicle_id")
      .references(() => vehicles.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("favorites_user_vehicle_idx").on(t.userId, t.vehicleId)]
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    link: varchar("link", { length: 500 }),
    isRead: boolean("is_read").default(false).notNull(),
    isAdmin: boolean("is_admin").default(false).notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_admin_idx").on(t.isAdmin),
  ]
);

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => users.id, {
    onDelete: "set null",
  }),
  adminName: varchar("admin_name", { length: 255 }),
  action: varchar("action", { length: 255 }).notNull(),
  targetType: varchar("target_type", { length: 100 }),
  targetId: varchar("target_id", { length: 100 }),
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  ipAddress: varchar("ip_address", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  subject: varchar("subject", { length: 255 }),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ============================================================
// DRIVERS / CANCELLATIONS / REFUNDS
// ============================================================

export const drivers = pgTable(
  "drivers",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 30 }).notNull(),
    licenseNumber: varchar("license_number", { length: 50 }),
    city: varchar("city", { length: 100 }),
    dailyFee: integer("daily_fee").default(2000).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    rating: decimal("rating", { precision: 3, scale: 2 }).default("5"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("drivers_active_idx").on(t.isActive)]
);

// Immutable audit record of every cancellation
export const cancellations = pgTable(
  "cancellations",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id")
      .references(() => bookings.id, { onDelete: "cascade" })
      .notNull(),
    originalAmount: integer("original_amount").notNull(),
    cancellationDeadline: timestamp("cancellation_deadline").notNull(),
    cancelledAt: timestamp("cancelled_at").defaultNow().notNull(),
    cancellationType: cancellationTypeEnum("cancellation_type").notNull(),
    deductionPercentage: integer("deduction_percentage").default(0).notNull(),
    deductionAmount: integer("deduction_amount").default(0).notNull(),
    refundAmount: integer("refund_amount").notNull(),
    refundStatus: refundStatusEnum("refund_status").default("pending").notNull(),
    cancellationReason: text("cancellation_reason"),
    cancelledByUserId: integer("cancelled_by_user_id").references(
      () => users.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("cancellations_booking_idx").on(t.bookingId),
    index("cancellations_status_idx").on(t.refundStatus),
  ]
);

// Refund ledger — never mutates the original payment record
export const refunds = pgTable(
  "refunds",
  {
    id: serial("id").primaryKey(),
    bookingId: integer("booking_id")
      .references(() => bookings.id, { onDelete: "cascade" })
      .notNull(),
    paymentId: integer("payment_id").references(() => payments.id, {
      onDelete: "set null",
    }),
    cancellationId: integer("cancellation_id").references(
      () => cancellations.id,
      { onDelete: "set null" }
    ),
    refundAmount: integer("refund_amount").notNull(),
    deductionAmount: integer("deduction_amount").default(0).notNull(),
    originalAmount: integer("original_amount").notNull(),
    refundStatus: refundStatusEnum("refund_status").default("pending").notNull(),
    provider: varchar("provider", { length: 50 }),
    gatewayReference: varchar("gateway_reference", { length: 120 }),
    failureReason: text("failure_reason"),
    notes: text("notes"),
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
    processedBy: integer("processed_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    index("refunds_booking_idx").on(t.bookingId),
    index("refunds_status_idx").on(t.refundStatus),
  ]
);

// ============================================================
// OTP + GUEST BOOKING SESSIONS (accountless customer verification)
// ============================================================

// OTP tables removed - no longer using OTP verification system

// ============================================================
// SUPPORT CHATBOT
// ============================================================

export const chatConversations = pgTable(
  "chat_conversations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    // Stable id kept in the browser (for guest cross-reload grouping).
    clientId: varchar("client_id", { length: 80 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("chat_convo_user_idx").on(t.userId)]
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id")
      .references(() => chatConversations.id, { onDelete: "cascade" })
      .notNull(),
    // "user" | "assistant"
    sender: varchar("sender", { length: 16 }).notNull(),
    content: text("content").notNull(),
    intent: varchar("intent", { length: 40 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("chat_messages_convo_idx").on(t.conversationId),
    index("chat_messages_intent_idx").on(t.intent),
  ]
);

// ============================================================
// ADVANCED PLATFORM MODULES
// ============================================================

export const licenseStatusEnum = pgEnum("license_status", [
  "not_submitted",
  "submitted",
  "under_review",
  "verified",
  "rejected",
]);

export const trackingStatusEnum = pgEnum("tracking_status", [
  "online",
  "offline",
  "unavailable",
]);

// Digital driving-license verification (sensitive – admin-only visibility)
export const licenseVerifications = pgTable(
  "license_verifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" }),
    licenseNumberMasked: varchar("license_number_masked", { length: 40 }),
    // Stored encrypted at rest (AES-256-GCM) – never returned to clients.
    licenseNumberEncrypted: text("license_number_encrypted"),
    fullName: varchar("full_name", { length: 255 }),
    cnic: varchar("cnic", { length: 20 }),
    dateOfBirth: varchar("date_of_birth", { length: 20 }),
    expiryDate: varchar("expiry_date", { length: 20 }),
    documentUrl: text("document_url"),
    status: licenseStatusEnum("status").default("not_submitted").notNull(),
    reviewedBy: integer("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("license_user_idx").on(t.userId),
    index("license_status_idx").on(t.status),
  ]
);

// Authorized GPS devices bound to a vehicle
export const gpsDevices = pgTable(
  "gps_devices",
  {
    id: serial("id").primaryKey(),
    deviceId: varchar("device_id", { length: 100 }).notNull(),
    vehicleId: integer("vehicle_id").references(() => vehicles.id, {
      onDelete: "cascade",
    }),
    label: varchar("label", { length: 120 }),
    // Hashed shared secret used to authenticate location pushes.
    secretHash: text("secret_hash"),
    trackingEnabled: boolean("tracking_enabled").default(false).notNull(),
    authorizedConsent: boolean("authorized_consent").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("gps_device_id_idx").on(t.deviceId),
    index("gps_vehicle_idx").on(t.vehicleId),
  ]
);

// Latest known location per vehicle (1 row per vehicle, upserted)
export const vehicleLocations = pgTable(
  "vehicle_locations",
  {
    id: serial("id").primaryKey(),
    vehicleId: integer("vehicle_id")
      .references(() => vehicles.id, { onDelete: "cascade" })
      .notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
    speed: decimal("speed", { precision: 6, scale: 2 }),
    heading: decimal("heading", { precision: 6, scale: 2 }),
    status: trackingStatusEnum("status").default("offline").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("vehicle_location_vehicle_idx").on(t.vehicleId)]
);

// Append-only tracking history (retention policy applied on write)
export const trackingEvents = pgTable(
  "tracking_events",
  {
    id: serial("id").primaryKey(),
    vehicleId: integer("vehicle_id")
      .references(() => vehicles.id, { onDelete: "cascade" })
      .notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
    recordedAt: timestamp("recorded_at").defaultNow().notNull(),
  },
  (t) => [index("tracking_events_vehicle_idx").on(t.vehicleId)]
);

// Notification delivery logs
export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  toAddress: varchar("to_address", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  template: varchar("template", { length: 100 }),
  provider: varchar("provider", { length: 50 }).default("mock").notNull(),
  status: varchar("status", { length: 30 }).default("queued").notNull(),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const smsLogs = pgTable("sms_logs", {
  id: serial("id").primaryKey(),
  toNumber: varchar("to_number", { length: 30 }).notNull(),
  message: text("message").notNull(),
  provider: varchar("provider", { length: 50 }).default("mock").notNull(),
  status: varchar("status", { length: 30 }).default("queued").notNull(),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  bookings: many(bookings),
  favorites: many(favorites),
  reviews: many(reviews),
  notifications: many(notifications),
}));

export const ownersRelations = relations(owners, ({ many }) => ({
  vehicles: many(vehicles),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  owner: one(owners, {
    fields: [vehicles.ownerId],
    references: [owners.id],
  }),
  images: many(vehicleImages),
  features: many(vehicleFeatures),
  prices: many(rentalPrices),
  bookings: many(bookings),
  reviews: many(reviews),
  favorites: many(favorites),
}));

export const vehicleImagesRelations = relations(vehicleImages, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleImages.vehicleId],
    references: [vehicles.id],
  }),
}));

export const vehicleFeaturesRelations = relations(
  vehicleFeatures,
  ({ one }) => ({
    vehicle: one(vehicles, {
      fields: [vehicleFeatures.vehicleId],
      references: [vehicles.id],
    }),
  })
);

export const rentalPricesRelations = relations(rentalPrices, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [rentalPrices.vehicleId],
    references: [vehicles.id],
  }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  vehicle: one(vehicles, {
    fields: [bookings.vehicleId],
    references: [vehicles.id],
  }),
  payments: many(payments),
  reviews: many(reviews),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
  verifier: one(users, {
    fields: [payments.verifiedBy],
    references: [users.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [reviews.vehicleId],
    references: [vehicles.id],
  }),
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  booking: one(bookings, {
    fields: [reviews.bookingId],
    references: [bookings.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  vehicle: one(vehicles, {
    fields: [favorites.vehicleId],
    references: [vehicles.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Vehicle = typeof vehicles.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Owner = typeof owners.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Setting = typeof settings.$inferSelect;
// OTP types removed - no longer using OTP verification system
export type ChatConversation = typeof chatConversations.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
export type Cancellation = typeof cancellations.$inferSelect;
export type Refund = typeof refunds.$inferSelect;
export type LicenseVerification = typeof licenseVerifications.$inferSelect;
export type GpsDevice = typeof gpsDevices.$inferSelect;
export type VehicleLocation = typeof vehicleLocations.$inferSelect;
export type TrackingEvent = typeof trackingEvents.$inferSelect;

export const licenseVerificationsRelations = relations(
  licenseVerifications,
  ({ one }) => ({
    user: one(users, {
      fields: [licenseVerifications.userId],
      references: [users.id],
    }),
    reviewer: one(users, {
      fields: [licenseVerifications.reviewedBy],
      references: [users.id],
    }),
  })
);

export const gpsDevicesRelations = relations(gpsDevices, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [gpsDevices.vehicleId],
    references: [vehicles.id],
  }),
}));

export const vehicleLocationsRelations = relations(
  vehicleLocations,
  ({ one }) => ({
    vehicle: one(vehicles, {
      fields: [vehicleLocations.vehicleId],
      references: [vehicles.id],
    }),
  })
);
