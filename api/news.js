export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { category } = req.query;
  const API_KEY = process.env.NEWS_API_KEY;

  // Advanced search queries using TheNewsAPI operators
  // + = AND, | = OR, - = NOT, " " = exact phrase
  const searches = {
    geo:    '"oil" | "gas" | "energy" + ("attack" | "sanction" | "war" | "Iran" | "Russia" | "Ukraine" | "Hormuz" | "pipeline")',
    energy: '"natural gas" | "LNG" | "TTF" | "energy prices" + ("Europe" | "European")',
    oil:    '"crude oil" | "Brent" | "WTI" | "OPEC" + ("price" | "barrel" | "production")',
    macro:  '"ECB" | "European Central Bank" | "eurozone" + ("inflation" | "interest rate" | "GDP" | "economy")',
  };

  const q = searches[category] || searches.energy;
  const twoDaysAgo = getDateDaysAgo(2);

  // Domains to exclude
  const excludeDomains = [
    "rt.com","sputniknews.com","tass.com","theduran.com",
    "zerohedge.com","steynonline.com","infowars.com","breitbart.com",
    "naturalnews.com","globalresearch.ca","vox.com","justsecurity.org",
    "zeenews.india.com","ndtv.com","activistpost.com"
  ].join(",");

  try {
    const url = `https://api.thenewsapi.com/v1/news/all` +
      `?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}` +
      `&categories=business,politics,general` +
      `&language=en` +
      `&limit=6` +
      `&sort=published_at` +
      `&published_after=${twoDaysAgo}` +
      `&exclude_domains=${encodeURIComponent(excludeDomains)}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.data && data.data.length > 0) {
      return res.status(200).json(data);
    }

    // Fallback: simpler query, last 3 days
    const simpleSearches = {
      geo:    "oil gas attack sanctions Iran Russia Ukraine energy",
      energy: "natural gas LNG TTF Europe energy",
      oil:    "crude oil OPEC Brent WTI prices",
      macro:  "ECB eurozone inflation interest rates economy",
    };

    const url2 = `https://api.thenewsapi.com/v1/news/all` +
      `?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(simpleSearches[category] || simpleSearches.energy)}` +
      `&categories=business,politics` +
      `&language=en` +
      `&limit=6` +
      `&sort=published_at` +
      `&published_after=${getDateDaysAgo(3)}` +
      `&exclude_domains=${encodeURIComponent(excludeDomains)}`;

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
