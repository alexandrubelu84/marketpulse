export default async function handler(req, res) {
  try {
    const API_KEY = process.env.GNEWS_API_KEY || "e0f37fea0cc58ddc53097169ff6594ba";
    const category = (req.query.category || "geo").toLowerCase();

    const categoryQueries = {
      geo: [
        '"Strait of Hormuz"',
        'Iran missile',
        'Iran strike',
        'Iran attack',
        'Hormuz tension'
      ],
      energy: [
        '"Strait of Hormuz" gas',
        'Iran gas',
        'Iran LNG',
        'gas refinery Iran',
        'Middle East energy'
      ],
      oil: [
        '"Strait of Hormuz" oil',
        'Iran oil',
        'Brent Iran',
        'OPEC Iran',
        'Middle East oil'
      ],
      macro: [
        'Iran war inflation',
        'Iran war economy',
        '"Strait of Hormuz" inflation',
        'Middle East commodity prices',
        'energy prices inflation'
      ]
    };

    const queries = categoryQueries[category] || categoryQueries.geo;

    const keywordsByCategory = {
      geo: [
        "iran", "hormuz", "strait of hormuz", "missile", "attack", "strike",
        "navy", "shipping", "vessel", "tanker", "gulf"
      ],
      energy: [
        "iran", "hormuz", "gas", "lng", "refinery", "pipeline", "terminal",
        "energy", "supply", "disruption", "facility"
      ],
      oil: [
        "iran", "hormuz", "oil", "brent", "opec", "crude", "barrel",
        "refinery", "shipping", "supply"
      ],
      macro: [
        "inflation", "economy", "growth", "rates", "central bank",
        "commodity", "prices", "energy", "oil", "gas", "iran", "hormuz"
      ]
    };

    const keywords = keywordsByCategory[category] || keywordsByCategory.geo;

    const trustedSources = [
      "reuters",
      "bloomberg",
      "financial times",
      "ft",
      "wall street journal",
      "wsj",
      "cnbc",
      "bbc",
      "associated press",
      "ap",
      "ap news",
      "spglobal",
      "s&p global",
      "platts",
      "marketwatch",
      "yahoo finance",
      "fortune",
      "the guardian",
      "al jazeera",
      "financial post"
    ];

    const blockedSources = [
      "lokmat times",
      "malayala manorama",
      "free press journal",
      "telegraph india",
      "news18",
      "times of india",
      "hindustan times",
      "india today",
      "firstpost"
    ];

    let allArticles = [];

    for (const q of queries) {
      const url =
        `https://gnews.io/api/v4/search?` +
        `q=${encodeURIComponent(q)}` +
        `&lang=en&max=10&sortby=publishedAt&apikey=${API_KEY}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.articles && Array.isArray(data.articles)) {
        allArticles = allArticles.concat(data.articles);
      }
    }

    const unique = Array.from(
      new Map(allArticles.map((a) => [a.url, a])).values()
    );

    const scored = unique
      .map((a) => {
        const title = (a.title || "").toLowerCase();
        const description = (a.description || "").toLowerCase();
        const text = `${title} ${description}`;
        const source = (a.source?.name || "").toLowerCase();

        let score = 0;

        for (const k of keywords) {
          if (text.includes(k)) score += 1;
        }

        const isTrusted = trustedSources.some((s) => source.includes(s));
        const isBlocked = blockedSources.some((s) => source.includes(s));

        if (isTrusted) score += 5;
        if (isBlocked) score -= 5;

        if (title.includes("iran")) score += 1;
        if (title.includes("hormuz")) score += 2;
        if (title.includes("gas")) score += 2;
        if (title.includes("lng")) score += 2;
        if (title.includes("oil")) score += 2;
        if (title.includes("missile")) score += 2;
        if (title.includes("attack")) score += 2;
        if (title.includes("strike")) score += 2;
        if (title.includes("refinery")) score += 2;
        if (title.includes("shipping")) score += 1;
        if (title.includes("tanker")) score += 1;
        if (title.includes("supply")) score += 1;
        if (title.includes("disruption")) score += 2;

        return {
          title: a.title,
          description: a.description,
          snippet: a.description,
          source: a.source?.name || "",
          url: a.url,
          published_at: a.publishedAt,
          score,
          trusted: isTrusted,
          blocked: isBlocked
        };
      })
      .filter((a) => !a.blocked)
      .filter((a) => a.score >= 3)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    res.status(200).json({ data: scored });
  } catch (err) {
    console.error("ERROR in /api/news:", err);
    res.status(500).json({ error: "Internal error" });
  }
}