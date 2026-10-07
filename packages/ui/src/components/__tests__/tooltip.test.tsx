import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { Button } from '../button';
import { Tooltip } from '../tooltip';

const TIP = 'Shows this product on the website. You can unpublish it any time.';

const setup = (onClick = vi.fn()) => {
  render(
    <div>
      <Tooltip content={TIP} infoLabel="About Publish">
        <Button onClick={onClick}>Publish</Button>
      </Tooltip>
      <button type="button">Elsewhere</button>
    </div>,
  );
  return { onClick, control: screen.getByRole('button', { name: 'Publish' }) };
};

describe('Tooltip', () => {
  it('describes the control to a screen reader without replacing its name', () => {
    const { control } = setup();
    expect(control).toHaveAccessibleName('Publish');
    expect(control).toHaveAccessibleDescription(TIP);
  });

  it('keeps an existing description and adds its own', () => {
    render(
      <>
        <p id="other">No photo yet</p>
        <Tooltip content={TIP} infoLabel="About Publish">
          <button type="button" aria-describedby="other">
            Publish
          </button>
        </Tooltip>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Publish' })).toHaveAccessibleDescription(`No photo yet ${TIP}`);
  });

  it('is hidden until asked for', () => {
    setup();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('appears on keyboard focus and goes on blur', async () => {
    const user = userEvent.setup();
    setup();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Publish' })).toHaveFocus();
    expect(screen.getByRole('tooltip')).toHaveTextContent(TIP);
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('appears on mouse hover and goes when the mouse leaves', () => {
    const { control } = setup();
    fireEvent.pointerEnter(control, { pointerType: 'mouse' });
    expect(screen.getByRole('tooltip')).toBeVisible();
    fireEvent.pointerLeave(control, { pointerType: 'mouse' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('ignores a touch pointer, so a tap on the control does not leave it stuck open', () => {
    const { control } = setup();
    fireEvent.pointerEnter(control, { pointerType: 'touch' });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('opens and closes from the info button, which is how a phone reaches it', async () => {
    const user = userEvent.setup();
    setup();
    const info = screen.getByRole('button', { name: 'About Publish' });
    expect(info).toHaveAttribute('aria-expanded', 'false');
    // A finger, not a mouse: no hover state to hold the tip open.
    await user.pointer({ keys: '[TouchA]', target: info });
    expect(info).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('tooltip')).toHaveTextContent(TIP);
    await user.pointer({ keys: '[TouchA]', target: info });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('closes a tapped tip on a tap anywhere else', async () => {
    const user = userEvent.setup();
    setup();
    await user.pointer({ keys: '[TouchA]', target: screen.getByRole('button', { name: 'About Publish' }) });
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.pointer({ keys: '[TouchA]', target: screen.getByRole('button', { name: 'Elsewhere' }) });
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('closes on Escape without moving focus', async () => {
    const user = userEvent.setup();
    setup();
    await user.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toHaveFocus();
  });

  it('lines the tip up with the right edge when asked, for a control at the end of its row', () => {
    render(
      <Tooltip content={TIP} infoLabel="About Publish" align="end">
        <Button>Publish</Button>
      </Tooltip>,
    );
    const tip = document.querySelector('[role="tooltip"]');
    expect(tip).toHaveClass('right-0');
    expect(tip).not.toHaveClass('left-0');
  });

  it('leaves the control working', async () => {
    const user = userEvent.setup();
    const { onClick, control } = setup();
    await user.click(control);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations, open or closed', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Tooltip content={TIP} infoLabel="About Publish">
        <Button>Publish</Button>
      </Tooltip>,
    );
    expect(await axe(container)).toHaveNoViolations();
    await user.click(screen.getByRole('button', { name: 'About Publish' }));
    expect(await axe(container)).toHaveNoViolations();
  });
});
