export default async function handler(req, res) {
  try {
    const API_KEY = process.env.GNEWS_API_KEY || "e0f37fea0cc58ddc53097169ff6594ba";
    const category = String(req.query.category || "geo").toLowerCase();

    const CATEGORY_QUERIES = {
      geo: [
        '"Strait of Hormuz"',
        'Iran missile strike',
        'Iran attack Gulf',
        'Iran shipping attack'
      ],
      energy: [
        '"Strait of Hormuz" gas',
        'Iran LNG supply',
        'gas supply disruption Middle East',
        'refinery attack Iran'
      ],
      oil: [
        '"Strait of Hormuz" oil',
        'Iran oil supply disruption',
        'Brent Middle East conflict',
        'OPEC Iran supply'
      ],
      macro: [
        'oil price spike inflation',
        'energy shock inflation',
        'Iran war inflation impact'
      ]
    };

    const queries = CATEGORY_QUERIES[category] || CATEGORY_QUERIES.geo;

    // 🔥 DOAR surse TOP
    const TIER1 = [
      "reuters",
      "bloomberg",
      "cnbc",
      "financial times",
      "ft",
      "wall street journal",
      "wsj",
      "associated press",
      "ap news",
      "bbc",
      "spglobal",
      "platts"
    ];

    const normalize = (s) =>
      String(s || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const isTier1 = (source) =>
      TIER1.some((s) => source.includes(normalize(s)));

    const fetchJson = async (url) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error("GNews error");
      return r.json();
    };

    let all = [];

    for (const q of queries) {
      const url =
        `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}` +
        `&lang=en&max=10&sortby=publishedAt&apikey=${API_KEY}`;

      const data = await fetchJson(url);

      if (Array.isArray(data.articles)) {
        all = all.concat(data.articles);
      }
    }

    // dedupe URL
    let unique = Array.from(
      new Map(all.map((a) => [a.url, a])).values()
    );

    // dedupe titlu
    const seen = new Set();
    unique = unique.filter((a) => {
      const key = normalize(a.title).slice(0, 80);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const scored = unique
      .map((a) => {
        const title = normalize(a.title);
        const desc = normalize(a.description);
        const text = `${title} ${desc}`;
        const source = normalize(a.source?.name || "");

        if (!isTier1(source)) return null; // 💣 HARD FILTER

        let score = 0;

        // 🔥 impact keywords
        if (text.includes("strait of hormuz")) score += 20;
        if (text.includes("hormuz")) score += 10;

        if (text.includes("lng")) score += 10;
        if (text.includes("gas")) score += 8;
        if (text.includes("oil")) score += 8;
        if (text.includes("refinery")) score += 10;

        if (text.includes("disruption")) score += 10;
        if (text.includes("closure")) score += 12;
        if (text.includes("blockade")) score += 12;

        if (text.includes("attack")) score += 8;
        if (text.includes("strike")) score += 8;
        if (text.includes("missile")) score += 6;

        if (text.includes("tanker")) score += 6;
        if (text.includes("shipping")) score += 5;

        // penalizări
        if (title.includes("live")) score -= 10;
        if (title.includes("video")) score -= 8;

        let impact = "low";
        if (score >= 25) impact = "high";
        else if (score >= 15) impact = "medium";

        let direction = "NEUTRAL";

        if (
          text.includes("attack") ||
          text.includes("disruption") ||
          text.includes("closure") ||
          text.includes("blockade")
        ) {
          if (text.includes("oil") || text.includes("brent")) {
            direction = "BULLISH_OIL";
          } else if (text.includes("gas") || text.includes("lng")) {
            direction = "BULLISH_GAS";
          } else {
            direction = "RISK_ENERGY";
          }
        }

        if (text.includes("ceasefire") || text.includes("deal")) {
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
          direction
        };
      })
      .filter(Boolean)
      .filter((a) => a.score >= 12) // 🔥 minim relevanță
      .sort((a, b) => b.score - a.score)
      .slice(0, 6); // 🔥 MAX 6 articole curate

    res.status(200).json({ data: scored });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal error" });
  }
}