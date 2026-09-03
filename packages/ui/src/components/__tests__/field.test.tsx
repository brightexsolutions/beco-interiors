import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Field, Input, Select, Textarea } from '../field';

/**
 * These replaced two hand written copies, so what is worth proving is the part
 * that differed between them: that the label actually reaches the control, and
 * that an error is announced rather than only coloured red.
 */
describe('Field', () => {
  it('ties the label to the control, so clicking the label focuses it', async () => {
    const user = userEvent.setup();
    render(
      <Field label="Phone number" htmlFor="phone">
        <Input id="phone" name="phone" />
      </Field>,
    );

    await user.click(screen.getByText('Phone number'));
    expect(screen.getByLabelText('Phone number')).toBe(document.activeElement);
  });

  it('announces an error rather than only colouring the border', () => {
    render(
      <Field label="Phone number" htmlFor="phone" error="Enter a phone number we can reach you on">
        <Input id="phone" />
      </Field>,
    );

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Enter a phone number we can reach you on');
    // The id is what aria-describedby on the control points at.
    expect(alert.getAttribute('id')).toBe('phone-error');
  });

  it('renders no alert at all when there is no error', () => {
    render(
      <Field label="Company" htmlFor="company" hint="Optional">
        <Input id="company" />
      </Field>,
    );

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Optional')).toBeDefined();
  });
});

describe('Input', () => {
  it('accepts typing and reports its value', async () => {
    const user = userEvent.setup();
    render(
      <Field label="Your name" htmlFor="name">
        <Input id="name" name="name" />
      </Field>,
    );

    const input = screen.getByLabelText('Your name') as HTMLInputElement;
    await user.type(input, 'Wanjiru');
    expect(input.value).toBe('Wanjiru');
  });

  it('carries aria-invalid through, so the error state is machine readable', () => {
    render(
      <Field label="Email" htmlFor="email" error="That does not look like an email">
        <Input id="email" aria-invalid aria-describedby="email-error" />
      </Field>,
    );

    expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe('true');
  });

  it('forwards a ref, so a form can focus the first field that failed', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Input ref={ref} aria-label="Ref target" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});

describe('Select', () => {
  it('changes value and reports the choice', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Field label="Sort" htmlFor="sort">
        <Select id="sort" defaultValue="name" onChange={onChange}>
          <option value="name">Name</option>
          <option value="price-asc">Price, low to high</option>
        </Select>
      </Field>,
    );

    const select = screen.getByLabelText('Sort') as HTMLSelectElement;
    await user.selectOptions(select, 'price-asc');
    expect(select.value).toBe('price-asc');
    expect(onChange).toHaveBeenCalled();
  });

  it('keeps the drawn chevron out of the click path', () => {
    // A chevron that eats the click makes the select look broken while being
    // perfectly functional, which is the hardest kind of bug to be told about.
    const { container } = render(
      <Select aria-label="Range">
        <option value="">All</option>
      </Select>,
    );
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('pointer-events-none');
  });

  it('renders option groups, which is how fifteen categories fit in one control', () => {
    render(
      <Select aria-label="Range" defaultValue="">
        <option value="">All ranges</option>
        <optgroup label="Hardware">
          <option value="handles">Handles</option>
        </optgroup>
      </Select>,
    );

    expect(screen.getByRole('group', { name: 'Hardware' })).toBeDefined();
  });
});

describe('Textarea', () => {
  it('accepts multi line input', async () => {
    const user = userEvent.setup();
    render(
      <Field label="Anything else?" htmlFor="details">
        <Textarea id="details" name="details" />
      </Field>,
    );

    const box = screen.getByLabelText('Anything else?') as HTMLTextAreaElement;
    await user.type(box, 'Two slabs{enter}and a splashback');
    expect(box.value).toBe('Two slabs\nand a splashback');
  });
});
