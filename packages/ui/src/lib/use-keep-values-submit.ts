'use client';

import { useCallback, useTransition, type FormEvent } from 'react';

/**
 * Submit a form to an action without React clearing it afterwards.
 *
 * `<form action={fn}>` resets every uncontrolled field once the action
 * settles, whatever it returned. On a refused save that wipes what someone
 * just typed, so fixing one bad field means retyping the whole form. This
 * hands the same FormData, submitter included, to the dispatcher inside a
 * transition, so `useActionState`'s pending flag still works and the fields
 * keep their values. Native `required` and pattern checks still run first,
 * because `submit` only fires once the form is valid.
 *
 * A form that should empty itself after a successful add calls
 * `form.reset()` itself, on the success state.
 */
export function useKeepValuesSubmit(dispatch: (payload: FormData) => void) {
  const [, startTransition] = useTransition();
  return useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const submitter = (event.nativeEvent as SubmitEvent).submitter ?? null;
      let payload: FormData;
      try {
        payload = new FormData(form, submitter);
      } catch {
        // A submitter from another form, or an engine without the second
        // argument: the fields are what matters.
        payload = new FormData(form);
        if (submitter instanceof HTMLButtonElement && submitter.name) {
          payload.append(submitter.name, submitter.value);
        }
      }
      startTransition(() => dispatch(payload));
    },
    [dispatch],
  );
}
