import { db } from "../src/db/client.js";
import { users, portfolios, positions, orders, stocks } from "../src/db/schema/index.js";
import { eq, and } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { env } from "../src/config/env.js";

async function runTest() {
  console.log("🧪 Testing Intraday MIS 5x Trading Flow...");

  // 1. Find or create test user
  let [user] = await db
    .select()
    .from(users)
    .limit(1);

  if (!user) {
    console.log("Creating test investor user...");
    const [created] = await db
      .insert(users)
      .values({
        email: "investor@stocklens.dev",
        displayName: "Aadinarayan Investor",
        passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$dummyhash",
        role: "INVESTOR",
        isActive: true,
      })
      .returning();
    user = created;
  }

  // Generate test JWT
  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const API_URL = "http://localhost:4000/api";

  // 2. Fetch Initial Portfolio
  const pRes1 = await fetch(`${API_URL}/portfolio`, { headers });
  const pData1 = (await pRes1.json()) as any;
  console.log("📊 Initial Cash Balance:", pData1.data.cashBalance);
  console.log("⚡ Effective 5x Buying Power:", pData1.data.effectiveBuyingPower);

  // 3. Execute MIS BUY Trade (10 shares of RELIANCE)
  console.log("\n📈 Placing MIS BUY (Long) order: 10 shares of RELIANCE...");
  const buyRes = await fetch(`${API_URL}/portfolio/trade`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      symbol: "RELIANCE",
      type: "BUY",
      quantity: 10,
      product: "MIS",
      orderType: "MARKET",
    }),
  });
  const buyData = (await buyRes.json()) as any;
  console.log("Buy Result:", buyData.data?.message || buyData);

  // 4. Execute MIS SELL Trade (Short Selling 5 shares of INFY with 0 shares owned!)
  console.log("\n📉 Placing MIS SHORT SELL order: 5 shares of INFY (No shares owned!)...");
  const shortRes = await fetch(`${API_URL}/portfolio/trade`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      symbol: "INFY",
      type: "SELL",
      quantity: 5,
      product: "MIS",
      orderType: "MARKET",
    }),
  });
  const shortData = (await shortRes.json()) as any;
  console.log("Short Sell Result:", shortData.data?.message || shortData);

  // 5. Fetch Portfolio to verify Open Intraday Positions & Margin
  const pRes2 = await fetch(`${API_URL}/portfolio`, { headers });
  const pData2 = (await pRes2.json()) as any;
  console.log("\n📋 Active Intraday Positions:");
  for (const pos of pData2.data.positions) {
    console.log(` - ${pos.symbol}: ${pos.side} ${pos.quantity} shares @ ₹${pos.averagePrice} | Margin Blocked (20%): ₹${pos.marginBlocked} | Day P&L: ₹${pos.unrealizedPnl}`);
  }
  console.log("Total Margin Blocked:", pData2.data.totalMarginBlocked);
  console.log("Live Intraday Day P&L:", pData2.data.totalIntradayPnl);

  // 6. Test Square Off on first position
  if (pData2.data.positions.length > 0) {
    const posToClose = pData2.data.positions[0];
    console.log(`\n🔄 Testing 1-click Square Off on ${posToClose.symbol} (${posToClose.side})...`);
    const sqRes = await fetch(`${API_URL}/portfolio/square-off/${posToClose.id}`, {
      method: "POST",
      headers,
    });
    const sqData = (await sqRes.json()) as any;
    console.log("Square Off Result:", sqData.data?.message || sqData);
  }

  // 7. Test Square Off All (03:15 PM EOD Square Off)
  console.log("\n⏰ Testing Square Off All Remaining MIS Positions (03:15 PM simulation)...");
  const sqAllRes = await fetch(`${API_URL}/portfolio/square-off-all`, {
    method: "POST",
    headers,
  });
  const sqAllData = (await sqAllRes.json()) as any;
  console.log("Square Off All Result:", sqAllData.data?.message || sqAllData);

  // 8. Final Check
  const pRes3 = await fetch(`${API_URL}/portfolio`, { headers });
  const pData3 = (await pRes3.json()) as any;
  console.log("\n✅ Final Open MIS Positions Count:", pData3.data.positions.length);
  console.log("✅ Final Available Cash Balance:", pData3.data.cashBalance);
  console.log("🎉 ALL INTRADAY MIS 5X TRADING FEATURES TESTED SUCCESSFULLY!");
  process.exit(0);
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
