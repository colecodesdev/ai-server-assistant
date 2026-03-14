/**
 * Database types for Old Florida Fish House AI Server Assistant.
 * These types match the Supabase schema defined in supabase/migration.sql.
 *
 * The Database type is used by the Supabase client for type-safe queries.
 * The individual types (Restaurant, Menu, MenuItem, etc.) are used throughout the app.
 */

// ============================================================
// Enums
// ============================================================

export type UserRole = "staff" | "admin";
export type AllergenStatus = "contains" | "free_of" | "verify";
export type DietaryTagStatus = "confirmed" | "verify";
export type PairingType = "wine" | "cocktail" | "sake" | "beer" | "non_alcoholic";
export type StaffNoteType = "prep" | "upsell" | "common_question" | "general";

// ============================================================
// Table Row Types
// ============================================================

export interface Restaurant {
  id: string;
  name: string;
  tagline: string | null;
  story: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  cross_contamination_disclaimer: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KeyPerson {
  id: string;
  restaurant_id: string;
  name: string;
  role: string;
  bio: string | null;
  is_public: boolean;
  sort_order: number;
}

export interface ServiceSetting {
  id: string;
  restaurant_id: string;
  name: string;
  days_available: string | null;
  hours: string | null;
  notes: string | null;
}

export interface Menu {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

export interface MenuServiceSetting {
  menu_id: string;
  service_setting_id: string;
}

export interface MenuCategory {
  id: string;
  menu_id: string;
  name: string;
  category_notes: string | null;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  category_id: string;
  item_name: string;
  price: string;
  available_during: string | null;
  menu_flags: string[];
  description_short: string | null;
  description_long: string | null;
  ingredients_high_level: string | null;
  ingredients_detailed: string | null;
  modification_notes: string | null;
  seasonal_availability: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Allergen {
  id: string;
  name: string;
}

export interface DietaryTag {
  id: string;
  name: string;
}

export interface ItemAllergen {
  id: string;
  item_id: string;
  allergen_id: string;
  status: AllergenStatus;
  notes: string | null;
}

export interface ItemDietaryTag {
  id: string;
  item_id: string;
  dietary_tag_id: string;
  status: DietaryTagStatus;
}

export interface ItemPairing {
  id: string;
  item_id: string;
  pairing_type: PairingType;
  recommendation: string | null;
  paired_item_id: string | null;
}

export interface ItemStaffNote {
  id: string;
  item_id: string;
  note_type: StaffNoteType;
  content: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

// ============================================================
// Joined / Enriched Types (for API responses)
// ============================================================

export interface MenuItemWithDetails extends MenuItem {
  allergens: (ItemAllergen & { allergen: Allergen })[];
  dietary_tags: (ItemDietaryTag & { dietary_tag: DietaryTag })[];
  pairings: ItemPairing[];
  staff_notes?: ItemStaffNote[];
}

export interface MenuCategoryWithItems extends MenuCategory {
  items: MenuItem[];
}

export interface MenuWithCategories extends Menu {
  categories: MenuCategoryWithItems[];
}

// ============================================================
// Supabase Database Type (for typed client)
// ============================================================

export interface Database {
  public: {
    Tables: {
      restaurant: {
        Row: Restaurant;
        Insert: Omit<Restaurant, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Restaurant, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      key_people: {
        Row: KeyPerson;
        Insert: Omit<KeyPerson, "id">;
        Update: Partial<Omit<KeyPerson, "id">>;
        Relationships: [];
      };
      service_settings: {
        Row: ServiceSetting;
        Insert: Omit<ServiceSetting, "id">;
        Update: Partial<Omit<ServiceSetting, "id">>;
        Relationships: [];
      };
      menus: {
        Row: Menu;
        Insert: Omit<Menu, "id">;
        Update: Partial<Omit<Menu, "id">>;
        Relationships: [];
      };
      menu_service_settings: {
        Row: MenuServiceSetting;
        Insert: MenuServiceSetting;
        Update: Partial<MenuServiceSetting>;
        Relationships: [];
      };
      menu_categories: {
        Row: MenuCategory;
        Insert: Omit<MenuCategory, "id">;
        Update: Partial<Omit<MenuCategory, "id">>;
        Relationships: [];
      };
      menu_items: {
        Row: MenuItem;
        Insert: Omit<MenuItem, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<MenuItem, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      allergens: {
        Row: Allergen;
        Insert: Omit<Allergen, "id">;
        Update: Partial<Omit<Allergen, "id">>;
        Relationships: [];
      };
      dietary_tags: {
        Row: DietaryTag;
        Insert: Omit<DietaryTag, "id">;
        Update: Partial<Omit<DietaryTag, "id">>;
        Relationships: [];
      };
      item_allergens: {
        Row: ItemAllergen;
        Insert: Omit<ItemAllergen, "id">;
        Update: Partial<Omit<ItemAllergen, "id">>;
        Relationships: [];
      };
      item_dietary_tags: {
        Row: ItemDietaryTag;
        Insert: Omit<ItemDietaryTag, "id">;
        Update: Partial<Omit<ItemDietaryTag, "id">>;
        Relationships: [];
      };
      item_pairings: {
        Row: ItemPairing;
        Insert: Omit<ItemPairing, "id">;
        Update: Partial<Omit<ItemPairing, "id">>;
        Relationships: [];
      };
      item_staff_notes: {
        Row: ItemStaffNote;
        Insert: Omit<ItemStaffNote, "id">;
        Update: Partial<Omit<ItemStaffNote, "id">>;
        Relationships: [];
      };
      users: {
        Row: User;
        Insert: User;
        Update: Partial<User>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      allergen_status: AllergenStatus;
      dietary_tag_status: DietaryTagStatus;
      pairing_type: PairingType;
      staff_note_type: StaffNoteType;
    };
    CompositeTypes: Record<string, never>;
  };
}
