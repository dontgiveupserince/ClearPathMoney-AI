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
  categories: { name: string; spent: number; limit: number; percentage: number }[];
  debts: { name: string; balance: number; apr: number; type: string }[];
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

    const ctxSummary = `
Financial Summary:
- Monthly Income: $${context.monthlyIncome.toFixed(2)}
- Total Expenses This Month: $${context.totalExpenses.toFixed(2)}
- Remaining Budget: $${(context.monthlyIncome - context.totalExpenses).toFixed(2)}
- Total Debt Outstanding: $${context.totalDebt.toFixed(2)}
- Debt Payoff Method: ${context.payoffMethod}
- Extra Monthly Debt Payment: $${context.extraDebtPayment.toFixed(2)}

Budget Categories:
${context.categories.length > 0 ? context.categories.map((c) => `- ${c.name}: spent $${c.spent.toFixed(2)} of $${c.limit.toFixed(2)} limit (${Math.round(c.percentage)}%)`).join("\n") : "No categories tracked."}

Debts:
${context.debts.length > 0 ? context.debts.map((d) => `- ${d.name} (${d.type}): $${d.balance.toFixed(2)} balance at ${d.apr}% APR`).join("\n") : "No debts tracked."}
`.trim();

    let systemPrompt: string;
    let userMessage: string;

    if (action === "generate_plan") {
      systemPrompt = `You are a calm, supportive, non-judgmental personal finance coach. Analyze the user's financial data and produce a structured weekly financial plan. Be specific, actionable, and encouraging. Never shame or lecture. Format your response as JSON with exactly these keys: summary (string), alerts (array of strings, may be empty), actions (array of 3-4 strings), debtAdvice (string), savingsOpportunities (array of strings, may be empty). Keep each item concise (1-2 sentences). Return ONLY valid JSON, no markdown fences.`;
      userMessage = `Analyze my finances and generate a weekly plan:\n\n${ctxSummary}`;
    } else {
      systemPrompt = `You are a calm, supportive personal finance coach. You have access to the user's financial data and answer their questions about budget, spending, debts, and savings. Be specific with numbers from their data. Keep answers to 2-4 sentences. Be encouraging and non-judgmental.`;
      userMessage = `My financial data:\n\n${ctxSummary}\n\nMy question: ${question}`;
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
        max_tokens: action === "generate_plan" ? 900 : 350,
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
      try {
        const parsed = JSON.parse(content);
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
