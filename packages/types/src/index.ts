// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = "INVESTOR" | "ANALYST" | "ADMIN" | "SUPER_ADMIN";

export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT";
export type OrderStatus = "PENDING" | "FILLED" | "CANCELLED" | "REJECTED";

export type DataStatus = "LIVE" | "DELAYED" | "STALE" | "UNAVAILABLE";

export type AuditAction =
  | "USER_REGISTERED"
  | "USER_LOGIN"
  | "USER_LOGOUT"
  | "USER_SUSPENDED"
  | "USER_REACTIVATED"
  | "ROLE_CHANGED"
  | "ADMIN_BOOTSTRAP"
  | "ORDER_PLACED"
  | "ORDER_CANCELLED"
  | "WATCHLIST_CREATED"
  | "WATCHLIST_DELETED"
  | "STOCK_CREATED"
  | "STOCK_UPDATED";

// ─── Users ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthTokenPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthResponse {
  user: PublicUser;
  accessToken: string;
  // refreshToken is set as httpOnly cookie — not in body
}

// ─── Stocks ───────────────────────────────────────────────────────────────────

export type Exchange = "NSE" | "BSE";

export interface Stock {
  id: string;
  symbol: string;        // e.g. "RELIANCE"
  name: string;          // e.g. "Reliance Industries Ltd."
  exchange: Exchange;
  sector: string;
  industry: string;
  marketCap?: string;    // stored as string to avoid float precision issues
  isActive: boolean;
}

export interface Quote {
  symbol: string;
  exchange: Exchange;
  currentPrice: string;  // decimal string (numeric safe)
  previousClose: string;
  change: string;
  changePercent: string;
  dayHigh: string;
  dayLow: string;
  open?: string;
  volume: number;
  bid?: string;
  ask?: string;
  dataStatus: DataStatus;
  timestamp: string;     // ISO 8601
}

export interface OHLCVCandle {
  date: string;          // YYYY-MM-DD for daily or ISO timestamp for intraday
  time?: number | undefined; // Unix timestamp in seconds for intraday
  open: string;
  high: string;
  low: string;
  close: string;
  volume: number;
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

export interface Watchlist {
  id: string;
  userId: string;
  name: string;
  stocks: string[];      // array of stock symbols
  createdAt: string;
  updatedAt: string;
}

// ─── Paper Trading (Phase 3) ─────────────────────────────────────────────────

export interface Portfolio {
  userId: string;
  virtualCash: string;   // decimal string
  totalValue: string;    // cash + holdings value
  totalPnL: string;
  totalPnLPercent: string;
  updatedAt: string;
}

export interface Holding {
  stockId: string;
  symbol: string;
  name: string;
  quantity: number;
  averageCost: string;   // decimal string
  currentValue?: string;
  unrealizedPnL?: string;
}

export interface Order {
  id: string;
  userId: string;
  stockId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPrice?: string;
  executedPrice?: string;
  status: OrderStatus;
  placedAt: string;
  executedAt?: string;
}

// ─── AI Intelligence (Phase 5) ────────────────────────────────────────────────

export type EvidenceConfidence =
  | "CONFIRMED"
  | "LIKELY"
  | "POSSIBLE"
  | "UNKNOWN";

export interface EvidenceItem {
  claim: string;
  confidence: EvidenceConfidence;
  source: string;
  sourceUrl?: string;
  timestamp: string;
}

// ─── API Response Envelopes ───────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ─── Market Summary (Dashboard) ───────────────────────────────────────────────

export interface MarketIndex {
  name: string;          // e.g. "NIFTY 50"
  value: string;
  change: string;
  changePercent: string;
  dataStatus: DataStatus;
}

export interface MarketSummary {
  indices: MarketIndex[];
  topGainers: Quote[];
  topLosers: Quote[];
  mostActive: Quote[];
  marketStatus: "OPEN" | "CLOSED" | "PRE_MARKET" | "POST_MARKET";
  asOf: string;
}
