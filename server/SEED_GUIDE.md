# Database Seed Guide

This document explains how to seed your D1 database with initial test data.

## Quick Start

### Seed Remote Database
```bash
pnpm run db:seed:remote
```

### Seed Local Database (for development)
```bash
pnpm run db:seed:local
```

## Alternative: Direct SQL Execution

### Remote
```bash
npx wrangler d1 execute rent --remote --file=./seed_remote.sql
```

### Local
```bash
npx wrangler d1 execute rent --local --file=./seed_remote.sql
```

## What Gets Seeded

### Users

| Email | Password | Role | Name |
|-------|----------|------|------|
| admin@pg.com | admin123 | admin | Admin |
| tenant1@pg.com | tenant123 | tenant | Rahul Kumar |
| tenant2@pg.com | tenant123 | tenant | Priya Sharma |

### Rooms

| Room | Description | Beds | Rent Range |
|------|-------------|------|------------|
| Room 101 | Ground floor, AC room with attached bathroom | 3 beds | ₹5000-5500 |
| Room 202 | Second floor, fan room with balcony | 2 beds | ₹4000 |
| Room 301 | Top floor, premium AC room with geyser | 2 beds | ₹6500 |

### Settings

| Key | Value | Description |
|-----|-------|-------------|
| rent_due_start_day | 1 | Rent due from 1st of month |
| rent_due_end_day | 5 | Rent due until 5th of month |
| late_fee_amount | 100 | Late fee: ₹100 |
| deposit_amount | 5000 | Default deposit: ₹5000 |

## Verify Seed Data

After seeding, you can verify the data using D1 Studio:

```bash
pnpm run db:studio
```

Or query directly:

```bash
# Count users
npx wrangler d1 execute rent --remote --command "SELECT COUNT(*) as count FROM users;"

# Count rooms
npx wrangler d1 execute rent --remote --command "SELECT COUNT(*) as count FROM rooms;"

# Count beds
npx wrangler d1 execute rent --remote --command "SELECT COUNT(*) as count FROM beds;"
```

## Notes

- **INSERT OR IGNORE** is used, so running the seed multiple times won't create duplicates
- IDs are hardcoded (1, 2, 3...) for consistency, but `INSERT OR IGNORE` prevents conflicts
- Password hashes are pre-computed for the default passwords
- The `created_at` timestamps use `datetime('now')` for SQLite

## Troubleshooting

### "Database does not exist"
Make sure you've created the D1 database and ran migrations first:
```bash
# Create database (if not exists)
# Then run migrations
pnpm run db:migrate:remote

# Then seed
pnpm run db:seed:remote
```

### "Constraint violation" errors
The database might have existing data with conflicting IDs. You can either:
1. Delete the database and recreate it
2. Manually clean up existing data
3. The seed uses `INSERT OR IGNORE` which should skip existing records

### Password doesn't work
The password hashes in the seed file are pre-computed. If you need to change passwords, you'll need to:
1. Use the application's password reset feature
2. Or generate a new hash using the same algorithm (see `src/utils/hash.ts`)
