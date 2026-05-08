/*
  # Create user_settings table

  ## Summary
  One row per user, holding non-financial app preferences (currency,
  payoff method, extra debt payment, AI privacy acknowledgement). Replaces
  the localStorage `cp_settings` blob.

  Note: deprecated fields `monthlyIncome` and `openAiApiKey` are not
  carried over. Income lives in the `incomes` table; the OpenAI key now
  lives as an Edge Function env var.

  ## New Tables
  - `user_settings`
    - `user_id` (uuid, PK, FK -> auth.users, ON DELETE CASCADE)
    - `currency` (text, default 'USD')
    - `payoff_method` (text, CHECK in 'snowball','avalanche')
    - `extra_debt_payment` (numeric(12,2), >= 0, default 0)
    - `ai_privacy_acknowledged` (boolean, default false)
    - timestamps

  ## Security
  - RLS enabled with own-row policies. Users can only see/modify their
    own settings row.
*/

CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'USD',
  payoff_method text NOT NULL DEFAULT 'avalanche'
    CHECK (payoff_method IN ('snowball', 'avalanche')),
  extra_debt_payment numeric(12, 2) NOT NULL DEFAULT 0
    CHECK (extra_debt_payment >= 0),
  ai_privacy_acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own settings"
  ON user_settings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
