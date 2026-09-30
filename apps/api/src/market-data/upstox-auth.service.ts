import crypto from "crypto";
import fs from "fs";
import path from "path";

/**
 * Base32 RFC 4648 decoder for TOTP secret keys
 */
function base32Decode(base32: string): Buffer {
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
 * Perform headless TOTP authentication with Upstox v2 API
 */
export async function refreshUpstoxTokenViaTOTP(config?: {
  apiKey?: string;
  pin?: string;
  totpSecret?: string;
}): Promise<UpstoxAutoLoginResult> {
  const apiKey = config?.apiKey || process.env["UPSTOX_API_KEY"];
  const pin = config?.pin || process.env["UPSTOX_PIN"];
  const totpSecret = config?.totpSecret || process.env["UPSTOX_TOTP_SECRET"];

  if (!apiKey || !pin || !totpSecret) {
    return {
      success: false,
      error: "Missing required Upstox credentials (UPSTOX_API_KEY, UPSTOX_PIN, UPSTOX_TOTP_SECRET)",
    };
  }

  try {
    const currentTotp = generateTOTP(totpSecret);

    const params = new URLSearchParams();
    params.append("client_id", apiKey);
    params.append("password", pin);
    params.append("totp", currentTotp);

    const response = await fetch("https://api.upstox.com/v2/totp-login/authorization/token", {
      method: "POST",
      headers: {
        "accept": "application/json",
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

    // Update .env files if on local filesystem
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
