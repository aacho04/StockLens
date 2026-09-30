import { UpstoxMarketDataAdapter } from '../src/market-data/upstox.adapter.js';

async function testCandles() {
  const adapter = new UpstoxMarketDataAdapter();

  console.log('--- Testing RELIANCE Candles ---');
  const intra = await adapter.getOHLCV('RELIANCE', 'INTRADAY', '5m');
  console.log(`Intraday 5m candle count: ${intra.length}`);
  if (intra.length > 0) {
    console.log('First candle:', intra[0]);
    console.log('Last candle:', intra[intra.length - 1]);
  }

  const daily = await adapter.getOHLCV('RELIANCE', '1Y', '1d');
  console.log(`\nDaily 1Y candle count: ${daily.length}`);
  if (daily.length > 0) {
    console.log('First daily candle:', daily[0]);
    console.log('Last daily candle:', daily[daily.length - 1]);
  }

  console.log('\n--- Testing NIFTY Candles ---');
  const niftyIntra = await adapter.getOHLCV('NIFTY', 'INTRADAY', '5m');
  console.log(`NIFTY Intraday 5m candle count: ${niftyIntra.length}`);
  if (niftyIntra.length > 0) {
    console.log('First NIFTY candle:', niftyIntra[0]);
    console.log('Last NIFTY candle:', niftyIntra[niftyIntra.length - 1]);
  }
}

testCandles();
