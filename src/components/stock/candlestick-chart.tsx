import { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  CrosshairMode,
  LineStyle,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
} from 'lightweight-charts';
import type { IChartApi } from 'lightweight-charts';
import type { OHLCData, TechnicalIndicators } from '@/types';

interface CandlestickChartProps {
  data: OHLCData[];
  indicators: TechnicalIndicators | null;
  showSMA: boolean;
  showEMA: boolean;
  showBollinger: boolean;
  showRegression: boolean;
  height?: number;
}

export function CandlestickChart({
  data,
  indicators,
  showSMA,
  showEMA,
  showBollinger,
  showRegression,
  height = 400,
}: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

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
    candleSeries.setData(
      data.map((d) => ({
        time: d.time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      })),
    );

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
        time: d.time,
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
          indicators.sma20.map((d) => ({ time: d.time, value: d.value })),
        );

        const sma50Series = chart.addSeries(LineSeries, {
          color: '#f59e0b',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        sma50Series.setData(
          indicators.sma50.map((d) => ({ time: d.time, value: d.value })),
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
          indicators.ema12.map((d) => ({ time: d.time, value: d.value })),
        );

        const ema26Series = chart.addSeries(LineSeries, {
          color: '#ec4899',
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        ema26Series.setData(
          indicators.ema26.map((d) => ({ time: d.time, value: d.value })),
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
          indicators.bollinger.map((d) => ({ time: d.time, value: d.upper })),
        );

        const bbMiddleSeries = chart.addSeries(LineSeries, {
          color: '#9ca3af',
          lineWidth: 1,
          lineStyle: LineStyle.Solid,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        bbMiddleSeries.setData(
          indicators.bollinger.map((d) => ({ time: d.time, value: d.middle })),
        );

        const bbLowerSeries = chart.addSeries(LineSeries, {
          color: '#9ca3af',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          priceLineVisible: false,
          lastValueVisible: false,
        });
        bbLowerSeries.setData(
          indicators.bollinger.map((d) => ({ time: d.time, value: d.lower })),
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
          indicators.regression.line.map((d) => ({ time: d.time, value: d.value })),
        );
      }
    }

    chart.timeScale().fitContent();

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
    };
  }, [data, indicators, showSMA, showEMA, showBollinger, showRegression, height]);

  return <div ref={containerRef} className="w-full" />;
}
