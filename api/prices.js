export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const instruments = [
    { label: "WTI",        symbol: "CL=F",    unit: "USD/bbl" },
    { label: "Brent",      symbol: "BZ=F",    unit: "USD/bbl" },
    { label: "TTF Gas",    symbol: "TTF=F",   unit: "EUR/MWh" },
    { label: "German Gas", symbol: "EGSGASDE=X", unit: "EUR/MWh" },
    { label: "Carbon ETS", symbol: "EUAD=F",  unit: "EUR/t"   },
  ];

  const fallback = instruments.map(i => ({
    label: i.label, value: "—", unit: i.unit, change: "—", up: null
  }));

  try {
    const tickers = instruments.map(i => i.symbol).join(",");
    const url = `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${encodeURIComponent(tickers)}&range=1d&interval=5m`;

    // Try v8 spark endpoint first  
    const r1 = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
    });

    // Try v7 quote endpoint
    const url2 = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(tickers)}`;
    const r2 = await fetch(url2, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
    });

    if (!r2.ok) throw new Error("Yahoo v7 failed: " + r2.status);

    const data = await r2.json();
    const quotes = data?.quoteResponse?.result || [];
    if (quotes.length === 0) throw new Error("No quotes");

    const prices = instruments.map(inst => {
      const q = quotes.find(x => x.symbol === inst.symbol);
      if (!q || !q.regularMarketPrice) return { label: inst.label, value: "—", unit: inst.unit, change: "—", up: null };
      const pct = q.regularMarketChangePercent || 0;
      return {
        label: inst.label,
        value: q.regularMarketPrice.toFixed(2),
        unit: inst.unit,
        change: (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%",
        up: pct >= 0,
      };
    });

    return res.status(200).json({ prices, source: "yahoo" });

  } catch(e) {
    // Try alternative Yahoo endpoint
    try {
      const tickers = instruments.map(i => i.symbol).join("%2C");
      const url3 = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${tickers}`;
      const r3 = await fetch(url3, {
        headers: { "User-Agent": "Mozilla/5.0", "Accept": "*/*" }
      });
      const d3 = await r3.json();
      const quotes = d3?.quoteResponse?.result || [];
      if (quotes.length > 0) {
        const prices = instruments.map(inst => {
          const q = quotes.find(x => x.symbol === inst.symbol);
          if (!q || !q.regularMarketPrice) return { label: inst.label, value: "—", unit: inst.unit, change: "—", up: null };
          const pct = q.regularMarketChangePercent || 0;
          return {
            label: inst.label,
            value: q.regularMarketPrice.toFixed(2),
            unit: inst.unit,
            change: (pct >= 0 ? "+" : "") + pct.toFixed(2) + "%",
            up: pct >= 0,
          };
        });
        return res.status(200).json({ prices, source: "yahoo2" });
      }
    } catch(e2) {}

    return res.status(200).json({ prices: fallback, source: "fallback", error: e.message });
  }
}
