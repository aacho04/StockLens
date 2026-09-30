import readline from "readline";
import fs from "fs";
import path from "path";
import { loginViaPlaywright } from "../src/market-data/upstox-auth.service.js";

const candidatePaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "apps/api/.env"),
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (query: string): Promise<string> =>
  new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log("\n=======================================================");
  console.log("   ⚡ Upstox 100% Automated Playwright Login");
  console.log("=======================================================\n");

  let combinedEnv = candidatePaths
    .filter((p) => fs.existsSync(p))
    .map((p) => fs.readFileSync(p, "utf-8"))
    .join("\n");

  const apiKeyMatch = combinedEnv.match(/^UPSTOX_API_KEY=["']?([^"'\r\n]+)["']?/m);
  const apiSecretMatch = combinedEnv.match(/^UPSTOX_API_SECRET=["']?([^"'\r\n]+)["']?/m);
  const redirectMatch = combinedEnv.match(/^UPSTOX_REDIRECT_URI=["']?([^"'\r\n]+)["']?/m);
  const mobileMatch = combinedEnv.match(/^UPSTOX_MOBILE_NUMBER=["']?([^"'\r\n]+)["']?/m);
  const pinMatch = combinedEnv.match(/^UPSTOX_PIN=["']?([^"'\r\n]+)["']?/m);
  const totpMatch = combinedEnv.match(/^UPSTOX_TOTP_SECRET=["']?([^"'\r\n]+)["']?/m);

  let apiKey = apiKeyMatch ? apiKeyMatch[1] : "";
  let apiSecret = apiSecretMatch ? apiSecretMatch[1] : "";
  let redirectUri = redirectMatch ? redirectMatch[1] : "https://127.0.0.1";
  let mobileNumber = mobileMatch ? mobileMatch[1] : "";
  let pin = pinMatch ? pinMatch[1] : "";
  let totpSecret = totpMatch ? totpMatch[1] : "";

  if (!apiKey) {
    apiKey = (await ask("1️⃣  Enter your Upstox API Key: ")).trim();
  } else {
    console.log(`🔑 Using UPSTOX_API_KEY from .env: ${apiKey.slice(0, 6)}...`);
  }

  if (!apiSecret) {
    apiSecret = (await ask("2️⃣  Enter your Upstox API Secret: ")).trim();
  } else {
    console.log(`🔒 Using UPSTOX_API_SECRET from .env`);
  }

  if (!mobileNumber) {
    mobileNumber = (await ask("3️⃣  Enter your Upstox Registered 10-digit Mobile Number: ")).trim();
  } else {
    console.log(`📱 Using UPSTOX_MOBILE_NUMBER from .env`);
  }

  if (!pin) {
    pin = (await ask("4️⃣  Enter your Upstox 6-digit PIN: ")).trim();
  } else {
    console.log(`🔒 Using UPSTOX_PIN from .env`);
  }

  if (!totpSecret) {
    totpSecret = (await ask("5️⃣  Enter your Upstox TOTP Secret Key: ")).trim();
  } else {
    console.log(`🛡️  Using UPSTOX_TOTP_SECRET from .env`);
  }

  if (!apiKey || !apiSecret || !mobileNumber || !pin || !totpSecret) {
    console.error("❌ Missing required fields. Exiting.");
    rl.close();
    process.exit(1);
  }

  // Save credentials to .env so future runs are completely headless
  const updateEnv = (content: string, key: string, val: string) => {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) return content.replace(regex, `${key}="${val}"`);
    return `${content.trim()}\n${key}="${val}"\n`;
  };

  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, "utf-8");
      content = updateEnv(content, "UPSTOX_API_KEY", apiKey);
      content = updateEnv(content, "UPSTOX_API_SECRET", apiSecret);
      content = updateEnv(content, "UPSTOX_REDIRECT_URI", redirectUri);
      content = updateEnv(content, "UPSTOX_MOBILE_NUMBER", mobileNumber);
      content = updateEnv(content, "UPSTOX_PIN", pin);
      content = updateEnv(content, "UPSTOX_TOTP_SECRET", totpSecret);
      content = updateEnv(content, "MARKET_DATA_PROVIDER", "upstox");
      fs.writeFileSync(envPath, content, "utf-8");
    }
  }

  console.log("\n⏳ Launching headless browser automation...");
  console.log("   1. Navigating to Upstox login");
  console.log("   2. Entering registered mobile number");
  console.log("   3. Generating and submitting RFC 6238 TOTP");
  console.log("   4. Submitting PIN and obtaining fresh authorization code");

  const res = await loginViaPlaywright({
    apiKey,
    apiSecret,
    redirectUri,
    mobileNumber,
    pin,
    totpSecret,
    headless: true,
  });

  if (res.success && res.accessToken) {
    console.log("\n🎉 Authentication Successful!");
    console.log(`👤 Upstox User: ${res.userName || res.userId || "Active Session"}`);
    console.log(`🔑 Access Token: ${res.accessToken.slice(0, 15)}... (Saved to .env)`);
    console.log("\n✅ StockLens is now 100% automated for every trading day!");
  } else {
    console.error(`\n❌ Automation error: ${res.error}`);
  }

  rl.close();
}

main().catch(console.error);
