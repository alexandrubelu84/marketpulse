export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { category } = req.query;
  const API_KEY = process.env.NEWS_API_KEY;

  const searches = {
    geo:    '"oil" | "gas" | "energy" + ("attack" | "sanction" | "war" | "Iran" | "Russia" | "Ukraine" | "Hormuz" | "pipeline")',
    energy: '"natural gas" | "LNG" | "TTF" | "energy prices" + ("Europe" | "European")',
    oil:    '"crude oil" | "Brent" | "WTI" | "OPEC" + ("price" | "barrel" | "production")',
    macro:  '"ECB" | "eurozone" | "European Central Bank" + ("inflation" | "interest rate" | "GDP" | "economy")',
  };

  // Only trusted, quality sources
  const domains = [
    "reuters.com",
    "apnews.com",
    "cnbc.com",
    "ft.com",
    "euronews.com",
    "skynews.com",
    "bbc.co.uk",
    "bbc.com",
    "theguardian.com",
    "economist.com",
    "wsj.com",
    "oilprice.com",
    "spglobal.com",
    "platts.com",
    "naturalgasworld.com",
    "iea.org",
    "politico.eu",
    "axios.com",
    "bloomberg.com",
    "seekingalpha.com",
  ].join(",");

  const q = searches[category] || searches.energy;
  const twoDaysAgo = getDateDaysAgo(2);

  try {
    // First attempt: trusted domains + last 2 days
    const url = `https://api.thenewsapi.com/v1/news/all` +
      `?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}` +
      `&language=en` +
      `&limit=6` +
      `&sort=published_at` +
      `&published_after=${twoDaysAgo}` +
      `&domains=${encodeURIComponent(domains)}`;

    const r1 = await fetch(url);
    const d1 = await r1.json();

    if (d1.data && d1.data.length >= 3) {
      return res.status(200).json(d1);
    }

    // Fallback: trusted domains, last 5 days, simpler query
    const simpleQ = {
      geo:    "oil gas attack sanctions Iran Russia Ukraine",
      energy: "natural gas LNG TTF Europe energy prices",
      oil:    "crude oil OPEC Brent WTI prices",
      macro:  "ECB inflation eurozone interest rates",
    };

    const url2 = `https://api.thenewsapi.com/v1/news/all` +
      `?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(simpleQ[category] || simpleQ.energy)}` +
      `&language=en` +
      `&limit=6` +
      `&sort=published_at` +
      `&published_after=${getDateDaysAgo(5)}` +
      `&domains=${encodeURIComponent(domains)}`;

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
