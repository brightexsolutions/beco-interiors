import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { QuoteDates } from '../quote-dates';

const raised = '2026-09-16T13:28:00.000Z';

describe('QuoteDates', () => {
  it('shows only Raised when nothing else has happened', () => {
    render(
      <QuoteDates
        createdAt={raised}
        reviewingAt={null}
        quotedAt={null}
        approvedAt={null}
        wonAt={null}
        lostAt={null}
        reopenedAt={null}
        validUntil={null}
      />,
    );
    expect(screen.getByText('Raised')).toBeInTheDocument();
    expect(screen.queryByText('Reviewed')).toBeNull();
    expect(screen.queryByText('Lost')).toBeNull();
  });

  it('keeps Lost and Reopened after the client comes back', () => {
    render(
      <QuoteDates
        createdAt={raised}
        reviewingAt="2026-09-16T14:00:00.000Z"
        quotedAt="2026-09-16T15:00:00.000Z"
        approvedAt={null}
        wonAt={null}
        lostAt="2026-09-17T10:00:00.000Z"
        reopenedAt="2026-09-17T17:40:00.000Z"
        validUntil="2026-10-07"
      />,
    );
    expect(screen.getByText('Reviewed')).toBeInTheDocument();
    expect(screen.getByText('Quoted')).toBeInTheDocument();
    expect(screen.getByText('Valid until')).toBeInTheDocument();
    expect(screen.getByText('Lost')).toBeInTheDocument();
    expect(screen.getByText('Reopened')).toBeInTheDocument();
  });

  it('is axe clean', async () => {
    const { container } = render(
      <QuoteDates
        createdAt={raised}
        reviewingAt={raised}
        quotedAt={null}
        approvedAt={null}
        wonAt={null}
        lostAt={null}
        reopenedAt={null}
        validUntil={null}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
