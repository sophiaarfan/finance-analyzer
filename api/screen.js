export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { company, context, thesis } = req.body;
  if (!company) return res.status(400).json({ error: 'Company name required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const system = `You are a finance analyst evaluating companies for investment fit. Assess the given company across standard investment dimensions and provide a structured analysis.

Respond ONLY with a valid raw JSON object with no markdown, no backticks, and no text before or after:
{
  "company_name": "string",
  "company_type": "string e.g. B2B SaaS / Fintech / Consumer",
  "overall_fit": "Strong fit" or "Moderate fit" or "Weak fit",
  "exec_summary": "2-3 sentence executive summary",
  "scores": [
    {"label": "Strategy alignment", "score": 7, "note": "one short sentence"},
    {"label": "Market size", "score": 8, "note": "one short sentence"},
    {"label": "Management", "score": 6, "note": "one short sentence"},
    {"label": "Financials", "score": 7, "note": "one short sentence"},
    {"label": "Competitive moat", "score": 5, "note": "one short sentence"}
  ],
  "memo": {
    "what_they_do": "2-3 sentences",
    "why_interesting": "2-3 sentences on the investment opportunity",
    "red_flags": ["flag 1", "flag 2", "flag 3"],
    "key_questions": ["question 1", "question 2", "question 3"],
    "human_gate_reason": "2 sentences on why the final decision must stay with a human analyst"
  }
}`;

  const userMsg = `Company: ${company}${context ? '\nContext: ' + context : ''}\nInvestment strategies: ${thesis.join(', ')}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system,
        messages: [{ role: 'user', content: userMsg }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let raw = data.content?.find(b => b.type === 'text')?.text || '';
    raw = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(raw);
    return res.status(200).json(parsed);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
