export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { category } = req.query;
  const API_KEY = process.env.NEWS_API_KEY;

  const searches = {
    geo:    "Iran war energy oil gas attack Ukraine Russia sanctions 2026",
    energy: "natural gas TTF LNG Europe prices 2026",
    oil:    "crude oil OPEC Brent WTI prices 2026",
    macro:  "ECB interest rates inflation eurozone 2026",
  };

  const excludeDomains = [
    "theduran.com","zerohedge.com","steynonline.com","infowars.com",
    "breitbart.com","naturalnews.com","rt.com","sputniknews.com",
    "tass.com","globalresearch.ca","activistpost.com","thegatwaypundit.com",
    "zeenews.india.com","ndtv.com","vox.com","justsecurity.org"
  ].join(",");

  const q = searches[category] || searches.energy;
  const twoDaysAgo = getDateDaysAgo(2);

  try {
    const url = `https://api.thenewsapi.com/v1/news/all` +
      `?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}` +
      `&language=en` +
      `&limit=6` +
      `&sort=published_at` +
      `&published_after=${twoDaysAgo}` +
      `&exclude_domains=${encodeURIComponent(excludeDomains)}`;

    const response = await fetch(url);
    const data = await response.json();

    // Filter out old articles client-side too
    if (data.data) {
      const twoDaysAgoMs = Date.now() - (2 * 24 * 60 * 60 * 1000);
      data.data = data.data.filter(function(a) {
        return new Date(a.published_at).getTime() > twoDaysAgoMs;
      });
    }

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
