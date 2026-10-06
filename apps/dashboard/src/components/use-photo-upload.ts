'use client';

import { startTransition, useCallback, useState, type FormEvent } from 'react';
import type { UploadArea } from '@beco/validation';
import { toast } from '@beco/ui';
import { createPhotoUpload } from '@/app/(app)/uploads/actions';
import { stagePhoto, type PresignPhoto } from '@/lib/direct-upload';

export type PhotoUploadPhase = 'idle' | 'uploading' | 'processing';

/**
 * Wires a photograph form to the direct upload path. D116. The form keeps its
 * fields and its `useActionState` dispatch, this only intercepts submit: the
 * file goes straight to R2, then the form data goes to the action with an
 * `uploadKey` in place of the file. `phase` and `progress` drive the button
 * label, so a 6MB upload on 4G shows movement rather than a frozen word.
 */
export function usePhotoUpload({
  area,
  field,
  dispatch,
  presign = createPhotoUpload,
}: {
  area: UploadArea;
  field: string;
  dispatch: (form: FormData) => void;
  presign?: PresignPhoto;
}) {
  const [phase, setPhase] = useState<PhotoUploadPhase>('idle');
  const [progress, setProgress] = useState(0);

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const file = form.get(field);
      setPhase('uploading');
      setProgress(0);
      const staged = await stagePhoto(file, area, presign, setProgress);
      if (staged.kind === 'error') {
        setPhase('idle');
        toast.error(staged.error);
        return;
      }
      if (staged.kind === 'staged') {
        form.delete(field);
        form.set('uploadKey', staged.key);
      }
      setPhase('processing');
      startTransition(() => dispatch(form));
    },
    [area, field, dispatch, presign],
  );

  /** Call when the action has answered, so the button returns to rest. */
  const settle = useCallback(() => setPhase('idle'), []);

  const label =
    phase === 'uploading' ? `Uploading ${Math.round(progress * 100)}%` : phase === 'processing' ? 'Processing' : null;

  return { onSubmit, phase, progress, label, settle };
}
