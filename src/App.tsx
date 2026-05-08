import { useState, useEffect } from 'react';
import { supabase, supabaseConfigured } from './lib/supabase';
import {
  getLocalSession, signInLocal, signUpLocal, resetPasswordLocal, clearLocalSession,
} from './lib/localAuth';
import AuthPage, { AuthHandlers } from './components/auth/AuthPage';
import CompleteProfileModal from './components/auth/CompleteProfileModal';
import AppShell, { Page } from './components/AppShell';
import Dashboard from './components/dashboard/Dashboard';
import BudgetCategories from './components/budget/BudgetCategories';
import Income from './components/income/Income';
import Expenses from './components/expenses/Expenses';
import Debts from './components/debts/Debts';
import DebtPayoffPlanner from './components/planner/DebtPayoffPlanner';
import AICoach from './components/coach/AICoach';
import Settings from './components/Settings';
import { getAIInsight, saveAIInsight, clearAIInsight } from './lib/storage';
import {
  fetchIncomes, createIncome, updateIncome, deleteIncome, totalMonthlyNet,
} from './lib/incomes';
import {
  fetchCategories, createCategory, updateCategory, deleteCategory, deleteAllCategories,
} from './lib/categories';
import {
  fetchDebts, createDebt, updateDebt, deleteDebt, deleteAllDebts,
} from './lib/debts';
import {
  fetchTransactions, createTransaction, updateTransaction, deleteTransaction, deleteAllTransactions,
} from './lib/transactions';
import {
  fetchUserSettings, upsertUserSettings, deleteUserSettings, DEFAULT_SETTINGS,
} from './lib/userSettings';
import { runLegacyLocalStorageMigration, loadDemoIntoSupabase } from './lib/migration';
import {
  Category, Transaction, Debt, AppSettings, AIInsight, Income as IncomeT, DEFAULT_CATEGORIES,
} from './types/finance';

interface AppSession {
  email?: string;
  userId?: string;
}

interface UserProfile {
  firstName: string;
  lastName: string;
}

async function fetchProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return { firstName: data.first_name ?? '', lastName: data.last_name ?? '' };
  } catch {
    return null;
  }
}

async function upsertProfile(userId: string, firstName: string, lastName: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, first_name: firstName, last_name: lastName, updated_at: new Date().toISOString() });
    return { error: error?.message ?? null };
  } catch {
    return { error: 'Failed to save profile.' };
  }
}

export default function App() {
  const [session, setSession] = useState<AppSession | null | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [page, setPage] = useState<Page>('dashboard');
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [aiInsight, setAIInsight] = useState<AIInsight | null>(null);
  const [incomes, setIncomes] = useState<IncomeT[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  useEffect(() => {
    if (supabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        setSession(s ? { email: s.user.email, userId: s.user.id } : null);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s ? { email: s.user.email, userId: s.user.id } : null);
      });
      return () => subscription.unsubscribe();
    } else {
      const local = getLocalSession();
      setSession(local ? { email: local.user.email } : null);
    }
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!session || !session.userId) {
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    fetchProfile(session.userId).then((p) => {
      setProfileLoading(false);
      if (p) {
        setProfile(p);
        setNeedsProfile(!p.firstName.trim() || !p.lastName.trim());
      } else {
        setNeedsProfile(true);
      }
    });
  }, [session?.userId]);

  async function loadAllUserData(userId: string) {
    setDataLoading(true);
    // Run any one-time localStorage → Supabase migration before fetching, so the
    // first fetch already includes migrated rows.
    await runLegacyLocalStorageMigration(userId, DEFAULT_CATEGORIES);

    const [cats, debtRows, txns, settingsRow, incomeRows] = await Promise.all([
      fetchCategories(userId),
      fetchDebts(userId),
      fetchTransactions(userId),
      fetchUserSettings(userId),
      fetchIncomes(userId),
    ]);

    setCategories(cats);
    setDebts(debtRows);
    setTransactions(txns);
    setSettings(settingsRow ?? DEFAULT_SETTINGS);
    setIncomes(incomeRows);
    setAIInsight(getAIInsight());
    setDataLoading(false);
  }

  useEffect(() => {
    if (!session?.userId) {
      setCategories([]);
      setDebts([]);
      setTransactions([]);
      setSettings(DEFAULT_SETTINGS);
      setIncomes([]);
      setAIInsight(null);
      return;
    }
    loadAllUserData(session.userId);
  }, [session?.userId]);

  async function handleCompleteProfile(firstName: string, lastName: string): Promise<{ error: string | null }> {
    if (!session?.userId) return { error: 'Not logged in.' };
    const result = await upsertProfile(session.userId, firstName, lastName);
    if (!result.error) {
      setProfile({ firstName, lastName });
      setNeedsProfile(false);
    }
    return result;
  }

  function handleSignOut() {
    if (supabaseConfigured) {
      supabase.auth.signOut();
    } else {
      clearLocalSession();
      setSession(null);
    }
  }

  const authHandlers: AuthHandlers = supabaseConfigured
    ? {
        signIn: async (email, password) => {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          return { error: error?.message ?? null };
        },
        signUp: async (email, password, firstName, lastName) => {
          const { data, error } = await supabase.auth.signUp({ email, password });
          if (error) return { error: error.message };

          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (!signInError && signInData.session && signInData.user) {
            await upsertProfile(signInData.user.id, firstName, lastName);
            setSession({ email: signInData.user.email, userId: signInData.user.id });
            return { error: null };
          }

          if (data.user) {
            await upsertProfile(data.user.id, firstName, lastName);
          }
          return { error: '__confirm__' };
        },
        resetPassword: async (email) => {
          const { error } = await supabase.auth.resetPasswordForEmail(email);
          return { error: error?.message ?? null };
        },
      }
    : {
        signIn: async (email, password) => {
          const { session: s, error } = await signInLocal(email, password);
          if (s) setSession({ email: s.user.email });
          return { error };
        },
        signUp: async (email, password) => {
          const { session: s, error } = await signUpLocal(email, password);
          if (s) setSession({ email: s.user.email });
          return { error };
        },
        resetPassword: resetPasswordLocal,
      };

  if (session === undefined || (session && session.userId && (profileLoading || dataLoading))) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthPage handlers={authHandlers} />;
  }

  // ------- Per-record handlers -------

  async function handleCategorySave(data: Omit<Category, 'id'>, id?: string): Promise<{ error: string | null }> {
    if (!session?.userId) return { error: 'Sign in to save categories.' };
    if (id) {
      const { category, error } = await updateCategory(session.userId, id, data);
      if (category) setCategories((prev) => prev.map((c) => (c.id === id ? category : c)));
      return { error };
    }
    const { category, error } = await createCategory(session.userId, data);
    if (category) setCategories((prev) => [...prev, category]);
    return { error };
  }

  async function handleCategoryDelete(id: string): Promise<{ error: string | null }> {
    if (!session?.userId) return { error: 'Sign in to delete categories.' };
    const { error } = await deleteCategory(session.userId, id);
    if (!error) setCategories((prev) => prev.filter((c) => c.id !== id));
    return { error };
  }

  async function handleTransactionSave(data: Omit<Transaction, 'id'>, id?: string): Promise<{ error: string | null }> {
    if (!session?.userId) return { error: 'Sign in to save expenses.' };
    if (id) {
      const { transaction, error } = await updateTransaction(session.userId, id, data);
      if (transaction) setTransactions((prev) => prev.map((t) => (t.id === id ? transaction : t)));
      return { error };
    }
    const { transaction, error } = await createTransaction(session.userId, data);
    if (transaction) setTransactions((prev) => [transaction, ...prev]);
    return { error };
  }

  async function handleTransactionDelete(id: string): Promise<{ error: string | null }> {
    if (!session?.userId) return { error: 'Sign in to delete expenses.' };
    const { error } = await deleteTransaction(session.userId, id);
    if (!error) setTransactions((prev) => prev.filter((t) => t.id !== id));
    return { error };
  }

  async function handleDebtSave(data: Omit<Debt, 'id'>, id?: string): Promise<{ error: string | null }> {
    if (!session?.userId) return { error: 'Sign in to save debts.' };
    if (id) {
      const { debt, error } = await updateDebt(session.userId, id, data);
      if (debt) setDebts((prev) => prev.map((d) => (d.id === id ? debt : d)));
      return { error };
    }
    const { debt, error } = await createDebt(session.userId, data);
    if (debt) setDebts((prev) => [...prev, debt]);
    return { error };
  }

  async function handleDebtDelete(id: string): Promise<{ error: string | null }> {
    if (!session?.userId) return { error: 'Sign in to delete debts.' };
    const { error } = await deleteDebt(session.userId, id);
    if (!error) setDebts((prev) => prev.filter((d) => d.id !== id));
    return { error };
  }

  async function handleIncomeSave(data: Omit<IncomeT, 'id'>, id?: string): Promise<{ error: string | null }> {
    if (!session?.userId) return { error: 'Sign in to save income.' };
    if (id) {
      const { income, error } = await updateIncome(session.userId, id, data);
      if (income) setIncomes((prev) => prev.map((i) => (i.id === id ? income : i)));
      return { error };
    }
    const { income, error } = await createIncome(session.userId, data);
    if (income) setIncomes((prev) => [...prev, income]);
    return { error };
  }

  async function handleIncomeDelete(id: string): Promise<{ error: string | null }> {
    if (!session?.userId) return { error: 'Sign in to delete income.' };
    const { error } = await deleteIncome(session.userId, id);
    if (!error) setIncomes((prev) => prev.filter((i) => i.id !== id));
    return { error };
  }

  async function handleSettingsChange(s: AppSettings): Promise<void> {
    setSettings(s);
    if (!session?.userId) return;
    const { settings: saved } = await upsertUserSettings(session.userId, s);
    if (saved) setSettings(saved);
  }

  function handleInsightGenerated(insight: AIInsight) {
    setAIInsight(insight);
    saveAIInsight(insight);
  }

  async function handleLoadDemo(): Promise<{ error: string | null }> {
    if (!session?.userId) return { error: 'Sign in to load demo data.' };
    const { error } = await loadDemoIntoSupabase(session.userId);
    if (error) return { error };
    clearAIInsight();
    await loadAllUserData(session.userId);
    setPage('dashboard');
    return { error: null };
  }

  async function handleClearAllData(): Promise<{ error: string | null }> {
    if (!session?.userId) return { error: 'Sign in to clear data.' };
    const userId = session.userId;
    // Delete in FK-safe order: transactions before categories.
    const results = await Promise.all([
      deleteAllTransactions(userId),
      deleteAllDebts(userId),
      deleteUserSettings(userId),
    ]);
    const firstErr = results.find((r) => r.error);
    if (firstErr?.error) return { error: firstErr.error };
    const catErr = await deleteAllCategories(userId);
    if (catErr.error) return { error: catErr.error };
    // Incomes: delete by hand since we don't have a deleteAll helper there.
    // Re-using the per-row delete is fine for MVP — incomes counts are small.
    for (const inc of incomes) {
      await deleteIncome(userId, inc.id);
    }
    clearAIInsight();
    await loadAllUserData(userId);
    setPage('dashboard');
    return { error: null };
  }

  const monthlyNetIncome = totalMonthlyNet(incomes);

  return (
    <>
      {needsProfile && supabaseConfigured && (
        <CompleteProfileModal onComplete={handleCompleteProfile} />
      )}
      <AppShell page={page} onNav={setPage} userEmail={session.email} onSignOut={handleSignOut}>
        {page === 'dashboard' && (
          <Dashboard
            categories={categories}
            transactions={transactions}
            debts={debts}
            settings={settings}
            aiInsight={aiInsight}
            onGoToCoach={() => setPage('coach')}
            firstName={profile?.firstName}
            monthlyNetIncome={monthlyNetIncome}
          />
        )}
        {page === 'budget' && (
          <BudgetCategories
            categories={categories}
            transactions={transactions}
            onSave={handleCategorySave}
            onDelete={handleCategoryDelete}
          />
        )}
        {page === 'income' && (
          <Income
            incomes={incomes}
            configured={Boolean(session?.userId)}
            onSave={handleIncomeSave}
            onDelete={handleIncomeDelete}
          />
        )}
        {page === 'expenses' && (
          <Expenses
            transactions={transactions}
            categories={categories}
            onSave={handleTransactionSave}
            onDelete={handleTransactionDelete}
          />
        )}
        {page === 'debts' && (
          <Debts
            debts={debts}
            onSave={handleDebtSave}
            onDelete={handleDebtDelete}
          />
        )}
        {page === 'planner' && (
          <DebtPayoffPlanner
            debts={debts}
            settings={settings}
            onSettingsChange={handleSettingsChange}
          />
        )}
        {page === 'coach' && (
          <AICoach
            categories={categories}
            transactions={transactions}
            debts={debts}
            settings={settings}
            insight={aiInsight}
            onInsightGenerated={handleInsightGenerated}
            onSettingsChange={handleSettingsChange}
            monthlyNetIncome={monthlyNetIncome}
          />
        )}
        {page === 'settings' && (
          <Settings
            settings={settings}
            onChange={handleSettingsChange}
            onLoadDemo={handleLoadDemo}
            onClearAll={handleClearAllData}
          />
        )}
      </AppShell>
    </>
  );
}
