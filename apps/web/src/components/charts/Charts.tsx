import React, { useEffect, useRef, useMemo } from "react";
import {
  createChart,
  CandlestickSeries,
  AreaSeries,
  HistogramSeries,
  ColorType,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";
import type { OHLCVCandle } from "@stocklens/types";
import { useTheme } from "@/stores/themeStore";

// Helper to normalize and sanitize OHLCV candle data for Lightweight Charts
export interface SanitizedCandle {
  time: string | number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function sanitizeCandles(data: OHLCVCandle[]): { candles: SanitizedCandle[]; isIntraday: boolean } {
  if (!Array.isArray(data) || data.length === 0) return { candles: [], isIntraday: false };

  // Determine if dataset is intraday
  const hasIntradayTime = data.some((d) => {
    if (typeof d.time === "number" && d.time > 0) return true;
    if (typeof d.date === "string" && (d.date.includes("T") || d.date.includes(":"))) {
      const parsed = new Date(d.date);
      return !isNaN(parsed.getTime()) && (parsed.getUTCHours() !== 0 || parsed.getUTCMinutes() !== 0);
    }
    return false;
  });

  if (hasIntradayTime) {
    const valid = data
      .map((d) => {
        const open = parseFloat(String(d.open));
        const close = parseFloat(String(d.close));
        const rawHigh = parseFloat(String(d.high));
        const rawLow = parseFloat(String(d.low));
        const volume = Number(d.volume) || 0;

        if (isNaN(open) || isNaN(close) || open <= 0 || close <= 0) return null;

        const high = !isNaN(rawHigh) ? Math.max(rawHigh, open, close) : Math.max(open, close);
        const low = !isNaN(rawLow) ? Math.max(0.01, Math.min(rawLow, open, close)) : Math.min(open, close);

        let timeSec: number;
        if (typeof d.time === "number" && d.time > 0) {
          timeSec = d.time;
        } else {
          const dObj = new Date(d.date);
          if (isNaN(dObj.getTime())) return null;
          timeSec = Math.floor(dObj.getTime() / 1000);
        }

        return {
          time: timeSec,
          open: +open.toFixed(2),
          high: +high.toFixed(2),
          low: +low.toFixed(2),
          close: +close.toFixed(2),
          volume,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => Number(a.time) - Number(b.time));

    const uniqueMap = new Map<number, SanitizedCandle>();
    for (const item of valid) {
      uniqueMap.set(Number(item.time), item);
    }
    return { candles: Array.from(uniqueMap.values()), isIntraday: true };
  }

  // Daily mode
  const valid = data
    .map((d) => {
      const open = parseFloat(String(d.open));
      const close = parseFloat(String(d.close));
      const rawHigh = parseFloat(String(d.high));
      const rawLow = parseFloat(String(d.low));
      const volume = Number(d.volume) || 0;

      if (isNaN(open) || isNaN(close) || open <= 0 || close <= 0) return null;

      const high = !isNaN(rawHigh) ? Math.max(rawHigh, open, close) : Math.max(open, close);
      const low = !isNaN(rawLow) ? Math.max(0.01, Math.min(rawLow, open, close)) : Math.min(open, close);

      let dateStr = "";
      if (typeof d.date === "string") {
        dateStr = d.date.split("T")[0]!;
      } else {
        const dObj = new Date(d.date);
        if (isNaN(dObj.getTime())) return null;
        dateStr = dObj.toISOString().split("T")[0]!;
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;

      return {
        time: dateStr,
        open: +open.toFixed(2),
        high: +high.toFixed(2),
        low: +low.toFixed(2),
        close: +close.toFixed(2),
        volume,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

  const uniqueMap = new Map<string, SanitizedCandle>();
  for (const item of valid) {
    uniqueMap.set(String(item.time), item);
  }
  return { candles: Array.from(uniqueMap.values()), isIntraday: false };
}

// ─── Candlestick Chart ────────────────────────────────────────────────────────

interface CandlestickChartProps {
  data: OHLCVCandle[];
  height?: number;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  data,
  height = 420,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const { isDark } = useTheme();

  const { candles: cleanCandles, isIntraday } = useMemo(() => sanitizeCandles(data), [data]);
  const prevCandlesRef = useRef<{ len: number; firstTime: any } | null>(null);

  // 1. Initialize Chart
  useEffect(() => {
    if (!containerRef.current) return;

    prevCandlesRef.current = null;

    const textColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "rgba(31, 45, 69, 0.4)" : "rgba(226, 232, 240, 0.8)";
    const borderColor = isDark ? "rgba(31, 45, 69, 0.8)" : "rgba(203, 213, 225, 0.8)";
    const crosshairColor = isDark ? "rgba(99, 102, 241, 0.5)" : "rgba(99, 102, 241, 0.4)";
    const upColor = isDark ? "#10b981" : "#059669";
    const downColor = isDark ? "#f43f5e" : "#e11d48";

    const initialWidth = containerRef.current.clientWidth > 0 ? containerRef.current.clientWidth : 600;

    let chart: IChartApi;
    try {
      chart = createChart(containerRef.current, {
        width: initialWidth,
        height,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor,
          fontFamily: "Inter, sans-serif",
          fontSize: 12,
        },
        localization: {
          timeFormatter: (time: number | string) => {
            if (typeof time === "number") {
              const d = new Date(time * 1000);
              return d.toLocaleTimeString("en-IN", {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
            }
            return String(time);
          },
        },
        grid: {
          vertLines: { color: gridColor },
          horzLines: { color: gridColor },
        },
        crosshair: {
          vertLine: { color: crosshairColor, width: 1, style: 2 },
          horzLine: { color: crosshairColor, width: 1, style: 2 },
        },
        rightPriceScale: {
          borderColor,
          textColor,
          scaleMargins: { top: 0.08, bottom: 0.22 },
        },
        timeScale: {
          borderColor,
          timeVisible: isIntraday,
          secondsVisible: false,
          rightOffset: 8,
          barSpacing: 8,
          minBarSpacing: 2,
        },
      });

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor,
        downColor,
        borderUpColor: upColor,
        borderDownColor: downColor,
        wickUpColor: upColor,
        wickDownColor: downColor,
        priceLineVisible: true,
      });

      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: isDark ? "rgba(16, 185, 129, 0.35)" : "rgba(5, 150, 105, 0.35)",
        priceFormat: { type: "volume" },
        priceScaleId: "volume_scale",
        priceLineVisible: false,
        lastValueVisible: false, // Prevents volume value (e.g. 500) from appearing as a badge on the price scale
      });

      chart.priceScale("volume_scale").applyOptions({
        visible: false,
        scaleMargins: {
          top: 0.82,
          bottom: 0,
        },
      });

      chartRef.current = chart;
      seriesRef.current = candleSeries;
      volumeSeriesRef.current = volumeSeries;

      const ro = new ResizeObserver((entries) => {
        if (!entries[0] || !chartRef.current) return;
        const width = entries[0].contentRect.width;
        if (width > 0) {
          chartRef.current.resize(width, height);
        }
      });
      ro.observe(containerRef.current);

      return () => {
        ro.disconnect();
        chart.remove();
        chartRef.current = null;
        seriesRef.current = null;
        volumeSeriesRef.current = null;
        prevCandlesRef.current = null;
      };
    } catch (err) {
      console.warn("Failed to initialize candlestick chart:", err);
    }
  }, [height, isDark, isIntraday]);

  // 2. Update data seamlessly without destroying chart
  useEffect(() => {
    if (!seriesRef.current || cleanCandles.length === 0) return;
    try {
      const upColor = isDark ? "rgba(16, 185, 129, 0.45)" : "rgba(5, 150, 105, 0.45)";
      const downColor = isDark ? "rgba(244, 63, 94, 0.45)" : "rgba(225, 29, 72, 0.45)";

      const candlePoints = cleanCandles.map((c) => ({
        time: c.time as any,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));

      const volumePoints = cleanCandles.map((c) => ({
        time: c.time as any,
        value: c.volume,
        color: c.close >= c.open ? upColor : downColor,
      }));

      const firstTime = candlePoints[0]?.time;
      const isInitialOrReset =
        !prevCandlesRef.current ||
        prevCandlesRef.current.len !== candlePoints.length ||
        prevCandlesRef.current.firstTime !== firstTime;

      if (isInitialOrReset) {
        prevCandlesRef.current = { len: candlePoints.length, firstTime };
        seriesRef.current.setData(candlePoints);
        volumeSeriesRef.current?.setData(volumePoints);
        chartRef.current?.timeScale().fitContent();
      } else {
        // Real-time live tick streaming: update only the active candle so the graph ticks dynamically!
        const lastCandle = candlePoints[candlePoints.length - 1];
        const lastVol = volumePoints[volumePoints.length - 1];
        if (lastCandle) {
          seriesRef.current.update(lastCandle);
        }
        if (lastVol) {
          volumeSeriesRef.current?.update(lastVol);
        }
      }
    } catch (err) {
      console.warn("Failed to update candlestick data:", err);
    }
  }, [cleanCandles, isDark]);

  if (cleanCandles.length < 2) {
    return (
      <div
        className="w-full flex items-center justify-center text-[#94a3b8] text-sm bg-[#111827]/40 rounded-[12px] border border-[#1f2d45]"
        style={{ height: `${height}px` }}
      >
        <span>Loading chart data...</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="lw-chart-container w-full relative"
      style={{ width: "100%", height: `${height}px`, minHeight: `${height}px` }}
    />
  );
};

// ─── Area Chart ───────────────────────────────────────────────────────────────

interface AreaChartProps {
  data: OHLCVCandle[];
  height?: number;
  positive?: boolean;
}

export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  height = 400,
  positive = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const { isDark } = useTheme();

  const { candles: cleanCandles, isIntraday } = useMemo(() => sanitizeCandles(data), [data]);
  const prevAreaRef = useRef<{ len: number; firstTime: any } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    prevAreaRef.current = null;

    const gainColor = isDark ? "#10b981" : "#059669";
    const lossColor = isDark ? "#f43f5e" : "#e11d48";
    const color = positive ? gainColor : lossColor;
    const colorDim = positive
      ? isDark ? "rgba(16,185,129,0.18)" : "rgba(5,150,105,0.12)"
      : isDark ? "rgba(244,63,94,0.18)" : "rgba(225,29,72,0.12)";

    const initialWidth = containerRef.current.clientWidth > 0 ? containerRef.current.clientWidth : 600;

    let chart: IChartApi;
    try {
      chart = createChart(containerRef.current, {
        width: initialWidth,
        height,
        layout: {
          background: { type: ColorType.Solid, color: "transparent" },
          textColor: isDark ? "#94a3b8" : "#64748b",
          fontFamily: "Inter, sans-serif",
          fontSize: 12,
        },
        localization: {
          timeFormatter: (time: number | string) => {
            if (typeof time === "number") {
              const d = new Date(time * 1000);
              return d.toLocaleTimeString("en-IN", {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              });
            }
            return String(time);
          },
        },
        grid: {
          vertLines: { visible: false },
          horzLines: { color: isDark ? "rgba(31, 45, 69, 0.3)" : "rgba(226, 232, 240, 0.6)" },
        },
        rightPriceScale: {
          borderColor: isDark ? "rgba(31, 45, 69, 0.8)" : "rgba(203, 213, 225, 0.8)",
          scaleMargins: { top: 0.1, bottom: 0.1 },
        },
        timeScale: {
          borderColor: isDark ? "rgba(31, 45, 69, 0.8)" : "rgba(203, 213, 225, 0.8)",
          timeVisible: isIntraday,
          secondsVisible: false,
          rightOffset: 8,
          barSpacing: 8,
          minBarSpacing: 2,
        },
        handleScroll: true,
        handleScale: true,
      });

      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: color,
        topColor: colorDim,
        bottomColor: "transparent",
        lineWidth: 2,
        priceLineVisible: true,
      });

      chartRef.current = chart;
      seriesRef.current = areaSeries;

      const ro = new ResizeObserver((entries) => {
        if (!entries[0] || !chartRef.current) return;
        const width = entries[0].contentRect.width;
        if (width > 0) {
          chartRef.current.resize(width, height);
        }
      });
      ro.observe(containerRef.current);

      return () => {
        ro.disconnect();
        chart.remove();
        chartRef.current = null;
        seriesRef.current = null;
        prevAreaRef.current = null;
      };
    } catch (err) {
      console.warn("Failed to initialize area chart:", err);
    }
  }, [height, positive, isDark, isIntraday]);

  useEffect(() => {
    if (!seriesRef.current || cleanCandles.length === 0) return;
    try {
      const areaPoints = cleanCandles.map((d) => ({
        time: d.time as any,
        value: d.close,
      }));
      const firstTime = areaPoints[0]?.time;
      const isInitial =
        !prevAreaRef.current ||
        prevAreaRef.current.len !== areaPoints.length ||
        prevAreaRef.current.firstTime !== firstTime;

      if (isInitial) {
        prevAreaRef.current = { len: areaPoints.length, firstTime };
        seriesRef.current.setData(areaPoints);
        chartRef.current?.timeScale().fitContent();
      } else {
        const lastPoint = areaPoints[areaPoints.length - 1];
        if (lastPoint) {
          seriesRef.current.update(lastPoint);
        }
      }
    } catch (err) {
      console.warn("Failed to update area chart data:", err);
    }
  }, [cleanCandles]);

  if (cleanCandles.length < 2) {
    return (
      <div
        className="w-full flex items-center justify-center text-[#94a3b8] text-sm bg-[#111827]/40 rounded-[12px] border border-[#1f2d45]"
        style={{ height: `${height}px` }}
      >
        <span>Loading chart data...</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="lw-chart-container w-full relative"
      style={{ width: "100%", height: `${height}px`, minHeight: `${height}px` }}
    />
  );
};
