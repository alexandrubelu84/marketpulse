export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { category } = req.query;
  const API_KEY = process.env.NEWS_API_KEY;

  const searches = {
    geo:    "oil gas attack sanctions Russia Ukraine energy war",
    energy: "natural gas LNG Europe energy TTF prices",
    oil:    "oil OPEC crude Brent WTI barrel prices",
    macro:  "ECB inflation eurozone interest rates economy",
  };

  const q = searches[category] || searches.energy;

  try {
    // Try last 3 days, no domain filter, top stories
    const url = `https://api.thenewsapi.com/v1/news/top` +
      `?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}` +
      `&language=en` +
      `&limit=6`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.data && data.data.length > 0) {
      return res.status(200).json(data);
    }

    // Fallback: use /all endpoint
    const url2 = `https://api.thenewsapi.com/v1/news/all` +
      `?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}` +
      `&language=en` +
      `&limit=6` +
      `&sort=published_at`;

    const r2 = await fetch(url2);
    const d2 = await r2.json();
    return res.status(200).json(d2);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
