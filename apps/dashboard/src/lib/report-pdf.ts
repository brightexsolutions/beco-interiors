import { renderReportPdf, type ReportPdfInput } from '@beco/documents';
import { reportFigures, type ConversionReport, type LeaderboardReport } from './reports';

export function reportPdfFilename(period: string): string {
  const safe = period
    .replace(/["\\/:*?<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return safe ? `Beco sales review ${safe}.pdf` : 'Beco sales review.pdf';
}

export function toReportPdfInput(
  leaderboard: LeaderboardReport,
  conversion: ConversionReport,
  generatedAt: string,
): ReportPdfInput {
  const figures = reportFigures(leaderboard);
  return {
    period: leaderboard.period,
    generatedAt,
    invoiced: leaderboard.invoiced,
    collected: leaderboard.collected,
    raised: figures.raised,
    won: figures.won,
    conversion: figures.conversion,
    people: leaderboard.people.map((person) => ({
      name: person.full_name,
      raised: person.raised,
      won: person.won,
      wonValue: person.won_value,
      conversion: person.conversion,
    })),
    products: conversion.products.map((row) => ({
      name: row.name,
      views: row.views,
      addToCart: row.add_to_cart,
      quoted: row.quote_submitted,
      whatsapp: row.whatsapp,
      calls: row.calls,
      viewToCart: row.view_to_cart,
    })),
    categories: conversion.categories.map((row) => ({
      name: row.name,
      views: row.views,
      addToCart: row.add_to_cart,
      quoted: row.quote_submitted,
      whatsapp: row.whatsapp,
      calls: row.calls,
      viewToCart: row.view_to_cart,
    })),
  };
}

export async function renderReportPdfBytes(
  leaderboard: LeaderboardReport,
  conversion: ConversionReport,
  generatedAt = new Date().toISOString(),
): Promise<{ ok: true; bytes: Buffer } | { ok: false; error: string }> {
  try {
    const bytes = await renderReportPdf(toReportPdfInput(leaderboard, conversion, generatedAt));
    return { ok: true, bytes };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown error';
    return { ok: false, error: `Could not render the PDF: ${detail}` };
  }
}
