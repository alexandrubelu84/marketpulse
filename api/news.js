export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { category } = req.query;
  const API_KEY = process.env.NEWS_API_KEY;

  // Simple reliable searches — no advanced operators that break URL encoding
  const searches = {
    geo:    "oil gas energy attack sanction war Iran Russia Ukraine Hormuz pipeline",
    energy: "natural gas LNG TTF energy Europe prices",
    oil:    "crude oil OPEC Brent WTI prices barrel",
    macro:  "ECB eurozone inflation interest rates economy Europe",
  };

  // Trusted sources only
  const domains = [
    "reuters.com", "apnews.com", "cnbc.com", "ft.com",
    "euronews.com", "skynews.com", "bbc.co.uk", "bbc.com",
    "theguardian.com", "economist.com", "oilprice.com",
    "spglobal.com", "naturalgasworld.com", "politico.eu",
    "axios.com", "seekingalpha.com", "marketwatch.com",
    "wsj.com", "bloomberg.com",
  ].join(",");

  const q = searches[category] || searches.energy;

  try {
    // Try last 2 days with trusted domains
    const url1 = `https://api.thenewsapi.com/v1/news/all` +
      `?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}` +
      `&language=en&limit=6&sort=published_at` +
      `&published_after=${getDateDaysAgo(2)}` +
      `&domains=${encodeURIComponent(domains)}`;

    const r1 = await fetch(url1);
    const d1 = await r1.json();

    if (d1.data && d1.data.length >= 2) {
      return res.status(200).json(d1);
    }

    // Fallback: last 7 days, trusted domains, simpler
    const url2 = `https://api.thenewsapi.com/v1/news/all` +
      `?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}` +
      `&language=en&limit=6&sort=published_at` +
      `&published_after=${getDateDaysAgo(7)}` +
      `&domains=${encodeURIComponent(domains)}`;

    const r2 = await fetch(url2);
    const d2 = await r2.json();

    // Last resort: no domain filter
    if (!d2.data || d2.data.length === 0) {
      const url3 = `https://api.thenewsapi.com/v1/news/all` +
        `?api_token=${API_KEY}` +
        `&search=${encodeURIComponent(q)}` +
        `&language=en&limit=6&sort=published_at` +
        `&categories=business,politics` +
        `&published_after=${getDateDaysAgo(3)}`;
      const r3 = await fetch(url3);
      const d3 = await r3.json();
      return res.status(200).json(d3);
    }

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
