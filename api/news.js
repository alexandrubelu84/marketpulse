export default async function handler(req, res) {
  try {
    const API_KEY = process.env.GNEWS_API_KEY || "e0f37fea0cc58ddc53097169ff6594ba";
    const category = String(req.query.category || "geo").toLowerCase();

    const CATEGORY_QUERIES = {
      geo: [
        '"Strait of Hormuz"',
        'Iran missile',
        'Iran strike',
        'Iran attack',
        'Iran tanker',
        'Iran shipping',
        'Gulf tanker attack',
        'Middle East shipping disruption',
        'Iran Israel conflict',
        'US Iran Israel strike',
	'US Iran Israel peace talks negotation'
      ],
      energy: [
        '"Strait of Hormuz" gas',
        '"Strait of Hormuz" LNG',
        'Iran gas supply',
        'Iran LNG supply',
        'refinery attack Iran',
        'Middle East gas disruption',
        'QatarEnergy LNG',
        'LNG force majeure'
      ],
      oil: [
        '"Strait of Hormuz" oil',
        'Iran oil supply',
        'Brent Iran war',
        'OPEC Iran oil',
        'Middle East crude disruption',
        'oil tanker Hormuz',
        'refinery oil attack'
      ],
      macro: [
        'oil price inflation',
        'energy shock inflation',
        'Iran war economy',
        'Iran war inflation',
        'commodity shock growth',
        'energy prices economy'
      ]
    };

    const queries = CATEGORY_QUERIES[category] || CATEGORY_QUERIES.geo;

    const TIER1 = [
      "reuters",
      "bloomberg",
      "bnn bloomberg",
      "cnbc",
      "financial times",
      "ft",
      "wall street journal",
      "wsj",
      "associated press",
      "ap news",
      "bbc",
      "spglobal",
      "s&p global",
      "platts"
    ];

    const TIER2 = [
      "fortune",
      "the guardian",
      "financial post",
      "al jazeera",
      "abc news",
      "fox business",
      "marketwatch",
      "yahoo finance",
      "cna",
      "investors business daily"
    ];

    const BLOCKED = [
      "moneycontrol",
      "outlook business",
      "outlook india",
      "indian express",
      "the new indian express",
      "telegraph india",
      "times now",
      "times of india",
      "hindustan times",
      "india today",
      "india tv news",
      "ndtv",
      "ndtv profit",
      "news18",
      "firstpost",
      "business standard",
      "lokmat times",
      "malayala manorama",
      "free press journal",
      "daily mail",
      "daily mail online",
      "daily express",
      "oxford mail",
      "daily echo",
      "lancashire telegraph",
      "devdiscourse",
      "natural news",
      "huffpost",
      "manila times",
      "ibt",
      "international business times",
      "atlanta journal constitution",
      "daily excelsior"
    ];

    const normalize = (s) =>
      String(s || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const sourceIn = (source, list) =>
      list.some((item) => source.includes(normalize(item)));

    const fetchJson = async (url) => {
      try {
        const response = await fetch(url, {
          headers: { Accept: "application/json" }
        });

        if (!response.ok) {
          const txt = await response.text().catch(() => "");
          console.error("GNews bad response:", response.status, txt.slice(0, 200));
          return { articles: [] };
        }

        return await response.json();
      } catch (e) {
        console.error("Fetch failed:", e);
        return { articles: [] };
      }
    };

    let allArticles = [];

    for (const q of queries) {
      const url =
        `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}` +
        `&lang=en&max=10&sortby=publishedAt&apikey=${API_KEY}`;

      const data = await fetchJson(url);

      if (Array.isArray(data.articles)) {
        allArticles = allArticles.concat(data.articles);
      }
    }

    // dedupe dupa URL
    let unique = Array.from(new Map(allArticles.map((a) => [a.url, a])).values());

    // dedupe dupa titlu aproximativ
    const seenTitles = new Set();
    unique = unique.filter((a) => {
      const key = normalize(a.title).split(" ").slice(0, 10).join(" ");
      if (!key) return false;
      if (seenTitles.has(key)) return false;
      seenTitles.add(key);
      return true;
    });

    const scored = unique
      .map((a) => {
        const title = normalize(a.title);
        const desc = normalize(a.description);
        const text = `${title} ${desc}`;
        const source = normalize(a.source?.name || "");

        const isTier1 = sourceIn(source, TIER1);
        const isTier2 = sourceIn(source, TIER2);
        const isBlocked = sourceIn(source, BLOCKED);

        if (isBlocked) return null;

        let score = 0;

        if (isTier1) score += 20;
        if (isTier2) score += 8;

        // universal important signals
        if (text.includes("strait of hormuz")) score += 18;
        if (text.includes("hormuz")) score += 10;
        if (text.includes("iran")) score += 5;
        if (text.includes("missile")) score += 6;
        if (text.includes("strike")) score += 6;
        if (text.includes("attack")) score += 6;
        if (text.includes("shipping")) score += 5;
        if (text.includes("tanker")) score += 6;
        if (text.includes("disruption")) score += 8;
        if (text.includes("closure")) score += 10;
        if (text.includes("blockade")) score += 10;

        // category specific
        if (category === "energy") {
          if (text.includes("lng")) score += 10;
          if (text.includes("gas")) score += 8;
          if (text.includes("refinery")) score += 8;
          if (text.includes("pipeline")) score += 6;
          if (text.includes("terminal")) score += 5;
          if (text.includes("supply")) score += 5;
          if (text.includes("force majeure")) score += 10;
        }

        if (category === "oil") {
          if (text.includes("oil")) score += 8;
          if (text.includes("crude")) score += 8;
          if (text.includes("brent")) score += 7;
          if (text.includes("opec")) score += 6;
          if (text.includes("refinery")) score += 7;
          if (text.includes("shipment")) score += 5;
        }

        if (category === "macro") {
          if (text.includes("inflation")) score += 8;
          if (text.includes("economy")) score += 6;
          if (text.includes("growth")) score += 4;
          if (text.includes("ecb")) score += 6;
          if (text.includes("rates")) score += 4;
          if (text.includes("shock")) score += 5;
        }

        if (category === "geo") {
          if (text.includes("gulf")) score += 4;
          if (text.includes("israel")) score += 3;
          if (text.includes("us")) score += 2;
          if (text.includes("tehran")) score += 2;
        }

        // penalties
        if (title.includes("live")) score -= 10;
        if (title.includes("live updates")) score -= 10;
        if (title.includes("video")) score -= 8;
        if (title.includes("watch")) score -= 6;
        if (title.includes("meme")) score -= 12;

        let impact = "low";
        if (
          score >= 32 ||
          text.includes("strait of hormuz") ||
          text.includes("force majeure") ||
          text.includes("closure") ||
          text.includes("blockade") ||
          (text.includes("lng") && text.includes("attack")) ||
          (text.includes("refinery") && text.includes("attack"))
        ) {
          impact = "high";
        } else if (score >= 20) {
          impact = "medium";
        }

        let direction = "NEUTRAL";

        if (
          text.includes("attack") ||
          text.includes("strike") ||
          text.includes("missile") ||
          text.includes("disruption") ||
          text.includes("closure") ||
          text.includes("blockade")
        ) {
          if (text.includes("oil") || text.includes("crude") || text.includes("brent")) {
            direction = "BULLISH_OIL";
          } else if (text.includes("gas") || text.includes("lng")) {
            direction = "BULLISH_GAS";
          } else {
            direction = "RISK_ENERGY";
          }
        }

        if (
          text.includes("deal") ||
          text.includes("ceasefire") ||
          text.includes("talks") ||
          text.includes("negotiation") ||
          text.includes("reopen")
        ) {
          direction = "BEARISH_ENERGY";
        }

        return {
          title: a.title,
          description: String(a.description || "").slice(0, 260),
          snippet: String(a.description || "").slice(0, 260),
          source: a.source?.name || "",
          url: a.url,
          published_at: a.publishedAt,
          score,
          impact,
          direction,
          isTier1,
          isTier2
        };
      })
      .filter(Boolean);

    // 1. doar Tier 1
    let finalItems = scored
      .filter((a) => a.isTier1)
      .filter((a) => a.score >= 18)
      .sort((a, b) => b.score - a.score);

    // 2. dacă sunt prea puține, Tier 2
    if (finalItems.length < 4) {
      finalItems = scored
        .filter((a) => a.isTier1 || a.isTier2)
        .filter((a) => a.score >= 20)
        .sort((a, b) => b.score - a.score);
    }

    // 3. fallback final, dar tot fără blocked
    if (finalItems.length < 2) {
      finalItems = scored
        .filter((a) => a.score >= 24)
        .sort((a, b) => b.score - a.score);
    }

    finalItems = finalItems.slice(0, 8).map((a) => ({
      title: a.title,
      description: a.description,
      snippet: a.snippet,
      source: a.source,
      url: a.url,
      published_at: a.published_at,
      score: a.score,
      impact: a.impact,
      direction: a.direction
    }));

    return res.status(200).json({ data: finalItems });
  } catch (err) {
    console.error("ERROR in /api/news:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}