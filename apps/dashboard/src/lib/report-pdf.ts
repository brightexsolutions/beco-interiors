import { renderReportPdf, type ReportPdfInput } from '@beco/documents';
import { reportFigures, type ConversionReport, type LeaderboardPerson, type LeaderboardReport } from './reports';

const cleanName = (value: string) =>
  value
    .replace(/["\\/:*?<>|\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);

export function reportPdfFilename(period: string, person?: string | null): string {
  const when = cleanName(period);
  if (person) {
    const who = cleanName(person);
    return `Beco salesperson review ${who} ${when}.pdf`.replace(/\s+/g, ' ').trim();
  }
  return when ? `Beco overall sales review ${when}.pdf` : 'Beco overall sales review.pdf';
}

const money = (value: number | string | null | undefined): number => {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
};

function toPersonRow(person: LeaderboardPerson) {
  return {
    name: person.full_name,
    raised: money(person.raised),
    won: money(person.won),
    lost: money(person.lost),
    wonValue: money(person.won_value),
    conversion: person.conversion,
    orders: money(person.orders),
  };
}

export function toReportPdfInput(
  leaderboard: LeaderboardReport,
  conversion: ConversionReport,
  generatedAt: string,
  personId?: string | null,
): ReportPdfInput {
  if (personId) {
    const person = leaderboard.people.find((row) => row.id === personId);
    if (!person) {
      throw new Error('That salesperson is not on the report.');
    }
    const slice: LeaderboardReport = {
      period: leaderboard.period,
      invoiced: money(person.invoiced),
      collected: money(person.collected),
      people: [person],
    };
    const figures = reportFigures(slice);
    return {
      period: leaderboard.period,
      generatedAt,
      person: person.full_name,
      invoiced: slice.invoiced,
      collected: slice.collected,
      raised: figures.raised,
      won: figures.won,
      conversion: figures.conversion,
      people: [toPersonRow(person)],
      products: [],
      categories: [],
    };
  }

  const figures = reportFigures(leaderboard);
  return {
    period: leaderboard.period,
    generatedAt,
    person: null,
    invoiced: money(leaderboard.invoiced),
    collected: money(leaderboard.collected),
    raised: figures.raised,
    won: figures.won,
    conversion: figures.conversion,
    people: leaderboard.people.map(toPersonRow),
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
  personId?: string | null,
): Promise<{ ok: true; bytes: Buffer } | { ok: false; error: string }> {
  try {
    const bytes = await renderReportPdf(toReportPdfInput(leaderboard, conversion, generatedAt, personId));
    return { ok: true, bytes };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'unknown error';
    return { ok: false, error: `Could not render the PDF: ${detail}` };
  }
}
