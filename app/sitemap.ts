import type { MetadataRoute } from "next";
import { db } from "@/db";
import { vehicles } from "@/db/schema";
import { eq } from "drizzle-orm";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/cars`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/bikes`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/how-it-works`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/cancellation`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const rows = await db
      .select({
        slug: vehicles.slug,
        vehicleType: vehicles.vehicleType,
        updatedAt: vehicles.updatedAt,
      })
      .from(vehicles)
      .where(eq(vehicles.isArchived, false));

    const vehiclePages = rows.map((v) => ({
      url: `${base}/${v.vehicleType === "bike" ? "bikes" : "cars"}/${v.slug}`,
      lastModified: v.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    return [...staticPages, ...vehiclePages];
  } catch {
    return staticPages;
  }
}
