import { notFound } from "next/navigation";
import { db } from "@/db";
import { vehicles, rentalPrices, settings } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { PublicShell } from "@/components/layout/public-shell";
import { BookFlow } from "@/components/booking/book-flow";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    pickup?: string;
    return?: string;
    pickupTime?: string;
    returnTime?: string;
    mode?: string;
  }>;
};

export default async function BookPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

  const [vehicle] = await db
    .select()
    .from(vehicles)
    .where(eq(vehicles.slug, slug))
    .limit(1);
  if (!vehicle || vehicle.isArchived) notFound();

  const priceRows = await db
    .select()
    .from(rentalPrices)
    .where(
      and(
        eq(rentalPrices.vehicleId, vehicle.id),
        eq(rentalPrices.isActive, true)
      )
    )
    .orderBy(asc(rentalPrices.sortOrder));

  return (
    <PublicShell>
      <BookFlow
        vehicle={{
          id: vehicle.id,
          slug: vehicle.slug,
          name: vehicle.name,
          brand: vehicle.brand,
          modelYear: vehicle.modelYear,
          color: vehicle.color,
          vehicleType: vehicle.vehicleType as "car" | "bike",
          coverImage: vehicle.coverImage,
          availability: vehicle.availability,
        }}
        prices={priceRows}
        defaultPickup={sp.pickup || ""}
        defaultReturn={sp.return || ""}
        defaultPickupTime={sp.pickupTime || "10:00"}
        defaultReturnTime={sp.returnTime || "10:00"}
        defaultMode={(sp.mode as "self_drive" | "with_driver") || "self_drive"}
      />
    </PublicShell>
  );
}
