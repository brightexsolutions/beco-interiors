import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs';

function Views() {
  return (
    <Tabs defaultValue="sales">
      <TabsList aria-label="Report views">
        <TabsTrigger value="sales">Sales</TabsTrigger>
        <TabsTrigger value="products">Products</TabsTrigger>
        <TabsTrigger value="categories">Categories</TabsTrigger>
      </TabsList>
      <TabsContent value="sales">Leaderboard</TabsContent>
      <TabsContent value="products">Product funnel</TabsContent>
      <TabsContent value="categories">Category funnel</TabsContent>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('shows the default panel, and a click reveals the named view', async () => {
    const user = userEvent.setup();
    render(<Views />);
    expect(screen.getByText('Leaderboard')).toBeVisible();
    expect(screen.queryByText('Product funnel')).toBeNull();

    await user.click(screen.getByRole('tab', { name: 'Products' }));
    expect(screen.getByText('Product funnel')).toBeVisible();
    expect(screen.queryByText('Leaderboard')).toBeNull();
  });

  it('keeps inactive forceMounted panels hidden', async () => {
    const user = userEvent.setup();
    render(
      <Tabs defaultValue="sales">
        <TabsList aria-label="Report views">
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>
        <TabsContent value="sales" forceMount>
          Leaderboard
        </TabsContent>
        <TabsContent value="products" forceMount>
          Product funnel
        </TabsContent>
      </Tabs>,
    );
    expect(screen.getByText('Leaderboard')).toBeVisible();
    expect(screen.getByText('Product funnel').closest('[role="tabpanel"]')).toHaveAttribute(
      'data-state',
      'inactive',
    );
    await user.click(screen.getByRole('tab', { name: 'Products' }));
    expect(screen.getByText('Product funnel').closest('[role="tabpanel"]')).toHaveAttribute(
      'data-state',
      'active',
    );
    expect(screen.getByText('Leaderboard').closest('[role="tabpanel"]')).toHaveAttribute(
      'data-state',
      'inactive',
    );
  });

  it('the active tab is charcoal, not a muted shadcn pill', () => {
    render(<Views />);
    const sales = screen.getByRole('tab', { name: 'Sales' });
    expect(sales.className).toContain('data-[state=active]:border-charcoal');
    expect(sales.className).toContain('min-h-11');
    expect(sales.className).not.toContain('rounded-md');
    expect(screen.getByRole('tablist').className).not.toContain('bg-muted');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Views />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
