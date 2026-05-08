/*
  # Create transactions table

  ## Summary
  Moves expense / income transactions from browser localStorage into a
  per-user Supabase table. Each row references a category via a nullable
  FK with ON DELETE SET NULL so deleting a category leaves transactions
  intact (they show as Uncategorized).

  ## New Tables
  - `transactions`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK -> auth.users, ON DELETE CASCADE)
    - `amount` (numeric(12,2), >= 0)
    - `txn_date` (date)
    - `category_id` (uuid, FK -> categories, ON DELETE SET NULL, nullable)
    - `merchant` (text)
    - `note` (text, nullable)
    - `txn_type` (text, CHECK in 'expense','income')
    - timestamps

  ## Security
  - RLS enabled with own-row policies for select/insert/update/delete.
*/

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  txn_date date NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  merchant text NOT NULL DEFAULT '',
  note text,
  txn_type text NOT NULL CHECK (txn_type IN ('expense', 'income')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON transactions(user_id);
CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON transactions(user_id, txn_date DESC);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON transactions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON transactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
