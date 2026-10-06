'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, FormSection, Input, Select, Textarea, useActionToast, useKeepValuesSubmit } from '@beco/ui';
import {
  createAnnouncement,
  updateAnnouncement,
  type AnnouncementActionState,
} from '@/app/(app)/announcements/actions';
import {
  ANNOUNCEMENT_TYPE_LABEL,
  ANNOUNCEMENT_TYPE_VALUES,
  toDatetimeLocalValue,
  type StaffAnnouncement,
} from '@/lib/announcements';
import type { AnnouncementType } from '@beco/types';

import { AnnouncementPreview } from './announcement-preview';

const INITIAL: AnnouncementActionState = {};

export function AnnouncementEditor({
  announcement,
}: {
  announcement: StaffAnnouncement | null;
}) {
  const router = useRouter();
  const save = announcement ? updateAnnouncement : createAnnouncement;
  const [state, submit, pending] = useActionState(save, INITIAL);
  const onSubmitSubmit = useKeepValuesSubmit(submit);
  const [title, setTitle] = useState(announcement?.title ?? '');
  const [body, setBody] = useState(announcement?.body ?? '');
  const [type, setType] = useState<AnnouncementType>(announcement?.type ?? 'notice');
  const [ctaLabel, setCtaLabel] = useState(announcement?.ctaLabel ?? '');
  useActionToast(state);

  useEffect(() => {
    if (state.announcementId) router.replace(`/announcements?edit=${state.announcementId}`);
  }, [state.announcementId, router]);

  return (
    <form onSubmit={onSubmitSubmit} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      {announcement ? <input type="hidden" name="announcementId" value={announcement.id} /> : null}
      <div className="min-h-0 min-w-0 flex-1 space-y-8 overflow-x-hidden overflow-y-auto px-5 py-5">
        <FormSection title="Copy">
          <Field label="Title" htmlFor="announcement-title">
            <Input
              id="announcement-title"
              name="title"
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <Field label="Body" htmlFor="announcement-body" hint="Optional">
            <Textarea
              id="announcement-body"
              name="body"
              rows={3}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </Field>
          <Field label="Type" htmlFor="announcement-type">
            <Select
              id="announcement-type"
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value as AnnouncementType)}
            >
              {ANNOUNCEMENT_TYPE_VALUES.map((value) => (
                <option key={value} value={value}>
                  {ANNOUNCEMENT_TYPE_LABEL[value]}
                </option>
              ))}
            </Select>
          </Field>
        </FormSection>

        <FormSection title="Schedule" hint="Nairobi time. A live row appears and retires on its own.">
          <Field label="Starts" htmlFor="announcement-starts">
            <Input
              id="announcement-starts"
              name="startsAt"
              type="datetime-local"
              required
              defaultValue={announcement ? toDatetimeLocalValue(announcement.startsAt) : toDatetimeLocalValue(new Date().toISOString())}
            />
          </Field>
          <Field label="Ends" htmlFor="announcement-ends">
            <Input
              id="announcement-ends"
              name="endsAt"
              type="datetime-local"
              required
              defaultValue={
                announcement
                  ? toDatetimeLocalValue(announcement.endsAt)
                  : toDatetimeLocalValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
              }
            />
          </Field>
          <Field label="Priority" htmlFor="announcement-priority" hint="Higher first">
            <Input
              id="announcement-priority"
              name="priority"
              type="number"
              min={0}
              max={100}
              defaultValue={announcement?.priority ?? 0}
            />
          </Field>
          <label className="flex min-h-11 items-center gap-3 font-ui text-base text-charcoal">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={announcement?.isActive ?? true}
              className="h-5 w-5 rounded-control border-neutral-300"
            />
            Active
          </label>
        </FormSection>

        <FormSection title="Call to action" hint="Optional. Both fields together, or neither.">
          <Field label="Label" htmlFor="announcement-cta-label">
            <Input
              id="announcement-cta-label"
              name="ctaLabel"
              value={ctaLabel}
              onChange={(event) => setCtaLabel(event.target.value)}
            />
          </Field>
          <Field label="URL" htmlFor="announcement-cta-url">
            <Input
              id="announcement-cta-url"
              name="ctaUrl"
              defaultValue={announcement?.ctaUrl ?? ''}
              placeholder="/shop"
            />
          </Field>
        </FormSection>

        <FormSection title="Preview" hint="How the bar reads. Clearance is the Warm Red pass.">
          <AnnouncementPreview title={title} body={body} type={type} ctaLabel={ctaLabel} />
        </FormSection>
      </div>
      <div className="shrink-0 border-t border-neutral-200 px-5 py-3">
        <Button type="submit" pending={pending}>
          {pending ? 'Saving' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
