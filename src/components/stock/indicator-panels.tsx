import { useEffect, useRef } from 'react';
import {
  createChart,
  ColorType,
  LineSeries,
  HistogramSeries,
  LineStyle,
} from 'lightweight-charts';
import type { IChartApi } from 'lightweight-charts';
import type { TechnicalIndicators } from '@/types';

interface IndicatorPanelProps {
  indicators: TechnicalIndicators | null;
}

export function RSIPanel({ indicators }: IndicatorPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !indicators) return;

    const isDark = document.documentElement.classList.contains('dark');

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 150,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#1a1a2e' : '#ffffff' },
        textColor: isDark ? '#d1d5db' : '#374151',
      },
      grid: {
        vertLines: { color: isDark ? '#2d2d44' : '#e5e7eb' },
        horzLines: { color: isDark ? '#2d2d44' : '#e5e7eb' },
      },
      rightPriceScale: {
        borderColor: isDark ? '#2d2d44' : '#d1d5db',
      },
      timeScale: {
        visible: false,
      },
    });
    chartRef.current = chart;

    const rsiSeries = chart.addSeries(LineSeries, {
      color: '#8b5cf6',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    rsiSeries.setData(
      indicators.rsi.map((d) => ({ time: d.time, value: d.value })),
    );

    // Overbought line at 70
    rsiSeries.createPriceLine({
      price: 70,
      color: '#ef4444',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'Overbought',
    });

    // Oversold line at 30
    rsiSeries.createPriceLine({
      price: 30,
      color: '#22c55e',
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: 'Oversold',
    });

    chart.timeScale().fitContent();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newWidth } = entry.contentRect;
        chart.resize(newWidth, 150);
      }
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [indicators]);

  return <div ref={containerRef} className="w-full" />;
}

export function MACDPanel({ indicators }: IndicatorPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !indicators) return;

    const isDark = document.documentElement.classList.contains('dark');

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 150,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#1a1a2e' : '#ffffff' },
        textColor: isDark ? '#d1d5db' : '#374151',
      },
      grid: {
        vertLines: { color: isDark ? '#2d2d44' : '#e5e7eb' },
        horzLines: { color: isDark ? '#2d2d44' : '#e5e7eb' },
      },
      rightPriceScale: {
        borderColor: isDark ? '#2d2d44' : '#d1d5db',
      },
      timeScale: {
        visible: false,
      },
    });
    chartRef.current = chart;

    // MACD line
    const macdLineSeries = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    macdLineSeries.setData(
      indicators.macd.map((d) => ({ time: d.time, value: d.macd })),
    );

    // Signal line
    const signalLineSeries = chart.addSeries(LineSeries, {
      color: '#ef4444',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    signalLineSeries.setData(
      indicators.macd.map((d) => ({ time: d.time, value: d.signal })),
    );

    // Histogram
    const histSeries = chart.addSeries(HistogramSeries, {
      priceLineVisible: false,
      lastValueVisible: false,
    });
    histSeries.setData(
      indicators.macd.map((d) => ({
        time: d.time,
        value: d.histogram,
        color: d.histogram >= 0 ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)',
      })),
    );

    chart.timeScale().fitContent();

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newWidth } = entry.contentRect;
        chart.resize(newWidth, 150);
      }
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [indicators]);

  return <div ref={containerRef} className="w-full" />;
}
