import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, CrosshairMode, LineSeries, LineStyle, LineType } from 'lightweight-charts';
import type { MouseEventParams, Time } from 'lightweight-charts';
import type { ComparisonPoint } from '@/lib/benchmark-comparison';
import { cn, formatCurrency, formatPercent } from '@/lib/utils';

const SERIES_COLORS = {
  account: '#3b82f6',
  benchmark: '#f97316',
  netDeposited: '#9ca3af',
} as const;

interface TooltipInfo {
  x: number;
  y: number;
  maxLeft: number;
  point: ComparisonPoint;
}

const TOOLTIP_WIDTH = 220;

interface Props {
  data: ComparisonPoint[];
  currency: string;
  benchmarkLabel: string;
  height?: number;
}

export function PortfolioBenchmarkLineChart({ data, currency, benchmarkLabel, height = 320 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);

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
      crosshair: { mode: CrosshairMode.Magnet },
      rightPriceScale: { borderColor: isDark ? '#2d2d44' : '#d1d5db' },
      timeScale: { borderColor: isDark ? '#2d2d44' : '#d1d5db' },
      localization: { priceFormatter: (v: number) => formatCurrency(v, currency) },
    });

    const common = { lineWidth: 2 as const, priceLineVisible: false };
    const depositedSeries = chart.addSeries(LineSeries, {
      ...common,
      color: SERIES_COLORS.netDeposited,
      lineStyle: LineStyle.Dotted,
      lineType: LineType.WithSteps,
      lastValueVisible: false,
    });
    const benchmarkSeries = chart.addSeries(LineSeries, { ...common, color: SERIES_COLORS.benchmark });
    const accountSeries = chart.addSeries(LineSeries, { ...common, color: SERIES_COLORS.account });

    depositedSeries.setData(data.map((p) => ({ time: p.date as Time, value: p.netDeposited })));
    benchmarkSeries.setData(data.map((p) => ({ time: p.date as Time, value: p.benchmark })));
    accountSeries.setData(data.map((p) => ({ time: p.date as Time, value: p.account })));
    chart.timeScale().fitContent();

    const byDate = new Map(data.map((p) => [p.date, p]));
    const onCrosshairMove = (param: MouseEventParams<Time>) => {
      const point = typeof param.time === 'string' ? byDate.get(param.time) : undefined;
      if (!param.point || !point || param.point.x < 0 || param.point.y < 0) {
        setTooltip(null);
        return;
      }
      setTooltip({ x: param.point.x, y: param.point.y, maxLeft: container.clientWidth - TOOLTIP_WIDTH, point });
    };
    chart.subscribeCrosshairMove(onCrosshairMove);

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) chart.resize(entry.contentRect.width, height);
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
      chart.unsubscribeCrosshairMove(onCrosshairMove);
      chart.remove();
      setTooltip(null);
    };
  }, [data, currency, height]);

  const diff = tooltip ? tooltip.point.account - tooltip.point.benchmark : null;
  const diffPct =
    tooltip && diff !== null && tooltip.point.benchmark !== 0 ? (diff / tooltip.point.benchmark) * 100 : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <LegendItem color={SERIES_COLORS.account} label="My account" />
        <LegendItem color={SERIES_COLORS.benchmark} label={benchmarkLabel} />
        <LegendItem color={SERIES_COLORS.netDeposited} label="Net deposited" dotted />
      </div>
      <div ref={containerRef} className="relative w-full">
        {tooltip && diff !== null && (
          <div
            className="pointer-events-none absolute z-10 rounded border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md"
            style={{
              width: TOOLTIP_WIDTH,
              left: Math.max(0, Math.min(tooltip.x + 16, tooltip.maxLeft)),
              top: Math.max(tooltip.y - 70, 4),
            }}
          >
            <div className="mb-0.5 text-muted-foreground">{tooltip.point.date}</div>
            <div className="text-muted-foreground">
              My account:{' '}
              <span className="font-medium text-foreground">{formatCurrency(tooltip.point.account, currency)}</span>
            </div>
            <div className="text-muted-foreground">
              {benchmarkLabel}:{' '}
              <span className="font-medium text-foreground">{formatCurrency(tooltip.point.benchmark, currency)}</span>
            </div>
            <div className={cn('font-semibold', diff >= 0 ? 'text-green-600' : 'text-red-600')}>
              Difference: {diff >= 0 ? '+' : ''}
              {formatCurrency(diff, currency)}
              {diffPct !== null && ` (${formatPercent(diffPct)})`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LegendItem({ color, label, dotted = false }: { color: string; label: string; dotted?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="inline-block w-4 border-t-2"
        style={{ borderColor: color, borderTopStyle: dotted ? 'dotted' : 'solid' }}
      />
      {label}
    </span>
  );
}
