export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { category } = req.query;
  const API_KEY = process.env.GNEWS_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: "GNEWS_API_KEY not set" });

  const searches = {
    geo:    "Iran war oil gas Middle East sanctions energy",
    energy: "natural gas LNG TTF Europe energy prices",
    oil:    "crude oil OPEC Brent WTI prices barrel",
    macro:  "ECB eurozone inflation interest rates economy",
  };

  const q = searches[category] || searches.energy;

  // Last 48 hours
  const from = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  try {
    const url = `https://gnews.io/api/v4/search` +
      `?q=${encodeURIComponent(q)}` +
      `&lang=en` +
      `&max=6` +
      `&sortby=publishedAt` +
      `&from=${from}` +
      `&apikey=${API_KEY}`;

    const r = await fetch(url);
    const d = await r.json();

    if (!d.articles) return res.status(500).json({ error: d.errors?.[0] || "No articles" });

    const data = d.articles.map(function(a) {
      return {
        title: a.title,
        description: a.description,
        snippet: a.content,
        source: a.source?.name || "",
        published_at: a.publishedAt,
        url: a.url,
      };
    });

    return res.status(200).json({ data, meta: { found: d.totalArticles, returned: data.length } });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
