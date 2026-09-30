/**
 * NCFM Technical Analysis Module (172-Page NSE Curriculum) Knowledge Base
 * Covers all 7 Core Chapters, Sub-sections, and Official Review Concepts:
 * - Chapter 1: Introduction to Technical Analysis (Assumptions, Strengths, Weaknesses)
 * - Chapter 2: Candle Charts (1-candle, 2-candle, 3-candle patterns)
 * - Chapter 3: Pattern Study (Support/Resistance, Head & Shoulders, Double Top/Bottom, Gap Theory)
 * - Chapter 4: Major Indicators & Oscillators (SMA, EMA, RSI, MACD, Bollinger Bands, Stochastics, MFI)
 * - Chapter 5: Trading Strategies (Day Trading, Momentum Breakouts)
 * - Chapter 6: Dow Theory and Elliott Wave Theory (6 Principles, Impulse & Corrective Waves, Fib Ratios)
 * - Chapter 7: Trading Psychology and Risk Management (Stop Loss, 1:2/1:3 Risk-Reward, Golden Rules, Discipline)
 */

export interface NcfmArticle {
  title: string;
  chapter: string;
  pageRange: string;
  keywords: string[];
  summary: string;
  keyPoints: string[];
  practicalRule: string;
  sampleQuestion?: string;
  sampleAnswer?: string;
}

export const NCFM_KNOWLEDGE_ARTICLES: NcfmArticle[] = [
  // ─── CHAPTER 1: INTRODUCTION ───────────────────────────────────────────
  {
    title: "Core Philosophy of Technical Analysis & Basic Assumptions",
    chapter: "Chapter 1: Introduction to Technical Analysis",
    pageRange: "Pages 9–15",
    keywords: ["assumption", "philosophy", "discount", "price discounts everything", "history repeats", "weakness of technical analysis", "random walk"],
    summary: "Technical analysis is the study of market action, primarily through the use of charts, for forecasting future price trends. It rests on three foundational premises taught in the NCFM curriculum.",
    keyPoints: [
      "**1. Price Discounts Everything:** The foundation of technical analysis. All market fundamentals (earnings, inflation, geopolitics, trader psychology) are already reflected and factored into the current market price.",
      "**2. Prices Move in Trends:** Price movements are not entirely random. Once a trend is established, price is more likely to continue in the direction of the existing trend than reverse.",
      "**3. History Repeats Itself:** Chart patterns and price structures repeat over time because human market psychology (fear, greed, herd instinct) remains constant across generations.",
      "**Strengths:** Offers precise entry, exit, stop-loss timing, and works across all asset classes and time horizons without needing insider balance sheet metrics.",
      "**Weaknesses/Limitations:** Self-fulfilling bias, subjective pattern identification, and occasional whipsaws during choppy, range-bound consolidation phases.",
    ],
    practicalRule: "Never predict market direction in a vacuum. Always align your trade with the prevailing higher-timeframe trend and define an invalidation price level (stop loss) before placing orders.",
    sampleQuestion: "What is the primary assumption underlying technical analysis?",
    sampleAnswer: "That market price discounts all available public and private information, and that price moves in identifiable trends that repeat over time."
  },

  // ─── CHAPTER 2: CANDLESTICK PATTERNS ──────────────────────────────────
  {
    title: "One-Candle Patterns: Hammer, Hanging Man, Shooting Star & Inverted Hammer",
    chapter: "Chapter 2: Candle Charts",
    pageRange: "Pages 21–28",
    keywords: ["hammer", "hanging man", "shooting star", "inverted hammer", "shadow", "wick", "one candle"],
    summary: "Single-candlestick patterns convey powerful intraday shifts between buying demand and selling supply based on the size of the real body versus upper and lower shadows.",
    keyPoints: [
      "**Hammer (Bullish Reversal):** Occurs at the bottom of a downtrend. Small real body at the upper end of the trading range with a long lower shadow at least 2 times the height of the real body, and little-to-no upper wick. Shows bears pushed prices lower, but aggressive buyers stepped in to close near the high.",
      "**Hanging Man (Bearish Warning):** Identical shape to a hammer (small upper body, long lower wick), but appears at the peak of an uptrend. Suggests sudden intense intraday selling pressure emerged; requires next-day bearish confirmation before acting.",
      "**Shooting Star (Bearish Reversal):** Formed at the top of an uptrend. Small real body near the day's low, long upper shadow (at least 2x body), and virtually no lower wick. Indicates buyers drove prices up to new highs, but sellers forcefully rejected the advance.",
      "**Inverted Hammer (Bullish Reversal):** Formed at the bottom of a downtrend. Small body at the bottom, long upper shadow. Signals early buyer accumulation; requires follow-through green candle next session.",
    ],
    practicalRule: "Always wait for the following candle to confirm the reversal. For a hammer, wait for the next candle to break above the hammer's high before entering.",
    sampleQuestion: "What must be the minimum ratio of lower shadow to real body in a valid Hammer candlestick?",
    sampleAnswer: "The lower shadow must be at least two to three times the length of the real body, with little or no upper shadow."
  },

  {
    title: "Doji, Spinning Tops, and Marubozu Candlesticks",
    chapter: "Chapter 2: Candle Charts",
    pageRange: "Pages 29–35",
    keywords: ["doji", "spinning top", "marubozu", "dragonfly", "gravestone", "indecision", "candle"],
    summary: "Candlestick structures reflecting total equilibrium, severe indecision, or absolute unilateral control.",
    keyPoints: [
      "**Doji:** Opening and closing prices are virtually identical. Reflects complete tug-of-war stalemate between bulls and bears. Variants include Standard Doji, Long-legged Doji, Dragonfly Doji (bullish rejection of lows), and Gravestone Doji (bearish rejection of highs).",
      "**Spinning Top:** Small real body centered between modest upper and lower shadows. Represents market hesitation and loss of momentum in an ongoing trend.",
      "**Marubozu (Absolute Momentum):** A candlestick with a long, robust body and zero (or negligible) shadows. Bullish Marubozu opens at the low and closes at the high (pure buyer dominance). Bearish Marubozu opens at the high and closes at the low (pure seller capitulation).",
    ],
    practicalRule: "A Doji or Spinning Top after an extended 5-8 day impulsive run signals extreme exhaustion—tighten your trailing stop loss or look for reversal confirmations.",
  },

  {
    title: "Two & Three Candlestick Reversal Patterns",
    chapter: "Chapter 2: Candle Charts",
    pageRange: "Pages 36–45",
    keywords: ["engulfing", "bullish engulfing", "bearish engulfing", "piercing line", "dark cloud cover", "morning star", "evening star", "harami", "three soldiers", "three crows"],
    summary: "Multi-candle patterns provide significantly higher statistical validity than single candles by capturing multi-session transitions in market sentiment.",
    keyPoints: [
      "**Bullish Engulfing:** In a downtrend, a red candle is followed by a much larger green candle whose body completely covers and engulfs the prior red candle's body.",
      "**Bearish Engulfing:** In an uptrend, a green candle is followed by a larger red candle completely engulfing the prior green body. Signals distribution and seller takeover.",
      "**Piercing Line:** Bullish 2-candle pattern. Red candle followed by gap down open, which then rallies to close more than 50% above the midpoint of the prior red candle.",
      "**Dark Cloud Cover:** Bearish 2-candle counterpart. Green candle followed by gap up open, which then plunges to close below 50% of the prior green candle's body.",
      "**Morning Star:** 3-candle major bullish reversal: Day 1 long red candle, Day 2 small indecision candle gapping lower, Day 3 long green candle closing deep within Day 1's body.",
      "**Evening Star:** 3-candle major bearish reversal: Day 1 long green candle, Day 2 small gapping star candle at apex, Day 3 decisive red candle erasing Day 1 gains.",
      "**Three White Soldiers / Three Black Crows:** Consecutive 3 candles making progressive higher highs or lower lows with strong real bodies, confirming trend initiation.",
    ],
    practicalRule: "Volume confirmation is vital: an engulfing or morning star candle that forms with above-average volume has more than an 70% probability of initiating a multi-day continuation.",
  },

  // ─── CHAPTER 3: PATTERNS & GAPS ───────────────────────────────────────
  {
    title: "Support, Resistance, and Role Reversal Principles",
    chapter: "Chapter 3: Pattern Study",
    pageRange: "Pages 48–52",
    keywords: ["support", "resistance", "role reversal", "breakout", "floor", "ceiling", "bounce"],
    summary: "Support represents the price floor where demand overcomes supply to halt a decline. Resistance represents the price ceiling where selling supply overcomes demand to halt an advance.",
    keyPoints: [
      "**Support:** A price level or zone where buying interest is strong enough to overcome selling pressure. Formed by previous swing lows, congestion clusters, or round numbers.",
      "**Resistance:** A price level or zone where selling pressure overcomes buying interest to stop and turn back an uptrend. Formed by previous swing highs.",
      "**Principle of Role Reversal:** When a key support line is definitively broken downwards, it flips and transforms into a strong resistance level for future rallies. Conversely, when resistance is broken upwards, it becomes future support on pullbacks.",
      "**Validity Factors:** The more times a level is tested and holds, the stronger it becomes. When accompanied by huge volume, broken levels become formidable institutional barriers.",
    ],
    practicalRule: "Never buy directly into resistance or short directly into support. Enter either on the confirmed breakout above resistance with volume, or on the first orderly pullback that re-tests the broken level as new support.",
  },

  {
    title: "Chart Patterns: Head & Shoulders and Double Top / Bottom",
    chapter: "Chapter 3: Pattern Study",
    pageRange: "Pages 52–69",
    keywords: ["head and shoulders", "inverted head and shoulders", "double top", "double bottom", "neckline", "target calculation", "m pattern", "w pattern"],
    summary: "Classical Western chart patterns that signal decisive trend reversals and provide mathematical price targets.",
    keyPoints: [
      "**Head and Shoulders Top Reversal:** Consists of Left Shoulder, a higher Head, and a lower Right Shoulder, connected along the swing lows by a 'Neckline'. Signals transition from uptrend to downtrend. Confirmed on a close below the neckline with expanding volume.",
      "**Inverted Head and Shoulders (Bottom):** Bullish reversal with Left Shoulder low, deeper Head low, and higher Right Shoulder low. Confirmed on a breakout above the neckline.",
      "**Price Target Formula:** Minimum Expected Target = Neckline Price ± (Vertical Distance from Head peak/trough to Neckline).",
      "**Double Top (M-Pattern):** Price rallies to a resistance peak twice, fails to break through, and drops below the intermediate trough. Volume on the second peak is typically lower, showing buyer exhaustion.",
      "**Double Bottom (W-Pattern):** Price tests a support floor twice, holds, and surges through the intervening swing high. Volume expands sharply on the breakout.",
    ],
    practicalRule: "Measure the height of the pattern from apex to neckline, and project that exact point distance from the neckline breakout point to establish your Target 1.",
  },

  {
    title: "Gap Theory: Common, Breakaway, Runaway, and Exhaustion Gaps",
    chapter: "Chapter 3: Pattern Study",
    pageRange: "Pages 70–76",
    keywords: ["gap", "gap theory", "breakaway gap", "runaway gap", "continuation gap", "exhaustion gap", "common gap", "island cluster", "gap fill"],
    summary: "A gap occurs when the opening price of a session is completely outside the high-low range of the prior session. NCFM categorizes gaps into 4 distinct types with unique trading rules.",
    keyPoints: [
      "**1. Common Gap (Area Gap):** Occurs within a quiet sideways trading range or congestion zone. Carries little forecasting significance and is typically filled within a few trading sessions.",
      "**2. Breakaway Gap:** Forms when price gaps out of a prolonged consolidation pattern (base, triangle, or channel) on massive volume. Signals the birth of a major new trend. Rarely gets filled in the near term.",
      "**3. Runaway / Continuation / Measuring Gap:** Appears near the midpoint of a rapid, powerful trend. Shows furious momentum. Crucial feature: it often acts as a 'measuring gap', projecting that the subsequent leg of the trend will equal the distance traveled before the gap.",
      "**4. Exhaustion Gap:** Forms near the very end of an extended trend. Represents a frantic, late-stage retail scramble. Filled quickly within 2-5 sessions, signaling immediate trend termination.",
      "**Island Reversal Cluster:** Formed when an exhaustion gap up is immediately followed by a breakaway gap down, leaving an isolated island of price bars trapped above.",
    ],
    practicalRule: "If a gap occurs on low volume within a range, treat it as a common gap and look for a fill. If a gap breaks out of a 2-month range on 3x average volume, do NOT fade it—trade in the direction of the gap.",
    sampleQuestion: "Which gap typically acts as a measuring gap occurring near the midpoint of a trend?",
    sampleAnswer: "The Runaway or Continuation Gap."
  },

  // ─── CHAPTER 4: INDICATORS & OSCILLATORS ──────────────────────────────
  {
    title: "Moving Averages: SMA, EMA, Golden Cross & Ribbons",
    chapter: "Chapter 4: Major Indicators & Oscillators",
    pageRange: "Pages 84–89",
    keywords: ["moving average", "sma", "ema", "golden cross", "death cross", "exponential moving average", "simple moving average", "crossover"],
    summary: "Moving averages smooth out erratic price fluctuations to identify the underlying trend direction and dynamic support/resistance zones.",
    keyPoints: [
      "**Simple Moving Average (SMA):** The unweighted mathematical mean of closing prices over the past N periods. Lags price action.",
      "**Exponential Moving Average (EMA):** Applies exponentially decreasing weighting factors, giving greatest importance to the most recent price bars. Responds much faster to price reversals with less lag than an SMA.",
      "**Golden Cross:** Bullish signal occurring when a short-term moving average (typically 50-day EMA) crosses above a long-term moving average (typically 200-day EMA). Confirms macro bull market.",
      "**Death Cross:** Bearish counterpart where the 50-day EMA crosses below the 200-day EMA, confirming macro structural downtrend.",
      "**Moving Average Ribbon (20, 50, 200):** When shorter MAs are fanned out neatly above longer MAs (20 > 50 > 200), trend strength is optimal. MAs also serve as dynamic support during pullbacks.",
    ],
    practicalRule: "Only take long trades when price is trading above its 200-day EMA. Use the 20 EMA and 50 EMA as pullback re-entry zones.",
  },

  {
    title: "Relative Strength Index (RSI) & Momentum Divergence",
    chapter: "Chapter 4: Major Indicators & Oscillators",
    pageRange: "Pages 89–101",
    keywords: ["rsi", "relative strength index", "overbought", "oversold", "divergence", "bullish divergence", "bearish divergence", "wilder"],
    summary: "Developed by J. Welles Wilder, the RSI is a bounded momentum oscillator measuring the speed and change of price movements between 0 and 100.",
    keyPoints: [
      "**Formula:** $RSI = 100 - [100 / (1 + RS)]$, where $RS = \\text{Average Gain of Up Days} / \\text{Average Loss of Down Days}$ over 14 periods.",
      "**Overbought (> 70):** Indicates price has advanced too rapidly; vulnerable to pullbacks or consolidation. (In strong bull markets, RSI can stay overbought between 70-85 for extended periods).",
      "**Oversold (< 30):** Indicates aggressive selling exhaustion; prime hunting zone for mean-reversion bounces.",
      "**Regular Bullish Divergence:** Price prints a Lower Low while the RSI indicator forms a Higher Low. Signals seller exhaustion and imminent upward reversal.",
      "**Regular Bearish Divergence:** Price prints a Higher High while the RSI indicator forms a Lower High. Signals buyer exhaustion and imminent downward correction.",
    ],
    practicalRule: "Never sell a stock purely because RSI is > 70 in a raging bull market. Only take reversal signals when RSI divergence is confirmed by a breakdown in price action (e.g., loss of prior swing low).",
  },

  {
    title: "MACD (Moving Average Convergence Divergence) & Bollinger Bands",
    chapter: "Chapter 4: Major Indicators & Oscillators",
    pageRange: "Pages 102–110",
    keywords: ["macd", "bollinger", "bollinger bands", "gerald appel", "histogram", "centerline", "volatility squeeze", "standard deviation"],
    summary: "Trend-following momentum indicators that combine moving averages and standard deviation volatility envelopes.",
    keyPoints: [
      "**MACD Construction (Gerald Appel):**",
      "  - MACD Line = 12-period EMA - 26-period EMA.",
      "  - Signal Line = 9-period EMA of the MACD Line.",
      "  - MACD Histogram = MACD Line - Signal Line.",
      "**MACD Trading Signals:** Signal line crossover (MACD crossing above signal line = Buy; below = Sell); Zero-line centerline crossover (confirms directional trend shift); Histogram momentum divergence.",
      "**Bollinger Bands (John Bollinger):**",
      "  - Middle Band: 20-period SMA.",
      "  - Upper Band: 20 SMA + (2 × 20-period Standard Deviation).",
      "  - Lower Band: 20 SMA - (2 × 20-period Standard Deviation).",
      "**Bollinger Squeeze:** When the bands contract to their narrowest width in months, it signals extreme volatility compression that reliably precedes an explosive directional breakout.",
    ],
    practicalRule: "During a Bollinger Squeeze, wait for the first candle to close entirely outside the upper or lower band with expanding MACD histogram bars before executing the breakout trade.",
  },

  // ─── CHAPTER 5: TRADING STRATEGIES ────────────────────────────────────
  {
    title: "Day Trading Advantages, Risks & Momentum Strategies",
    chapter: "Chapter 5: Trading Strategies",
    pageRange: "Pages 120–126",
    keywords: ["day trading", "intraday", "momentum strategy", "slippage", "overnight risk", "gap risk"],
    summary: "NCFM Chapter 5 contrasts intraday execution with position trading, emphasizing speed, strict execution, and zero overnight exposure.",
    keyPoints: [
      "**Advantages of Day Trading:** Complete immunity from overnight gap-down risks caused by global events; ability to profit equally in both rising and falling markets; capital velocity.",
      "**Risks of Day Trading:** High transaction friction (brokerage, STT, exchange turnover fees); execution slippage; psychological stress and intraday whipsaws.",
      "**Momentum Trading Strategies:** Focus on top percentage gainers/losers with heavy relative volume (RVOL > 2.0); opening range breakouts (ORB) over the first 15–30 minutes.",
    ],
    practicalRule: "Never hold an intraday margin position overnight to avoid taking a loss. Cut trades cleanly before 3:15 PM IST regardless of outcome.",
  },

  // ─── CHAPTER 6: DOW THEORY & ELLIOTT WAVE ──────────────────────────────
  {
    title: "Dow Theory: 6 Cardinal Principles",
    chapter: "Chapter 6: Dow Theory and Elliott Wave Theory",
    pageRange: "Pages 127–133",
    keywords: ["dow theory", "charles dow", "principles of dow", "three trends", "three phases", "volume confirms trend", "averages discount"],
    summary: "Formulated by Charles Dow, this is the foundational bedrock of all Western technical analysis.",
    keyPoints: [
      "**1. The Averages Discount Everything:** All factors affecting supply and demand are reflected in index prices.",
      "**2. The Market Has Three Trends:** Primary trend (major trend lasting > 1 year), Secondary trend (counter-trend corrections lasting 3 weeks to 3 months), and Minor fluctuations (daily noise < 3 weeks).",
      "**3. Primary Trends Have Three Phases:** Accumulation Phase (shrewd institutional investors buy while public is depressed), Public Participation Phase (trend accelerates, retail enters, earnings improve), and Distribution Phase (institutions quietly offload to euphoric late retail).",
      "**4. The Averages Must Confirm Each Other:** A bull market signal in one index (e.g., Nifty 50) must be confirmed by related indices (e.g., Nifty Bank / Nifty IT) to be authentic.",
      "**5. Volume Must Confirm the Trend:** In an uptrend, volume must expand on up-moves and contract on downward pullbacks. In a downtrend, volume expands on sell-offs and shrinks on bounces.",
      "**6. A Trend Persists Until Definite Reversal Signals:** An uptrend remains valid as long as it forms Higher Highs (HH) and Higher Lows (HL). A reversal is only confirmed when price breaks below a prior swing low, forming a Lower Low (LL).",
    ],
    practicalRule: "Never fight the primary trend. Secondary corrections are buying opportunities in a primary bull market, and selling opportunities in a primary bear market.",
    sampleQuestion: "What are the three phases of a primary bull market in Dow Theory?",
    sampleAnswer: "1. Accumulation Phase, 2. Public Participation Phase, and 3. Distribution Phase."
  },

  {
    title: "Elliott Wave Theory: Wave Rules & Fibonacci Proportions",
    chapter: "Chapter 6: Dow Theory and Elliott Wave Theory",
    pageRange: "Pages 133–158",
    keywords: ["elliott wave", "ralph nelson elliott", "impulse wave", "corrective wave", "wave 3", "wave 4", "fibonacci", "wave 2", "a b c"],
    summary: "Discovered by Ralph Nelson Elliott, market prices move in repetitive 5-wave motive patterns followed by 3-wave corrective patterns governed by Fibonacci ratios.",
    keyPoints: [
      "**The 5-3 Wave Cycle:** A complete cycle consists of 8 waves: 5 impulse waves in the trend direction (numbered 1, 2, 3, 4, 5) and 3 corrective waves against the trend (labeled A, B, C).",
      "**Three Inviolable Rules of Elliott Wave:**",
      "  - **Rule 1:** Wave 2 never retraces more than 100% of Wave 1.",
      "  - **Rule 2:** Wave 3 is never the shortest impulse wave (often the longest, most explosive wave).",
      "  - **Rule 3:** Wave 4 never overlaps or enters the price territory of Wave 1.",
      "**Fibonacci Proportions:**",
      "  - Wave 2 typically retraces 50% or 61.8% of Wave 1.",
      "  - Wave 3 typically extends to 1.618x or 2.618x the length of Wave 1.",
      "  - Wave 4 typically retraces 38.2% of Wave 3.",
      "  - Wave 5 frequently equals Wave 1 in amplitude.",
    ],
    practicalRule: "The highest probability, maximum reward-to-risk entry in trading is buying at the end of Wave 2 pullback (near 61.8% Fibonacci retracement) with a stop just below Wave 1 origin, to ride the explosive Wave 3.",
  },

  // ─── CHAPTER 7: TRADING PSYCHOLOGY & RISK MANAGEMENT ─────────────────
  {
    title: "Trading Psychology, Stop Loss, and Risk Management",
    chapter: "Chapter 7: Trading Psychology and Risk Management",
    pageRange: "Pages 159–172",
    keywords: ["risk management", "stop loss", "psychology", "risk reward", "trailing stop loss", "rules to stop losing", "golden rules", "discipline"],
    summary: "NCFM Chapter 7 establishes that 90% of trading success stems from disciplined risk management and emotional control, rather than charting accuracy.",
    keyPoints: [
      "**Stop Loss as Survival Tool:** A stop loss is an insurance policy. It protects trading capital from catastrophic black swan drawdowns.",
      "**Reward-to-Risk Ratio (RRR):** Never execute a trade with less than a 1:2 RRR. If risking ₹10 on a stop loss, minimum target must be ₹20. With a 1:2 RRR, you can be wrong 50% of the time and still remain consistently profitable.",
      "**Trailing Stop Loss:** Moving your stop loss upward as the trade progresses in your favor to lock in accrued paper profits while giving the trend room to breathe.",
      "**Golden Rules of Traders (NCFM):**",
      "  1. Trade with the trend, never against it.",
      "  2. Cut losses fast without hesitation, and let winning trades run.",
      "  3. Never risk more than 1% to 2% of total account capital on any single trade.",
      "  4. Always define your stop loss BEFORE entering the position.",
      "  5. Never average down on a losing trade.",
      "  6. Do not overtrade or engage in revenge trading after a loss.",
      "  7. Maintain a trading journal to audit mistake patterns.",
    ],
    practicalRule: "Position Size Formula = (Total Account Capital × 2%) / (Entry Price - Stop Loss Price). This guarantees that hitting a stop loss never damages your financial longevity.",
    sampleQuestion: "What is the minimum recommended Reward to Risk ratio according to NCFM risk management standards?",
    sampleAnswer: "A minimum of 1:2 (preferably 1:3), ensuring long-term profitability even with a 40-50% win rate."
  },
];

/**
 * Intelligent query matcher that searches the 172-page NCFM curriculum
 */
export function queryNcfmCurriculum(query: string): NcfmArticle | null {
  const q = query.toLowerCase().trim();

  // Score each article based on keyword and title matches
  let bestArticle: NcfmArticle | null = null;
  let highestScore = 0;

  for (const article of NCFM_KNOWLEDGE_ARTICLES) {
    let score = 0;

    // Check title match
    const titleWords = article.title.toLowerCase().split(/\s+/);
    for (const tw of titleWords) {
      if (tw.length > 3 && q.includes(tw)) score += 3;
    }

    // Check keyword matches
    for (const kw of article.keywords) {
      if (q.includes(kw)) {
        score += 5;
      }
    }

    // Check chapter title matches
    if (q.includes(article.chapter.toLowerCase().substring(0, 15))) {
      score += 4;
    }

    if (score > highestScore && score >= 5) {
      highestScore = score;
      bestArticle = article;
    }
  }

  return bestArticle;
}
