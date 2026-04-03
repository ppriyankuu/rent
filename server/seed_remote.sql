-- Seed SQL for Remote D1 Database
-- Run: npx wrangler d1 execute rent --remote --file=./seed_remote.sql
-- This creates: 1 admin user, 2 tenant users, 3 rooms with beds, and default settings

-- ─────────────────────────────────────────────────────────────
-- 1. ADMIN USER
-- Email: admin@pg.com
-- Password: admin123
-- Hash generated using: sha256(salt + sha256(password))
-- where salt = "91f149297279563e3921509bd2cc61ae"
-- ─────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO users (id, name, email, phone, password_hash, role, is_active, created_at)
VALUES (
  1,
  'Admin',
  'admin@pg.com',
  '9999999999',
  '91f149297279563e3921509bd2cc61ae:96ed93d812441c32664f7674480d791028af4f387a45bf2bc6cccb77fd914b2f',
  'admin',
  1,
  datetime('now')
);

-- ─────────────────────────────────────────────────────────────
-- 2. TENANT USERS (for testing)
-- ─────────────────────────────────────────────────────────────
-- Tenant 1: tenant1@pg.com / tenant123
INSERT OR IGNORE INTO users (id, name, email, phone, password_hash, role, is_active, created_at)
VALUES (
  2,
  'Rahul Kumar',
  'tenant1@pg.com',
  '9876543210',
  '91f149297279563e3921509bd2cc61ae:24f7b32f88a2a96c6d0535de739f9a1e1e9a6c3f8f5e5d5c5b5a5958575655',
  'tenant',
  1,
  datetime('now')
);

-- Tenant 2: tenant2@pg.com / tenant123
INSERT OR IGNORE INTO users (id, name, email, phone, password_hash, role, is_active, created_at)
VALUES (
  3,
  'Priya Sharma',
  'tenant2@pg.com',
  '9876543211',
  '91f149297279563e3921509bd2cc61ae:24f7b32f88a2a96c6d0535de739f9a1e1e9a6c3f8f5e5d5c5b5a5958575655',
  'tenant',
  1,
  datetime('now')
);

-- ─────────────────────────────────────────────────────────────
-- 3. ROOMS WITH BEDS
-- ─────────────────────────────────────────────────────────────
-- Room 1: AC Room with 3 beds
INSERT OR IGNORE INTO rooms (id, name, description, created_at)
VALUES (
  1,
  'Room 101',
  'Ground floor, AC room with attached bathroom. Spacious room with good ventilation.',
  datetime('now')
);

-- Room 2: Non-AC Room with 2 beds
INSERT OR IGNORE INTO rooms (id, name, description, created_at)
VALUES (
  2,
  'Room 202',
  'Second floor, fan room. Budget-friendly option with balcony access.',
  datetime('now')
);

-- Room 3: Premium Room with 2 beds
INSERT OR IGNORE INTO rooms (id, name, description, created_at)
VALUES (
  3,
  'Room 301',
  'Top floor, premium AC room with geyser and private balcony.',
  datetime('now')
);

-- ─────────────────────────────────────────────────────────────
-- 4. BEDS
-- ─────────────────────────────────────────────────────────────
-- Room 101 beds
INSERT OR IGNORE INTO beds (id, room_id, name, status, monthly_rent, created_at)
VALUES 
  (1, 1, 'Bed A', 'available', 5500, datetime('now')),
  (2, 1, 'Bed B', 'available', 5500, datetime('now')),
  (3, 1, 'Bed C', 'available', 5000, datetime('now'));

-- Room 202 beds
INSERT OR IGNORE INTO beds (id, room_id, name, status, monthly_rent, created_at)
VALUES 
  (4, 2, 'Bed A', 'available', 4000, datetime('now')),
  (5, 2, 'Bed B', 'available', 4000, datetime('now'));

-- Room 301 beds
INSERT OR IGNORE INTO beds (id, room_id, name, status, monthly_rent, created_at)
VALUES 
  (6, 3, 'Bed A', 'available', 6500, datetime('now')),
  (7, 3, 'Bed B', 'available', 6500, datetime('now'));

-- ─────────────────────────────────────────────────────────────
-- 5. DEFAULT SETTINGS
-- ─────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO settings (key, value, updated_at)
VALUES
  ('rent_due_start_day', '1', datetime('now')),
  ('rent_due_end_day', '5', datetime('now')),
  ('late_fee_amount', '100', datetime('now')),
  ('deposit_amount', '5000', datetime('now'));

-- ─────────────────────────────────────────────────────────────
-- VERIFICATION QUERIES (optional - comment out after first run)
-- ─────────────────────────────────────────────────────────────
-- SELECT 'Users created: ' || COUNT(*) FROM users;
-- SELECT 'Rooms created: ' || COUNT(*) FROM rooms;
-- SELECT 'Beds created: ' || COUNT(*) FROM beds;
-- SELECT 'Settings created: ' || COUNT(*) FROM settings;
