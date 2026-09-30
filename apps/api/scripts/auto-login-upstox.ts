import readline from "readline";
import fs from "fs";
import path from "path";
import { refreshUpstoxTokenViaTOTP, generateTOTP } from "../src/market-data/upstox-auth.service.js";

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
  console.log("   ⚡ Upstox Automated TOTP Login (Headless)");
  console.log("=======================================================\n");

  let combinedEnv = candidatePaths
    .filter((p) => fs.existsSync(p))
    .map((p) => fs.readFileSync(p, "utf-8"))
    .join("\n");

  const apiKeyMatch = combinedEnv.match(/^UPSTOX_API_KEY=["']?([^"'\r\n]+)["']?/m);
  const pinMatch = combinedEnv.match(/^UPSTOX_PIN=["']?([^"'\r\n]+)["']?/m);
  const totpMatch = combinedEnv.match(/^UPSTOX_TOTP_SECRET=["']?([^"'\r\n]+)["']?/m);

  let apiKey = apiKeyMatch ? apiKeyMatch[1] : "";
  let pin = pinMatch ? pinMatch[1] : "";
  let totpSecret = totpMatch ? totpMatch[1] : "";

  if (!apiKey) {
    apiKey = (await ask("1️⃣  Enter your Upstox API Key: ")).trim();
  } else {
    console.log(`🔑 Using UPSTOX_API_KEY from .env: ${apiKey.slice(0, 6)}...`);
  }

  if (!pin) {
    pin = (await ask("2️⃣  Enter your Upstox 6-digit PIN: ")).trim();
  } else {
    console.log(`🔒 Using UPSTOX_PIN from .env`);
  }

  if (!totpSecret) {
    console.log("\n👉 To get your TOTP Secret Key:");
    console.log("   1. Open account.upstox.com -> Security / 2FA -> Authenticator App.");
    console.log("   2. Copy the manual Secret Key (e.g. JBSWY3DPEHPK3PXP).\n");
    totpSecret = (await ask("3️⃣  Enter your Upstox TOTP Secret Key: ")).trim();
  } else {
    console.log(`🛡️  Using UPSTOX_TOTP_SECRET from .env`);
  }

  if (!apiKey || !pin || !totpSecret) {
    console.error("❌ Missing required fields. Exiting.");
    rl.close();
    process.exit(1);
  }

  // Save credentials to .env so future runs are 100% automated
  const updateEnv = (content: string, key: string, val: string) => {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) return content.replace(regex, `${key}="${val}"`);
    return `${content.trim()}\n${key}="${val}"\n`;
  };

  for (const envPath of candidatePaths) {
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, "utf-8");
      content = updateEnv(content, "UPSTOX_API_KEY", apiKey);
      content = updateEnv(content, "UPSTOX_PIN", pin);
      content = updateEnv(content, "UPSTOX_TOTP_SECRET", totpSecret);
      content = updateEnv(content, "MARKET_DATA_PROVIDER", "upstox");
      fs.writeFileSync(envPath, content, "utf-8");
    }
  }

  console.log("\n⏳ Generating TOTP and authenticating with Upstox API...");
  const currentTotp = generateTOTP(totpSecret);
  console.log(`📲 Generated 6-digit TOTP: ${currentTotp}`);

  const res = await refreshUpstoxTokenViaTOTP({ apiKey, pin, totpSecret });

  if (res.success && res.accessToken) {
    console.log("\n🎉 Authentication Successful!");
    console.log(`👤 Upstox Account: ${res.userName || res.userId || "Active"}`);
    console.log(`🔑 Access Token: ${res.accessToken.slice(0, 15)}... (Saved to .env)`);
    console.log("\n✅ StockLens will now use real-time Upstox live ticks automatically!");
  } else {
    console.error(`\n❌ Auto-login failed: ${res.error}`);
  }

  rl.close();
}

main().catch(console.error);
