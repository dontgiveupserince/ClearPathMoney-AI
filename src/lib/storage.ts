import { AIInsight } from '../types/finance';

const KEYS = {
  aiInsight: 'cp_ai_insight',
};

export function getAIInsight(): AIInsight | null {
  try {
    const raw = localStorage.getItem(KEYS.aiInsight);
    return raw ? (JSON.parse(raw) as AIInsight) : null;
  } catch {
    return null;
  }
}

export function saveAIInsight(insight: AIInsight): void {
  localStorage.setItem(KEYS.aiInsight, JSON.stringify(insight));
}

export function clearAIInsight(): void {
  localStorage.removeItem(KEYS.aiInsight);
}
