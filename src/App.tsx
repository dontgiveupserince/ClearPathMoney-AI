import React, { useState, useEffect } from 'react';
import { supabase, supabaseConfigured } from './lib/supabase';
import {
  getLocalSession, signInLocal, signUpLocal, resetPasswordLocal, clearLocalSession, LocalSession,
} from './lib/localAuth';
import AuthPage, { AuthHandlers } from './components/auth/AuthPage';
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
}

export default function App() {
  // undefined = loading, null = not logged in, object = logged in
  const [session, setSession] = useState<AppSession | null | undefined>(undefined);
  const [page, setPage] = useState<Page>('dashboard');
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [aiInsight, setAIInsight] = useState<AIInsight | null>(null);

  useEffect(() => {
    if (supabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        setSession(s ? { email: s.user.email } : null);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
        setSession(s ? { email: s.user.email } : null);
      });
      return () => subscription.unsubscribe();
    } else {
      const local = getLocalSession();
      setSession(local ? { email: local.user.email } : null);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    initializeDefaults();
    setCategories(getCategories());
    setTransactions(getTransactions());
    setDebts(getDebts());
    setSettings(getSettings());
    setAIInsight(getAIInsight());
  }, [session]);

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
        signUp: async (email, password) => {
          const { error } = await supabase.auth.signUp({ email, password });
          return { error: error?.message ?? null };
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

  if (session === undefined) {
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
    <AppShell page={page} onNav={setPage} userEmail={session.email} onSignOut={handleSignOut}>
      {page === 'dashboard' && (
        <Dashboard
          categories={categories}
          transactions={transactions}
          debts={debts}
          settings={settings}
          aiInsight={aiInsight}
          onGoToCoach={() => setPage('coach')}
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
  );
}
