import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface FinancialContext {
  monthlyIncome: number;
  totalExpenses: number;
  totalDebt: number;
  currentMonthTransactionCount: number;
  categories: { name: string; spent: number; limit: number; percentage: number }[];
  debts: { name: string; balance: number; apr: number; type: string; minimumPayment: number; dueDate?: string }[];
  recentTransactions: { date: string; merchant: string; amount: number; type: string; category: string }[];
  payoffMethod: string;
  extraDebtPayment: number;
}

interface RequestBody {
  action: "generate_plan" | "ask_question";
  context: FinancialContext;
  question?: string;
  apiKey?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    const { action, context, question, apiKey } = body;

    const resolvedKey = Deno.env.get("OPENAI_API_KEY") || apiKey;
    if (!resolvedKey) {
      return new Response(JSON.stringify({ error: "No OpenAI API key configured." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const remaining = context.monthlyIncome - context.totalExpenses;
    const savingsRate = context.monthlyIncome > 0 ? ((remaining / context.monthlyIncome) * 100).toFixed(1) : "N/A";

    const ctxSummary = `
Financial Summary:
- Monthly Net Income: $${context.monthlyIncome.toFixed(2)}
- Total Expenses This Month: $${context.totalExpenses.toFixed(2)} (${context.currentMonthTransactionCount} transactions)
- Remaining Budget: $${remaining.toFixed(2)} (${savingsRate}% savings rate)
- Total Debt Outstanding: $${context.totalDebt.toFixed(2)}
- Debt Payoff Method: ${context.payoffMethod}
- Extra Monthly Debt Payment: $${context.extraDebtPayment.toFixed(2)}

Budget Categories This Month:
${context.categories.length > 0
  ? context.categories.map((c) =>
      `- ${c.name}: spent $${c.spent.toFixed(2)} of $${c.limit.toFixed(2)} budget (${Math.round(c.percentage)}%)`
    ).join("\n")
  : "No categories tracked."}

Debts:
${context.debts.length > 0
  ? context.debts.map((d) =>
      `- ${d.name} (${d.type}): $${d.balance.toFixed(2)} balance at ${d.apr}% APR, min payment $${d.minimumPayment.toFixed(2)}/mo${d.dueDate ? `, due ${d.dueDate}` : ""}`
    ).join("\n")
  : "No debts tracked."}

Recent Transactions (up to 30):
${context.recentTransactions.length > 0
  ? context.recentTransactions.map((t) =>
      `- ${t.date} | ${t.merchant} | ${t.category} | $${t.amount.toFixed(2)} (${t.type})`
    ).join("\n")
  : "No recent transactions."}
`.trim();

    let systemPrompt: string;
    let userMessage: string;

    if (action === "generate_plan") {
      systemPrompt = `You are a calm, supportive, non-judgmental personal finance coach. Analyze the user's actual financial data below — including their real income, specific expenses, transaction history, and debt balances — and produce a structured weekly financial plan. Reference specific numbers and merchants from their data. Be specific, actionable, and encouraging. Never shame or lecture. Format your response as JSON with exactly these keys: summary (string), alerts (array of strings, may be empty), actions (array of 3-4 strings), debtAdvice (string), savingsOpportunities (array of strings, may be empty). Keep each item concise (1-2 sentences). Return ONLY valid JSON, no markdown fences.`;
      userMessage = `Analyze my actual financial data and generate a personalized weekly plan:\n\n${ctxSummary}`;
    } else {
      systemPrompt = `You are a calm, supportive personal finance coach. You have access to the user's real financial data including their income, every expense transaction, category budgets, and debt details. Answer questions using the specific numbers from their data — mention actual merchants, amounts, and categories when relevant. Keep answers to 2-4 sentences. Be encouraging and non-judgmental.`;
      userMessage = `My actual financial data:\n\n${ctxSummary}\n\nMy question: ${question}`;
    }

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resolvedKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: action === "generate_plan" ? 1000 : 400,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return new Response(JSON.stringify({ error: `OpenAI error: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiData = await openaiRes.json();
    const content = openaiData.choices?.[0]?.message?.content ?? "";

    if (action === "generate_plan") {
      // Strip markdown fences if model wrapped despite instructions
      const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
      try {
        const parsed = JSON.parse(cleaned);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ error: "Failed to parse AI response", raw: content }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ answer: content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
