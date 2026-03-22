export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { category } = req.query;
  const API_KEY = process.env.NEWS_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: "NEWS_API_KEY not set" });

  const searches = {
    energy: "oil gas energy",
    geo:    "Iran war sanctions oil",
  };

  const blacklist = [
    // Russian propaganda
    "rt.com","sputniknews.com","tass.com",
    // Indian sites
    "thehindu.com","ndtv.com","hindustantimes.com","economictimes.indiatimes.com",
    "timesofindia.com","indiatoday.intoday.in","livemint.com","rediff.com",
    "business-standard.com","moneycontrol.com","deccanchronicle.com",
    "opindia.com","swarajyamag.com","wionews.com","firstpost.com",
    "theprint.in","scroll.in","telegraphindia.com","thehindubusinessline.com","businesstoday.in",
    "redstate.com","thegoodinvestors.sg","e.vnexpress.net","vnexpress.net",
    "seekingalpha.com","middleeastmonitor.com","pambazuka.org","antiwar.com",
    // Far right / conspiracy / extremist
    "theduran.com","zerohedge.com","infowars.com","breitbart.com","naturalnews.com",
    "globalresearch.ca","steynonline.com","activistpost.com","newsmax.com",
    "westernjournal.com","theoccidentalobserver.net","theblaze.com","oann.com",
    "gellerreport.com","juancole.com",
    // Left wing activist
    "truthout.org","commondreams.org","alternet.org","counterpunch.org",
    // Regional irrelevant
    "thedailyblog.co.nz","manilatimes.net","jamaicagleaner.com",
    "winnipegfreepress.com","en.protothema.gr","thedrive.com",
    // Sports / lifestyle
    "sportsnet.ca","insider.com","menshealth.com","buzzfeed.com",
    // Finance clickbait
    "mottcapitalmanagement.com","uctoday.com","fortune.com","investing.com",
    "finance.yahoo.com","benzinga.com","fool.com","thestockmarketwatch.com",
    "flassbeck-economics.com","kingworldnews.com","argaam.com","fastcompany.com",
    // Other
    "dailymail.co.uk","nypost.com","vox.com","jamaica-gleaner.com",
  ].join(",");

  const q = searches[category] || searches.energy;

  try {
    const url = `https://api.thenewsapi.com/v1/news/all?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}&language=en&limit=6&sort=published_at` +
      `&categories=business,politics` +
      `&published_after=${daysAgo(2)}` +
      `&exclude_domains=${encodeURIComponent(blacklist)}`;

    const r = await fetch(url);
    const d = await r.json();

    if (d.data && d.data.length >= 2) return res.status(200).json(d);

    // Fallback: last 5 days
    const url2 = `https://api.thenewsapi.com/v1/news/all?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}&language=en&limit=6&sort=published_at` +
      `&categories=business,politics` +
      `&published_after=${daysAgo(5)}` +
      `&exclude_domains=${encodeURIComponent(blacklist)}`;

    const r2 = await fetch(url2);
    const d2 = await r2.json();
    return res.status(200).json(d2);

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
