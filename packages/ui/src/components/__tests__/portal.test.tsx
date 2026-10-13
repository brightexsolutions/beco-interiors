import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Portal } from '../portal';

describe('Portal', () => {
  it('renders its children on the body, outside the component that drew it', () => {
    const { container } = render(
      <div data-testid="parent">
        <Portal>
          <p>Layer</p>
        </Portal>
      </div>,
    );
    const layer = screen.getByText('Layer');
    expect(container.contains(layer)).toBe(false);
    expect(layer.parentElement).toBe(document.body);
  });
});
