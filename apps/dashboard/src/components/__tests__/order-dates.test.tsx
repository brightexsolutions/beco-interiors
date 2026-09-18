import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { OrderDates } from '../order-dates';

const raised = '2026-09-18T07:00:00.000Z';

describe('OrderDates', () => {
  it('shows only Raised when nothing else has happened', () => {
    render(
      <OrderDates
        createdAt={raised}
        confirmedAt={null}
        paidAt={null}
        fulfilledAt={null}
        cancelledAt={null}
      />,
    );
    expect(screen.getByText('Raised')).toBeInTheDocument();
    expect(screen.queryByText('Confirmed')).toBeNull();
    expect(screen.queryByText('Paid')).toBeNull();
  });

  it('lists paid without implying the order is fulfilled', () => {
    render(
      <OrderDates
        createdAt={raised}
        confirmedAt="2026-09-18T08:00:00.000Z"
        paidAt="2026-09-18T09:00:00.000Z"
        fulfilledAt={null}
        cancelledAt={null}
      />,
    );
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.queryByText('Fulfilled')).toBeNull();
  });

  it('is axe clean', async () => {
    const { container } = render(
      <OrderDates
        createdAt={raised}
        confirmedAt={raised}
        paidAt={null}
        fulfilledAt={null}
        cancelledAt={null}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
