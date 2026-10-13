import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { PageUrl } from '../page-url';

describe('PageUrl', () => {
  it('shows the address read only, says it is made from the name, and posts it under slug', () => {
    const { container } = render(
      <form>
        <PageUrl prefix="/product" slug="calacatta-gold" />
      </form>,
    );
    expect(screen.getByText('calacatta-gold')).toBeInTheDocument();
    expect(screen.getByText('Made from the name')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    const hidden = container.querySelector('input[name="slug"]') as HTMLInputElement;
    expect(hidden.type).toBe('hidden');
    expect(hidden.value).toBe('calacatta-gold');
  });

  it('says the address will move when the name has changed', () => {
    render(<PageUrl prefix="/shop" slug="handles" renamed />);
    expect(screen.getByText(/Changes with the new name on Save/)).toBeInTheDocument();
  });

  it('holds the place before a name is typed', () => {
    render(<PageUrl prefix="/product" slug="" />);
    expect(screen.getByText('your product name')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<PageUrl prefix="/product" slug="calacatta-gold" />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
