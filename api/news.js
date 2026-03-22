export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { category } = req.query;
  const API_KEY = process.env.NEWS_API_KEY;

  const searches = {
    geo:    "military attack oil gas pipeline energy infrastructure sanctions Russia Iran Ukraine Middle East",
    energy: "natural gas TTF LNG Europe energy prices pipeline",
    oil:    "crude oil OPEC Brent WTI prices barrel",
    macro:  "ECB European Central Bank interest rates inflation eurozone GDP economy",
  };

  // Trusted financial/news sources only
  const sources = [
    "reuters.com","bloomberg.com","ft.com","wsj.com","cnbc.com",
    "bbc.co.uk","economist.com","spglobal.com","oilprice.com",
    "naturalgasworld.com","euronews.com","politico.eu","iea.org",
    "apnews.com","theguardian.com","axios.com"
  ].join(",");

  const q = searches[category] || searches.energy;
  const yesterday = getDateDaysAgo(1);

  try {
    // First try: with trusted sources filter + last 24h
    const url1 = `https://api.thenewsapi.com/v1/news/all?api_token=${API_KEY}&search=${encodeURIComponent(q)}&language=en&limit=6&sort=published_at&published_after=${yesterday}&domains=${encodeURIComponent(sources)}`;
    const r1 = await fetch(url1);
    const d1 = await r1.json();

    if (d1.data && d1.data.length >= 2) {
      return res.status(200).json(d1);
    }

    // Fallback: no domain filter, last 48h
    const twodaysago = getDateDaysAgo(2);
    const url2 = `https://api.thenewsapi.com/v1/news/all?api_token=${API_KEY}&search=${encodeURIComponent(q)}&language=en&limit=6&sort=published_at&published_after=${twodaysago}`;
    const r2 = await fetch(url2);
    const d2 = await r2.json();
    return res.status(200).json(d2);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}
