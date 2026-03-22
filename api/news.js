export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { category } = req.query;
  const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });
  }

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric"
  });

  const prompts = {
    geo:    "Search for the 5 most recent news articles (last 48 hours) about: military strikes on oil/gas infrastructure, Iran war impact on energy, Russia Ukraine energy sanctions, Middle East conflict and oil supply.",
    energy: "Search for the 5 most recent news articles (last 48 hours) about: European natural gas prices, TTF gas market, LNG imports to Europe, energy prices Europe.",
    oil:    "Search for the 5 most recent news articles (last 48 hours) about: crude oil prices, OPEC decisions, Brent WTI oil market.",
    macro:  "Search for the 5 most recent news articles (last 48 hours) about: ECB interest rates, eurozone inflation, European economy GDP.",
  };

  const prompt = prompts[category] || prompts.energy;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        system: `You are an economic news analyst. Today is ${today}. Search the web and return ONLY a JSON array, no text before or after, no markdown fences. Start directly with [
[{"title":"...","summary":"...","source":"Reuters/BBC/AP/etc","datetime":"22 Mar 14:30","impact":"high|medium|low","url":"https://...","body":"2-3 sentences of context in English."}]
Return 4-5 articles, newest first. Only real articles from last 48 hours from quality sources like Reuters, AP, BBC, FT, CNBC, Guardian, Euronews.`,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const e = await response.json();
      return res.status(500).json({ error: e.error?.message || "Anthropic error" });
    }

    const data = await response.json();
    const raw = (data.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("")
      .trim();

    // Parse JSON array from response
    const a1 = raw.indexOf("[");
    const a2 = raw.lastIndexOf("]");
    if (a1 === -1 || a2 <= a1) {
      return res.status(500).json({ error: "Invalid response format" });
    }

    let arr;
    try {
      arr = JSON.parse(raw.slice(a1, a2 + 1));
    } catch {
      const fixed = raw.slice(a1, a2 + 1).replace(/,(\s*[\]}])/g, "$1");
      arr = JSON.parse(fixed);
    }

    return res.status(200).json({ data: arr, source: "claude" });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
