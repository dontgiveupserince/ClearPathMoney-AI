/*
  # Drop incomes.gross_amount

  ## Summary
  Income tracking simplifies to net only — the amount that actually
  arrives in the user's bank account. Gross was added in the original
  income migration but is dropped here as part of the UX simplification.

  ## Change
  - `incomes.gross_amount` column removed.

  Net amount stays as the source of truth for budgeting and AI insights.
*/

ALTER TABLE incomes DROP COLUMN IF EXISTS gross_amount;
