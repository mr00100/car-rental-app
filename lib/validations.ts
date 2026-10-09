import { z } from "zod";

export const phoneRegex = /^(\+92|0)?3[0-9]{9}$/;
export const cnicRegex = /^[0-9]{5}-?[0-9]{7}-?[0-9]{1}$/;

export const registerSchema = z.object({
  // The lamp registration UI submits firstName + lastName.
  // `fullName` is kept optional for backwards compatibility with other clients.
  fullName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(255)
    .optional(),
  firstName: z.string().trim().min(1, "First name is required").max(255).optional(),
  lastName: z.string().trim().min(1, "Last name is required").max(255).optional(),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .regex(phoneRegex, "Invalid Pakistani phone number (e.g. 03XXXXXXXXX)")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100),
  city: z.string().max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const bookingSchema = z
  .object({
    vehicleId: z.number().int().positive(),
    customerName: z.string().min(2, "Name is required").max(255),
    customerPhone: z
      .string()
      // Tolerate human formatting (spaces/dashes) by normalizing before the
      // rule check. The strict format rule itself is unchanged.
      .transform((v) => v.replace(/[\s-]/g, "").trim())
      .refine((v) => phoneRegex.test(v), {
        message: "Invalid phone number (e.g. 03XXXXXXXXX)",
      }),
    customerEmail: z
      .string()
      .email("Invalid email")
      .optional()
      .or(z.literal("")),
    customerCnic: z
      .string()
      .regex(cnicRegex, "Invalid CNIC format (XXXXX-XXXXXXX-X)")
      .optional()
      .or(z.literal("")),
    city: z.string().min(2, "City is required").max(100),
    pickupDate: z.string().min(1, "Pickup date is required"),
    returnDate: z.string().min(1, "Return date is required"),
    durationHours: z.number().int().positive("Duration is required"),
    durationLabel: z.string().min(1),
    notes: z.string().max(1000).optional(),
    rentalMode: z.enum(["self_drive", "with_driver"]).optional(),
    driverId: z.number().int().positive().optional().nullable(),
  })
  .refine(
    (data) => {
      const pickup = new Date(data.pickupDate);
      const ret = new Date(data.returnDate);
      return ret > pickup;
    },
    { message: "Return date must be after pickup date", path: ["returnDate"] }
  )
  .refine(
    (data) => {
      const pickup = new Date(data.pickupDate);
      return pickup >= new Date(Date.now() - 60 * 60 * 1000);
    },
    { message: "Pickup date cannot be in the past", path: ["pickupDate"] }
  );

export const paymentSubmitSchema = z.object({
  bookingId: z.number().int().positive(),
  transactionId: z
    .string()
    .min(5, "Transaction ID is required")
    .max(100),
  senderPhone: z
    .string()
    .regex(phoneRegex, "Invalid sender phone number"),
  amount: z.number().int().positive("Amount is required"),
  screenshotUrl: z.string().optional(),
  paymentDate: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const vehicleSchema = z.object({
  name: z.string().min(2).max(255),
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  modelYear: z.number().int().min(1990).max(2030),
  color: z.string().min(1).max(50),
  vehicleType: z.enum(["car", "bike"]),
  registrationNumber: z.string().max(50).optional(),
  description: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  transmission: z.string().max(50).optional(),
  fuelType: z.string().max(50).optional(),
  seatingCapacity: z.number().int().min(1).max(50).optional(),
  availability: z
    .enum(["available", "reserved", "rented", "maintenance", "disabled"])
    .optional(),
  ownerId: z.number().int().positive().optional().nullable(),
  isFeatured: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  coverImage: z.string().optional(),
  seoTitle: z.string().max(255).optional(),
  seoDescription: z.string().optional(),
  features: z.array(z.string()).optional(),
  prices: z
    .array(
      z.object({
        label: z.string(),
        durationHours: z.number().int().positive(),
        price: z.number().int().nonnegative(),
        sortOrder: z.number().int().optional(),
      })
    )
    .optional(),
  images: z
    .array(
      z.object({
        url: z.string(),
        alt: z.string().optional(),
        category: z.string().optional(),
        isPrimary: z.boolean().optional(),
      })
    )
    .optional(),
});

export const ownerSchema = z.object({
  name: z.string().min(2).max(255),
  phone: z.string().min(10).max(30),
  email: z.string().email().optional().or(z.literal("")),
  city: z.string().max(100).optional(),
  address: z.string().optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  notes: z.string().optional(),
  publicDisplayName: z.string().max(255).optional(),
  showContactToCustomers: z.boolean().optional(),
});

export const reviewSchema = z.object({
  vehicleId: z.number().int().positive(),
  bookingId: z.number().int().positive().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(255).optional(),
  comment: z.string().max(2000).optional(),
  photoUrl: z.string().optional(),
  customerName: z.string().max(255).optional(),
});

export const contactSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  phone: z.string().max(30).optional(),
  subject: z.string().max(255).optional(),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
});

export const profileUpdateSchema = z.object({
  fullName: z.string().min(2).max(255).optional(),
  phone: z
    .string()
    .regex(phoneRegex, "Invalid phone number")
    .optional()
    .or(z.literal("")),
  city: z.string().max(100).optional(),
  address: z.string().optional(),
  cnic: z
    .string()
    .regex(cnicRegex, "Invalid CNIC format")
    .optional()
    .or(z.literal("")),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(100),
    confirmPassword: z.string().min(8),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
