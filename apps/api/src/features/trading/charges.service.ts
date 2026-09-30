export interface OrderChargeParams {
  side: "BUY" | "SELL";
  productType: "MIS" | "CNC";
  quantity: number;
  price: number;
}

export interface ChargesBreakdown {
  turnover: number;
  brokerage: number;
  stt: number;
  exchangeCharges: number;
  gst: number;
  sebiCharges: number;
  stampDuty: number;
  totalCharges: number;
  isSimulated: true;
}

/**
 * Configurable brokerage & statutory charges calculation engine for Indian stock trading.
 * Follows official NSE/SEBI charge structure (simulated for paper trading).
 */
export class ChargesService {
  // Configurable rates
  private static rates = {
    intradayBrokeragePercent: 0.0005, // 0.05%
    intradayBrokerageCap: 20.0, // Max ₹20 per executed order
    deliveryBrokeragePercent: 0.0, // Zero brokerage for delivery
    deliveryBrokerageCap: 0.0,

    sttIntradaySell: 0.00025, // 0.025% on sell side
    sttDeliveryBoth: 0.001, // 0.1% on both buy & sell

    exchangeTurnoverCharge: 0.0000345, // 0.00345% (NSE)
    gstRate: 0.18, // 18% GST
    sebiTurnoverRate: 0.000001, // ₹10 per crore (0.0001%)

    stampDutyIntradayBuy: 0.00003, // 0.003% on buy
    stampDutyDeliveryBuy: 0.00015, // 0.015% on buy
  };

  /**
   * Calculate exact simulated charges for an order
   */
  public static calculateCharges(params: OrderChargeParams): ChargesBreakdown {
    const { side, productType, quantity, price } = params;
    const turnover = +(quantity * price).toFixed(2);
    const isIntraday = productType === "MIS";
    const isBuy = side === "BUY";
    const isSell = side === "SELL";

    // 1. Brokerage
    let brokerage = 0;
    if (isIntraday) {
      brokerage = Math.min(
        this.rates.intradayBrokerageCap,
        +(turnover * this.rates.intradayBrokeragePercent).toFixed(2)
      );
    } else {
      brokerage = Math.min(
        this.rates.deliveryBrokerageCap,
        +(turnover * this.rates.deliveryBrokeragePercent).toFixed(2)
      );
    }

    // 2. STT (Securities Transaction Tax)
    let stt = 0;
    if (isIntraday) {
      stt = isSell ? +(turnover * this.rates.sttIntradaySell).toFixed(2) : 0;
    } else {
      stt = +(turnover * this.rates.sttDeliveryBoth).toFixed(2);
    }

    // 3. Exchange Transaction Charges (NSE rate)
    const exchangeCharges = +(turnover * this.rates.exchangeTurnoverCharge).toFixed(2);

    // 4. SEBI Turnover Charges
    const sebiCharges = +(turnover * this.rates.sebiTurnoverRate).toFixed(2);

    // 5. GST (18% on Brokerage + Exchange charges + SEBI charges)
    const gstBase = brokerage + exchangeCharges + sebiCharges;
    const gst = +(gstBase * this.rates.gstRate).toFixed(2);

    // 6. Stamp Duty (on BUY only)
    let stampDuty = 0;
    if (isBuy) {
      stampDuty = isIntraday
        ? +(turnover * this.rates.stampDutyIntradayBuy).toFixed(2)
        : +(turnover * this.rates.stampDutyDeliveryBuy).toFixed(2);
    }

    // Total Charges
    const totalCharges = +(brokerage + stt + exchangeCharges + gst + sebiCharges + stampDuty).toFixed(2);

    return {
      turnover,
      brokerage: +brokerage.toFixed(2),
      stt: +stt.toFixed(2),
      exchangeCharges: +exchangeCharges.toFixed(2),
      gst: +gst.toFixed(2),
      sebiCharges: +sebiCharges.toFixed(2),
      stampDuty: +stampDuty.toFixed(2),
      totalCharges,
      isSimulated: true,
    };
  }
}
