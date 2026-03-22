export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Yahoo Finance symbols
  const symbols = {
    "WTI":        "CL=F",
    "Brent":      "BZ=F",
    "TTF Gas":    "TTF=F",
    "German Gas": "TTFDE=F",
    "Carbon ETS": "EUGASEN.CO",
  };

  const units = {
    "WTI":        "USD/bbl",
    "Brent":      "USD/bbl",
    "TTF Gas":    "EUR/MWh",
    "German Gas": "EUR/MWh",
    "Carbon ETS": "EUR/t",
  };

  // Fallback values if Yahoo Finance fails
  const fallback = [
    { label: "WTI",        value: "—", unit: "USD/bbl", change: "—", up: null },
    { label: "Brent",      value: "—", unit: "USD/bbl", change: "—", up: null },
    { label: "TTF Gas",    value: "—", unit: "EUR/MWh", change: "—", up: null },
    { label: "German Gas", value: "—", unit: "EUR/MWh", change: "—", up: null },
    { label: "Carbon ETS", value: "—", unit: "EUR/t",   change: "—", up: null },
  ];

  try {
    const tickers = Object.values(symbols).join(",");
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(tickers)}&fields=regularMarketPrice,regularMarketChangePercent&corsDomain=finance.yahoo.com`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      }
    });

    if (!response.ok) throw new Error("Yahoo Finance HTTP " + response.status);

    const data = await response.json();
    const quotes = data?.quoteResponse?.result || [];

    if (quotes.length === 0) throw new Error("No quotes returned");

    const prices = Object.entries(symbols).map(function([label, ticker]) {
      const quote = quotes.find(function(q) { return q.symbol === ticker; });
      if (!quote) return fallback.find(function(f) { return f.label === label; });

      const price = quote.regularMarketPrice;
      const changePct = quote.regularMarketChangePercent;
      const up = changePct >= 0;
      const changeStr = (up ? "+" : "") + changePct.toFixed(2) + "%";

      return {
        label,
        value: price.toFixed(2),
        unit: units[label],
        change: changeStr,
        up,
      };
    });

    return res.status(200).json({ prices, source: "yahoo", updated: new Date().toISOString() });

  } catch (e) {
    console.warn("Yahoo Finance failed:", e.message, "— using fallback");
    return res.status(200).json({ prices: fallback, source: "fallback", error: e.message });
  }
}
