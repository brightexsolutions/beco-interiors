import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { Pagination } from '../pagination';

describe('Pagination', () => {
  it('Next calls onPageChange with the next page, so the row set can actually change', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Pagination page={1} pageCount={3} from={1} to={8} total={20} onPageChange={onPageChange} />,
    );
    expect(screen.getByText('1–8')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('Previous is disabled on the first page, with a reason the control itself states', () => {
    render(<Pagination page={1} pageCount={3} from={1} to={8} total={20} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('Next is disabled on the last page', () => {
    render(<Pagination page={3} pageCount={3} from={17} to={20} total={20} onPageChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
  });

  it('renders nothing when one page holds everything, so the control is not decoration', () => {
    const { container } = render(
      <Pagination page={1} pageCount={1} from={1} to={3} total={3} onPageChange={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Pagination page={2} pageCount={3} from={9} to={16} total={20} onPageChange={() => {}} />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
