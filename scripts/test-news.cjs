async function printSummary() {
  const res = await fetch('http://localhost:4000/api/analysis/news');
  const json = await res.json();
  console.log("Source:", json.data?.source);
  console.log("Market Bias Score:", json.data?.overallScore);
  console.log("Bullish %:", json.data?.sentimentSummary?.bullish);
  console.log("Neutral %:", json.data?.sentimentSummary?.neutral);
  console.log("Bearish %:", json.data?.sentimentSummary?.bearish);
  console.log("Total Live Articles:", json.data?.items?.length);
  console.log("\n--- Latest 3 Articles from Upstox ---");
  json.data?.items?.slice(0, 3).forEach((item, i) => {
    console.log(`${i+1}. [${item.symbols.join(',')}] ${item.title}`);
    console.log(`   Sentiment: ${item.sentiment} (${item.sentimentScore > 0 ? '+' : ''}${item.sentimentScore}) | Impact: ${item.impactMagnitude}`);
    console.log(`   Link: ${item.url}\n`);
  });
}
printSummary().catch(console.error);
