export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { category } = req.query;
  const API_KEY = process.env.NEWS_API_KEY;

  const searches = {
    geo:    "war sanctions Iran Russia Ukraine energy oil gas",
    energy: "natural gas LNG TTF energy Europe prices",
    oil:    "crude oil OPEC Brent WTI prices",
    macro:  "ECB eurozone inflation interest rates economy",
  };

  // 29 trusted sources - both sky.com variants included
  const domains = [
    "apnews.com", "reuters.com", "bbc.co.uk", "bbc.com",
    "news.sky.com", "sky.com", "theguardian.com", "axios.com",
    "cnbc.com", "marketwatch.com", "seekingalpha.com", "economist.com",
    "oilprice.com", "ogj.com", "rigzone.com", "naturalgasworld.com",
    "worldoil.com", "lngprime.com", "argusmedia.com", "icis.com",
    "euronews.com", "france24.com", "dw.com", "politico.eu",
    "afp.com", "iea.org", "spglobal.com",
    "consilium.europa.eu", "ec.europa.eu",
  ].join(",");

  // Strict blacklist for last resort
  const blacklist = [
    "rt.com", "sputniknews.com", "tass.com", "theduran.com",
    "zerohedge.com", "infowars.com", "breitbart.com", "naturalnews.com",
    "globalresearch.ca", "steynonline.com", "zeenews.india.com",
    "ndtv.com", "hindustantimes.com", "vox.com", "dailymail.co.uk",
    "kingworldnews.com", "jamaica-gleaner.com", "investing.com",
    "activistpost.com", "newsmax.com", "oann.com", "theblaze.com",
  ].join(",");

  const q = searches[category] || searches.energy;

  try {
    // Tier 1: trusted domains, last 3 days
    const r1 = await fetch(
      `https://api.thenewsapi.com/v1/news/all?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}&language=en&limit=6&sort=published_at` +
      `&published_after=${daysAgo(3)}&domains=${encodeURIComponent(domains)}`
    );
    const d1 = await r1.json();
    if (d1.data && d1.data.length >= 3) return res.status(200).json(d1);

    // Tier 2: trusted domains, last 7 days
    const r2 = await fetch(
      `https://api.thenewsapi.com/v1/news/all?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}&language=en&limit=6&sort=published_at` +
      `&published_after=${daysAgo(7)}&domains=${encodeURIComponent(domains)}`
    );
    const d2 = await r2.json();
    if (d2.data && d2.data.length >= 2) return res.status(200).json(d2);

    // Tier 3: no domain filter, exclude blacklist, business/politics only
    const r3 = await fetch(
      `https://api.thenewsapi.com/v1/news/all?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}&language=en&limit=6&sort=published_at` +
      `&categories=business,politics&published_after=${daysAgo(5)}` +
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
