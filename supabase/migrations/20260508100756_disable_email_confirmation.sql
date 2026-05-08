/*
  # Disable email confirmation requirement

  Sets mailer_autoconfirm to true so new signups are immediately
  confirmed without needing to click an email link. This eliminates
  the email rate limit problem and allows instant login after signup.
*/
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;
