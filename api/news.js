export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { category } = req.query;
  const API_KEY = process.env.NEWS_API_KEY;

  const searches = {
    geo:    "oil gas energy attack sanction war Iran Russia Ukraine Hormuz pipeline Middle East",
    energy: "natural gas LNG TTF energy Europe prices electricity",
    oil:    "crude oil OPEC Brent WTI prices barrel production",
    macro:  "ECB eurozone inflation interest rates economy Europe GDP",
  };

  // 29 trusted sources — no garbage
  const domains = [
    // Breaking & general
    "apnews.com",
    "reuters.com",
    "bbc.co.uk",
    "news.sky.com",
    "theguardian.com",
    "axios.com",
    // USA financial
    "cnbc.com",
    "marketwatch.com",
    "seekingalpha.com",
    "economist.com",
    // Energy specialized
    "oilprice.com",
    "ogj.com",
    "rigzone.com",
    "naturalgasworld.com",
    "worldoil.com",
    "lngprime.com",
    "argusmedia.com",
    "icis.com",
    "energyintel.com",
    // Europe media
    "euronews.com",
    "france24.com",
    "dw.com",
    "politico.eu",
    "afp.com",
    "middleeasteye.net",
    // Official institutions
    "iea.org",
    "spglobal.com",
    "consilium.europa.eu",
    "ec.europa.eu",
  ].join(",");

  const q = searches[category] || searches.energy;

  try {
    // First: trusted domains, last 2 days
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

    // Fallback: same domains, last 7 days
    const url2 = `https://api.thenewsapi.com/v1/news/all` +
      `?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}` +
      `&language=en&limit=6&sort=published_at` +
      `&published_after=${getDateDaysAgo(7)}` +
      `&domains=${encodeURIComponent(domains)}`;

    const r2 = await fetch(url2);
    const d2 = await r2.json();

    if (d2.data && d2.data.length >= 2) {
      return res.status(200).json(d2);
    }

    // Last resort: no domain filter, categories only, last 3 days
    const url3 = `https://api.thenewsapi.com/v1/news/all` +
      `?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}` +
      `&language=en&limit=6&sort=published_at` +
      `&categories=business,politics` +
      `&published_after=${getDateDaysAgo(3)}`;

    const r3 = await fetch(url3);
    const d3 = await r3.json();
    return res.status(200).json(d3);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}
