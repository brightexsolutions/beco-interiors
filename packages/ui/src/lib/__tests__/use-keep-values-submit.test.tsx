import { describe, expect, it, vi } from 'vitest';
import { useActionState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useKeepValuesSubmit } from '../use-keep-values-submit';

type State = { error?: string; ok?: string };

function Harness({ action }: { action: (prev: State, form: FormData) => Promise<State> }) {
  const [state, dispatch, pending] = useActionState(action, {});
  const onSubmit = useKeepValuesSubmit(dispatch);
  return (
    <form onSubmit={onSubmit}>
      <label htmlFor="name">Name</label>
      <input id="name" name="name" required />
      <button type="submit" name="intent" value="save" disabled={pending}>
        {pending ? 'Saving' : 'Save'}
      </button>
      {state.error ? <p role="alert">{state.error}</p> : null}
      {state.ok ? <p role="status">{state.ok}</p> : null}
    </form>
  );
}

describe('useKeepValuesSubmit', () => {
  it('keeps what was typed when the action refuses it', async () => {
    const action = vi.fn(async () => ({ error: 'That name is taken.' }));
    const user = userEvent.setup();
    render(<Harness action={action} />);
    await user.type(screen.getByLabelText('Name'), 'Nero Marquina');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('That name is taken.');
    expect(screen.getByLabelText('Name')).toHaveValue('Nero Marquina');
  });

  it('hands the action the fields and the button that submitted', async () => {
    const action = vi.fn(async (_prev: State, _form: FormData) => ({ ok: 'Saved.' }));
    const user = userEvent.setup();
    render(<Harness action={action} />);
    await user.type(screen.getByLabelText('Name'), 'Calacatta');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await screen.findByRole('status');
    const form = action.mock.calls[0]![1];
    expect(form.get('name')).toBe('Calacatta');
    expect(form.get('intent')).toBe('save');
  });

  it('reports pending while the action runs', async () => {
    let finish: (value: State) => void = () => {};
    const action = vi.fn(() => new Promise<State>((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    render(<Harness action={action} />);
    await user.type(screen.getByLabelText('Name'), 'Onyx');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('button', { name: 'Saving' })).toBeDisabled();
    finish({ ok: 'Saved.' });
    expect(await screen.findByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('does not call the action while a required field is empty', async () => {
    const action = vi.fn(async () => ({}));
    const user = userEvent.setup();
    render(<Harness action={action} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(action).not.toHaveBeenCalled();
  });
});
