/*
  # Create debts table

  ## Summary
  Moves debt accounts from browser localStorage into per-user Supabase.

  ## New Tables
  - `debts`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK -> auth.users, ON DELETE CASCADE)
    - `name` (text)
    - `debt_type` (text, CHECK in allowed set)
    - `balance` (numeric(12,2), >= 0)
    - `apr` (numeric(7,3), >= 0)
    - `minimum_payment` (numeric(12,2), >= 0)
    - `due_date` (date, nullable)
    - timestamps

  ## Security
  - RLS enabled with own-row policies for select/insert/update/delete.
*/

CREATE TABLE IF NOT EXISTS debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  debt_type text NOT NULL CHECK (debt_type IN (
    'credit_card', 'student_loan', 'auto_loan', 'mortgage',
    'personal_loan', 'medical', 'other'
  )),
  balance numeric(12, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  apr numeric(7, 3) NOT NULL DEFAULT 0 CHECK (apr >= 0),
  minimum_payment numeric(12, 2) NOT NULL DEFAULT 0 CHECK (minimum_payment >= 0),
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS debts_user_id_idx ON debts(user_id);

ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own debts"
  ON debts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own debts"
  ON debts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own debts"
  ON debts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own debts"
  ON debts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
