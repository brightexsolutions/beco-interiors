import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Icon, type IconName } from '../icon';

const names: IconName[] = [
  'plus',
  'minus',
  'pencil',
  'arrow-right',
  'chevron-up',
  'chevron-down',
  'upload',
  'photo',
  'x',
  'trash',
];

describe('Icon', () => {
  it('is decorative: hidden from the accessibility tree', () => {
    const { container } = render(<Icon name="pencil" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden');
    expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
  });

  it.each(names)('draws a path for %s', (name) => {
    const { container } = render(<Icon name={name} />);
    expect(container.querySelector('path')).toHaveAttribute('d');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <button type="button">
        <Icon name="pencil" />
        Edit
      </button>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
