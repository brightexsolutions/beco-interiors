'use client';

import { useEffect, useState } from 'react';

/**
 * The colours a chart may use, read from the live tokens so a chart follows
 * the dashboard's dark appearance without a second palette.
 *
 * The brand is near monochrome on purpose, so there is no categorical hue
 * set to cycle. Every chart here uses the EMPHASIS form from the dataviz
 * method: the series that is the point in charcoal, the context series in a
 * light neutral of the same hue, and Warm Red for a single attention series
 * only. Identity never rests on colour alone: two series always carry a
 * legend and direct labels, and every chart renders a table of its data.
 */
export interface ChartTheme {
  /** The series that is the point. */
  primary: string;
  /** The series that is context. */
  secondary: string;
  /** A third, further back. */
  tertiary: string;
  /** Needs action. Rationed. */
  attention: string;
  /** Gridlines and axis rules. */
  rule: string;
  /** Axis text. */
  text: string;
  /** The chart's background, for the 2px gaps and rings between marks. */
  surface: string;
}

const LIGHT: ChartTheme = {
  primary: '#101820',
  secondary: '#b9c0c7',
  tertiary: '#d7dce0',
  attention: '#c81419',
  rule: '#eceef0',
  text: '#6b757f',
  surface: '#ffffff',
};

const TOKENS: Record<keyof ChartTheme, string> = {
  primary: '--color-charcoal',
  secondary: '--color-neutral-300',
  tertiary: '--color-neutral-200',
  attention: '--color-warm-red-deep',
  rule: '--color-neutral-100',
  text: '--color-neutral-500',
  surface: '--color-high-vis-white',
};

export const readChartTheme = (root: Element | null = typeof document === 'undefined' ? null : document.documentElement): ChartTheme => {
  if (!root || typeof getComputedStyle !== 'function') return LIGHT;
  const styles = getComputedStyle(root);
  const read = (key: keyof ChartTheme) => styles.getPropertyValue(TOKENS[key]).trim() || LIGHT[key];
  return {
    primary: read('primary'),
    secondary: read('secondary'),
    tertiary: read('tertiary'),
    attention: read('attention'),
    rule: read('rule'),
    text: read('text'),
    surface: read('surface'),
  };
};

/** The live theme, re-read when the dashboard's `html.dark` class flips. */
export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(LIGHT);
  useEffect(() => {
    const root = document.documentElement;
    setTheme(readChartTheme(root));
    const observer = new MutationObserver(() => setTheme(readChartTheme(root)));
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

/** Charts hold still for a reader who asked for no motion. */
export function useChartMotion(): boolean {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    setAnimate(!(query?.matches ?? false));
    const onChange = () => setAnimate(!query.matches);
    query?.addEventListener?.('change', onChange);
    return () => query?.removeEventListener?.('change', onChange);
  }, []);
  return animate;
}

/**
 * Recharts measures its container on the client, so a chart rendered on the
 * server with a guessed width hydrates with a different one and React logs a
 * mismatch. The plot is drawn only once mounted; the frame, legend and table
 * render on the server as normal, so nothing a reader needs waits.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export const compactNumber = (value: number): string => {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
};
