# Rent

A rent payment and management system for shared housing (PG/coliving spaces). Tenants can browse rooms, book beds, pay rent and deposits online, and raise complaints. Admins can manage rooms, tenants, payments, and settings from a dedicated dashboard.

## Tech Stack

**Frontend (client/)**
- Next.js (App Router) + React
- TypeScript
- Tailwind CSS + DaisyUI
- Axios (API calls)
- Razorpay (payments)
- React Hot Toast (notifications)

**Backend (server/)**
- Hono (lightweight web framework)
- Cloudflare Workers (serverless hosting)
- Cloudflare D1 (SQLite database)
- Drizzle ORM (database queries)
- Zod (input validation)
- JWT (authentication)
- Google OAuth + email/password login

## What It Does

- **Public home page** — shows available rooms and beds with a booking flow
- **Tenant dashboard** — view booking details, pay rent, track history, raise complaints, update profile
- **Admin dashboard** — manage tenants, rooms, bookings, payments, complaints, and global settings (rent, deposit, late fees)
- **Payments** — Razorpay integration for security deposits, plus manual payment recording for cash/UPI
- **Notifications** — Telegram alerts to the admin for payment verifications

## Folder Structure

```
rent/
├── client/                 # Next.js frontend
│   ├── app/                # Pages (App Router)
│   │   ├── admin/          # Admin dashboard pages
│   │   ├── auth/           # Login / signup pages
│   │   ├── dashboard/      # Tenant dashboard pages
│   │   └── page.tsx        # Public home page
│   ├── components/         # Reusable UI components
│   ├── context/            # React context (auth, etc.)
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities (API client, Razorpay, etc.)
│   └── public/             # Static assets
│
└── server/                 # Hono backend (Cloudflare Workers)
    ├── src/
    │   ├── routes/         # API routes (auth, rooms, bookings, payments, complaints, admin)
    │   ├── db/             # Database schema and Drizzle config
    │   ├── middleware/     # Auth and other middleware
    │   ├── services/       # Business logic
    │   ├── types/          # TypeScript types
    │   ├── utils/          # Helper functions
    │   ├── validators/     # Zod validators
    │   └── index.ts        # App entry point
    ├── migrations/         # D1 database migrations
    └── scripts/            # DB seeding scripts
```

## Quick Start

**Frontend**
```bash
cd client
pnpm install
pnpm dev          # runs on http://localhost:3000
```

**Backend**
```bash
cd server
pnpm install
npx wrangler login
pnpm dev          # runs on http://localhost:8787
```