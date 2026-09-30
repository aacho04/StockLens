import fs from "fs";
import path from "path";
import readline from "readline";

// Resolve candidate .env paths
const candidatePaths = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "apps/api/.env"),
  path.resolve(process.cwd(), "../../.env"),
  path.resolve(process.cwd(), "../.env"),
];

const existingEnvs = Array.from(new Set(candidatePaths.filter((p) => fs.existsSync(p))));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (query: string): Promise<string> =>
  new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log("\n=======================================================");
  console.log("   🚀 Upstox Token Generator for StockLens");
  console.log("=======================================================\n");

  let combinedEnvContent = existingEnvs
    .map((p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : ""))
    .join("\n");

  // Check if API_KEY and SECRET are already in .env or ask for them
  const keyMatch = combinedEnvContent.match(/^UPSTOX_API_KEY=["']?([^"'\r\n]+)["']?/m);
  const secretMatch = combinedEnvContent.match(/^UPSTOX_API_SECRET=["']?([^"'\r\n]+)["']?/m);
  const redirectMatch = combinedEnvContent.match(/^UPSTOX_REDIRECT_URI=["']?([^"'\r\n]+)["']?/m);

  let apiKey = keyMatch ? keyMatch[1] : "";
  let apiSecret = secretMatch ? secretMatch[1] : "";
  let redirectUri = redirectMatch ? redirectMatch[1] : "https://127.0.0.1";

  if (!apiKey) {
    apiKey = (await ask("1️⃣  Paste your Upstox API Key: ")).trim();
  } else {
    console.log(`🔑 Using UPSTOX_API_KEY from .env: ${apiKey.slice(0, 6)}...`);
  }

  if (!apiSecret) {
    apiSecret = (await ask("2️⃣  Paste your Upstox API Secret: ")).trim();
  } else {
    console.log(`🔒 Using UPSTOX_API_SECRET from .env`);
  }

  const enteredRedirect = (
    await ask(`3️⃣  Redirect URL used in Upstox Console [default: ${redirectUri}]: `)
  ).trim();
  if (enteredRedirect) {
    redirectUri = enteredRedirect;
  }

  const authDialogUrl = `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${encodeURIComponent(
    apiKey
  )}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  console.log("\n-------------------------------------------------------");
  console.log("👉 Step 1: Open this URL in your web browser:\n");
  console.log(authDialogUrl);
  console.log("\n-------------------------------------------------------");
  console.log("👉 Step 2: Log in with your Upstox credentials (Mobile + OTP + PIN).");
  console.log("👉 Step 3: When your browser redirects, copy the entire URL (or the code) from the address bar.\n");

  const redirectedInput = (await ask("📋 Paste the redirected URL or code here: ")).trim();

  let code = redirectedInput;
  if (redirectedInput.includes("code=")) {
    try {
      const parsedUrl = new URL(redirectedInput);
      code = parsedUrl.searchParams.get("code") || redirectedInput;
    } catch {
      const match = redirectedInput.match(/code=([^&]+)/);
      if (match) code = match[1];
    }
  }

  if (!code) {
    console.error("❌ Invalid authorization code provided.");
    process.exit(1);
  }

  console.log("\n⏳ Exchanging authorization code for Access Token...");

  try {
    const params = new URLSearchParams();
    params.append("code", code);
    params.append("client_id", apiKey);
    params.append("client_secret", apiSecret);
    params.append("redirect_uri", redirectUri);
    params.append("grant_type", "authorization_code");

    const response = await fetch("https://api.upstox.com/v2/login/authorization/token", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = (await response.json()) as any;

    if (!response.ok || !data.access_token) {
      console.error("\n❌ Failed to generate token from Upstox API:");
      console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    const accessToken = data.access_token;
    console.log("\n🎉 Token generated successfully!");
    console.log(`👤 User: ${data.user_name || data.user_id || "Active Upstox Account"}`);

    // Update .env file
    const updateOrAddEnv = (content: string, key: string, val: string) => {
      const regex = new RegExp(`^${key}=.*$`, "m");
      if (regex.test(content)) {
        return content.replace(regex, `${key}="${val}"`);
      }
      return `${content.trim()}\n${key}="${val}"\n`;
    };

    for (const filePath of existingEnvs) {
      let fileContent = fs.readFileSync(filePath, "utf-8");
      fileContent = updateOrAddEnv(fileContent, "MARKET_DATA_PROVIDER", "upstox");
      fileContent = updateOrAddEnv(fileContent, "UPSTOX_API_KEY", apiKey);
      fileContent = updateOrAddEnv(fileContent, "UPSTOX_API_SECRET", apiSecret);
      fileContent = updateOrAddEnv(fileContent, "UPSTOX_REDIRECT_URI", redirectUri);
      fileContent = updateOrAddEnv(fileContent, "UPSTOX_ACCESS_TOKEN", accessToken);
      fs.writeFileSync(filePath, fileContent, "utf-8");
      console.log(`💾 Updated ${filePath}`);
    }
    console.log("🚀 StockLens is now configured with live Upstox Market Data!");
  } catch (err) {
    console.error("❌ An error occurred:", err);
  } finally {
    rl.close();
  }
}

main();
