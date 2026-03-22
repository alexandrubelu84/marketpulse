// Prices are fetched from TheNewsAPI search for financial data
// Update manually or integrate with a financial API
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Static prices — update these manually or connect to a financial API
  // Source: tradingeconomics.com/commodities or finance.yahoo.com
  const prices = [
    { label: "WTI",        value: "68.28", unit: "USD/bbl", change: "+1.2%",  up: true  },
    { label: "Brent",      value: "71.84", unit: "USD/bbl", change: "+1.1%",  up: true  },
    { label: "TTF Gas",    value: "59.00", unit: "EUR/MWh", change: "+2.0%",  up: true  },
    { label: "German Gas", value: "32.82", unit: "EUR/MWh", change: "+2.3%",  up: true  },
    { label: "Carbon ETS", value: "58.30", unit: "EUR/t",   change: "-1.4%",  up: false },
  ];

  return res.status(200).json({ prices });
}
