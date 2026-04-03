#!/usr/bin/env node
/**
 * Seed Database Script
 * 
 * Usage:
 *   node scripts/seed-db.js --remote    # Seed remote database
 *   node scripts/seed-db.js --local     # Seed local database
 * 
 * This script:
 * 1. Reads the seed_remote.sql file
 * 2. Executes it against the specified D1 database
 * 3. Verifies the seed data was created
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const isRemote = args.includes('--remote');
const isLocal = args.includes('--local');

if (!isRemote && !isLocal) {
  console.error('❌ Please specify --remote or --local flag');
  console.error('Usage: node scripts/seed-db.js --remote');
  console.error('       node scripts/seed-db.js --local');
  process.exit(1);
}

const seedFile = path.join(__dirname, '..', 'seed_remote.sql');
const flag = isRemote ? '--remote' : '--local';

console.log(`\n🌱 Seeding ${isRemote ? 'remote' : 'local'} D1 database...\n`);

try {
  // Check if seed file exists
  if (!fs.existsSync(seedFile)) {
    throw new Error(`Seed file not found: ${seedFile}`);
  }

  // Execute the seed SQL
  console.log('📝 Executing seed SQL...');
  const result = execSync(
    `npx wrangler d1 execute rent ${flag} --file="${seedFile}"`,
    {
      cwd: path.join(__dirname, '..'),
      encoding: 'utf8',
      stdio: 'inherit'
    }
  );

  console.log('\n✅ Database seeded successfully!\n');

  // Show summary
  console.log('📊 Seed Summary:');
  console.log('   - 1 Admin user (admin@pg.com / admin123)');
  console.log('   - 2 Tenant users (tenant1@pg.com, tenant2@pg.com)');
  console.log('   - 3 Rooms (Room 101, 202, 301)');
  console.log('   - 7 Beds total');
  console.log('   - Default settings configured\n');

} catch (error) {
  console.error('\n❌ Failed to seed database:');
  console.error(error.message);
  process.exit(1);
}
