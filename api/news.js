export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { category } = req.query;
  const API_KEY = process.env.NEWS_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: "NEWS_API_KEY not set" });

  const searches = {
    geo:    "Iran war sanctions Middle East oil gas",
    energy: "natural gas LNG TTF Europe energy",
    oil:    "crude oil OPEC Brent WTI prices",
    macro:  "ECB eurozone inflation interest rates economy",
  };

  const blacklist = [
    // Russian propaganda
    "rt.com","sputniknews.com","tass.com",
    // Indian sites
    "thehindu.com","ndtv.com","hindustantimes.com","economictimes.indiatimes.com",
    "timesofindia.com","timesofindia.indiatimes.com","indiatoday.intoday.in",
    "livemint.com","rediff.com","business-standard.com","moneycontrol.com",
    "deccanchronicle.com","opindia.com","swarajyamag.com","wionews.com",
    "firstpost.com","theprint.in","scroll.in","telegraphindia.com",
    "thehindubusinessline.com","businesstoday.in",
    // Far right / conspiracy
    "theduran.com","zerohedge.com","infowars.com","breitbart.com","naturalnews.com",
    "globalresearch.ca","steynonline.com","activistpost.com","newsmax.com",
    "westernjournal.com","theoccidentalobserver.net","theblaze.com","oann.com",
    "gellerreport.com","juancole.com","redstate.com","dailysignal.com",
    // Left wing activist
    "truthout.org","commondreams.org","alternet.org","counterpunch.org",
    // Regional irrelevant
    "thedailyblog.co.nz","manilatimes.net","jamaica-gleaner.com",
    "winnipegfreepress.com","en.protothema.gr","thedrive.com",
    "thegoodinvestors.sg","e.vnexpress.net","vnexpress.net",
    // Sports / lifestyle
    "sportsnet.ca","insider.com","menshealth.com","buzzfeed.com","labourlist.org",
    // Finance clickbait / aggregators
    "mottcapitalmanagement.com","uctoday.com","fortune.com","investing.com",
    "finance.yahoo.com","benzinga.com","fool.com","thestockmarketwatch.com",
    "flassbeck-economics.com","kingworldnews.com","argaam.com","fastcompany.com",
    "newser.com","suburbanfinance.com","seekingalpha.com","middleeastmonitor.com",
    // Other
    "dailymail.co.uk","nypost.com","vox.com","washingtontimes.com",
  ].join(",");

  const q = searches[category] || searches.energy;

  try {
    // Tier 1: last 2 days + categories filter
    const r1 = await fetch(
      `https://api.thenewsapi.com/v1/news/all?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}&language=en&limit=6&sort=published_at` +
      `&categories=business,politics&published_after=${daysAgo(2)}` +
      `&exclude_domains=${encodeURIComponent(blacklist)}`
    );
    const d1 = await r1.json();
    if (d1.data && d1.data.length >= 2) return res.status(200).json(d1);

    // Tier 2: last 5 days
    const r2 = await fetch(
      `https://api.thenewsapi.com/v1/news/all?api_token=${API_KEY}` +
      `&search=${encodeURIComponent(q)}&language=en&limit=6&sort=published_at` +
      `&categories=business,politics&published_after=${daysAgo(5)}` +
      `&exclude_domains=${encodeURIComponent(blacklist)}`
    );
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
