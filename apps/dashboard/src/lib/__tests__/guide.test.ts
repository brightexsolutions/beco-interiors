import { describe, expect, it } from 'vitest';
import { GUIDE_TOPICS, currentGuideTopic, guideTopicsFor } from '../guide';
import { ROUTE_RULES, canAccess } from '../access';

describe('the guide, D140', () => {
  it('covers every section in the route map that a grant can open, and the home screen', () => {
    const covered = new Set(GUIDE_TOPICS.map((topic) => topic.path.split('?')[0]));
    for (const rule of ROUTE_RULES) {
      // Leaderboard is an alias that redirects into Reports.
      if (!rule.module || rule.prefix === '/leaderboard') continue;
      expect(covered.has(rule.prefix), `${rule.prefix} has no guide topic`).toBe(true);
    }
    expect(covered.has('/')).toBe(true);
  });

  it('writes every step as a thing to do and where, with no em dashes', () => {
    for (const topic of GUIDE_TOPICS) {
      expect(topic.purpose.length).toBeGreaterThan(20);
      expect(topic.steps.length).toBeGreaterThan(0);
      for (const step of topic.steps) {
        expect(step.do.length).toBeGreaterThan(3);
        expect(step.where.length).toBeGreaterThan(10);
        expect(`${step.do}${step.where}`).not.toContain(String.fromCharCode(8212));
      }
    }
  });

  it('lists only the screens a role can reach, the current one first', () => {
    const sales = guideTopicsFor('beco_sales', {}, '/orders/BEC-O-00012');
    expect(sales[0]?.id).toBe('orders');
    expect(sales.map((topic) => topic.id)).not.toContain('users');
    expect(sales.map((topic) => topic.id)).not.toContain('reports');
    expect(sales.map((topic) => topic.id)).not.toContain('products');
    for (const topic of sales) expect(canAccess('beco_sales', topic.path.split('?')[0]!)).toBe(true);

    const granted = guideTopicsFor('beco_sales', { modules: ['reports'] }, '/reports');
    expect(granted[0]?.id).toBe('reports');

    const pm = guideTopicsFor('beco_product_manager', {}, '/products?edit=x');
    expect(pm[0]?.id).toBe('products');
    expect(pm.map((topic) => topic.id)).toContain('photos');
  });

  it('picks the most specific topic for a path', () => {
    expect(currentGuideTopic('/quotes/new')?.id).toBe('new-quote');
    expect(currentGuideTopic('/quotes/BEC-Q-00001')?.id).toBe('quotes');
    expect(currentGuideTopic('/')?.id).toBe('overview');
    expect(currentGuideTopic('/change-password')).toBeNull();
  });
});
