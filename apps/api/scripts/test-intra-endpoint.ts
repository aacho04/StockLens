import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const token = env.match(/UPSTOX_ACCESS_TOKEN=["']?([^"'\r\n]+)["']?/)?.[1] || '';

async function testHistoricalIntraday() {
  const ik = 'NSE_EQ|INE002A01018';
  // Upstox historical candle endpoint: /historical-candle/{instrument_key}/{interval}/{to_date}/{from_date}
  const url = `https://api.upstox.com/v2/historical-candle/${encodeURIComponent(ik)}/1minute/2026-09-29`;
  console.log('Fetching:', url);

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Api-Version': '2.0',
    },
  });

  console.log('Status:', res.status, res.statusText);
  const data = await res.json() as any;
  console.log('Candles count:', data.data?.candles?.length);
  if (data.data?.candles?.length > 0) {
    console.log('First candle:', data.data.candles[0]);
    console.log('Last candle:', data.data.candles[data.data.candles.length - 1]);
  }
}

testHistoricalIntraday();
