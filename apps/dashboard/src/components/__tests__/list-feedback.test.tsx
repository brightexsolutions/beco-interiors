import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import type { AnnouncementType } from '@beco/types';
import type { AuditRow } from '@/lib/audit';
import type { StaffAnnouncement } from '@/lib/announcements';
import type { StaffBlogPost } from '@/lib/blog';
import type { OrderListItem } from '@/lib/orders';
import type { QuoteListItem } from '@/lib/quotes';
import type { ConversionReport, LeaderboardReport } from '@/lib/reports';
import type { StaffUser } from '@/lib/users';

/**
 * Every filtered list as its page composes it: the filter row and the results
 * under one QueryNavigationProvider. The router's push returns a promise this
 * test resolves by hand, which holds the transition open the way a slow
 * server render does, so the state in between can be asserted: the results
 * dim with aria-busy and the filter row says Updating, until the rows land.
 * Before the provider, the filter row knew and the list did not. D117.
 */
let resolveNavigation: () => void = () => {};
const push = vi.fn(
  () =>
    new Promise<void>((resolve) => {
      resolveNavigation = resolve;
    }),
);
let pathname = '/quotes';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn() }),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/components/user-editor', () => ({ UserEditor: () => null }));
vi.mock('@/components/user-create', () => ({ UserCreate: () => null }));
vi.mock('@/components/announcement-editor', () => ({ AnnouncementEditor: () => null }));
vi.mock('@/components/pdf-preview', () => ({ PdfPreview: () => null }));

const { QueryNavigationProvider } = await import('@/lib/use-query-navigation');
const { QuoteFilters } = await import('../quote-filters');
const { QuoteResults } = await import('../quote-results');
const { OrderFilters } = await import('../order-filters');
const { OrderResults } = await import('../order-results');
const { UserFilters } = await import('../user-filters');
const { UserResults } = await import('../user-results');
const { AnnouncementFilters } = await import('../announcement-filters');
const { AnnouncementResults } = await import('../announcement-results');
const { BlogFilters } = await import('../blog-filters');
const { BlogResults } = await import('../blog-results');
const { AuditFilters } = await import('../audit-filters');
const { AuditResults } = await import('../audit-results');
const { ReportFilters } = await import('../report-filters');
const { ReportResults } = await import('../report-results');

const quote: QuoteListItem = {
  id: '11111111-1111-4111-8111-111111111111',
  referenceNumber: 'BEC-Q-00001',
  customerName: 'Njeri Kamau',
  customerPhone: '0711222333',
  status: 'new',
  source: 'web',
  createdAt: '2026-09-17T10:28:00.000Z',
  validUntil: null,
  requiresApproval: false,
  approvedAt: null,
  assignedTo: null,
  assignedToName: null,
  createdBy: null,
  createdByName: null,
  value: 30000,
  isPriced: true,
  itemCount: 2,
};

const order: OrderListItem = {
  id: '22222222-2222-4222-8222-222222222222',
  referenceNumber: 'BEC-O-00001',
  customerName: 'Njeri Kamau',
  customerPhone: '0711222333',
  status: 'pending',
  paymentStatus: 'unpaid',
  source: 'web',
  createdAt: '2026-09-18T10:28:00.000Z',
  paidAt: null,
  salespersonId: 'sales-1',
  salespersonName: 'Sam Odhiambo',
  quoteReference: 'BEC-Q-00001',
  value: 65000,
  isPriced: true,
  itemCount: 1,
};

const staff: StaffUser = {
  id: '33333333-3333-4333-8333-333333333333',
  email: 'sam.odhiambo@beco.co.ke',
  fullName: 'Sam Odhiambo',
  role: 'beco_sales',
  isActive: true,
  isPublic: false,
  publicTitle: null,
  publicPhone: null,
  publicPhoto: null,
  mustChangePassword: false,
  lastLoginAt: '2026-09-18T07:00:00.000Z',
  createdAt: '2026-09-01T07:00:00.000Z',
  updatedAt: '2026-09-18T07:00:00.000Z',
};

const announcement: StaffAnnouncement = {
  id: '44444444-4444-4444-8444-444444444444',
  title: 'Mid year sale',
  body: 'Selected slabs.',
  type: 'sale' as AnnouncementType,
  ctaLabel: 'Shop stone',
  ctaUrl: '/shop',
  startsAt: '2026-09-19T05:00:00.000Z',
  endsAt: '2026-09-30T15:00:00.000Z',
  priority: 2,
  isActive: true,
  createdBy: 'admin-1',
};

const post: StaffBlogPost = {
  id: '55555555-5555-4555-8555-555555555555',
  title: 'Sintered stone in Nairobi',
  slug: 'sintered-stone-nairobi',
  excerpt: null,
  body: 'Body.',
  coverImage: null,
  coverImageAlt: null,
  category: 'Materials',
  tags: [],
  metaTitle: null,
  metaDescription: null,
  targetTerm: null,
  readingTime: 4,
  status: 'draft',
  publishedAt: null,
  author: 'Irene Kariuki',
  generatedByModel: null,
  generationPrompt: null,
  updatedAt: '2026-09-18T08:00:00.000Z',
};

const auditRow: AuditRow = {
  id: '66666666-6666-4666-8666-666666666666',
  userId: 'u1',
  actor: 'Irene Kariuki',
  action: 'update',
  entityType: 'settings',
  entityId: null,
  before: { value: 0.16 },
  after: { value: 0.18 },
  createdAt: '2026-09-18T08:00:00.000Z',
};

const leaderboard: LeaderboardReport = {
  period: 'This month',
  invoiced: 100000,
  collected: 40000,
  people: [
    {
      id: 'd5c0ffee-0000-4000-8000-000000000002',
      full_name: 'Sam Odhiambo',
      raised: 4,
      won: 2,
      lost: 1,
      won_value: 80000,
      conversion: 66.7,
      orders: 1,
      order_value: 40000,
      invoiced: 40000,
      collected: 20000,
    },
  ],
};
const conversion: ConversionReport = { period: 'This month', products: [], categories: [] };

/** The phone list below xl: the rows, or the user table that stands for them. */
const phoneList = (container: HTMLElement) => container.querySelector('.xl\\:hidden[aria-busy], ul.xl\\:hidden, div.xl\\:hidden') as HTMLElement;

interface Case {
  name: string;
  path: string;
  screen: ReactNode;
  /** The control the reader changes, and the value they choose. */
  filter: string;
  value: string;
  pushed: string;
}

const cases: Case[] = [
  {
    name: 'Quotes',
    path: '/quotes',
    screen: (
      <>
        <QuoteFilters ownerOptions={[{ value: 'all', label: 'Everyone' }, { value: 'mine', label: 'Assigned to me' }]} count="1 quote" />
        <QuoteResults quotes={[quote]} />
      </>
    ),
    filter: 'Filter by status',
    value: 'won',
    pushed: '/quotes?status=won',
  },
  {
    name: 'Orders',
    path: '/orders',
    screen: (
      <>
        <OrderFilters ownerOptions={[{ value: 'all', label: 'Everyone' }]} count="1 order" />
        <OrderResults orders={[order]} />
      </>
    ),
    filter: 'Filter by payment',
    value: 'paid',
    pushed: '/orders?payment=paid',
  },
  {
    name: 'Users',
    path: '/users',
    screen: (
      <>
        <UserFilters count="1 user" />
        <UserResults users={[staff]} viewing={null} creating={false} viewerId="brightex-1" viewerRole="brightex_admin" />
      </>
    ),
    filter: 'Filter by status',
    value: 'inactive',
    pushed: '/users?status=inactive',
  },
  {
    name: 'Announcements',
    path: '/announcements',
    screen: (
      <>
        <AnnouncementFilters count="1 announcement" />
        <AnnouncementResults announcements={[announcement]} editing={null} creating={false} />
      </>
    ),
    filter: 'Filter by window',
    value: 'live',
    pushed: '/announcements?window=live',
  },
  {
    name: 'Blog',
    path: '/studio/blog',
    screen: (
      <>
        <BlogFilters count="1 article" />
        <BlogResults posts={[post]} />
      </>
    ),
    filter: 'Filter by status',
    value: 'published',
    pushed: '/studio/blog?status=published',
  },
  {
    name: 'Audit',
    path: '/audit',
    screen: (
      <>
        <AuditFilters count="1 event" />
        <AuditResults rows={[auditRow]} viewing={null} />
      </>
    ),
    filter: 'Filter by entity',
    value: 'quotes',
    pushed: '/audit?entity=quotes',
  },
];

beforeEach(() => {
  push.mockClear();
});

describe.each(cases)('$name: a filter change is seen in the results, not only in the filter row (D117)', (c) => {
  it('dims the phone list and the table with aria-busy and shows Updating until the navigation lands', async () => {
    pathname = c.path;
    const user = userEvent.setup();
    const { container } = render(<QueryNavigationProvider>{c.screen}</QueryNavigationProvider>);
    const table = () => container.querySelector('.xl\\:block .overflow-x-auto') as HTMLElement;
    expect(phoneList(container)).not.toHaveAttribute('aria-busy');
    expect(table()).not.toHaveAttribute('aria-busy');

    await user.selectOptions(screen.getByLabelText(c.filter), c.value);

    expect(push).toHaveBeenCalledWith(c.pushed);
    expect(phoneList(container)).toHaveAttribute('aria-busy', 'true');
    expect(phoneList(container)).toHaveClass('opacity-50');
    expect(table()).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Updating');

    await act(async () => resolveNavigation());
    await waitFor(() => expect(phoneList(container)).not.toHaveAttribute('aria-busy'));
    expect(table()).not.toHaveAttribute('aria-busy');
    expect(screen.queryByText('Updating')).toBeNull();
  });
});

describe('an empty result dims too, so a filter change from nothing still shows', () => {
  it('marks the empty state busy while the next filter loads', async () => {
    pathname = '/quotes';
    const user = userEvent.setup();
    render(
      <QueryNavigationProvider>
        <QuoteFilters ownerOptions={[{ value: 'all', label: 'Everyone' }]} count="0 quotes" />
        <QuoteResults quotes={[]} />
      </QueryNavigationProvider>,
    );
    const empty = screen.getByText('No quotes here').closest('[class*="transition-opacity"]') as HTMLElement;
    expect(empty).not.toHaveAttribute('aria-busy');
    await user.selectOptions(screen.getByLabelText('Filter by status'), 'new');
    expect(empty).toHaveAttribute('aria-busy', 'true');
    await act(async () => resolveNavigation());
    await waitFor(() => expect(empty).not.toHaveAttribute('aria-busy'));
  });
});

describe('Reports: a period change in the heading dims the figures below', () => {
  it('sets aria-busy on the report and Updating in the heading until the new period lands', async () => {
    pathname = '/reports';
    const user = userEvent.setup();
    render(
      <QueryNavigationProvider>
        <ReportFilters people={[]} />
        <ReportResults leaderboard={leaderboard} conversion={conversion} />
      </QueryNavigationProvider>,
    );
    const report = screen.getByTestId('report-results');
    expect(report).not.toHaveAttribute('aria-busy');

    await user.selectOptions(screen.getByLabelText('Filter by period'), 'last_month');

    expect(push).toHaveBeenCalledWith('/reports?period=last_month');
    expect(report).toHaveAttribute('aria-busy', 'true');
    expect(report).toHaveClass('opacity-50');
    expect(screen.getByRole('status')).toHaveTextContent('Updating');

    await act(async () => resolveNavigation());
    await waitFor(() => expect(report).not.toHaveAttribute('aria-busy'));
  });
});
