import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Panel } from '../panel';

describe('Panel', () => {
  it('groups a titled surface with its action', () => {
    render(
      <Panel title="Items" action={<button type="button">Custom item</button>}>
        <p>No items yet</p>
      </Panel>,
    );
    expect(screen.getByText('Items')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Custom item' })).toBeInTheDocument();
    expect(screen.getByText('No items yet')).toBeInTheDocument();
  });

  it('renders children without chrome when no title or action is given', () => {
    const { container } = render(
      <Panel>
        <p>Body only</p>
      </Panel>,
    );
    expect(container.querySelector('header')).toBeNull();
    expect(screen.getByText('Body only')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <Panel title="Customer">
        <label htmlFor="name">
          Name
          <input id="name" />
        </label>
      </Panel>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
