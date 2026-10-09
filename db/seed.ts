import "dotenv/config";
import { db, pool } from "./index";
import {
  users,
  owners,
  vehicles,
  vehicleImages,
  vehicleFeatures,
  rentalPrices,
  settings,
  bookings,
  payments,
  reviews,
} from "./schema";
import bcrypt from "bcryptjs";
import { DEFAULT_SETTINGS } from "../lib/settings";

const CAR_IMAGES: Record<string, string[]> = {
  mehran: [
    "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=500&fit=crop",
  ],
  alto: [
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=500&fit=crop",
  ],
  civic: [
    "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&h=500&fit=crop",
  ],
  corolla: [
    "https://images.unsplash.com/photo-1623869675781-0f5505d08e7e?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&h=500&fit=crop",
  ],
  landcruiser: [
    "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&h=500&fit=crop",
  ],
  wagonr: [
    "https://images.unsplash.com/photo-1542362567-b07e54389941?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=800&h=500&fit=crop",
  ],
  brv: [
    "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800&h=500&fit=crop",
  ],
  city: [
    "https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800&h=500&fit=crop",
  ],
  vigo: [
    "https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1563720223185-11003d516935?w=800&h=500&fit=crop",
  ],
  apv: [
    "https://images.unsplash.com/photo-1464219789935-c2d9d9aba644?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1527786356703-4b100091cd2c?w=800&h=500&fit=crop",
  ],
};

const BIKE_IMAGES: Record<string, string[]> = {
  cd70: [
    "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=800&h=500&fit=crop",
  ],
  honda125: [
    "https://images.unsplash.com/photo-1609630875171-b1321377ee65?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1449426468159-d96dbf643f06?w=800&h=500&fit=crop",
  ],
  yamaha: [
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=800&h=500&fit=crop",
  ],
  ybr: [
    "https://images.unsplash.com/photo-1591637333184-19aa84dd9a03?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1615172286990-4b7f1f4f0f1c?w=800&h=500&fit=crop",
  ],
  heavy: [
    "https://images.unsplash.com/photo-1558981853-b8d5f6e3a3c1?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1580310614729-ccd69652492d?w=800&h=500&fit=crop",
  ],
};

function defaultPrices(multiplier = 1) {
  return [
    { label: "3 Hours", durationHours: 3, price: Math.round(2000 * multiplier), sortOrder: 1 },
    { label: "6 Hours", durationHours: 6, price: Math.round(4000 * multiplier), sortOrder: 2 },
    { label: "12 Hours", durationHours: 12, price: Math.round(5000 * multiplier), sortOrder: 3 },
    { label: "1 Day", durationHours: 24, price: Math.round(8000 * multiplier), sortOrder: 4 },
    { label: "2 Days", durationHours: 48, price: Math.round(15000 * multiplier), sortOrder: 5 },
    { label: "3 Days", durationHours: 72, price: Math.round(21000 * multiplier), sortOrder: 6 },
    { label: "7 Days", durationHours: 168, price: Math.round(45000 * multiplier), sortOrder: 7 },
  ];
}

function bikePrices(multiplier = 1) {
  return [
    { label: "3 Hours", durationHours: 3, price: Math.round(500 * multiplier), sortOrder: 1 },
    { label: "6 Hours", durationHours: 6, price: Math.round(800 * multiplier), sortOrder: 2 },
    { label: "12 Hours", durationHours: 12, price: Math.round(1200 * multiplier), sortOrder: 3 },
    { label: "1 Day", durationHours: 24, price: Math.round(1800 * multiplier), sortOrder: 4 },
    { label: "2 Days", durationHours: 48, price: Math.round(3200 * multiplier), sortOrder: 5 },
    { label: "3 Days", durationHours: 72, price: Math.round(4500 * multiplier), sortOrder: 6 },
    { label: "7 Days", durationHours: 168, price: Math.round(10000 * multiplier), sortOrder: 7 },
  ];
}

async function seed() {
  console.log("Seeding database...");

  // Clear existing data (order matters for FKs)
  await db.delete(reviews);
  await db.delete(payments);
  await db.delete(bookings);
  await db.delete(rentalPrices);
  await db.delete(vehicleFeatures);
  await db.delete(vehicleImages);
  await db.delete(vehicles);
  await db.delete(owners);
  await db.delete(settings);
  // Keep users if re-seeding carefully — wipe demo users
  await db.delete(users);

  const adminHash = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || "Admin@12345",
    12
  );
  const customerHash = await bcrypt.hash("Customer@123", 12);

  const [admin] = await db
    .insert(users)
    .values({
      email: process.env.ADMIN_EMAIL || "admin@rentacar.pk",
      passwordHash: adminHash,
      fullName: "Platform Admin",
      phone: "03001234567",
      role: "SUPER_ADMIN",
      city: "Lahore",
      emailVerified: true,
    })
    .returning();

  const [staff] = await db
    .insert(users)
    .values({
      email: "staff@rentacar.pk",
      passwordHash: adminHash,
      fullName: "Support Staff",
      phone: "03009876543",
      role: "STAFF",
      city: "Lahore",
      emailVerified: true,
    })
    .returning();

  const [customer] = await db
    .insert(users)
    .values({
      email: "customer@example.com",
      passwordHash: customerHash,
      fullName: "Ali Khan",
      phone: "03001112233",
      role: "CUSTOMER",
      city: "Lahore",
      cnic: "35202-1234567-1",
      emailVerified: true,
    })
    .returning();

  console.log("Users created:", admin.email, staff.email, customer.email);

  const ownerRows = await db
    .insert(owners)
    .values([
      {
        name: "Ahmed Motors",
        phone: "03005556677",
        email: "ahmed@motors.pk",
        city: "Lahore",
        address: "Jail Road, Lahore",
        publicDisplayName: "Ahmed Motors",
        showContactToCustomers: false,
        status: "active",
      },
      {
        name: "City Wheels",
        phone: "03008889900",
        email: "info@citywheels.pk",
        city: "Lahore",
        address: "MM Alam Road, Lahore",
        publicDisplayName: "City Wheels Fleet",
        showContactToCustomers: true,
        status: "active",
      },
      {
        name: "Bike Hub",
        phone: "03002223344",
        email: "hub@bikehub.pk",
        city: "Lahore",
        address: "Faisal Town, Lahore",
        publicDisplayName: "Bike Hub",
        showContactToCustomers: false,
        status: "active",
      },
    ])
    .returning();

  const carData = [
    {
      name: "Suzuki Mehran",
      slug: "suzuki-mehran",
      brand: "Suzuki",
      model: "Mehran",
      modelYear: 2018,
      color: "White",
      key: "mehran",
      mult: 0.6,
      transmission: "Manual",
      fuelType: "Petrol",
      seats: 4,
      featured: true,
      popular: true,
      features: ["AC", "Manual transmission", "Fuel efficient", "USB"],
      desc: "Economical and reliable city car perfect for short trips and daily commuting. Easy to park and fuel-efficient.",
      ownerId: ownerRows[0].id,
    },
    {
      name: "Suzuki Alto",
      slug: "suzuki-alto",
      brand: "Suzuki",
      model: "Alto",
      modelYear: 2022,
      color: "Silver",
      key: "alto",
      mult: 0.7,
      transmission: "Automatic",
      fuelType: "Petrol",
      seats: 4,
      featured: true,
      popular: true,
      features: ["AC", "Automatic transmission", "Power steering", "Bluetooth", "USB"],
      desc: "Modern compact hatchback with automatic transmission. Ideal for city driving with great fuel economy.",
      ownerId: ownerRows[0].id,
    },
    {
      name: "Honda Civic",
      slug: "honda-civic",
      brand: "Honda",
      model: "Civic",
      modelYear: 2023,
      color: "Black",
      key: "civic",
      mult: 1.4,
      transmission: "Automatic",
      fuelType: "Petrol",
      seats: 5,
      featured: true,
      popular: true,
      features: ["AC", "Automatic transmission", "Power steering", "Bluetooth", "USB", "Airbags", "ABS", "Reverse camera", "GPS"],
      desc: "Premium sedan with sporty design and advanced features. Perfect for business trips and comfortable long drives within the city.",
      ownerId: ownerRows[1].id,
    },
    {
      name: "Toyota Corolla",
      slug: "toyota-corolla",
      brand: "Toyota",
      model: "Corolla",
      modelYear: 2024,
      color: "White",
      key: "corolla",
      mult: 1.2,
      transmission: "Automatic",
      fuelType: "Petrol",
      seats: 5,
      featured: true,
      popular: true,
      features: ["AC", "Automatic transmission", "Power steering", "Bluetooth", "USB", "Airbags", "ABS", "Reverse camera"],
      desc: "Pakistan's favorite family sedan. Reliable, comfortable, and well-maintained. Ideal for family outings and airport transfers.",
      ownerId: ownerRows[1].id,
    },
    {
      name: "Toyota Land Cruiser",
      slug: "toyota-land-cruiser",
      brand: "Toyota",
      model: "Land Cruiser",
      modelYear: 2021,
      color: "Pearl White",
      key: "landcruiser",
      mult: 3.5,
      transmission: "Automatic",
      fuelType: "Diesel",
      seats: 7,
      featured: true,
      popular: false,
      features: ["AC", "Automatic transmission", "Power steering", "Bluetooth", "USB", "Airbags", "ABS", "GPS", "Reverse camera", "4WD", "Leather seats"],
      desc: "Luxury SUV with unmatched presence and comfort. Perfect for special occasions, VIP transport, and group travel.",
      ownerId: ownerRows[1].id,
    },
    {
      name: "Suzuki WagonR",
      slug: "suzuki-wagonr",
      brand: "Suzuki",
      model: "WagonR",
      modelYear: 2020,
      color: "Grey",
      key: "wagonr",
      mult: 0.85,
      transmission: "Manual",
      fuelType: "Petrol",
      seats: 5,
      featured: false,
      popular: true,
      features: ["AC", "Manual transmission", "Power steering", "USB", "Spacious cabin"],
      desc: "Tall-boy hatchback with surprisingly spacious interior. Great for families who need extra headroom and cargo space.",
      ownerId: ownerRows[0].id,
    },
    {
      name: "Honda BR-V",
      slug: "honda-br-v",
      brand: "Honda",
      model: "BR-V",
      modelYear: 2022,
      color: "Maroon",
      key: "brv",
      mult: 1.5,
      transmission: "Automatic",
      fuelType: "Petrol",
      seats: 7,
      featured: true,
      popular: false,
      features: ["AC", "Automatic transmission", "Power steering", "Bluetooth", "USB", "Airbags", "ABS", "7 Seater"],
      desc: "Compact 7-seater crossover SUV. Perfect for large families and group trips around the city.",
      ownerId: ownerRows[1].id,
    },
    {
      name: "Honda City",
      slug: "honda-city",
      brand: "Honda",
      model: "City",
      modelYear: 2023,
      color: "Blue",
      key: "city",
      mult: 1.15,
      transmission: "Automatic",
      fuelType: "Petrol",
      seats: 5,
      featured: false,
      popular: true,
      features: ["AC", "Automatic transmission", "Power steering", "Bluetooth", "USB", "Airbags", "ABS", "Reverse camera"],
      desc: "Stylish and fuel-efficient sedan with Honda reliability. Excellent choice for daily rentals and business use.",
      ownerId: ownerRows[0].id,
    },
    {
      name: "Toyota Vigo 4x4",
      slug: "toyota-vigo-4x4",
      brand: "Toyota",
      model: "Vigo",
      modelYear: 2019,
      color: "Silver",
      key: "vigo",
      mult: 2.0,
      transmission: "Manual",
      fuelType: "Diesel",
      seats: 5,
      featured: false,
      popular: false,
      features: ["AC", "Manual transmission", "Power steering", "4x4", "ABS", "Bluetooth", "Heavy duty"],
      desc: "Rugged double-cabin pickup with 4x4 capability. Ideal for cargo transport and rough terrain within city limits.",
      ownerId: ownerRows[1].id,
    },
    {
      name: "Suzuki APV",
      slug: "suzuki-apv",
      brand: "Suzuki",
      model: "APV",
      modelYear: 2017,
      color: "White",
      key: "apv",
      mult: 1.3,
      transmission: "Manual",
      fuelType: "Petrol",
      seats: 8,
      featured: false,
      popular: false,
      features: ["AC", "Manual transmission", "8 Seater", "Spacious", "USB"],
      desc: "Spacious multi-purpose van seating up to 8 passengers. Great for group travel, events, and airport shuttles.",
      ownerId: ownerRows[0].id,
    },
  ];

  const bikeData = [
    {
      name: "Honda CD 70",
      slug: "honda-cd-70",
      brand: "Honda",
      model: "CD 70",
      modelYear: 2023,
      color: "Red",
      key: "cd70",
      mult: 0.8,
      transmission: "Manual",
      fuelType: "Petrol",
      seats: 2,
      featured: true,
      popular: true,
      features: ["Fuel efficient", "Electric start", "Kick start", "Reliable"],
      desc: "Pakistan's most popular commuter bike. Extremely fuel-efficient and easy to ride. Perfect for short city trips.",
      ownerId: ownerRows[2].id,
    },
    {
      name: "Honda 125",
      slug: "honda-125",
      brand: "Honda",
      model: "CG 125",
      modelYear: 2024,
      color: "Black",
      key: "honda125",
      mult: 1.0,
      transmission: "Manual",
      fuelType: "Petrol",
      seats: 2,
      featured: true,
      popular: true,
      features: ["Electric start", "Fuel efficient", "Disc brake", "Comfortable seat"],
      desc: "Powerful 125cc commuter with excellent pickup. Ideal for daily commuting and longer city rides.",
      ownerId: ownerRows[2].id,
    },
    {
      name: "Yamaha YBR",
      slug: "yamaha-ybr",
      brand: "Yamaha",
      model: "YBR 125",
      modelYear: 2022,
      color: "Blue",
      key: "ybr",
      mult: 1.1,
      transmission: "Manual",
      fuelType: "Petrol",
      seats: 2,
      featured: true,
      popular: true,
      features: ["Electric start", "Digital meter", "Disc brake", "Comfortable"],
      desc: "Stylish Yamaha with smooth engine and modern features. Great balance of performance and economy.",
      ownerId: ownerRows[2].id,
    },
    {
      name: "Yamaha",
      slug: "yamaha-standard",
      brand: "Yamaha",
      model: "YBR G",
      modelYear: 2021,
      color: "Black",
      key: "yamaha",
      mult: 1.0,
      transmission: "Manual",
      fuelType: "Petrol",
      seats: 2,
      featured: false,
      popular: false,
      features: ["Electric start", "Kick start", "Reliable engine"],
      desc: "Dependable Yamaha motorcycle for everyday city travel. Well-maintained and ready to ride.",
      ownerId: ownerRows[2].id,
    },
    {
      name: "Heavy Bike",
      slug: "heavy-bike",
      brand: "Kawasaki",
      model: "Ninja 300",
      modelYear: 2020,
      color: "Green",
      key: "heavy",
      mult: 3.0,
      transmission: "Manual",
      fuelType: "Petrol",
      seats: 2,
      featured: true,
      popular: false,
      features: ["Sport mode", "ABS", "Digital display", "High performance", "Disc brakes"],
      desc: "High-performance sports bike for enthusiasts. Requires valid motorcycle license. Thrilling ride within city limits.",
      ownerId: ownerRows[2].id,
    },
  ];

  async function insertVehicle(
    data: (typeof carData)[0],
    type: "car" | "bike",
    images: string[],
    prices: ReturnType<typeof defaultPrices>
  ) {
    const [v] = await db
      .insert(vehicles)
      .values({
        name: data.name,
        slug: data.slug,
        brand: data.brand,
        model: data.model,
        modelYear: data.modelYear,
        color: data.color,
        vehicleType: type,
        registrationNumber: `LE-${Math.floor(1000 + Math.random() * 9000)}`,
        description: data.desc,
        shortDescription: data.desc.slice(0, 150),
        transmission: data.transmission,
        fuelType: data.fuelType,
        seatingCapacity: data.seats,
        availability: "available",
        ownerId: data.ownerId,
        isFeatured: data.featured,
        isPopular: data.popular,
        coverImage: images[0],
        seoTitle: `Rent ${data.name} ${data.modelYear} in Lahore | Rent A Car`,
        seoDescription: data.desc,
        averageRating: String((4 + Math.random()).toFixed(2)),
        reviewCount: Math.floor(Math.random() * 20),
        bookingCount: Math.floor(Math.random() * 50),
        viewCount: Math.floor(Math.random() * 500),
      })
      .returning();

    await db.insert(vehicleImages).values(
      images.map((url, i) => ({
        vehicleId: v.id,
        url,
        alt: `${data.name} - view ${i + 1}`,
        category: i === 0 ? "exterior" : i === 1 ? "side" : "exterior",
        sortOrder: i,
        isPrimary: i === 0,
      }))
    );

    // Extra gallery placeholders
    await db.insert(vehicleImages).values([
      {
        vehicleId: v.id,
        url: images[0],
        alt: `${data.name} front`,
        category: "front",
        sortOrder: 10,
        isPrimary: false,
      },
      {
        vehicleId: v.id,
        url: images[1] || images[0],
        alt: `${data.name} interior`,
        category: "interior",
        sortOrder: 11,
        isPrimary: false,
      },
    ]);

    if (data.features.length) {
      await db.insert(vehicleFeatures).values(
        data.features.map((name) => ({
          vehicleId: v.id,
          name,
          icon: name.toLowerCase().replace(/\s+/g, "-"),
        }))
      );
    }

    await db.insert(rentalPrices).values(
      prices.map((p) => ({
        vehicleId: v.id,
        label: p.label,
        durationHours: p.durationHours,
        price: p.price,
        sortOrder: p.sortOrder,
        isActive: true,
      }))
    );

    return v;
  }

  for (const car of carData) {
    await insertVehicle(
      car,
      "car",
      CAR_IMAGES[car.key] || CAR_IMAGES.corolla,
      defaultPrices(car.mult)
    );
  }

  for (const bike of bikeData) {
    await insertVehicle(
      bike,
      "bike",
      BIKE_IMAGES[bike.key] || BIKE_IMAGES.cd70,
      bikePrices(bike.mult)
    );
  }

  // Settings
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.insert(settings).values({ key, value });
  }

  // Sample review
  const allVehicles = await db.select().from(vehicles).limit(3);
  if (allVehicles.length && customer) {
    for (const v of allVehicles) {
      await db.insert(reviews).values({
        vehicleId: v.id,
        userId: customer.id,
        rating: 5,
        title: "Great experience!",
        comment:
          "Vehicle was clean, well-maintained, and exactly as described. Smooth booking process. Highly recommended!",
        customerName: customer.fullName,
        isApproved: true,
      });
    }
  }

  console.log("Seed complete!");
  console.log("Admin login:", process.env.ADMIN_EMAIL || "admin@rentacar.pk");
  console.log("Customer login: customer@example.com / Customer@123");
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    pool.end();
    process.exit(1);
  });
