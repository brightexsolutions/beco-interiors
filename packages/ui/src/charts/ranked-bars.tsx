'use client';

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartFrame, ChartTip, type ChartSeries } from './chart-frame';
import { compactNumber, useChartMotion, useChartTheme, useMounted } from './chart-theme';

export interface RankedItem {
  label: string;
  value: number;
}

/**
 * Magnitude, highest first, as horizontal bars with the value at the end
 * of each. The leader is charcoal and the rest a light neutral, so the top
 * row is named without a second colour. Long names run horizontally, the
 * direction a name is read.
 */
export function RankedBars({
  title,
  description,
  items,
  valueLabel,
  format = compactNumber,
  className,
}: {
  title: string;
  description?: string | undefined;
  items: RankedItem[];
  /** What the number is: "Won value", "Views". */
  valueLabel: string;
  format?: ((value: number) => string) | undefined;
  className?: string | undefined;
}) {
  const theme = useChartTheme();
  const animate = useChartMotion();
  const mounted = useMounted();
  const series: ChartSeries[] = [{ key: 'value', label: valueLabel, color: theme.primary, format }];
  const rows = items.map((item) => ({ label: item.label, value: item.value }));
  const height = Math.max(96, items.length * 40 + 8);

  return (
    <ChartFrame title={title} description={description} series={series} rows={rows} rowLabel="label" className={className}>
      {items.length === 0 ? (
        <p className="font-ui text-base text-neutral-500">Nothing to rank yet.</p>
      ) : (
        <div style={{ height }} className="w-full">
          {mounted ? (
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 480, height }}>
            <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 104, bottom: 0, left: 0 }} barCategoryGap={8}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                width={150}
                tickLine={false}
                axisLine={false}
                tick={{ fill: theme.text, fontSize: 14, fontFamily: 'inherit' }}
              />
              <Tooltip cursor={{ fill: theme.rule, opacity: 0.6 }} content={<ChartTip series={series} />} />
              <Bar dataKey="value" radius={[0, 2, 2, 0]} isAnimationActive={animate} maxBarSize={18}>
                {rows.map((row, index) => (
                  <Cell key={row.label} fill={index === 0 ? theme.primary : theme.secondary} />
                ))}
                <LabelList dataKey="value" position="right" offset={8} formatter={(value: number) => format(value)} style={{ fill: theme.text, fontSize: 14, fontFamily: 'inherit' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          ) : null}
        </div>
      )}
    </ChartFrame>
  );
}
