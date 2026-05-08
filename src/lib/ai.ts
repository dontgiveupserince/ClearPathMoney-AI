import { Category, Transaction, Debt, AppSettings, AIInsight } from '../types/finance';
import { getCategorySpending, getTotalExpenses, formatCurrency } from './calculations';

export function generateMockInsight(
  categories: Category[],
  transactions: Transaction[],
  debts: Debt[],
  settings: AppSettings
): AIInsight {
  const totalExpenses = getTotalExpenses(transactions);
  const income = settings.monthlyIncome;
  const remaining = income - totalExpenses;
  const categorySpending = getCategorySpending(transactions, categories);
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const overspent = categorySpending.filter((c) => c.percentage >= 100);
  const nearLimit = categorySpending.filter((c) => c.percentage >= 80 && c.percentage < 100);

  const subs = categorySpending.find((c) => c.category.name === 'Subscriptions');
  const dining = categorySpending.find((c) => c.category.name === 'Dining');
  const highAprDebt = [...debts].sort((a, b) => b.apr - a.apr)[0];

  const alerts: string[] = [];
  const actions: string[] = [];
  const savingsOpportunities: string[] = [];

  if (overspent.length > 0) {
    alerts.push(`You've exceeded your budget in ${overspent.map((c) => c.category.name).join(', ')}.`);
  }
  if (nearLimit.length > 0) {
    alerts.push(`You're close to your limit in ${nearLimit.map((c) => c.category.name).join(', ')} — watch your spending here.`);
  }
  if (remaining < 0) {
    alerts.push(`Your expenses exceed your income by ${formatCurrency(Math.abs(remaining))} this month.`);
  } else if (income > 0 && remaining / income < 0.1) {
    alerts.push(`Less than 10% of your income remains — consider reducing discretionary spending.`);
  }

  if (subs && subs.spent > 80) {
    savingsOpportunities.push(`Review your subscriptions (${formatCurrency(subs.spent)}/mo). Canceling 1–2 services could save ${formatCurrency(Math.round(subs.spent * 0.4))} per month.`);
  }
  if (dining && dining.percentage > 70) {
    savingsOpportunities.push(`Dining spending is ${Math.round(dining.percentage)}% of your budget. Cooking at home 2 more days a week could save ${formatCurrency(Math.round(dining.spent * 0.25))}/month.`);
  }
  if (remaining > 100 && totalDebt > 0) {
    savingsOpportunities.push(`You have ${formatCurrency(remaining)} remaining this month — consider applying some to your highest-interest debt.`);
  }

  actions.push(`Review the ${overspent.length > 0 ? overspent[0].category.name : 'Dining'} category and identify one place to cut back.`);
  if (settings.payoffMethod === 'avalanche' && highAprDebt) {
    actions.push(`Stay focused on ${highAprDebt.name} (${highAprDebt.apr}% APR) — avalanche method saves you the most interest long-term.`);
  } else if (settings.payoffMethod === 'snowball' && debts.length > 0) {
    const smallest = [...debts].sort((a, b) => a.balance - b.balance)[0];
    actions.push(`Keep targeting ${smallest.name} — paying it off will give you momentum and free up ${formatCurrency(smallest.minimumPayment)}/month.`);
  }
  if (settings.extraDebtPayment === 0 && totalDebt > 0) {
    actions.push(`Even an extra $50/month toward debt could save hundreds in interest. Try setting an extra payment in the Planner.`);
  }
  actions.push(`Set a weekly check-in — 10 minutes every Sunday can prevent budget drift.`);

  const debtAdvice = debts.length === 0
    ? `No debts on file. Consider building a 3-month emergency fund to stay debt-free.`
    : `Your total debt is ${formatCurrency(totalDebt)}. ${
        settings.payoffMethod === 'avalanche'
          ? `Using the avalanche method, you'll minimize interest paid — great choice for maximum savings.`
          : `Using the snowball method, you'll get quick wins that help maintain momentum.`
      } ${highAprDebt ? `Your most urgent debt is ${highAprDebt.name} at ${highAprDebt.apr}% APR.` : ''}`;

  const summary = income > 0
    ? `This month you've spent ${formatCurrency(totalExpenses)} of your ${formatCurrency(income)} income, leaving ${formatCurrency(remaining)} remaining. ${
        overspent.length > 0
          ? `Watch out — you've overspent in ${overspent.length} ${overspent.length === 1 ? 'category' : 'categories'}.`
          : `Overall, you're on track this month.`
      } Your total outstanding debt is ${formatCurrency(totalDebt)}.`
    : `Add your monthly income in Settings to get personalized budget insights. Your total outstanding debt is ${formatCurrency(totalDebt)}.`;

  return {
    generatedAt: new Date().toISOString(),
    summary,
    alerts,
    actions,
    debtAdvice,
    savingsOpportunities,
  };
}

export function mockBudgetAnswer(
  question: string,
  categories: Category[],
  transactions: Transaction[],
  debts: Debt[],
  settings: AppSettings
): string {
  const q = question.toLowerCase();
  const totalExpenses = getTotalExpenses(transactions);
  const income = settings.monthlyIncome;
  const remaining = income - totalExpenses;
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const categorySpending = getCategorySpending(transactions, categories);

  if (q.includes('debt') || q.includes('owe')) {
    if (debts.length === 0) return `You have no debts tracked. Add them in the Debts section to start planning your payoff.`;
    const highApr = [...debts].sort((a, b) => b.apr - a.apr)[0];
    return `You have ${formatCurrency(totalDebt)} in total debt across ${debts.length} account${debts.length > 1 ? 's' : ''}. Your highest-interest debt is ${highApr.name} at ${highApr.apr}% APR with a balance of ${formatCurrency(highApr.balance)}.`;
  }

  if (q.includes('spend') || q.includes('spent') || q.includes('spending')) {
    const topCat = [...categorySpending].sort((a, b) => b.spent - a.spent)[0];
    return `This month you've spent ${formatCurrency(totalExpenses)}. Your biggest category is ${topCat?.category.name ?? 'N/A'} at ${formatCurrency(topCat?.spent ?? 0)}.`;
  }

  if (q.includes('save') || q.includes('saving')) {
    const savingsCat = categorySpending.find((c) => c.category.name === 'Savings');
    return savingsCat && savingsCat.spent > 0
      ? `You've put ${formatCurrency(savingsCat.spent)} into savings this month. Great work — keep building that buffer!`
      : `You haven't logged any savings this month. Even a small amount helps — try automating a transfer on payday.`;
  }

  if (q.includes('income') || q.includes('earn') || q.includes('make')) {
    return income > 0
      ? `Your monthly income is set to ${formatCurrency(income)}. You've used ${formatCurrency(totalExpenses)} (${Math.round((totalExpenses / income) * 100)}%) so far this month.`
      : `No monthly income set yet. Add it in the Settings section to unlock budget tracking.`;
  }

  if (q.includes('remain') || q.includes('left') || q.includes('budget')) {
    return income > 0
      ? `You have ${formatCurrency(Math.max(0, remaining))} left in your budget this month. ${remaining < 0 ? 'Watch out — you\'re over budget!' : 'Keep it up!'}`
      : `Set your monthly income in Settings to see your remaining budget.`;
  }

  if (q.includes('subscription') || q.includes('subscrib')) {
    const subs = categorySpending.find((c) => c.category.name === 'Subscriptions');
    return subs
      ? `Your subscription spending is ${formatCurrency(subs.spent)} this month against a ${formatCurrency(subs.category.monthlyLimit)} budget. Consider auditing services you rarely use.`
      : `No subscriptions tracked yet. Add them as expenses under the Subscriptions category.`;
  }

  if (q.includes('payoff') || q.includes('pay off') || q.includes('free')) {
    return debts.length > 0
      ? `Check the Debt Payoff Planner for your personalized debt-free timeline using the ${settings.payoffMethod} method. You can also add extra monthly payments to accelerate your payoff.`
      : `No debts to plan for — that's a great position to be in! Focus on building savings instead.`;
  }

  return `I can help you with questions about your spending, debt, savings, budget balance, and subscriptions. Try asking something like "How much have I spent this month?" or "What's my total debt?"`;
}
