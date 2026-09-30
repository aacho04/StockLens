import { UpstoxMarketDataAdapter } from '../src/market-data/upstox.adapter.js';

async function testAdapter() {
  const adapter = new UpstoxMarketDataAdapter();
  console.log('Adapter Name:', adapter.name);
  console.log('Data Status:', adapter.dataStatus);

  const symbols = ['RELIANCE', 'TCS', 'NIFTY', 'TATAPOWER', 'ZOMATO', 'BANKNIFTY', 'SENSEX', 'MARUTI'];
  for (const s of symbols) {
    const q = await adapter.getQuote(s);
    console.log(`[${s}] Price: ₹${q.currentPrice} | PrevClose: ₹${q.previousClose} | Chg: ${q.change} (${q.changePercent}%) | Status: ${q.dataStatus}`);
  }

  console.log('\n--- Batch Quotes ---');
  const quotes = await adapter.getQuotes(symbols);
  for (const q of quotes) {
    console.log(`BATCH [${q.symbol}] Price: ₹${q.currentPrice} | Chg: ${q.changePercent}% | Status: ${q.dataStatus}`);
  }
}

testAdapter();
