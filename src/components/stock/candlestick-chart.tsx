import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from 'lightweight-charts';
import type { IChartApi, ISeriesApi, SeriesType, Time } from 'lightweight-charts';
import type { OHLCData, TechnicalIndicators } from '@/types';
import { cn } from '@/lib/utils';

interface CandlestickChartProps {
  data: OHLCData[];
  indicators: TechnicalIndicators | null;
  showSMA: boolean;
  showEMA: boolean;
  showBollinger: boolean;
  showRegression: boolean;
  averagePrice?: number | null;
  currentPrice?: number | null;
  showOverlay?: boolean;
  formatPrice?: (value: number) => string;
  height?: number;
}

interface CrosshairInfo {
  price: number;
  x: number;
  y: number;
}

export function CandlestickChart({
  data,
  indicators,
  showSMA,
  showEMA,
  showBollinger,
  showRegression,
  averagePrice,
  currentPrice,
  showOverlay = true,
  formatPrice,
  height = 400,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const [crosshair, setCrosshair] = useState<CrosshairInfo | null>(null);

  const handleCrosshairMove = useCallback(
    (param: { point?: { x: number; y: number } }) => {
      if (
        !param.point ||
        !seriesRef.current ||
        !currentPrice ||
        param.point.x < 0 ||
        param.point.y < 0
      ) {
        setCrosshair(null);
        return;
      }

      const coordPrice = seriesRef.current.coordinateToPrice(param.point.y);
      if (coordPrice == null || typeof coordPrice !== 'number' || !isFinite(coordPrice)) {
        setCrosshair(null);
        return;
      }

      setCrosshair({ price: coordPrice, x: param.point.x, y: param.point.y });
    },
    [currentPrice],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isDark = document.documentElement.classList.contains('dark');

    const chart = createChart(container, {
      width: container.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#1a1a2e' : '#ffffff' },
        textColor: isDark ? '#d1d5db' : '#374151',
      },
      grid: {
        vertLines: { color: isDark ? '#2d2d44' : '#e5e7eb' },
        horzLines: { color: isDark ? '#2d2d44' : '#e5e7eb' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: isDark ? '#2d2d44' : '#d1d5db',
      },
      timeScale: {
        borderColor: isDark ? '#2d2d44' : '#d1d5db',
      },
    });
    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });
    seriesRef.current = candleSeries;
    candleSeries.setData(
      data.map((d) => ({
        time: d.time as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      })),
    );

    // Average price line
    if (averagePrice && data.length > 0) {
      candleSeries.createPriceLine({
        price: averagePrice,
        color: '#a855f7',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Avg',
      });
    }

    // Volume histogram at bottom 20%
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });
    volumeSeries.setData(
      data.map((d) => ({
        time: d.time as Time,
        value: d.volume,
        color: d.close >= d.open ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
      })),
    );

    // Overlay indicators
    if (indicators) {
      // SMA
      if (showSMA) {
        const sma20Series = chart.addSeries(LineSeries, {
          color: '#3b82f6',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        sma20Series.setData(
          indicators.sma20.map((d) => ({ time: d.time as Time, value: d.value })),
        );

        const sma50Series = chart.addSeries(LineSeries, {
          color: '#f59e0b',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        sma50Series.setData(
          indicators.sma50.map((d) => ({ time: d.time as Time, value: d.value })),
        );
      }

      // EMA
      if (showEMA) {
        const ema12Series = chart.addSeries(LineSeries, {
          color: '#8b5cf6',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        ema12Series.setData(
          indicators.ema12.map((d) => ({ time: d.time as Time, value: d.value })),
        );

        const ema26Series = chart.addSeries(LineSeries, {
          color: '#ec4899',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        ema26Series.setData(
          indicators.ema26.map((d) => ({ time: d.time as Time, value: d.value })),
        );
      }

      // Bollinger Bands
      if (showBollinger) {
        const bbUpperSeries = chart.addSeries(LineSeries, {
          color: '#9ca3af',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        bbUpperSeries.setData(
          indicators.bollinger.map((d) => ({ time: d.time as Time, value: d.upper })),
        );

        const bbMiddleSeries = chart.addSeries(LineSeries, {
          color: '#9ca3af',
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        bbMiddleSeries.setData(
          indicators.bollinger.map((d) => ({ time: d.time as Time, value: d.middle })),
        );

        const bbLowerSeries = chart.addSeries(LineSeries, {
          color: '#9ca3af',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        bbLowerSeries.setData(
          indicators.bollinger.map((d) => ({ time: d.time as Time, value: d.lower })),
        );
      }

      // Regression line
      if (showRegression) {
        const regressionSeries = chart.addSeries(LineSeries, {
          color: '#f97316',
          lineWidth: 2,
          lineStyle: LineStyle.Dotted,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        regressionSeries.setData(
          indicators.regression.line.map((d) => ({ time: d.time as Time, value: d.value })),
        );
      }
    }

    chart.timeScale().fitContent();

    // Crosshair move handler
    if (showOverlay && currentPrice) {
      chart.subscribeCrosshairMove(handleCrosshairMove);
    }

    // ResizeObserver for responsive width
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newWidth } = entry.contentRect;
        chart.resize(newWidth, height);
      }
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      setCrosshair(null);
    };
  }, [data, indicators, showSMA, showEMA, showBollinger, showRegression, averagePrice, currentPrice, showOverlay, height, handleCrosshairMove]);

  const fmtPrice = formatPrice ?? ((v: number) => v.toFixed(2));

  const diffCurrent = crosshair && currentPrice ? crosshair.price - currentPrice : null;
  const diffCurrentPct = diffCurrent != null && currentPrice ? (diffCurrent / currentPrice) * 100 : null;

  const diffAvg = crosshair && averagePrice ? crosshair.price - averagePrice : null;
  const diffAvgPct = diffAvg != null && averagePrice ? (diffAvg / averagePrice) * 100 : null;

  return (
    <div ref={containerRef} className="relative w-full">
      {showOverlay && crosshair && diffCurrent != null && diffCurrentPct != null && (
        <div
          className="pointer-events-none absolute z-10 rounded border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md"
          style={{
            left: Math.min(crosshair.x + 16, (containerRef.current?.clientWidth ?? 400) - 180),
            top: Math.max(crosshair.y - 60, 4),
          }}
        >
          <div className="text-muted-foreground">
            Price: <span className="font-medium text-foreground">{fmtPrice(crosshair.price)}</span>
          </div>
          <div className={cn('font-semibold', diffCurrent >= 0 ? 'text-green-600' : 'text-red-600')}>
            vs Current: {diffCurrent >= 0 ? '+' : ''}{fmtPrice(diffCurrent)} ({diffCurrentPct >= 0 ? '+' : ''}{diffCurrentPct.toFixed(2)}%)
          </div>
          {diffAvg != null && diffAvgPct != null && (
            <div className={cn('font-semibold', diffAvg >= 0 ? 'text-green-600' : 'text-red-600')}>
              vs Avg: {diffAvg >= 0 ? '+' : ''}{fmtPrice(diffAvg)} ({diffAvgPct >= 0 ? '+' : ''}{diffAvgPct.toFixed(2)}%)
            </div>
          )}
        </div>
      )}
    </div>
  );
}
