import { Debt, PayoffPlan, PayoffMonth } from '../types/finance';

function monthLabel(monthOffset: number): { month: number; year: number; label: string } {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + monthOffset);
  return {
    month: d.getMonth(),
    year: d.getFullYear(),
    label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
  };
}

export function calculatePayoff(
  debts: Debt[],
  method: 'snowball' | 'avalanche',
  extraPayment: number
): PayoffPlan | null {
  if (debts.length === 0) return null;

  const sorted = [...debts].sort((a, b) =>
    method === 'snowball' ? a.balance - b.balance : b.apr - a.apr
  );

  const balances: Record<string, number> = {};
  const paid: Record<string, boolean> = {};
  for (const d of sorted) {
    balances[d.id] = d.balance;
    paid[d.id] = false;
  }

  const warningDebts: string[] = [];
  for (const d of sorted) {
    const monthlyInterest = (d.apr / 100 / 12) * d.balance;
    if (d.minimumPayment < monthlyInterest) {
      warningDebts.push(d.name);
    }
  }

  const schedule: PayoffMonth[] = [];
  let totalInterest = 0;
  let monthOffset = 0;
  const MAX_MONTHS = 600;

  while (Object.values(paid).some((v) => !v) && monthOffset < MAX_MONTHS) {
    const info = monthLabel(monthOffset);
    const monthDebts: PayoffMonth['debts'] = [];
    let rollover = 0;

    // Apply minimums to all non-paid debts
    for (const d of sorted) {
      if (paid[d.id]) {
        rollover += d.minimumPayment;
        continue;
      }
      const monthlyInterest = (d.apr / 100 / 12) * balances[d.id];
      totalInterest += monthlyInterest;
      balances[d.id] = balances[d.id] + monthlyInterest;

      const minPay = Math.min(d.minimumPayment, balances[d.id]);
      balances[d.id] -= minPay;

      if (balances[d.id] <= 0.01) {
        rollover += d.minimumPayment - balances[d.id];
        balances[d.id] = 0;
        paid[d.id] = true;
      }

      monthDebts.push({
        id: d.id,
        name: d.name,
        balance: Math.max(0, balances[d.id]),
        payment: minPay,
        interest: monthlyInterest,
      });
    }

    // Apply extra payment + rollover to target debt
    let extra = extraPayment + rollover;
    const target = sorted.find((d) => !paid[d.id]);
    if (target && extra > 0) {
      const available = Math.min(extra, balances[target.id]);
      balances[target.id] -= available;
      extra -= available;
      if (balances[target.id] <= 0.01) {
        balances[target.id] = 0;
        paid[target.id] = true;
      }
      const existing = monthDebts.find((d) => d.id === target.id);
      if (existing) {
        existing.payment += available;
        existing.balance = Math.max(0, balances[target.id]);
      }
    }

    const totalBalance = Object.values(balances).reduce((s, b) => s + b, 0);
    schedule.push({
      month: info.month,
      year: info.year,
      label: info.label,
      debts: monthDebts,
      totalBalance,
      totalInterest,
    });

    monthOffset++;
  }

  const debtFreeMonthInfo = monthLabel(monthOffset);
  const debtFreeDate = new Date(debtFreeMonthInfo.year, debtFreeMonthInfo.month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return {
    method,
    debtFreeDate,
    totalInterest: Math.round(totalInterest * 100) / 100,
    totalMonths: monthOffset,
    schedule,
    warningDebts,
  };
}
