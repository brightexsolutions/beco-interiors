import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { FormSection } from '../form-section';

describe('FormSection', () => {
  it('names the group and keeps the hint as supporting copy, not a second heading', () => {
    render(
      <FormSection title="Photographs" hint="First shot is the shop card.">
        <label htmlFor="photo">Photograph</label>
        <input id="photo" type="file" />
      </FormSection>,
    );
    expect(screen.getByRole('heading', { name: 'Photographs' })).toBeInTheDocument();
    expect(screen.getByText('First shot is the shop card.')).toBeInTheDocument();
    expect(screen.getByLabelText('Photograph')).toHaveAttribute('type', 'file');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <FormSection title="Availability">
        <p>In stock</p>
      </FormSection>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
