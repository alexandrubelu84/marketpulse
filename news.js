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

    // Surse bune / utile pentru tine
    const ALLOWED_SOURCES = [
      "reuters",
      "bloomberg",
      "bnn bloomberg",
      "cnbc",
      "financial times",
      "ft",
      "wall street journal",
      "wsj",
      "associated press",
      "ap",
      "ap news",
      "bbc",
      "marketwatch",
      "yahoo finance",
      "spglobal",
      "s&p global",
      "platts",
      "fortune",
      "the guardian",
      "financial post",
      "al jazeera",
      "abc news",
      "abc17news.com",
      "fox business",
      "cna",
      "outlook business",
      "investors business daily"
    ];

    // Surse pe care vrei sa le omori
    const BLOCKED_SOURCES = [
      "lokmat times",
      "malayala manorama",
      "free press journal",
      "telegraph india",
      "india tv news",
      "ndtv",
      "ndtv profit",
      "news18",
      "times now",
      "times of india",
      "hindustan times",
      "india today",
      "firstpost",
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
      "business standard",
      "the new indian express"
    ];

    const fetchJson = async (url) => {
      const response = await fetch(url, {
        headers: {
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        const txt = await response.text().catch(() => "");
        throw new Error(`GNews HTTP ${response.status}: ${txt.slice(0, 200)}`);
      }

      return response.json();
    };

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

    // dedupe basic dupa URL
    let unique = Array.from(
      new Map(allArticles.map((a) => [a.url, a])).values()
    );

    const normalize = (s) =>
      String(s || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const getSource = (a) => normalize(a.source?.name || "");
    const getTitle = (a) => String(a.title || "");
    const getDesc = (a) => String(a.description || "");

    const containsAny = (text, arr) => arr.some((x) => text.includes(normalize(x)));

    const isAllowedSource = (source) =>
      ALLOWED_SOURCES.some((s) => source.includes(normalize(s)));

    const isBlockedSource = (source) =>
      BLOCKED_SOURCES.some((s) => source.includes(normalize(s)));

    const scoreArticle = (a) => {
      const title = normalize(getTitle(a));
      const desc = normalize(getDesc(a));
      const text = `${title} ${desc}`;
      const source = getSource(a);

      let score = 0;

      // source quality
      if (isAllowedSource(source)) score += 10;
      if (isBlockedSource(source)) score -= 20;

      // category keywords
      for (const k of cfg.keywords) {
        if (text.includes(normalize(k))) score += 2;
      }

      // exact important triggers
      if (text.includes("strait of hormuz")) score += 12;
      if (text.includes("hormuz")) score += 6;
      if (text.includes("lng")) score += 7;
      if (text.includes("refinery")) score += 7;
      if (text.includes("pipeline")) score += 6;
      if (text.includes("terminal")) score += 5;
      if (text.includes("disruption")) score += 8;
      if (text.includes("supply shock")) score += 9;
      if (text.includes("closure")) score += 8;
      if (text.includes("blockade")) score += 8;
      if (text.includes("shipping")) score += 4;
      if (text.includes("tanker")) score += 5;
      if (text.includes("export")) score += 4;
      if (text.includes("attack")) score += 5;
      if (text.includes("strike")) score += 5;
      if (text.includes("missile")) score += 4;
      if (text.includes("war")) score += 3;

      // category-specific boosts
      if (category === "energy") {
        if (text.includes("gas")) score += 5;
        if (text.includes("energy")) score += 3;
        if (text.includes("facility")) score += 3;
      }

      if (category === "oil") {
        if (text.includes("oil")) score += 5;
        if (text.includes("crude")) score += 5;
        if (text.includes("brent")) score += 4;
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

      // penalizari pentru articole prea generale / slabe
      if (title.includes("live updates")) score -= 6;
      if (title.includes("live:")) score -= 6;
      if (title.includes("watch")) score -= 5;
      if (title.includes("video")) score -= 5;
      if (title.includes("meme")) score -= 8;
      if (text.includes("opinion")) score -= 5;

      return score;
    };

    const inferImpact = (a, score) => {
      const text = normalize(`${getTitle(a)} ${getDesc(a)}`);

      if (
        score >= 28 ||
        text.includes("strait of hormuz") ||
        text.includes("supply shock") ||
        text.includes("closure") ||
        text.includes("blockade") ||
        (text.includes("lng") && text.includes("attack")) ||
        (text.includes("refinery") && text.includes("attack"))
      ) return "high";

      if (score >= 18) return "medium";
      return "low";
    };

    const inferDirection = (a) => {
      const text = normalize(`${getTitle(a)} ${getDesc(a)}`);

      if (
        text.includes("attack") ||
        text.includes("strike") ||
        text.includes("missile") ||
        text.includes("closure") ||
        text.includes("disruption") ||
        text.includes("blockade")
      ) {
        if (text.includes("oil") || text.includes("crude") || text.includes("brent")) {
          return "BULLISH_OIL";
        }
        if (text.includes("gas") || text.includes("lng")) {
          return "BULLISH_GAS";
        }
        return "RISK_ON_ENERGY";
      }

      if (
        text.includes("deal") ||
        text.includes("ceasefire") ||
        text.includes("reopen") ||
        text.includes("talks")
      ) {
        return "BEARISH_ENERGY";
      }

      return "NEUTRAL";
    };

    // dedupe mai bun pe titlu aproape identic
    const seenKeys = new Set();
    unique = unique.filter((a) => {
      const key = normalize(getTitle(a)).split(" ").slice(0, 9).join(" ");
      if (!key) return false;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    let scored = unique
      .map((a) => {
        const source = getSource(a);
        const score = scoreArticle(a);
        const impact = inferImpact(a, score);
        const direction = inferDirection(a);

        return {
          raw: a,
          title: getTitle(a),
          description: getDesc(a),
          snippet: getDesc(a),
          source: a.source?.name || "",
          url: a.url,
          published_at: a.publishedAt,
          score,
          impact,
          direction,
          allowed: isAllowedSource(source),
          blocked: isBlockedSource(source)
        };
      })
      .filter((a) => !a.blocked);

    // prima trecere: doar allowed + scor bun
    let finalItems = scored
      .filter((a) => a.allowed && a.score >= 12)
      .sort((a, b) => b.score - a.score);

    // fallback: daca sunt prea putine, permite cateva non-blocked dar relevante
    if (finalItems.length < 6) {
      finalItems = scored
        .filter((a) => a.score >= 18)
        .sort((a, b) => b.score - a.score);
    }

    // inca un fallback: daca tot sunt putine, prag mai mic
    if (finalItems.length < 4) {
      finalItems = scored
        .filter((a) => a.score >= 12)
        .sort((a, b) => b.score - a.score);
    }

    // taie lungimea descrierii foarte mari
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