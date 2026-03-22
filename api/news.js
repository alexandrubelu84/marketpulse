export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { category } = req.query;
  const API_KEY = process.env.NEWS_API_KEY;

  if (!API_KEY) return res.status(500).json({ error: "NEWS_API_KEY not set" });

  // Simple single-word queries that definitely exist in TheNewsAPI
  const searches = {
    energy: "energy",
    geo:    "oil",
  };

  const q = searches[category] || "energy";

  try {
    const url = `https://api.thenewsapi.com/v1/news/all?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}&language=en&limit=6&sort=published_at` +
      `&published_after=${daysAgo(2)}`;

    const r = await fetch(url);
    const d = await r.json();

    return res.status(200).json({
      data: d.data || [],
      meta: d.meta || {},
      debug: { category, q, found: d.meta?.found || 0, error: d.error || null }
    });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
