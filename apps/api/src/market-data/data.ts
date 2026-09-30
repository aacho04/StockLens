import type { OHLCVCandle, Quote, DataStatus } from "@stocklens/types";

export interface StockMetadata {
  symbol: string;
  yahooSymbol: string;
  name: string;
  sector: string;
  industry: string;
  basePrice: number;
  marketCap: string;
}

export const NSE_UNIVERSE: StockMetadata[] = [
  // ─── Major Benchmark Indices (Intraday Index Trading) ─────────────────────────
  { symbol: "NIFTY",       yahooSymbol: "^NSEI",          name: "NIFTY 50 Index (NSE)",                 sector: "Indices",                  industry: "Benchmark Index",                basePrice: 22717,   marketCap: "0" },
  { symbol: "BANKNIFTY",   yahooSymbol: "^NSEBANK",       name: "BANK NIFTY Index (NSE)",               sector: "Indices",                  industry: "Banking Index",                  basePrice: 54535,   marketCap: "0" },
  { symbol: "FINNIFTY",    yahooSymbol: "NIFTY_FIN_SERVICE.NS", name: "FINNIFTY (Financial Services)",  sector: "Indices",                  industry: "Financial Index",                basePrice: 24622,   marketCap: "0" },
  { symbol: "SENSEX",      yahooSymbol: "^BSESN",         name: "BSE SENSEX Index",                     sector: "Indices",                  industry: "Benchmark Index",                basePrice: 72655,   marketCap: "0" },
  { symbol: "MIDCPNIFTY",  yahooSymbol: "^NSEMDCP50",     name: "NIFTY MIDCAP SELECT Index",            sector: "Indices",                  industry: "Midcap Index",                   basePrice: 13831,   marketCap: "0" },

  // NIFTY 50 Equities
  { symbol: "RELIANCE",    yahooSymbol: "RELIANCE.NS",    name: "Reliance Industries Ltd.",             sector: "Energy",                   industry: "Oil & Gas Refining",             basePrice: 1191,    marketCap: "20150000000000" },
  { symbol: "TCS",         yahooSymbol: "TCS.NS",         name: "Tata Consultancy Services Ltd.",       sector: "Information Technology",   industry: "IT Services & Consulting",       basePrice: 2080,    marketCap: "15340000000000" },
  { symbol: "HDFCBANK",    yahooSymbol: "HDFCBANK.NS",    name: "HDFC Bank Ltd.",                       sector: "Financial Services",       industry: "Private Sector Bank",            basePrice: 712,    marketCap: "12820000000000" },
  { symbol: "INFY",        yahooSymbol: "INFY.NS",        name: "Infosys Ltd.",                         sector: "Information Technology",   industry: "IT Services & Consulting",       basePrice: 1006,    marketCap: "7860000000000" },
  { symbol: "ICICIBANK",   yahooSymbol: "ICICIBANK.NS",   name: "ICICI Bank Ltd.",                      sector: "Financial Services",       industry: "Private Sector Bank",            basePrice: 1306,    marketCap: "8890000000000" },
  { symbol: "HINDUNILVR",  yahooSymbol: "HINDUNILVR.NS",  name: "Hindustan Unilever Ltd.",              sector: "FMCG",                     industry: "Personal Products",              basePrice: 1879,    marketCap: "5820000000000" },
  { symbol: "BHARTIARTL",  yahooSymbol: "BHARTIARTL.NS",  name: "Bharti Airtel Ltd.",                   sector: "Communication Services",   industry: "Telecom",                        basePrice: 1773,    marketCap: "9450000000000" },
  { symbol: "SBIN",        yahooSymbol: "SBIN.NS",        name: "State Bank of India",                  sector: "Financial Services",       industry: "Public Sector Bank",             basePrice: 968,     marketCap: "7490000000000" },
  { symbol: "WIPRO",       yahooSymbol: "WIPRO.NS",       name: "Wipro Ltd.",                           sector: "Information Technology",   industry: "IT Services & Consulting",       basePrice: 160,     marketCap: "2850000000000" },
  { symbol: "HCLTECH",     yahooSymbol: "HCLTECH.NS",     name: "HCL Technologies Ltd.",                sector: "Information Technology",   industry: "IT Services & Consulting",       basePrice: 1241,    marketCap: "4830000000000" },
  { symbol: "BAJFINANCE",  yahooSymbol: "BAJFINANCE.NS",  name: "Bajaj Finance Ltd.",                   sector: "Financial Services",       industry: "NBFC",                           basePrice: 969,    marketCap: "4480000000000" },
  { symbol: "MARUTI",      yahooSymbol: "MARUTI.NS",      name: "Maruti Suzuki India Ltd.",             sector: "Automobile",               industry: "Passenger Cars",                 basePrice: 11962,   marketCap: "3910000000000" },
  { symbol: "LT",          yahooSymbol: "LT.NS",          name: "Larsen & Toubro Ltd.",                 sector: "Capital Goods",            industry: "Industrial Conglomerates",       basePrice: 3772,    marketCap: "4980000000000" },
  { symbol: "ASIANPAINT",  yahooSymbol: "ASIANPAINT.NS",  name: "Asian Paints Ltd.",                    sector: "Consumer Discretionary",   industry: "Paints",                         basePrice: 2429,    marketCap: "2730000000000" },
  { symbol: "AXISBANK",    yahooSymbol: "AXISBANK.NS",    name: "Axis Bank Ltd.",                       sector: "Financial Services",       industry: "Private Sector Bank",            basePrice: 1207,    marketCap: "3640000000000" },
  { symbol: "SUNPHARMA",   yahooSymbol: "SUNPHARMA.NS",   name: "Sun Pharmaceutical Industries Ltd.",   sector: "Healthcare",               industry: "Pharmaceuticals",                basePrice: 1839,    marketCap: "4120000000000" },
  { symbol: "TITAN",       yahooSymbol: "TITAN.NS",       name: "Titan Company Ltd.",                   sector: "Consumer Discretionary",   industry: "Watches & Accessories",          basePrice: 4653,    marketCap: "3060000000000" },
  { symbol: "ULTRACEMCO",  yahooSymbol: "ULTRACEMCO.NS",  name: "UltraTech Cement Ltd.",                sector: "Materials",               industry: "Cement",                         basePrice: 10915,   marketCap: "3230000000000" },
  { symbol: "KOTAKBANK",   yahooSymbol: "KOTAKBANK.NS",   name: "Kotak Mahindra Bank Ltd.",             sector: "Financial Services",       industry: "Private Sector Bank",            basePrice: 410,    marketCap: "3540000000000" },
  { symbol: "POWERGRID",   yahooSymbol: "POWERGRID.NS",   name: "Power Grid Corporation of India Ltd.", sector: "Utilities",                industry: "Electric Utilities",             basePrice: 261,     marketCap: "3070000000000" },
  { symbol: "NTPC",        yahooSymbol: "NTPC.NS",        name: "NTPC Ltd.",                            sector: "Utilities",                industry: "Electric Utilities",             basePrice: 323,     marketCap: "3970000000000" },
  { symbol: "ONGC",        yahooSymbol: "ONGC.NS",        name: "Oil and Natural Gas Corporation Ltd.", sector: "Energy",                   industry: "Oil & Gas E&P",                  basePrice: 231,     marketCap: "3710000000000" },
  { symbol: "NESTLEIND",   yahooSymbol: "NESTLEIND.NS",   name: "Nestle India Ltd.",                    sector: "FMCG",                     industry: "Food Products",                  basePrice: 1337,    marketCap: "2260000000000" },
  { symbol: "ITC",         yahooSymbol: "ITC.NS",         name: "ITC Ltd.",                             sector: "FMCG",                     industry: "Cigarettes & Tobacco",           basePrice: 266,     marketCap: "6180000000000" },
  { symbol: "DRREDDY",     yahooSymbol: "DRREDDY.NS",     name: "Dr. Reddy's Laboratories Ltd.",        sector: "Healthcare",               industry: "Pharmaceuticals",                basePrice: 1221,    marketCap: "1090000000000" },
  { symbol: "BAJAJFINSV",  yahooSymbol: "BAJAJFINSV.NS",  name: "Bajaj Finserv Ltd.",                   sector: "Financial Services",       industry: "NBFC",                           basePrice: 1744,    marketCap: "2890000000000" },
  { symbol: "TATAMOTORS",  yahooSymbol: "TATAMOTORS.NS",  name: "Tata Motors Ltd.",                     sector: "Automobile",               industry: "Automobiles",                    basePrice: 281,     marketCap: "3600000000000" },
  { symbol: "JSWSTEEL",    yahooSymbol: "JSWSTEEL.NS",    name: "JSW Steel Ltd.",                       sector: "Materials",               industry: "Steel",                          basePrice: 1263,     marketCap: "2340000000000" },
  { symbol: "ADANIPORTS",  yahooSymbol: "ADANIPORTS.NS",  name: "Adani Ports and SEZ Ltd.",             sector: "Industrials",              industry: "Ports & Shipping",               basePrice: 1798,    marketCap: "3060000000000" },
  { symbol: "TATACONSUM",  yahooSymbol: "TATACONSUM.NS",  name: "Tata Consumer Products Ltd.",          sector: "FMCG",                     industry: "Tea & Coffee",                   basePrice: 964,    marketCap: "1040000000000" },
  // Additional Large Caps & Nifty Next 50
  { symbol: "TATASTEEL",   yahooSymbol: "TATASTEEL.NS",   name: "Tata Steel Ltd.",                      sector: "Materials",               industry: "Steel",                          basePrice: 188,     marketCap: "1930000000000" },
  { symbol: "HINDALCO",    yahooSymbol: "HINDALCO.NS",    name: "Hindalco Industries Ltd.",             sector: "Materials",               industry: "Aluminium",                      basePrice: 949,     marketCap: "1520000000000" },
  { symbol: "COALINDIA",   yahooSymbol: "COALINDIA.NS",   name: "Coal India Ltd.",                      sector: "Energy",                   industry: "Coal",                           basePrice: 428,     marketCap: "3020000000000" },
  { symbol: "TECHM",       yahooSymbol: "TECHM.NS",       name: "Tech Mahindra Ltd.",                   sector: "Information Technology",   industry: "IT Services",                    basePrice: 1540,    marketCap: "1520000000000" },
  { symbol: "HDFCLIFE",    yahooSymbol: "HDFCLIFE.NS",    name: "HDFC Life Insurance Company Ltd.",     sector: "Financial Services",       industry: "Life Insurance",                 basePrice: 518,     marketCap: "1520000000000" },
  { symbol: "SBILIFE",     yahooSymbol: "SBILIFE.NS",     name: "SBI Life Insurance Company Ltd.",      sector: "Financial Services",       industry: "Life Insurance",                 basePrice: 1713,    marketCap: "1680000000000" },
  { symbol: "DIVISLAB",    yahooSymbol: "DIVISLAB.NS",    name: "Divi's Laboratories Ltd.",             sector: "Healthcare",               industry: "Pharmaceuticals",                basePrice: 9398,    marketCap: "1440000000000" },
  { symbol: "CIPLA",       yahooSymbol: "CIPLA.NS",       name: "Cipla Ltd.",                           sector: "Healthcare",               industry: "Pharmaceuticals",                basePrice: 1376,    marketCap: "1270000000000" },
  { symbol: "GRASIM",      yahooSymbol: "GRASIM.NS",      name: "Grasim Industries Ltd.",               sector: "Materials",               industry: "Diversified",                    basePrice: 3109,    marketCap: "1720000000000" },
  { symbol: "HEROMOTOCO",  yahooSymbol: "HEROMOTOCO.NS",  name: "Hero MotoCorp Ltd.",                   sector: "Automobile",               industry: "Two-Wheelers",                   basePrice: 5302,    marketCap: "1090000000000" },
  { symbol: "EICHERMOT",   yahooSymbol: "EICHERMOT.NS",   name: "Eicher Motors Ltd.",                   sector: "Automobile",               industry: "Two-Wheelers",                   basePrice: 7178,    marketCap: "1330000000000" },
  { symbol: "BAJAJ-AUTO",  yahooSymbol: "BAJAJ-AUTO.NS",  name: "Bajaj Auto Ltd.",                      sector: "Automobile",               industry: "Two-Wheelers",                   basePrice: 10840,   marketCap: "2870000000000" },
  { symbol: "M&M",         yahooSymbol: "M&M.NS",         name: "Mahindra & Mahindra Ltd.",             sector: "Automobile",               industry: "SUVs & Tractors",                basePrice: 2962,    marketCap: "3540000000000" },
  { symbol: "BPCL",        yahooSymbol: "BPCL.NS",        name: "Bharat Petroleum Corporation Ltd.",    sector: "Energy",                   industry: "Oil & Gas Downstream",           basePrice: 307,     marketCap: "1470000000000" },
  { symbol: "IOC",         yahooSymbol: "IOC.NS",         name: "Indian Oil Corporation Ltd.",          sector: "Energy",                   industry: "Oil & Gas Downstream",           basePrice: 135,     marketCap: "2470000000000" },
  { symbol: "INDUSINDBK",  yahooSymbol: "INDUSINDBK.NS",  name: "IndusInd Bank Ltd.",                   sector: "Financial Services",       industry: "Private Sector Bank",            basePrice: 893,    marketCap: "1100000000000" },
  { symbol: "APOLLOHOSP",  yahooSymbol: "APOLLOHOSP.NS",  name: "Apollo Hospitals Enterprise Ltd.",     sector: "Healthcare",               industry: "Hospitals",                      basePrice: 8536,    marketCap: "985000000000" },
  { symbol: "ADANIENT",    yahooSymbol: "ADANIENT.NS",    name: "Adani Enterprises Ltd.",               sector: "Industrials",              industry: "Conglomerate",                   basePrice: 2953,    marketCap: "3590000000000" },
  { symbol: "ADANIGREEN",  yahooSymbol: "ADANIGREEN.NS",  name: "Adani Green Energy Ltd.",              sector: "Utilities",                industry: "Renewable Energy",               basePrice: 1273,    marketCap: "2820000000000" },
  { symbol: "ADANITRANS",  yahooSymbol: "ADANIENSOL.NS",  name: "Adani Energy Solutions Ltd.",          sector: "Utilities",                industry: "Power Transmission",             basePrice: 1332,    marketCap: "1250000000000" },
  { symbol: "SIEMENS",     yahooSymbol: "SIEMENS.NS",     name: "Siemens Ltd.",                         sector: "Capital Goods",            industry: "Industrial Machinery",           basePrice: 3759,    marketCap: "2440000000000" },
  { symbol: "ABB",         yahooSymbol: "ABB.NS",         name: "ABB India Ltd.",                       sector: "Capital Goods",            industry: "Industrial Machinery",           basePrice: 6859,    marketCap: "1680000000000" },
  { symbol: "BOSCHLTD",    yahooSymbol: "BOSCHLTD.NS",    name: "Bosch Ltd.",                           sector: "Automobile",               industry: "Auto Parts",                     basePrice: 46595,   marketCap: "1010000000000" },
  { symbol: "MCDOWELL-N",  yahooSymbol: "UNITDSPR.NS",    name: "United Spirits Ltd.",                  sector: "Consumer Discretionary",   industry: "Spirits",                        basePrice: 1353,    marketCap: "960000000000" },
  { symbol: "PAGEIND",     yahooSymbol: "PAGEIND.NS",     name: "Page Industries Ltd.",                 sector: "Consumer Discretionary",   industry: "Apparel",                        basePrice: 36765,   marketCap: "493000000000" },
  { symbol: "PIDILITIND",  yahooSymbol: "PIDILITIND.NS",  name: "Pidilite Industries Ltd.",             sector: "Materials",               industry: "Specialty Chemicals",            basePrice: 1489,    marketCap: "1580000000000" },
  { symbol: "BERGEPAINT",  yahooSymbol: "BERGEPAINT.NS",  name: "Berger Paints India Ltd.",             sector: "Materials",               industry: "Paints",                         basePrice: 456,     marketCap: "630000000000" },
  { symbol: "HAVELLS",     yahooSymbol: "HAVELLS.NS",     name: "Havells India Ltd.",                   sector: "Capital Goods",            industry: "Electrical Goods",               basePrice: 1052,    marketCap: "1160000000000" },
  { symbol: "DMART",       yahooSymbol: "DMART.NS",       name: "Avenue Supermarts Ltd. (DMart)",       sector: "Consumer Discretionary",   industry: "Retail",                         basePrice: 3836,    marketCap: "2890000000000" },
  { symbol: "ZOMATO",      yahooSymbol: "ZOMATO.NS",      name: "Zomato Ltd.",                          sector: "Consumer Discretionary",   industry: "Food Delivery",                  basePrice: 326,     marketCap: "2340000000000" },
  { symbol: "NYKAA",       yahooSymbol: "NYKAA.NS",       name: "FSN E-Commerce Ventures Ltd. (Nykaa)",sector: "Consumer Discretionary",   industry: "E-Commerce",                     basePrice: 330,     marketCap: "550000000000" },
  { symbol: "POLICYBZR",   yahooSymbol: "POLICYBZR.NS",   name: "PB Fintech Ltd. (PolicyBazaar)",       sector: "Financial Services",       industry: "Insurance Marketplace",          basePrice: 1079,    marketCap: "780000000000" },
  { symbol: "PAYTM",       yahooSymbol: "PAYTM.NS",       name: "One 97 Communications Ltd. (Paytm)",  sector: "Financial Services",       industry: "FinTech",                        basePrice: 1701,     marketCap: "450000000000" },
  { symbol: "IRFC",        yahooSymbol: "IRFC.NS",        name: "Indian Railway Finance Corporation",   sector: "Financial Services",       industry: "Infrastructure Finance",         basePrice: 79,     marketCap: "2020000000000" },
  { symbol: "IRCTC",       yahooSymbol: "IRCTC.NS",       name: "Indian Railway Catering & Tourism",    sector: "Consumer Discretionary",   industry: "Travel & Tourism",               basePrice: 458,     marketCap: "728000000000" },
  { symbol: "HAL",         yahooSymbol: "HAL.NS",         name: "Hindustan Aeronautics Ltd.",           sector: "Capital Goods",            industry: "Defence & Aerospace",            basePrice: 4661,    marketCap: "3110000000000" },
  { symbol: "BEL",         yahooSymbol: "BEL.NS",         name: "Bharat Electronics Ltd.",              sector: "Capital Goods",            industry: "Defence Electronics",            basePrice: 387,     marketCap: "2230000000000" },
  { symbol: "MUTHOOTFIN",  yahooSymbol: "MUTHOOTFIN.NS",  name: "Muthoot Finance Ltd.",                 sector: "Financial Services",       industry: "Gold Loans",                     basePrice: 2763,    marketCap: "755000000000" },
  { symbol: "CHOLAFIN",    yahooSymbol: "CHOLAFIN.NS",    name: "Cholamandalam Investment & Finance",   sector: "Financial Services",       industry: "NBFC",                           basePrice: 1633,    marketCap: "1240000000000" },
  { symbol: "FEDERALBNK",  yahooSymbol: "FEDERALBNK.NS",  name: "The Federal Bank Ltd.",                sector: "Financial Services",       industry: "Private Sector Bank",            basePrice: 324,     marketCap: "475000000000" },
  { symbol: "BANDHANBNK",  yahooSymbol: "BANDHANBNK.NS",  name: "Bandhan Bank Ltd.",                    sector: "Financial Services",       industry: "Private Sector Bank",            basePrice: 183,     marketCap: "306000000000" },
  { symbol: "PNB",         yahooSymbol: "PNB.NS",         name: "Punjab National Bank",                 sector: "Financial Services",       industry: "Public Sector Bank",             basePrice: 114,     marketCap: "1260000000000" },
  { symbol: "CANBK",       yahooSymbol: "CANBK.NS",       name: "Canara Bank",                          sector: "Financial Services",       industry: "Public Sector Bank",             basePrice: 121,     marketCap: "1010000000000" },
  { symbol: "BANKBARODA",  yahooSymbol: "BANKBARODA.NS",  name: "Bank of Baroda",                       sector: "Financial Services",       industry: "Public Sector Bank",             basePrice: 235,     marketCap: "1310000000000" },
  { symbol: "TATAPOWER",   yahooSymbol: "TATAPOWER.NS",   name: "Tata Power Company Ltd.",              sector: "Utilities",                industry: "Electric Utilities",             basePrice: 360,     marketCap: "1390000000000" },
  { symbol: "TORNTPHARM", yahooSymbol: "TORNTPHARM.NS",  name: "Torrent Pharmaceuticals Ltd.",         sector: "Healthcare",               industry: "Pharmaceuticals",                basePrice: 4904,    marketCap: "1150000000000" },
  { symbol: "LUPIN",       yahooSymbol: "LUPIN.NS",       name: "Lupin Ltd.",                           sector: "Healthcare",               industry: "Pharmaceuticals",                basePrice: 2057,    marketCap: "995000000000" },
  { symbol: "AUROPHARMA",  yahooSymbol: "AUROPHARMA.NS",  name: "Aurobindo Pharma Ltd.",                sector: "Healthcare",               industry: "Pharmaceuticals",                basePrice: 1699,    marketCap: "808000000000" },
  { symbol: "BIOCON",      yahooSymbol: "BIOCON.NS",      name: "Biocon Ltd.",                          sector: "Healthcare",               industry: "Biopharmaceuticals",             basePrice: 380,     marketCap: "414000000000" },
  { symbol: "GMRINFRA",    yahooSymbol: "GMRAIRPORT.NS",  name: "GMR Airports Infrastructure Ltd.",     sector: "Industrials",              industry: "Airports",                       basePrice: 95,      marketCap: "1000000000000" },
  { symbol: "INDIGO",      yahooSymbol: "INDIGO.NS",      name: "InterGlobe Aviation Ltd. (IndiGo)",   sector: "Industrials",              industry: "Airlines",                       basePrice: 4950,    marketCap: "1780000000000" },
];

export const NSE_STOCKS = NSE_UNIVERSE;

// Deterministic Pseudo-Random Number Generator
export function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getStockBasePrice(symbol: string): number {
  const found = NSE_UNIVERSE.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());
  if (found) return found.basePrice;
  // Deterministic fallback for unknown symbols
  const hash = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return 100 + (hash % 2000);
}

export function generateOHLCV(
  symbol: string,
  basePrice: number,
  days: number
): OHLCVCandle[] {
  const seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = mulberry32(seed);
  const candles: OHLCVCandle[] = [];
  let price = basePrice * (0.8 + rand() * 0.2); // start around 80-100% of base

  const endDate = new Date();
  endDate.setHours(0, 0, 0, 0);

  // Generate for days backwards, ensuring we get at least 5 candles
  const totalDaysToScan = Math.max(days, 7);

  for (let i = totalDaysToScan; i >= 0; i--) {
    const date = new Date(endDate);
    date.setDate(date.getDate() - i);

    // Skip weekends
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue;

    const volatility = 0.015 + rand() * 0.01;
    const drift = (rand() - 0.48) * volatility;

    const open = price;
    const close = Math.max(1, open * (1 + drift));
    const high = Math.max(open, close) * (1 + rand() * volatility * 0.5);
    const low = Math.max(0.5, Math.min(open, close) * (1 - rand() * volatility * 0.5));
    const volume = Math.floor(1_000_000 + rand() * 20_000_000);

    candles.push({
      date: date.toISOString().split("T")[0]!,
      open: open.toFixed(2),
      high: high.toFixed(2),
      low: low.toFixed(2),
      close: close.toFixed(2),
      volume,
    });

    price = close;
  }

  return candles;
}

export function generateIntradayOHLCV(
  symbol: string,
  basePrice: number,
  intervalMinutes: number = 5
): OHLCVCandle[] {
  const seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0) + intervalMinutes;
  const rand = mulberry32(seed);
  const candles: OHLCVCandle[] = [];

  const now = new Date();
  // Find latest weekday
  const sessionDate = new Date(now);
  if (sessionDate.getDay() === 0) sessionDate.setDate(sessionDate.getDate() - 2); // Sun -> Fri
  else if (sessionDate.getDay() === 6) sessionDate.setDate(sessionDate.getDate() - 1); // Sat -> Fri

  // 09:15 IST is 03:45 UTC
  const startTime = new Date(sessionDate);
  startTime.setUTCHours(3, 45, 0, 0);

  const totalMinutes = 375; // 09:15 to 15:30
  const steps = Math.min(Math.floor(totalMinutes / Math.max(1, intervalMinutes)), 150);

  let currentPrice = basePrice * (1 + (rand() - 0.5) * 0.008);

  for (let i = 0; i < steps; i++) {
    const candleTime = new Date(startTime.getTime() + i * intervalMinutes * 60 * 1000);
    const timeSec = Math.floor(candleTime.getTime() / 1000);

    const volatility = 0.002 * Math.sqrt(intervalMinutes);
    const drift = (rand() - 0.49) * volatility;
    const open = currentPrice;
    const close = Math.max(1, open * (1 + drift));
    const high = Math.max(open, close) * (1 + rand() * volatility * 0.5);
    const low = Math.max(0.5, Math.min(open, close) * (1 - rand() * volatility * 0.5));
    const volume = Math.floor((10_000 + rand() * 100_000) * intervalMinutes);

    candles.push({
      date: candleTime.toISOString(),
      time: timeSec,
      open: open.toFixed(2),
      high: high.toFixed(2),
      low: low.toFixed(2),
      close: close.toFixed(2),
      volume,
    });

    currentPrice = close;
  }

  // Anchor last candle close to basePrice
  if (candles.length > 0) {
    const last = candles[candles.length - 1]!;
    last.close = basePrice.toFixed(2);
    if (parseFloat(last.high) < basePrice) last.high = (basePrice * 1.001).toFixed(2);
    if (parseFloat(last.low) > basePrice) last.low = (basePrice * 0.999).toFixed(2);
  }

  return candles;
}

export function generateSimulatedQuote(
  symbol: string,
  basePrice: number,
  dataStatus: DataStatus = "DELAYED"
): Quote {
  const variation = (Math.random() - 0.49) * 0.015;
  const current = Math.max(1, basePrice * (1 + variation));
  const prevClose = basePrice * (1 + (Math.random() - 0.5) * 0.01);
  const change = current - prevClose;
  const changePercent = (change / (prevClose || 1)) * 100;
  const spread = current * 0.0005;

  return {
    symbol,
    exchange: "NSE",
    currentPrice: current.toFixed(2),
    previousClose: prevClose.toFixed(2),
    change: change.toFixed(2),
    changePercent: changePercent.toFixed(2),
    dayHigh: (current * 1.012).toFixed(2),
    dayLow: (current * 0.988).toFixed(2),
    volume: Math.floor(1_000_000 + Math.random() * 25_000_000),
    bid: (current - spread).toFixed(2),
    ask: (current + spread).toFixed(2),
    dataStatus,
    timestamp: new Date().toISOString(),
  };
}
