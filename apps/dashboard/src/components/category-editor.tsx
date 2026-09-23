'use client';

import { useActionState, useEffect, useState } from 'react';
import {
  Button,
  ConfirmDialog,
  Field,
  FormSection,
  Icon,
  Input,
  Select,
  StatusPill,
  Textarea,
  useActionToast,
} from '@beco/ui';
import { deleteCategory, updateCategory, type CategoryActionState } from '@/app/(app)/categories/actions';
import type { CategoryParentOption, CategoryRow } from '@/lib/categories';

const INITIAL: CategoryActionState = {};

export function CategoryEditor({
  category,
  groupOptions,
  onDeleted,
}: {
  category: CategoryRow;
  groupOptions: CategoryParentOption[];
  onDeleted?: () => void;
}) {
  const [saveState, save, saving] = useActionState(updateCategory, INITIAL);
  const [deleteState, remove, removing] = useActionState(deleteCategory, INITIAL);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [name, setName] = useState(category.name);
  const [published, setPublished] = useState(category.isPublished);
  useActionToast(saveState);
  useActionToast(deleteState);

  useEffect(() => {
    setName(category.name);
    setPublished(category.isPublished);
  }, [category.id, category.updatedAt, category.name, category.isPublished]);

  useEffect(() => {
    if (deleteState.ok) onDeleted?.();
  }, [deleteState.ok, onDeleted]);

  const busy = saving || removing;
  const isGroup = category.parentId == null;
  const blockedBy =
    category.childCount > 0
      ? `${category.childCount} ${category.childCount === 1 ? 'range' : 'ranges'} filed under it`
      : category.productCount > 0
        ? `${category.productCount} ${category.productCount === 1 ? 'product' : 'products'} in it`
        : null;

  return (
    <>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 min-w-0 flex-1 space-y-8 overflow-x-hidden overflow-y-auto px-5 py-5">
          <div className="min-w-0 border border-neutral-200 px-4 py-4">
            <p className="font-ui text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500">
              {isGroup ? 'Top level group' : 'Range'}
            </p>
            <p className="mt-2 font-ui text-lg font-semibold text-charcoal">{name.trim() || 'Unnamed range'}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {published ? (
                <StatusPill label="Published" tone="positive" />
              ) : (
                <StatusPill label="Draft" tone="muted" />
              )}
              <StatusPill
                label={`${category.productCount} ${category.productCount === 1 ? 'product' : 'products'}`}
                tone="muted"
              />
              {isGroup ? (
                <StatusPill
                  label={`${category.childCount} ${category.childCount === 1 ? 'range' : 'ranges'}`}
                  tone="muted"
                />
              ) : null}
            </div>
            <p className="mt-3 font-ui text-base text-neutral-500">
              {published ? 'Name and copy go live after Save.' : 'Hidden on the website until you publish.'}
            </p>
          </div>

          <form id="category-editor" action={save} className="grid min-w-0 gap-8">
            <input type="hidden" name="categoryId" value={category.id} />
            <input type="hidden" name="updatedAt" value={category.updatedAt} />

            <FormSection title="Name" hint="The name shoppers see and the URL the range lives at.">
              <Field label="Name" htmlFor="cat-name">
                <Input
                  id="cat-name"
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  className="min-w-0"
                />
              </Field>
              <Field label="Page URL" htmlFor="cat-slug" hint="Old URL redirects">
                <Input id="cat-slug" name="slug" defaultValue={category.slug} required className="min-w-0" />
              </Field>
              <Field
                label="File under"
                htmlFor="cat-parent"
                hint={
                  category.childCount > 0
                    ? 'This group has ranges under it, so it has to stay a top level group'
                    : 'Leave as Top level group to keep it above the shop'
                }
              >
                <Select
                  id="cat-parent"
                  name="parentId"
                  defaultValue={category.parentId ?? ''}
                  disabled={category.childCount > 0}
                >
                  <option value="">Top level group</option>
                  {groupOptions.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </FormSection>

            <FormSection title="Copy" hint="Shown on the range's own shop page.">
              <Field label="Description" htmlFor="cat-description">
                <Textarea
                  id="cat-description"
                  name="description"
                  rows={6}
                  defaultValue={category.description ?? ''}
                  className="min-w-0"
                />
              </Field>
            </FormSection>

            <FormSection title="Availability" hint="A draft range is hidden from the shop and the sitemap.">
              <label className="flex min-h-11 items-center gap-3 font-ui text-base text-charcoal">
                <input
                  type="checkbox"
                  name="isPublished"
                  checked={published}
                  onChange={(event) => setPublished(event.target.checked)}
                  className="h-5 w-5 rounded-[2px] border-neutral-300 text-charcoal"
                />
                Published on the website
              </label>
              <Field label="Sort order" htmlFor="cat-sort" hint="Lower shows first">
                <Input
                  id="cat-sort"
                  name="sortOrder"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={category.sortOrder}
                  className="min-w-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </Field>
            </FormSection>

            <FormSection title="Search" hint="Optional overrides. Blank uses the name and description.">
              <Field label="SEO title" htmlFor="cat-meta-title">
                <Input
                  id="cat-meta-title"
                  name="metaTitle"
                  defaultValue={category.metaTitle ?? ''}
                  maxLength={70}
                  className="min-w-0"
                />
              </Field>
              <Field label="SEO description" htmlFor="cat-meta-description">
                <Textarea
                  id="cat-meta-description"
                  name="metaDescription"
                  rows={3}
                  defaultValue={category.metaDescription ?? ''}
                  maxLength={180}
                  className="min-w-0"
                />
              </Field>
            </FormSection>
          </form>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-neutral-200 bg-high-vis-white px-5 py-3 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConfirmOpen(true)}
            disabled={busy || blockedBy != null}
            title={blockedBy ? `Cannot delete: ${blockedBy}` : undefined}
          >
            <Icon name="trash" />
            {blockedBy ? `Delete range (${blockedBy})` : 'Delete range'}
          </Button>
          <Button type="submit" form="category-editor" variant="primary" disabled={busy}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this range?"
        description={`${category.name} will be removed. This only works while it is empty, nothing is filed under it.`}
        confirmLabel="Delete range"
        destructive
        onConfirm={() => {
          const form = new FormData();
          form.set('categoryId', category.id);
          form.set('updatedAt', category.updatedAt);
          remove(form);
          setConfirmOpen(false);
        }}
      />
    </>
  );
}
