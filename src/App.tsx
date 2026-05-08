import React, { useState, useEffect } from 'react';
import { supabase, supabaseConfigured } from './lib/supabase';
import {
  getLocalSession, signInLocal, signUpLocal, resetPasswordLocal, clearLocalSession,
} from './lib/localAuth';
import AuthPage, { AuthHandlers } from './components/auth/AuthPage';
import CompleteProfileModal from './components/auth/CompleteProfileModal';
import AppShell, { Page } from './components/AppShell';
import Dashboard from './components/dashboard/Dashboard';
import BudgetCategories from './components/budget/BudgetCategories';
import Expenses from './components/expenses/Expenses';
import Debts from './components/debts/Debts';
import DebtPayoffPlanner from './components/planner/DebtPayoffPlanner';
import AICoach from './components/coach/AICoach';
import Settings from './components/Settings';
import {
  getCategories, saveCategories,
  getTransactions, saveTransactions,
  getDebts, saveDebts,
  getSettings, saveSettings,
  getAIInsight, saveAIInsight,
  initializeDefaults,
} from './lib/storage';
import { Category, Transaction, Debt, AppSettings, AIInsight } from './types/finance';

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
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [aiInsight, setAIInsight] = useState<AIInsight | null>(null);

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

  // Load profile when session changes
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

  // Load local data when session is ready
  useEffect(() => {
    if (!session) return;
    initializeDefaults();
    setCategories(getCategories());
    setTransactions(getTransactions());
    setDebts(getDebts());
    setSettings(getSettings());
    setAIInsight(getAIInsight());
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
          if (data.user) {
            await upsertProfile(data.user.id, firstName, lastName);
          }
          // Email confirmation disabled: session returned immediately, set it now
          if (data.session && data.user) {
            setSession({ email: data.user.email, userId: data.user.id });
          }
          // Email confirmation required: session is null, show confirmation message
          if (!data.session) {
            return { error: '__confirm__' };
          }
          return { error: null };
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

  if (session === undefined || (session && session.userId && profileLoading)) {
    return (
      <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <AuthPage handlers={authHandlers} />;
  }

  function handleCategoriesChange(cats: Category[]) {
    setCategories(cats);
    saveCategories(cats);
  }

  function handleTransactionsChange(txns: Transaction[]) {
    setTransactions(txns);
    saveTransactions(txns);
  }

  function handleDebtsChange(d: Debt[]) {
    setDebts(d);
    saveDebts(d);
  }

  function handleSettingsChange(s: AppSettings) {
    setSettings(s);
    saveSettings(s);
  }

  function handleInsightGenerated(insight: AIInsight) {
    setAIInsight(insight);
    saveAIInsight(insight);
  }

  function handleDemoLoaded() {
    setCategories(getCategories());
    setTransactions(getTransactions());
    setDebts(getDebts());
    setSettings(getSettings());
    setAIInsight(null);
    setPage('dashboard');
  }

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
          />
        )}
        {page === 'budget' && (
          <BudgetCategories
            categories={categories}
            transactions={transactions}
            onChange={handleCategoriesChange}
          />
        )}
        {page === 'expenses' && (
          <Expenses
            transactions={transactions}
            categories={categories}
            onChange={handleTransactionsChange}
          />
        )}
        {page === 'debts' && (
          <Debts debts={debts} onChange={handleDebtsChange} />
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
          />
        )}
        {page === 'settings' && (
          <Settings
            settings={settings}
            onChange={handleSettingsChange}
            onDemoLoaded={handleDemoLoaded}
          />
        )}
      </AppShell>
    </>
  );
}
