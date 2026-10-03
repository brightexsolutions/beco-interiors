'use client';

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartFrame, ChartTip, type ChartSeries } from './chart-frame';
import { compactNumber, useChartMotion, useChartTheme, useMounted } from './chart-theme';

export interface TrendPoint {
  /** The x label, "29 Sep". */
  label: string;
  [key: string]: string | number;
}

export interface TrendBarsProps {
  title: string;
  description?: string | undefined;
  points: TrendPoint[];
  /** The series that is the point: charcoal, labelled on every bar. */
  primary: { key: string; label: string; format?: (value: number) => string };
  /** Context, behind it in a light neutral. */
  secondary?: { key: string; label: string; format?: (value: number) => string } | undefined;
  height?: number | undefined;
  className?: string | undefined;
}

/**
 * Change over time as bars, one week or one day per group, in the emphasis
 * form: the series that answers the question in charcoal, the context
 * series beside it in a light neutral. Thin marks, a surface gap between
 * them, no second axis, a tooltip that lists both.
 */
export function TrendBars({ title, description, points, primary, secondary, height = 220, className }: TrendBarsProps) {
  const theme = useChartTheme();
  const animate = useChartMotion();
  const mounted = useMounted();
  const series: ChartSeries[] = [
    ...(secondary ? [{ key: secondary.key, label: secondary.label, color: theme.secondary, format: secondary.format }] : []),
    { key: primary.key, label: primary.label, color: theme.primary, format: primary.format },
  ];

  return (
    <ChartFrame title={title} description={description} series={series} rows={points} rowLabel="label" className={className}>
      <div style={{ height }} className="w-full">
        {mounted ? (
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height }}>
          <BarChart data={points} margin={{ top: 16, right: 4, bottom: 0, left: -8 }} barCategoryGap="28%" barGap={2}>
            <CartesianGrid vertical={false} stroke={theme.rule} />
            <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: theme.rule }} tick={{ fill: theme.text, fontSize: 14, fontFamily: 'inherit' }} interval="preserveStartEnd" />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={44} tickFormatter={compactNumber} tick={{ fill: theme.text, fontSize: 14, fontFamily: 'inherit' }} />
            <Tooltip cursor={{ fill: theme.rule, opacity: 0.6 }} content={<ChartTip series={series} />} />
            {secondary ? (
              <Bar dataKey={secondary.key} fill={theme.secondary} radius={[2, 2, 0, 0]} isAnimationActive={animate} maxBarSize={28} />
            ) : null}
            <Bar dataKey={primary.key} fill={theme.primary} radius={[2, 2, 0, 0]} isAnimationActive={animate} maxBarSize={28}>
              {/* Short labels on the bars, so eight weeks of shillings do not
                  collide; the tooltip and the table carry the full figure. */}
              <LabelList
                dataKey={primary.key}
                position="top"
                formatter={(value: number) => (value > 0 ? compactNumber(value) : '')}
                style={{ fill: theme.text, fontSize: 14, fontFamily: 'inherit' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        ) : null}
      </div>
    </ChartFrame>
  );
}
