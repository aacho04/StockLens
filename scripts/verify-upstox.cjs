const fs = require('fs');

const envContent = fs.readFileSync('apps/api/.env', 'utf-8');
const match = envContent.match(/UPSTOX_ACCESS_TOKEN="?([^"\r\n]+)"?/);
const token = match[1];

async function checkUpstox() {
  const url = 'https://api.upstox.com/v2/market-quote/quotes?instrument_key=NSE_EQ%7CINE002A01018,NSE_EQ%7CINE467B01029,NSE_EQ%7CINE009A01021,NSE_EQ%7CINE040A01034';
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  const json = await res.json();
  console.log("=== EXACT LIVE UPSTOX NSE CLOSING / LTP PRICES ===");
  for (const [k, v] of Object.entries(json.data || {})) {
    const prevClose = +(v.last_price - (v.net_change || 0)).toFixed(2);
    const pct = +(((v.net_change || 0) / prevClose) * 100).toFixed(2);
    console.log(`${v.symbol.padEnd(10)}: ₹${v.last_price} (${v.net_change > 0 ? '+' : ''}${v.net_change} / ${pct}%) | High: ₹${v.ohlc?.high} | Low: ₹${v.ohlc?.low} | Volume: ${v.volume?.toLocaleString('en-IN')}`);
  }
}

checkUpstox().catch(console.error);
