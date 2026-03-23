export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { category } = req.query;
  const API_KEY = process.env.GNEWS_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: "GNEWS_API_KEY not set" });

  const searches = {
    geo:    "Iran war sanctions oil gas Middle East energy",
    energy: "natural gas LNG TTF Europe energy prices",
    oil:    "crude oil OPEC Brent WTI prices",
    macro:  "ECB eurozone inflation interest rates economy",
  };

  const q = searches[category] || searches.energy;

  try {
    const url = `https://gnews.io/api/v4/search` +
      `?q=${encodeURIComponent(q)}` +
      `&lang=en` +
      `&max=6` +
      `&sortby=publishedAt` +
      `&apikey=${API_KEY}`;

    const r = await fetch(url);
    const d = await r.json();

    if (!d.articles) return res.status(500).json({ error: d.errors || "No articles" });

    // Map GNews format to our format
    const data = d.articles.map(function(a) {
      return {
        title: a.title,
        description: a.description,
        snippet: a.content,
        source: a.source?.name || a.source?.url || "",
        published_at: a.publishedAt,
        url: a.url,
      };
    });

    return res.status(200).json({ data, meta: { found: d.totalArticles, returned: data.length } });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
