export default async function handler(req, res) {
  try {
    // 🔑 cheia ta (hardcoded + fallback env)
    const API_KEY = process.env.GNEWS_API_KEY || "e0f37fea0cc58ddc53097169ff6594ba";

    const queries = [
      "(iran OR hormuz) AND (gas OR LNG OR refinery)",
      "iran gas",
      "hormuz oil",
      "iran missile attack",
      "middle east energy"
    ];

    let allArticles = [];

    // 🔥 rulăm mai multe query-uri (ca să nu mai ai ZERO rezultate)
    for (const q of queries) {
      const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=en&max=10&apikey=${API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.articles && data.articles.length > 0) {
        allArticles = allArticles.concat(data.articles);
      }
    }

    // 🔥 dedupe după URL
    const unique = Array.from(
      new Map(allArticles.map(a => [a.url, a])).values()
    );

    // 🔥 keywords pentru relevanță
    const keywords = [
      "iran","hormuz","gas","lng","refinery",
      "attack","strike","missile","energy","oil"
    ];

    // 🔥 surse mai ok (dar NU blocăm complet restul)
    const trustedDomains = [
      "reuters","bloomberg","ft.com","wsj.com",
      "apnews","bbc","cnbc","spglobal","platts"
    ];

    const cleaned = unique
      .map(a => {
        const title = (a.title || "").toLowerCase();
        const source = (a.source?.name || "").toLowerCase();

        let score = 0;

        keywords.forEach(k => {
          if (title.includes(k)) score += 1;
        });

        const isTrusted = trustedDomains.some(d => source.includes(d));
        if (isTrusted) score += 3;

        return {
          title: a.title,
          url: a.url,
          source: a.source?.name,
          description: a.description,
          publishedAt: a.publishedAt,
          score
        };
      })
      .filter(a => a.score >= 1) // 🔥 IMPORTANT: nu mai blocăm tot
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // 🔥 format compatibil cu frontend-ul tău
    const formatted = cleaned.map(a => ({
      title: a.title,
      description: a.description,
      snippet: a.description,
      source: a.source,
      url: a.url,
      published_at: a.publishedAt
    }));

    res.status(200).json({ data: formatted });

  } catch (err) {
    console.error("ERROR:", err);
    res.status(500).json({ error: "Internal error" });
  }
}