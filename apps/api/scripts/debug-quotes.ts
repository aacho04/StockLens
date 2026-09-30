import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/UPSTOX_ACCESS_TOKEN=["']?([^"'\r\n]+)["']?/);
const token = match ? match[1].trim() : '';

async function run() {
  // Test LTP endpoint
  const ltpRes = await fetch('https://api.upstox.com/v2/market-quote/ltp?instrument_key=NSE_EQ%7CINE002A01018,NSE_INDEX%7CNifty%2050', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Api-Version': '2.0',
    },
  });
  console.log('LTP Status:', ltpRes.status);
  const ltpData = await ltpRes.json();
  console.log('LTP Data:', JSON.stringify(ltpData, null, 2));

  // Also test OHLC endpoint
  const ohlcRes = await fetch('https://api.upstox.com/v2/market-quote/ohlc?instrument_key=NSE_EQ%7CINE002A01018,NSE_INDEX%7CNifty%2050&interval=1d', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Api-Version': '2.0',
    },
  });
  console.log('OHLC Status:', ohlcRes.status);
  const ohlcData = await ohlcRes.json();
  console.log('OHLC Data:', JSON.stringify(ohlcData, null, 2));
}

run();
