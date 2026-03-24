export default async function handler(req, res) {
  try {
    const API_KEY = process.env.GNEWS_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({ error: "Missing GNEWS_API_KEY" });
    }

    const query = "(iran OR hormuz) AND (gas OR LNG OR refinery OR energy)";

    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(
      query
    )}&lang=en&max=20&apikey=${API_KEY}`;

    const response = await fetch(url);

    const data = await response.json();

    console.log("GNEWS RAW:", data);

    if (!data.articles) {
      return res.status(200).json({ articles: [] });
    }

    // 🔥 KEYWORDS
    const keywords = [
      "iran",
      "hormuz",
      "gas",
      "lng",
      "refinery",
      "attack",
      "strike",
      "missile",
      "energy",
    ];

    // 🔥 TRUSTED DOMAINS (soft, nu elimină complet)
    const trustedDomains = [
      "reuters",
      "bloomberg",
      "ft.com",
      "wsj.com",
      "apnews",
      "bbc",
      "cnbc",
      "spglobal",
      "platts",
      "rte.ie",
      "theguardian",
    ];

    const cleaned = data.articles
      .map((a) => {
        const title = (a.title || "").toLowerCase();
        const domain = a.source?.name?.toLowerCase() || "";

        let score = 0;

        keywords.forEach((k) => {
          if (title.includes(k)) score += 1;
        });

        const isTrusted = trustedDomains.some((d) =>
          domain.includes(d)
        );

        if (isTrusted) score += 3;

        return {
          title: a.title,
          url: a.url,
          source: a.source?.name,
          score,
          trusted: isTrusted,
          publishedAt: a.publishedAt,
        };
      })
      // 🔥 NU mai eliminăm agresiv
      .filter((a) => a.score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    res.status(200).json({ articles: cleaned });
  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Internal error" });
  }
}
