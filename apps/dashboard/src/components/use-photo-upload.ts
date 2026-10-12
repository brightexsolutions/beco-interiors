'use client';

import { startTransition, useCallback, useState, type FormEvent } from 'react';
import type { UploadArea } from '@beco/validation';
import { toast } from '@beco/ui';
import { createPhotoUpload } from '@/app/(app)/uploads/actions';
import { stagePhoto, type PresignPhoto } from '@/lib/direct-upload';
import { photoInputProblem, prepareImage, type PreparedImage } from '@/lib/image-prepare';

export type PhotoUploadPhase = 'idle' | 'preparing' | 'uploading' | 'processing';

export type PreparePhoto = (file: File, onPhase?: (phase: 'decoding' | 'resizing') => void) => Promise<PreparedImage>;

const defaultPrepare: PreparePhoto = (file, onPhase) => prepareImage(file, onPhase ? { onPhase } : {});

/**
 * Wires a photograph form to the direct upload path. D116, D139. The form
 * keeps its fields and its `useActionState` dispatch, this only intercepts
 * submit: the file is made small in the browser (HEIC decoded, long edge
 * capped, JPEG), goes straight to R2, then the form data goes to the action
 * with an `uploadKey` in place of the file. `phase` and `progress` drive the
 * button label, so a 6MB upload on 4G shows movement rather than a frozen
 * word, and the person is told what is happening at every step.
 */
export function usePhotoUpload({
  area,
  field,
  dispatch,
  presign = createPhotoUpload,
  prepare = defaultPrepare,
}: {
  area: UploadArea;
  field: string;
  dispatch: (form: FormData) => void;
  presign?: PresignPhoto;
  prepare?: PreparePhoto;
}) {
  const [phase, setPhase] = useState<PhotoUploadPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [detail, setDetail] = useState<string | null>(null);

  const onSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const raw = form.get(field);
      const problem = photoInputProblem(raw);
      if (problem || !(raw instanceof File)) {
        toast.error(problem ?? 'Choose a photograph first.');
        return;
      }
      setPhase('preparing');
      setDetail(null);
      setProgress(0);
      let file: File;
      try {
        const prepared = await prepare(raw, (step) => setDetail(step === 'decoding' ? 'Reading the photo' : 'Resizing'));
        file = prepared.file;
      } catch (error) {
        setPhase('idle');
        toast.error(error instanceof Error ? error.message : 'Could not read that photograph.');
        return;
      }
      setPhase('uploading');
      setDetail(null);
      const staged = await stagePhoto(file, area, presign, setProgress);
      if (staged.kind === 'error') {
        setPhase('idle');
        toast.error(staged.error);
        return;
      }
      if (staged.kind === 'staged') {
        form.delete(field);
        form.set('uploadKey', staged.key);
      } else {
        // Fallback: the prepared file travels in the form post instead.
        form.set(field, file);
      }
      setPhase('processing');
      startTransition(() => dispatch(form));
    },
    [area, field, dispatch, presign, prepare],
  );

  /** Call when the action has answered, so the button returns to rest. */
  const settle = useCallback(() => setPhase('idle'), []);

  const label =
    phase === 'preparing'
      ? (detail ?? 'Preparing')
      : phase === 'uploading'
        ? `Uploading ${Math.round(progress * 100)}%`
        : phase === 'processing'
          ? 'Processing'
          : null;

  return { onSubmit, phase, progress, label, settle };
}
