export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { category } = req.query;
  const API_KEY = process.env.NEWS_API_KEY;

  if (!API_KEY) return res.status(500).json({ error: "NEWS_API_KEY not set" });

  const searches = {
    energy: "natural gas LNG TTF Europe energy prices oil OPEC Brent WTI",
    geo:    "Iran war oil gas sanctions Russia Ukraine ECB inflation",
  };

  const blacklist = [
    "rt.com","sputniknews.com","tass.com","theduran.com","zerohedge.com",
    "infowars.com","breitbart.com","naturalnews.com","globalresearch.ca",
    "zeenews.india.com","ndtv.com","hindustantimes.com","economictimes.indiatimes.com",
    "timesofindia.com","indiatoday.intoday.in","thehindu.com","livemint.com",
    "dailymail.co.uk","nypost.com","kingworldnews.com","jamaica-gleaner.com",
    "fastcompany.com","thestockmarketwatch.com","flassbeck-economics.com",
    "uctoday.com","fortune.com","investing.com","finance.yahoo.com",
    "winnipegfreepress.com","en.protothema.gr","steynonline.com","newsmax.com",
  ].join(",");

  const q = searches[category] || searches.energy;

  try {
    // Try without category filter first — broader search
    const url = `https://api.thenewsapi.com/v1/news/all?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}&language=en&limit=6&sort=published_at` +
      `&published_after=${daysAgo(3)}` +
      `&exclude_domains=${encodeURIComponent(blacklist)}`;

    const r = await fetch(url);
    const d = await r.json();

    // Return whatever we got — even if empty, include meta for debugging
    return res.status(200).json({
      data: d.data || [],
      meta: d.meta || {},
      debug: { category, q, found: d.meta?.found || 0 }
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
