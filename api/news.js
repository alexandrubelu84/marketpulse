export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { category } = req.query;
  const API_KEY = process.env.NEWS_API_KEY;

  const searches = {
    energy: "natural gas LNG TTF Europe energy prices oil OPEC Brent WTI crude barrel",
    geo:    "war sanctions Iran Russia Ukraine energy oil gas Middle East ECB eurozone inflation",
  };

  const blacklist = [
    "rt.com","sputniknews.com","tass.com","theduran.com","zerohedge.com",
    "infowars.com","breitbart.com","naturalnews.com","globalresearch.ca",
    "zeenews.india.com","ndtv.com","hindustantimes.com","economictimes.indiatimes.com",
    "timesofindia.com","indiatoday.intoday.in","thehindu.com","livemint.com",
    "dailymail.co.uk","nypost.com","vox.com","kingworldnews.com","jamaica-gleaner.com",
    "fastcompany.com","thestockmarketwatch.com","flassbeck-economics.com","argaam.com",
    "uctoday.com","fortune.com","investing.com","finance.yahoo.com","benzinga.com",
    "winnipegfreepress.com","en.protothema.gr","steynonline.com","activistpost.com",
    "newsmax.com","juancole.com","theblaze.com","oann.com",
  ].join(",");

  const q = searches[category] || searches.energy;

  try {
    // Tier 1: last 2 days, categories filter
    const r1 = await fetch(
      `https://api.thenewsapi.com/v1/news/all?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}&language=en&limit=6&sort=published_at` +
      `&categories=business,politics&published_after=${daysAgo(2)}` +
      `&exclude_domains=${encodeURIComponent(blacklist)}`
    );
    const d1 = await r1.json();
    if (d1.data && d1.data.length >= 3) return res.status(200).json(d1);

    // Tier 2: last 5 days
    const r2 = await fetch(
      `https://api.thenewsapi.com/v1/news/all?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}&language=en&limit=6&sort=published_at` +
      `&categories=business,politics&published_after=${daysAgo(5)}` +
      `&exclude_domains=${encodeURIComponent(blacklist)}`
    );
    const d2 = await r2.json();
    if (d2.data && d2.data.length >= 2) return res.status(200).json(d2);

    // Tier 3: no category filter, just blacklist
    const r3 = await fetch(
      `https://api.thenewsapi.com/v1/news/all?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}&language=en&limit=6&sort=published_at` +
      `&published_after=${daysAgo(3)}` +
      `&exclude_domains=${encodeURIComponent(blacklist)}`
    );
    const d3 = await r3.json();
    return res.status(200).json(d3);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
