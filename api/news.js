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

  // Blocked sources
  const excludeDomains = [
    "rt.com","sputniknews.com","tass.com",
    "zeenews.india.com","ndtv.com","hindustantimes.com",
    "vox.com","dailymail.co.uk","nypost.com","breitbart.com",
    "infowars.com","naturalnews.com"
  ].join(",");

  const q = searches[category] || searches.energy;
  const threeDaysAgo = getDateDaysAgo(3);

  try {
    const url = `https://api.thenewsapi.com/v1/news/all` +
      `?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}` +
      `&language=en` +
      `&limit=6` +
      `&sort=published_at` +
      `&published_after=${threeDaysAgo}` +
      `&exclude_domains=${encodeURIComponent(excludeDomains)}`;

    const response = await fetch(url);
    const data = await response.json();
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0];
}
