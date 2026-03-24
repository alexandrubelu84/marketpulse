export default async function handler(req, res) {
  try {
    const API_KEY = process.env.GNEWS_API_KEY || "e0f37fea0cc58ddc53097169ff6594ba";
    const category = String(req.query.category || "geo").toLowerCase();

    const CATEGORY_CONFIG = {
      geo: {
        queries: [
          '"Strait of Hormuz"',
          'Iran missile strike',
          'Iran attack Hormuz',
          'Iran Gulf shipping',
          'Iran Gulf states attack'
        ],
        keywords: [
          "iran", "hormuz", "strait of hormuz", "missile", "strike", "attack",
          "shipping", "ship", "vessel", "tanker", "gulf", "naval", "closure",
          "blockade", "retaliation", "tehran"
        ]
      },
      energy: {
        queries: [
          '"Strait of Hormuz" gas',
          '"Strait of Hormuz" LNG',
          'Iran gas supply disruption',
          'Iran refinery attack',
          'Middle East LNG supply'
        ],
        keywords: [
          "iran", "hormuz", "strait of hormuz", "gas", "lng", "refinery",
          "pipeline", "terminal", "energy", "supply", "disruption", "facility",
          "export", "shipment", "cargo", "petchem", "petrochemical"
        ]
      },
      oil: {
        queries: [
          '"Strait of Hormuz" oil',
          'Iran oil supply disruption',
          'Brent Iran war',
          'OPEC Iran oil',
          'Middle East crude supply'
        ],
        keywords: [
          "iran", "hormuz", "strait of hormuz", "oil", "crude", "brent",
          "opec", "barrel", "refinery", "shipment", "tanker", "export",
          "supply", "disruption", "wti"
        ]
      },
      macro: {
        queries: [
          'Iran war inflation',
          'Iran war economy',
          '"Strait of Hormuz" inflation',
          'energy prices inflation',
          'oil shock economy'
        ],
        keywords: [
          "inflation", "economy", "growth", "rates", "central bank", "ecb",
          "commodity", "prices", "energy", "oil", "gas", "iran", "hormuz",
          "shock", "stagflation", "recession", "survey", "manufacturing"
        ]
      }
    };

    const cfg = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.geo;

    // Tier 1 = ce vrei sa vezi aproape mereu
    const TIER1_SOURCES = [
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
      "marketwatch",
      "yahoo finance",
      "spglobal",
      "s&p global",
      "platts"
    ];

    // Tier 2 = acceptabile doar daca nu ai destule din Tier 1
    const TIER2_SOURCES = [
      "fortune",
      "the guardian",
      "financial post",
      "al jazeera",
      "abc news",
      "fox business",
      "cna",
      "investors business daily"
    ];

    // Tot ce vrei sa omori
    const BLOCKED_SOURCES = [
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
      "international business times"
    ];

    const fetchJson = async (url) => {
      const response = await fetch(url, {
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        const txt = await response.text().catch(() => "");
        throw new Error(`GNews HTTP ${response.status}: ${txt.slice(0, 200)}`);
      }

      return response.json();
    };

    const normalize = (s) =>
      String(s || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const inList = (source, arr) => arr.some((x) => source.includes(normalize(x)));

    let allArticles = [];

    for (const q of cfg.queries) {
      const url =
        `https://gnews.io/api/v4/search?` +
        `q=${encodeURIComponent(q)}` +
        `&lang=en` +
        `&max=10` +
        `&sortby=publishedAt` +
        `&apikey=${API_KEY}`;

      const data = await fetchJson(url);

      if (Array.isArray(data.articles)) {
        allArticles = allArticles.concat(data.articles);
      }
    }

    // dedupe dupa URL
    let unique = Array.from(
      new Map(allArticles.map((a) => [a.url, a])).values()
    );

    // dedupe si dupa titlu aproape identic
    const seenTitleKeys = new Set();
    unique = unique.filter((a) => {
      const key = normalize(a.title).split(" ").slice(0, 9).join(" ");
      if (!key) return false;
      if (seenTitleKeys.has(key)) return false;
      seenTitleKeys.add(key);
      return true;
    });

    const scored = unique.map((a) => {
      const title = normalize(a.title);
      const desc = normalize(a.description);
      const text = `${title} ${desc}`;
      const source = normalize(a.source?.name || "");

      let score = 0;

      const isTier1 = inList(source, TIER1_SOURCES);
      const isTier2 = inList(source, TIER2_SOURCES);
      const isBlocked = inList(source, BLOCKED_SOURCES);

      if (isTier1) score += 20;
      if (isTier2) score += 8;
      if (isBlocked) score -= 100;

      for (const k of cfg.keywords) {
        if (text.includes(normalize(k))) score += 2;
      }

      if (text.includes("strait of hormuz")) score += 15;
      if (text.includes("hormuz")) score += 8;
      if (text.includes("lng")) score += 8;
      if (text.includes("refinery")) score += 8;
      if (text.includes("pipeline")) score += 6;
      if (text.includes("terminal")) score += 5;
      if (text.includes("disruption")) score += 8;
      if (text.includes("closure")) score += 8;
      if (text.includes("blockade")) score += 8;
      if (text.includes("shipping")) score += 4;
      if (text.includes("tanker")) score += 5;
      if (text.includes("export")) score += 4;
      if (text.includes("attack")) score += 5;
      if (text.includes("strike")) score += 5;
      if (text.includes("missile")) score += 4;
      if (text.includes("war")) score += 3;

      if (category === "energy") {
        if (text.includes("gas")) score += 6;
        if (text.includes("energy")) score += 3;
        if (text.includes("facility")) score += 3;
      }

      if (category === "oil") {
        if (text.includes("oil")) score += 6;
        if (text.includes("crude")) score += 5;
        if (text.includes("brent")) score += 5;
        if (text.includes("opec")) score += 4;
        if (text.includes("wti")) score += 3;
      }

      if (category === "macro") {
        if (text.includes("inflation")) score += 6;
        if (text.includes("economy")) score += 4;
        if (text.includes("growth")) score += 3;
        if (text.includes("ecb")) score += 4;
        if (text.includes("rates")) score += 3;
      }

      if (category === "geo") {
        if (text.includes("iran")) score += 4;
        if (text.includes("gulf")) score += 3;
        if (text.includes("tehran")) score += 2;
      }

      if (title.includes("live updates")) score -= 8;
      if (title.includes("live:")) score -= 8;
      if (title.includes("watch")) score -= 6;
      if (title.includes("video")) score -= 6;
      if (title.includes("meme")) score -= 10;
      if (text.includes("opinion")) score -= 6;

      let impact = "low";
      if (
        score >= 35 ||
        text.includes("strait of hormuz") ||
        text.includes("closure") ||
        text.includes("blockade") ||
        (text.includes("lng") && text.includes("attack")) ||
        (text.includes("refinery") && text.includes("attack"))
      ) {
        impact = "high";
      } else if (score >= 22) {
        impact = "medium";
      }

      let direction = "NEUTRAL";
      if (
        text.includes("attack") ||
        text.includes("strike") ||
        text.includes("missile") ||
        text.includes("closure") ||
        text.includes("disruption") ||
        text.includes("blockade")
      ) {
        if (text.includes("oil") || text.includes("crude") || text.includes("brent")) {
          direction = "BULLISH_OIL";
        } else if (text.includes("gas") || text.includes("lng")) {
          direction = "BULLISH_GAS";
        } else {
          direction = "RISK_ON_ENERGY";
        }
      }
      if (
        text.includes("ceasefire") ||
        text.includes("deal") ||
        text.includes("reopen") ||
        text.includes("talks")
      ) {
        direction = "BEARISH_ENERGY";
      }

      return {
        title: a.title,
        description: a.description,
        snippet: a.description,
        source: a.source?.name || "",
        url: a.url,
        published_at: a.publishedAt,
        score,
        impact,
        direction,
        isTier1,
        isTier2,
        isBlocked
      };
    });

    // 1) doar Tier 1
    let finalItems = scored
      .filter((a) => !a.isBlocked)
      .filter((a) => a.isTier1)
      .filter((a) => a.score >= 18)
      .sort((a, b) => b.score - a.score);

    // 2) dacă sunt prea puține, adaugă Tier 2
    if (finalItems.length < 4) {
      finalItems = scored
        .filter((a) => !a.isBlocked)
        .filter((a) => a.isTier1 || a.isTier2)
        .filter((a) => a.score >= 18)
        .sort((a, b) => b.score - a.score);
    }

    // 3) fallback final, dar tot fără blocked
    if (finalItems.length < 3) {
      finalItems = scored
        .filter((a) => !a.isBlocked)
        .filter((a) => a.score >= 24)
        .sort((a, b) => b.score - a.score);
    }

    finalItems = finalItems
      .map((a) => ({
        title: a.title,
        description: String(a.description || "").slice(0, 260),
        snippet: String(a.snippet || "").slice(0, 260),
        source: a.source,
        url: a.url,
        published_at: a.published_at,
        score: a.score,
        impact: a.impact,
        direction: a.direction
      }))
      .slice(0, 12);

    return res.status(200).json({ data: finalItems });
  } catch (err) {
    console.error("ERROR in /api/news:", err);
    return res.status(500).json({ error: "Internal error" });
  }
}