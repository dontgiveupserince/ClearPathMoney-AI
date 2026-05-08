const ACCOUNTS_KEY = 'cp_local_accounts';
const SESSION_KEY = 'cp_local_session';

interface LocalAccount {
  email: string;
  password: string;
}

export interface LocalSession {
  user: { id: string; email: string };
}

function getAccounts(): LocalAccount[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveAccounts(accounts: LocalAccount[]): void {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function getLocalSession(): LocalSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setLocalSession(email: string): LocalSession {
  const session: LocalSession = { user: { id: btoa(email), email } };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearLocalSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export async function signUpLocal(email: string, password: string): Promise<{ session: LocalSession | null; error: string | null }> {
  const accounts = getAccounts();
  if (accounts.find((a) => a.email.toLowerCase() === email.toLowerCase())) {
    return { session: null, error: 'An account with this email already exists.' };
  }
  accounts.push({ email: email.toLowerCase(), password });
  saveAccounts(accounts);
  return { session: setLocalSession(email.toLowerCase()), error: null };
}

export async function signInLocal(email: string, password: string): Promise<{ session: LocalSession | null; error: string | null }> {
  const accounts = getAccounts();
  const account = accounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
  if (!account) {
    return { session: null, error: 'No account found with this email.' };
  }
  if (account.password !== password) {
    return { session: null, error: 'Incorrect password.' };
  }
  return { session: setLocalSession(account.email), error: null };
}

export async function resetPasswordLocal(email: string): Promise<{ error: string | null }> {
  const accounts = getAccounts();
  const exists = accounts.some((a) => a.email.toLowerCase() === email.toLowerCase());
  if (!exists) {
    return { error: 'No account found with this email.' };
  }
  return { error: null };
}
