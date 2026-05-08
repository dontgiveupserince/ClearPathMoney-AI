/*
  # Create categories table

  ## Summary
  Moves budget categories from browser localStorage into a per-user
  Supabase table. Each row is a category with a monthly spending limit.

  ## New Tables
  - `categories`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK -> auth.users, ON DELETE CASCADE)
    - `name` (text)
    - `monthly_limit` (numeric(12,2), default 0, >= 0)
    - `color` (text)
    - `icon` (text, nullable)
    - timestamps

  ## Security
  - RLS enabled with own-row policies for select/insert/update/delete.
*/

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  monthly_limit numeric(12, 2) NOT NULL DEFAULT 0 CHECK (monthly_limit >= 0),
  color text NOT NULL DEFAULT '#6B7280',
  icon text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS categories_user_id_idx ON categories(user_id);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own categories"
  ON categories FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON categories FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON categories FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON categories FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
