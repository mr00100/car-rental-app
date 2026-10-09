# 🚗 RENT A CAR

**Cars • Bikes • Easy Booking • Easy Rental Management**

A production-ready car & bike rental web application built with Next.js (App Router), TypeScript, Tailwind CSS, Drizzle ORM, and PostgreSQL.

> **This service is available inside the city only.**

## Features

### Customer
- Beautiful landing page with search, featured & popular vehicles
- Car and bike catalogs with filters, sorting, and pagination
- Vehicle detail pages with image gallery (carousel, zoom, fullscreen)
- Flexible database-driven rental pricing
- Full booking flow with availability checks (no double-booking)
- EasyPaisa manual payment workflow (transaction ID submission)
- Booking confirmation with printable receipt (RAC-YYYY-######)
- User registration, login, profile, favorites
- My Bookings dashboard with status tracking
- Reviews & ratings after completed rentals
- Contact form, policies, dark/light/system theme

### Admin (`/admin` — auth protected)
- Dashboard with revenue charts, booking stats, utilization
- Vehicle CRUD (cars & bikes), pricing, features, images, availability
- Owner management
- Booking management (confirm, reject, activate, complete, cancel)
- Payment verification / rejection / refund
- Review moderation
- Contact messages inbox
- Admin notifications with badges
- Audit log of admin actions
- Configurable business settings (EasyPaisa number, policies, etc.)
- Roles: SUPER_ADMIN, ADMIN, STAFF

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Next.js Route Handlers (REST API) |
| Database | PostgreSQL + Drizzle ORM |
| Auth | JWT (jose) in httpOnly cookies, bcrypt password hashing |
| Validation | Zod (client + server) |
| Charts | Recharts |
| Icons | Lucide React |

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your values

# Push schema to database
npx drizzle-kit push

# Seed demo data (vehicles, admin, settings)
npx tsx src/db/seed.ts

# Development
npm run dev

# Production build
npm run build && npm start
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | JWT signing secret (min 32 chars) |
| `ADMIN_EMAIL` | Seed admin email |
| `ADMIN_PASSWORD` | Seed admin password |
| `NEXT_PUBLIC_APP_URL` | Public site URL |
| `ALLOW_RESEED` | Set `true` to allow re-seeding |

**Never commit real secrets.** Use `.env.example` as a template.

## Demo Accounts

After seeding:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | `admin@rentacar.pk` | `Admin@12345` |
| Staff | `staff@rentacar.pk` | `Admin@12345` |
| Customer | `customer@example.com` | `Customer@123` |

## Demo Fleet

**Cars:** Suzuki Mehran, Alto, WagonR, APV · Honda Civic, City, BR-V · Toyota Corolla, Land Cruiser, Vigo 4x4

**Bikes:** Honda CD 70, Honda 125 · Yamaha, Yamaha YBR · Heavy Bike

## EasyPaisa Configuration

1. Log in to `/admin`
2. Open **Settings**
3. Set `easypaisaNumber` and `easypaisaAccountName`
4. Customers send payment manually and submit Transaction ID
5. Admin verifies under **Payments** → status becomes Verified → booking Confirmed

Payment is **never** auto-verified without admin action.

## Security Notes

- Passwords hashed with bcrypt (cost 12)
- JWT sessions in httpOnly, SameSite cookies
- Login rate limiting
- Role-based access control (SUPER_ADMIN / ADMIN / STAFF / CUSTOMER)
- Zod validation on all mutating endpoints
- SQL injection protection via Drizzle parameterized queries
- Security headers (X-Frame-Options, nosniff, etc.)
- Admin actions written to audit log
- No secrets exposed to the client bundle

## Project Structure

```
src/
  app/                  # App Router pages & API routes
    admin/              # Admin panel (protected)
    api/                # REST API
    cars/ bikes/        # Catalogs & detail pages
    bookings/           # Payment & confirmation
    dashboard/          # Customer bookings
  components/           # UI, layout, vehicles, booking, admin
  db/                   # Drizzle schema, client, seed
  lib/                  # Auth, validation, settings, availability
```

## Business Rules Enforced

1. No overlapping confirmed/active bookings on the same vehicle
2. Maintenance/disabled vehicles cannot be booked
3. Prices always loaded from the database
4. Payment stays pending until admin verifies
5. Owner private data hidden from customers by default
6. City-only service disclaimer shown throughout the UI

## License

Private / commercial use as needed.
