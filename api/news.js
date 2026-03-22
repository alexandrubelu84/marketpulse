export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { category } = req.query;
  const API_KEY = process.env.NEWS_API_KEY;

  const searches = {
    geo:    "military strike oil gas pipeline energy infrastructure sanctions Russia Iran",
    energy: "European natural gas TTF LNG energy prices",
    oil:    "crude oil OPEC Brent WTI prices",
    macro:  "ECB interest rates eurozone inflation economy",
  };

  const q = searches[category] || searches.energy;

  try {
    const url = `https://api.thenewsapi.com/v1/news/all?api_token=${API_KEY}&search=${encodeURIComponent(q)}&language=en&limit=6&published_after=${getDateDaysAgo(3)}`;
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
