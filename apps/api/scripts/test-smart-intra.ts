import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const token = env.match(/UPSTOX_ACCESS_TOKEN=["']?([^"'\r\n]+)["']?/)?.[1] || '';

async function testSmartIntraday(sym: string, ik: string) {
  const toDate = new Date().toISOString().split('T')[0];
  console.log(`\nTesting smart intraday for ${sym} (${ik})...`);

  // 1. Try intraday
  let url = `https://api.upstox.com/v2/historical-candle/intraday/${encodeURIComponent(ik)}/1minute`;
  let res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', 'Api-Version': '2.0' },
  });
  let json = await res.json() as any;
  let candles = json.data?.candles || [];
  console.log(`Today intraday candles count: ${candles.length}`);

  // 2. If 0 (e.g. pre-market), fetch recent 1minute candles
  if (candles.length === 0) {
    url = `https://api.upstox.com/v2/historical-candle/${encodeURIComponent(ik)}/1minute/${toDate}`;
    res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', 'Api-Version': '2.0' },
    });
    json = await res.json() as any;
    candles = json.data?.candles || [];
    console.log(`Fallback latest 1minute candles count: ${candles.length}`);
  }

  if (candles.length > 0) {
    // Upstox returns newest first: [ [ts, open, high, low, close, vol, oi], ... ]
    // Take the last session (last 375 1-minute bars = 1 day) and reverse to chronological order
    const sessionCandles = candles.slice(0, 375).reverse();
    console.log(`First candle of session:`, sessionCandles[0]);
    console.log(`Last candle of session:`, sessionCandles[sessionCandles.length - 1]);
  }
}

async function run() {
  await testSmartIntraday('RELIANCE', 'NSE_EQ|INE002A01018');
  await testSmartIntraday('NIFTY', 'NSE_INDEX|Nifty 50');
  await testSmartIntraday('TCS', 'NSE_EQ|INE467B01029');
}

run();
