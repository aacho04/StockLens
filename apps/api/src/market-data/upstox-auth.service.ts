import crypto from "crypto";
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

/**
 * Base32 RFC 4648 decoder for TOTP secret keys
 */
export function base32Decode(base32: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = base32.toUpperCase().replace(/=+$/, "").replace(/[\s-]/g, "");
  let bits = "";
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned.charAt(i);
    const val = alphabet.indexOf(char);
    if (val === -1) throw new Error(`Invalid Base32 character: ${char}`);
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.substring(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

/**
 * Generate standard RFC 6238 6-digit TOTP code
 */
export function generateTOTP(secret: string, periodSec = 30): string {
  const key = base32Decode(secret);
  const epoch = Math.floor(Date.now() / 1000);
  const counter = Math.floor(epoch / periodSec);

  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key).update(buffer).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);

  return (code % 1_000_000).toString().padStart(6, "0");
}

export interface UpstoxAutoLoginResult {
  success: boolean;
  accessToken?: string;
  userName?: string;
  userId?: string;
  error?: string;
}

/**
 * Exchange OAuth authorization code for Access Token
 */
export async function exchangeCodeForToken(
  code: string,
  apiKey: string,
  apiSecret: string,
  redirectUri: string
): Promise<UpstoxAutoLoginResult> {
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
        accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = (await response.json()) as any;

    if (!response.ok || !data.access_token) {
      return {
        success: false,
        error: data.message || data.error || JSON.stringify(data),
      };
    }

    const token = data.access_token;
    process.env["UPSTOX_ACCESS_TOKEN"] = token;
    saveTokenToEnvFiles(token);

    return {
      success: true,
      accessToken: token,
      userName: data.user_name,
      userId: data.user_id,
    };
  } catch (err) {
    return {
      success: false,
      error: (err as Error).message,
    };
  }
}

/**
 * Perform 100% automated headless login using Playwright and TOTP
 */
export async function loginViaPlaywright(config?: {
  apiKey?: string;
  apiSecret?: string;
  redirectUri?: string;
  mobileNumber?: string;
  pin?: string;
  totpSecret?: string;
  headless?: boolean;
}): Promise<UpstoxAutoLoginResult> {
  const apiKey = config?.apiKey || process.env["UPSTOX_API_KEY"];
  const apiSecret = config?.apiSecret || process.env["UPSTOX_API_SECRET"];
  const redirectUri = config?.redirectUri || process.env["UPSTOX_REDIRECT_URI"] || "https://127.0.0.1";
  const mobileNumber = config?.mobileNumber || process.env["UPSTOX_MOBILE_NUMBER"];
  const pin = config?.pin || process.env["UPSTOX_PIN"];
  const totpSecret = config?.totpSecret || process.env["UPSTOX_TOTP_SECRET"];

  if (!apiKey || !apiSecret || !mobileNumber || !pin || !totpSecret) {
    return {
      success: false,
      error:
        "Missing required Upstox credentials (UPSTOX_API_KEY, UPSTOX_API_SECRET, UPSTOX_MOBILE_NUMBER, UPSTOX_PIN, UPSTOX_TOTP_SECRET)",
    };
  }

  let browser;
  try {
    browser = await chromium.launch({
      headless: config?.headless !== false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    let authCode = "";

    // Intercept redirect URL
    page.on("framenavigated", (frame) => {
      const url = frame.url();
      if (url.includes("code=")) {
        try {
          const parsed = new URL(url);
          const c = parsed.searchParams.get("code");
          if (c) authCode = c;
        } catch {
          const match = url.match(/code=([^&]+)/);
          if (match) authCode = match[1]!;
        }
      }
    });

    const authUrl = `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${encodeURIComponent(
      apiKey
    )}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    await page.goto(authUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Step 1: Fill Mobile Number
    const mobileInput = page
      .locator("#mobileNum, input[placeholder*='10 digit'], input[type='tel']")
      .first();
    await mobileInput.waitFor({ state: "visible", timeout: 15000 });
    await mobileInput.fill(mobileNumber);

    const getOtpBtn = page
      .locator("#getOtp, button:has-text('Get OTP'), button:has-text('Continue')")
      .first();
    await getOtpBtn.click();

    // Step 2: Fill TOTP
    await page.waitForTimeout(1500);
    const totpCode = generateTOTP(totpSecret);

    const otpInput = page
      .locator(
        "#otpNum, input[autocomplete='one-time-code'], input[placeholder*='OTP'], input[placeholder*='otp']"
      )
      .first();

    if (await otpInput.isVisible({ timeout: 8000 }).catch(() => false)) {
      await otpInput.fill(totpCode);
    } else {
      // Individual inputs if applicable
      const digitInputs = page.locator("input[type='tel'], input[type='text'], input[type='number']");
      const count = await digitInputs.count();
      if (count >= 6) {
        for (let i = 0; i < 6; i++) {
          await digitInputs.nth(i).fill(totpCode.charAt(i));
        }
      }
    }

    const continueOtpBtn = page
      .locator("#continueBtn, button:has-text('Continue'), button:has-text('Verify')")
      .first();
    if (await continueOtpBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await continueOtpBtn.click();
    }

    // Step 3: Fill PIN
    await page.waitForTimeout(1500);
    const pinInput = page
      .locator(
        "#pinCode, #pin, input[type='password'], input[placeholder*='PIN'], input[placeholder*='pin']"
      )
      .first();

    if (await pinInput.isVisible({ timeout: 8000 }).catch(() => false)) {
      await pinInput.fill(pin);
    } else {
      const digitInputs = page.locator("input[type='password']");
      const count = await digitInputs.count();
      if (count >= 6) {
        for (let i = 0; i < 6; i++) {
          await digitInputs.nth(i).fill(pin.charAt(i));
        }
      }
    }

    const continuePinBtn = page
      .locator("#continueBtn, button:has-text('Continue'), button:has-text('Submit'), button[type='submit']")
      .first();
    if (await continuePinBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await continuePinBtn.click();
    }

    // Step 4: Wait for redirect and capture code
    for (let i = 0; i < 30; i++) {
      if (authCode) break;
      const currentUrl = page.url();
      if (currentUrl.includes("code=")) {
        try {
          const parsed = new URL(currentUrl);
          const c = parsed.searchParams.get("code");
          if (c) {
            authCode = c;
            break;
          }
        } catch {
          const match = currentUrl.match(/code=([^&]+)/);
          if (match) {
            authCode = match[1]!;
            break;
          }
        }
      }
      await page.waitForTimeout(500);
    }

    await browser.close();

    if (!authCode) {
      return {
        success: false,
        error: "Failed to capture authorization code from Upstox redirect URL.",
      };
    }

    return await exchangeCodeForToken(authCode, apiKey, apiSecret, redirectUri);
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    return {
      success: false,
      error: (err as Error).message,
    };
  }
}

/**
 * Persist new access token to .env files safely
 */
export function saveTokenToEnvFiles(token: string): void {
  const candidatePaths = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "apps/api/.env"),
  ];

  const updateOrAdd = (content: string, key: string, val: string) => {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      return content.replace(regex, `${key}="${val}"`);
    }
    return `${content.trim()}\n${key}="${val}"\n`;
  };

  for (const envPath of candidatePaths) {
    try {
      if (fs.existsSync(envPath)) {
        let content = fs.readFileSync(envPath, "utf-8");
        content = updateOrAdd(content, "UPSTOX_ACCESS_TOKEN", token);
        fs.writeFileSync(envPath, content, "utf-8");
      }
    } catch {
      // Ignored in read-only / cloud container environments
    }
  }
}
