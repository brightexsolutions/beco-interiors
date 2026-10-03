'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Field, FormSection, Input, Select, useActionToast, useKeepValuesSubmit } from '@beco/ui';
import { slugifyCategoryName } from '@beco/validation';
import { createCategory, type CategoryActionState } from '@/app/(app)/categories/actions';
import type { CategoryParentOption } from '@/lib/categories';

const INITIAL: CategoryActionState = {};

export function CategoryCreate({
  groupOptions,
  returnTo,
}: {
  groupOptions: CategoryParentOption[];
  returnTo: string;
}) {
  const router = useRouter();
  const [state, create, pending] = useActionState(createCategory, INITIAL);
  const onCreateSubmit = useKeepValuesSubmit(create);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  useActionToast(state);

  useEffect(() => {
    if (state.slug) router.replace(`/categories?edit=${state.slug}`);
  }, [state.slug, router]);

  return (
    <form onSubmit={onCreateSubmit} className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="min-h-0 min-w-0 flex-1 space-y-8 overflow-x-hidden overflow-y-auto px-5 py-5">
        <FormSection
          title="Name"
          hint="A major category sits at the top of the shop, like Sintered Stone or Handles. A range sits under one, like 12mm Sintered Stones. A sub range sits under a range, like Black Handles under Handles, and each level can hold priced products."
        >
          <Field label="Name" htmlFor="new-cat-name">
            <Input
              id="new-cat-name"
              name="name"
              required
              value={name}
              onChange={(event) => {
                const next = event.target.value;
                setName(next);
                if (!slugTouched) setSlug(slugifyCategoryName(next));
              }}
            />
          </Field>
          <Field label="Page URL" htmlFor="new-cat-slug" hint="Auto from the name until you edit it">
            <Input
              id="new-cat-slug"
              name="slug"
              required
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
            />
          </Field>
          <Field label="File under" htmlFor="new-cat-parent" hint="Leave as Major category to create one, or pick the category or range this sits under">
            <Select id="new-cat-parent" name="parentId" defaultValue="">
              <option value="">Major category</option>
              {groupOptions.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </Select>
          </Field>
        </FormSection>
      </div>
      <div className="flex shrink-0 justify-end gap-3 border-t border-neutral-200 bg-high-vis-white px-5 py-3">
        <Button type="button" variant="ghost" onClick={() => router.push(returnTo)}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? 'Creating…' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
