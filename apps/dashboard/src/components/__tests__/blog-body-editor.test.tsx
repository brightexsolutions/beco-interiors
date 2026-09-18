import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'vitest-axe';
import { Field } from '@beco/ui';
import { BlogBodyEditor } from '../blog-body-editor';

function Harness({ initial = 'stone' }: { initial?: string }) {
  const [body, setBody] = useState(initial);
  return (
    <Field label="Body" htmlFor="blog-body">
      <BlogBodyEditor id="blog-body" name="body" value={body} onChange={setBody} />
    </Field>
  );
}

describe('BlogBodyEditor', () => {
  it('wraps the current selection in bold', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const area = screen.getByLabelText('Body');
    area.focus();
    area.setSelectionRange(0, 5);
    await user.click(screen.getByRole('button', { name: 'Bold' }));
    expect(area).toHaveValue('**stone**');
  });

  it('inserts a markdown link from a Dialog, never a browser prompt', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const area = screen.getByLabelText('Body');
    area.focus();
    area.setSelectionRange(0, 5);
    await user.click(screen.getByRole('button', { name: 'Link' }));
    await user.clear(screen.getByLabelText('URL'));
    await user.type(screen.getByLabelText('URL'), 'https://www.beco.co.ke');
    await user.click(screen.getByRole('button', { name: 'Insert link' }));
    expect(area).toHaveValue('[stone](https://www.beco.co.ke)');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Harness />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
