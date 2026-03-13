-- ============================================================
-- Old Florida Fish House — AI Server Assistant
-- Database Migration Script
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('staff', 'admin');
CREATE TYPE allergen_status AS ENUM ('contains', 'free_of', 'verify');
CREATE TYPE dietary_tag_status AS ENUM ('confirmed', 'verify');
CREATE TYPE pairing_type AS ENUM ('wine', 'cocktail', 'sake', 'beer', 'non_alcoholic');
CREATE TYPE staff_note_type AS ENUM ('prep', 'upsell', 'common_question', 'general');

-- ============================================================
-- TABLES
-- ============================================================

-- Restaurant profile
CREATE TABLE restaurant (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  tagline TEXT,
  website TEXT,
  story TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  cross_contamination_disclaimer TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Key people (chef, beverage director, GM, etc.)
CREATE TABLE key_people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  is_public BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Service settings (Dinner, Brunch, Happy Hour, etc.)
CREATE TABLE service_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  days_available TEXT,
  hours TEXT,
  notes TEXT
);

-- Menus
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurant(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Junction: which menus are available during which service settings
CREATE TABLE menu_service_settings (
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  service_setting_id UUID NOT NULL REFERENCES service_settings(id) ON DELETE CASCADE,
  PRIMARY KEY (menu_id, service_setting_id)
);

-- Menu categories
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_notes TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Menu items
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  price TEXT NOT NULL,
  available_during TEXT,
  menu_flags TEXT[] DEFAULT '{}',
  description_short TEXT,
  description_long TEXT,
  ingredients_high_level TEXT,
  ingredients_detailed TEXT,
  modification_notes TEXT,
  seasonal_availability TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allergens reference table
CREATE TABLE allergens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE
);

-- Dietary tags reference table
CREATE TABLE dietary_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE
);

-- Junction: item ↔ allergen
CREATE TABLE item_allergens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  allergen_id UUID NOT NULL REFERENCES allergens(id) ON DELETE CASCADE,
  status allergen_status NOT NULL DEFAULT 'contains',
  notes TEXT
);

-- Junction: item ↔ dietary tag
CREATE TABLE item_dietary_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  dietary_tag_id UUID NOT NULL REFERENCES dietary_tags(id) ON DELETE CASCADE,
  status dietary_tag_status NOT NULL DEFAULT 'confirmed'
);

-- Item pairings (wine, cocktail, etc.)
CREATE TABLE item_pairings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  pairing_type pairing_type NOT NULL,
  recommendation TEXT,
  paired_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL
);

-- Staff-only notes (prep, upsell, common questions)
CREATE TABLE item_staff_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  note_type staff_note_type NOT NULL,
  content TEXT NOT NULL
);

-- Users (extends Supabase Auth)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'staff'
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_active ON menu_items(is_active);
CREATE INDEX idx_menu_categories_menu ON menu_categories(menu_id);
CREATE INDEX idx_item_allergens_item ON item_allergens(item_id);
CREATE INDEX idx_item_allergens_allergen ON item_allergens(allergen_id);
CREATE INDEX idx_item_dietary_tags_item ON item_dietary_tags(item_id);
CREATE INDEX idx_item_pairings_item ON item_pairings(item_id);
CREATE INDEX idx_item_staff_notes_item ON item_staff_notes(item_id);
CREATE INDEX idx_key_people_restaurant ON key_people(restaurant_id);
CREATE INDEX idx_menus_restaurant ON menus(restaurant_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_restaurant_updated_at
  BEFORE UPDATE ON restaurant
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW-LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE restaurant ENABLE ROW LEVEL SECURITY;
ALTER TABLE key_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_service_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE dietary_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_allergens ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_dietary_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_pairings ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_staff_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- PUBLIC READ: menu data, restaurant info, allergens, etc.
-- Anyone (including unauthenticated guests) can read.
-- -------------------------------------------------------

CREATE POLICY "Public read: restaurant"
  ON restaurant FOR SELECT
  USING (true);

CREATE POLICY "Public read: key_people"
  ON key_people FOR SELECT
  USING (true);

CREATE POLICY "Public read: service_settings"
  ON service_settings FOR SELECT
  USING (true);

CREATE POLICY "Public read: menus"
  ON menus FOR SELECT
  USING (true);

CREATE POLICY "Public read: menu_service_settings"
  ON menu_service_settings FOR SELECT
  USING (true);

CREATE POLICY "Public read: menu_categories"
  ON menu_categories FOR SELECT
  USING (true);

CREATE POLICY "Public read: menu_items"
  ON menu_items FOR SELECT
  USING (true);

CREATE POLICY "Public read: allergens"
  ON allergens FOR SELECT
  USING (true);

CREATE POLICY "Public read: dietary_tags"
  ON dietary_tags FOR SELECT
  USING (true);

CREATE POLICY "Public read: item_allergens"
  ON item_allergens FOR SELECT
  USING (true);

CREATE POLICY "Public read: item_dietary_tags"
  ON item_dietary_tags FOR SELECT
  USING (true);

CREATE POLICY "Public read: item_pairings"
  ON item_pairings FOR SELECT
  USING (true);

-- -------------------------------------------------------
-- STAFF NOTES: Only staff + admin can read
-- -------------------------------------------------------

CREATE POLICY "Staff read: item_staff_notes"
  ON item_staff_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('staff', 'admin')
    )
  );

-- -------------------------------------------------------
-- ADMIN WRITE: Only admin can insert/update/delete data
-- -------------------------------------------------------

-- Helper function to check admin role
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply admin write policies to all content tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'restaurant', 'key_people', 'service_settings', 'menus',
    'menu_service_settings', 'menu_categories', 'menu_items',
    'allergens', 'dietary_tags', 'item_allergens',
    'item_dietary_tags', 'item_pairings', 'item_staff_notes'
  ]
  LOOP
    EXECUTE format(
      'CREATE POLICY "Admin insert: %1$s" ON %1$s FOR INSERT WITH CHECK (is_admin())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Admin update: %1$s" ON %1$s FOR UPDATE USING (is_admin())',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Admin delete: %1$s" ON %1$s FOR DELETE USING (is_admin())',
      tbl
    );
  END LOOP;
END $$;

-- -------------------------------------------------------
-- USERS: Each user reads own record; admin reads all
-- -------------------------------------------------------

CREATE POLICY "Users read own"
  ON users FOR SELECT
  USING (id = auth.uid() OR is_admin());

CREATE POLICY "Admin manage users"
  ON users FOR ALL
  USING (is_admin());
