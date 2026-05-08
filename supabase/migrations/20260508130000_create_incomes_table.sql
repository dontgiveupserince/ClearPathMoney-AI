/*
  # Create incomes table

  ## Summary
  Adds an `incomes` table to store each user's income sources. Replaces the
  single `monthlyIncome` value previously kept in app settings, supporting
  multiple sources, gross/net amounts, and varying frequencies.

  ## New Tables
  - `incomes`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK -> auth.users, ON DELETE CASCADE)
    - `source_name` (text, NOT NULL)
    - `income_type` (text, NOT NULL, CHECK in allowed set)
    - `gross_amount` (numeric(12,2), NOT NULL, >= 0)
    - `net_amount` (numeric(12,2), NOT NULL, >= 0)
    - `frequency` (text, NOT NULL, CHECK in allowed set)
    - `notes` (text, nullable)
    - `created_at` (timestamptz, default now())
    - `updated_at` (timestamptz, default now())

  ## Security
  - RLS enabled. Users can only select/insert/update/delete their own rows.
*/

CREATE TABLE IF NOT EXISTS incomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_name text NOT NULL,
  income_type text NOT NULL CHECK (income_type IN (
    'salary', 'business', 'investment', 'rental', 'pension', 'government', 'other'
  )),
  gross_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
  net_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
  frequency text NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'yearly')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS incomes_user_id_idx ON incomes(user_id);

ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own incomes"
  ON incomes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own incomes"
  ON incomes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own incomes"
  ON incomes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own incomes"
  ON incomes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
