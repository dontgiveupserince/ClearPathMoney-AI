import React, { useState } from 'react';
import {
  LayoutDashboard, Tag, Receipt, CreditCard, TrendingDown, Sparkles, Settings, Menu, X, ChevronRight, LogOut,
} from 'lucide-react';

export type Page = 'dashboard' | 'budget' | 'expenses' | 'debts' | 'planner' | 'coach' | 'settings';

interface NavItem {
  id: Page;
  label: string;
  icon: React.ElementType;
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'budget', label: 'Budget', icon: Tag },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'debts', label: 'Debts', icon: CreditCard },
  { id: 'planner', label: 'Payoff Planner', icon: TrendingDown },
  { id: 'coach', label: 'AI Coach', icon: Sparkles },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface Props {
  page: Page;
  onNav: (p: Page) => void;
  children: React.ReactNode;
  userEmail?: string;
  onSignOut?: () => void;
}

export default function AppShell({ page, onNav, children, userEmail, onSignOut }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = page === item.id;
    const isAI = item.id === 'coach';
    return (
      <button
        onClick={() => { onNav(item.id); setMobileOpen(false); }}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          active
            ? isAI
              ? 'bg-violet-600 text-white shadow-sm'
              : 'bg-teal-600 text-white shadow-sm'
            : isAI
            ? 'text-gray-600 hover:bg-violet-50 hover:text-violet-700'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`}
      >
        <item.icon size={18} />
        <span>{item.label}</span>
        {active && <ChevronRight size={14} className="ml-auto opacity-70" />}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-white border-r border-gray-100 px-4 py-6 gap-1">
        <div className="px-3 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <TrendingDown size={16} className="text-white" />
            </div>
            <div>
              <p className="font-heading font-bold text-gray-900 text-sm leading-none">ClearPath</p>
              <p className="text-xs text-teal-600 font-medium">Money</p>
            </div>
          </div>
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map((item) => <NavLink key={item.id} item={item} />)}
        </nav>
        <div className="px-3 pt-4 border-t border-gray-100 space-y-3">
          {userEmail && (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              </div>
              <button
                onClick={onSignOut}
                title="Sign out"
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
          <p className="text-xs text-gray-400 leading-relaxed">
            Educational budgeting guidance only — not professional financial advice.
          </p>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-100 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center">
            <TrendingDown size={14} className="text-white" />
          </div>
          <span className="font-heading font-bold text-gray-900">ClearPath Money</span>
        </div>
        <div className="flex items-center gap-1">
          {userEmail && (
            <button
              onClick={onSignOut}
              title="Sign out"
              className="p-2 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={18} />
            </button>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-100">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute top-14 left-0 bottom-0 w-64 bg-white shadow-xl px-4 py-4" onClick={(e) => e.stopPropagation()}>
            <nav className="flex flex-col gap-1">
              {NAV.map((item) => <NavLink key={item.id} item={item} />)}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 lg:ml-0 mt-14 lg:mt-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
