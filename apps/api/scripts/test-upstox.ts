import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');

const match = envContent.match(/UPSTOX_ACCESS_TOKEN=["']?([^"'\r\n]+)["']?/);
if (!match) {
  console.log('NO_TOKEN');
  process.exit(1);
}

const token = match[1].trim();

try {
  const parts = token.split('.');
  if (parts.length === 3) {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    console.log('CLIENT_ID:', payload.client_id || payload.sub);
    const expDate = new Date(payload.exp * 1000);
    console.log('EXPIRY_IST:', expDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    console.log('NOW_IST:', new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    console.log('IS_EXPIRED:', Date.now() > payload.exp * 1000);
  }
} catch (e: any) {
  console.log('JWT_PARSE_ERROR:', e.message);
}

async function testUpstox() {
  try {
    const res = await fetch('https://api.upstox.com/v2/market-quote/quotes?instrument_key=NSE_EQ%7CINE002A01018', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Api-Version': '2.0'
      }
    });
    console.log('HTTP_STATUS:', res.status, res.statusText);
    const text = await res.text();
    console.log('HTTP_BODY:', text);
  } catch (err: any) {
    console.log('FETCH_ERROR:', err.message);
  }
}

testUpstox();
