#!/bin/bash

# Reset local D1 database and apply all migrations + seed

echo "🗑️  Deleting local D1 database..."
rm -rf .wrangler/state

echo "📦 Applying all migrations..."
pnpm db:migrate:local

echo "🌱 Seeding database..."
npx wrangler d1 execute rent --local --file=seed.sql

echo "✅ Done! You can now login with:"
echo "   Email: admin@pg.com"
echo "   Password: admin123"
