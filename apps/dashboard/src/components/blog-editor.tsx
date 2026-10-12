'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  ConfirmDialog,
  Field,
  Icon,
  Input,
  Panel,
  SegmentedControl,
  StatusPill,
  Textarea,
  useActionToast,
  useKeepValuesSubmit,
} from '@beco/ui';
import {
  generateBlogDraft,
  removeBlogCover,
  saveBlogPost,
  uploadBlogCover,
  type BlogActionState,
} from '@/app/(app)/studio/blog/actions';
import { usePhotoUpload } from '@/components/use-photo-upload';
import { BlogBodyEditor } from '@/components/blog-body-editor';
import { BlogLivePreview } from '@/components/blog-live-preview';
import { coverPreviewUrl, readingTimeMinutes, slugFromTitle, type StaffBlogPost } from '@/lib/blog';

const INITIAL: BlogActionState = {};

export function BlogEditor({
  post,
  defaultAuthor,
}: {
  post: StaffBlogPost | null;
  defaultAuthor: string;
}) {
  const router = useRouter();
  const [saveState, save, savePending] = useActionState(saveBlogPost, INITIAL);
  const onSaveSubmit = useKeepValuesSubmit(save);
  const [genState, generate, genPending] = useActionState(generateBlogDraft, INITIAL);
  const onGenerateSubmit = useKeepValuesSubmit(generate);
  const [coverState, uploadCover, coverPending] = useActionState(uploadBlogCover, INITIAL);
  const upload = usePhotoUpload({ area: 'studio/blog', field: 'file', dispatch: uploadCover });
  const [removeState, removeCover] = useActionState(removeBlogCover, INITIAL);
  useActionToast(saveState);
  useActionToast(genState);
  useActionToast(coverState);
  useEffect(() => {
    if (coverState.ok || coverState.error) upload.settle();
  }, [coverState, upload.settle]);
  useActionToast(removeState);

  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [body, setBody] = useState(post?.body ?? '');
  const [category, setCategory] = useState(post?.category ?? '');
  const [tags, setTags] = useState(post?.tags.join(', ') ?? '');
  const [metaTitle, setMetaTitle] = useState(post?.metaTitle ?? '');
  const [metaDescription, setMetaDescription] = useState(post?.metaDescription ?? '');
  const [targetTerm, setTargetTerm] = useState(post?.targetTerm ?? '');
  const [author, setAuthor] = useState(post?.author ?? defaultAuthor);
  const [coverAlt, setCoverAlt] = useState(post?.coverImageAlt ?? '');
  const [brief, setBrief] = useState(post?.title ?? '');
  const [prompt, setPrompt] = useState(post?.generationPrompt ?? '');
  const [model, setModel] = useState(post?.generatedByModel ?? '');
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmUnpublish, setConfirmUnpublish] = useState(false);
  const [confirmRemoveCover, setConfirmRemoveCover] = useState(false);

  useEffect(() => {
    if (saveState.postId && !post) router.replace(`/studio/blog/${saveState.postId}`);
  }, [saveState.postId, post, router]);

  useEffect(() => {
    const draft = genState.draft;
    if (!draft) return;
    setTitle(draft.title);
    setSlug(draft.slug);
    setExcerpt(draft.excerpt);
    setBody(draft.body);
    setMetaTitle(draft.metaTitle);
    setMetaDescription(draft.metaDescription);
    setTags(draft.tags);
    setCategory(draft.category);
    setCoverAlt(draft.coverImageAlt);
    setPrompt(`${brief}\n${targetTerm}`);
    setModel(draft.model || 'gemini');
  }, [genState.draft, brief, targetTerm]);

  const coverSrc = coverPreviewUrl(post?.coverImage ?? null);

  const hidden = (
    <>
      {post ? <input type="hidden" name="postId" value={post.id} /> : null}
      <input type="hidden" name="generatedByModel" value={model} />
      <input type="hidden" name="generationPrompt" value={prompt} />
    </>
  );

  const fillSaveForm = (status: 'draft' | 'published') => {
    const form = new FormData();
    if (post) form.set('postId', post.id);
    form.set('title', title);
    form.set('slug', slug);
    form.set('excerpt', excerpt);
    form.set('body', body);
    form.set('category', category);
    form.set('tags', tags);
    form.set('metaTitle', metaTitle);
    form.set('metaDescription', metaDescription);
    form.set('targetTerm', targetTerm);
    form.set('author', author);
    form.set('coverImageAlt', coverAlt);
    form.set('status', status);
    form.set('generatedByModel', model);
    form.set('generationPrompt', prompt);
    return form;
  };

  const published = post?.status === 'published';
  const panelTitle = (text: string, note?: string) => (
    <div>
      <h2 className="font-ui text-base font-semibold text-charcoal">{text}</h2>
      {note ? <p className="font-ui text-sm text-neutral-500">{note}</p> : null}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* The editor's bar, D147: how you are looking at the article on the
          left, what you can do to it on the right. Pinned under the top bar
          from a laptop up so Save is never a scroll away; on a phone it
          wraps to two rows and stays at the head of the page. */}
      <div data-editor-bar className="-my-2 bg-neutral-50 py-2 lg:sticky lg:top-[var(--shell-top)] lg:z-10">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-panel border border-neutral-200 bg-high-vis-white px-3 py-2.5 shadow-panel sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
            <SegmentedControl
              label="Mode"
              value={view}
              onChange={setView}
              options={[
                { value: 'edit', label: 'Edit', icon: 'pencil' },
                { value: 'preview', label: 'Preview', icon: 'eye' },
              ]}
            />
            <StatusPill
              label={published ? 'Published' : 'Draft'}
              tone={published ? 'positive' : 'muted'}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {post ? (
              published ? (
                <Button type="button" variant="outline" onClick={() => setConfirmUnpublish(true)}>
                  Unpublish
                </Button>
              ) : (
                <Button type="button" variant="outline" onClick={() => setConfirmPublish(true)}>
                  Publish
                </Button>
              )
            ) : null}
            <Button type="submit" form="blog-save" pending={savePending}>
              {savePending ? 'Saving' : published ? 'Save' : 'Save draft'}
            </Button>
          </div>
        </div>
      </div>

      {view === 'preview' ? (
        <div className="rounded-panel border border-neutral-200 bg-high-vis-white p-5 shadow-panel sm:p-8">
          <BlogLivePreview
            title={title}
            body={body}
            excerpt={excerpt}
            category={category}
            author={author}
            coverSrc={coverSrc}
            coverAlt={coverAlt}
            readingTime={body ? readingTimeMinutes(body) : null}
          />
        </div>
      ) : (
        <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <form id="blog-save" onSubmit={onSaveSubmit} className="min-w-0 space-y-6">
            {hidden}
            <input type="hidden" name="status" value={published ? 'published' : 'draft'} />
            <input type="hidden" name="targetTerm" value={targetTerm} />
            <Panel title={panelTitle('Article', 'The headline, its address and who wrote it.')}>
              <div className="grid gap-5 p-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Title" htmlFor="blog-title">
                    <Input
                      id="blog-title"
                      name="title"
                      required
                      value={title}
                      onChange={(event) => {
                        setTitle(event.target.value);
                        if (!post) setSlug(slugFromTitle(event.target.value));
                      }}
                    />
                  </Field>
                </div>
                <Field label="Slug" htmlFor="blog-slug">
                  <Input
                    id="blog-slug"
                    name="slug"
                    required
                    value={slug}
                    onChange={(event) => setSlug(event.target.value)}
                  />
                </Field>
                <Field label="Author" htmlFor="blog-author">
                  <Input
                    id="blog-author"
                    name="author"
                    required
                    value={author}
                    onChange={(event) => setAuthor(event.target.value)}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Excerpt" htmlFor="blog-excerpt" hint="Optional">
                    <Textarea
                      id="blog-excerpt"
                      name="excerpt"
                      rows={3}
                      value={excerpt}
                      onChange={(event) => setExcerpt(event.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </Panel>
            <Panel>
              <div className="p-5">
                <Field
                  label="Body"
                  htmlFor="blog-body"
                  hint={body ? `${readingTimeMinutes(body)} min read` : undefined}
                >
                  <BlogBodyEditor id="blog-body" name="body" value={body} onChange={setBody} />
                </Field>
              </div>
            </Panel>
          </form>

          <aside className="space-y-6 xl:sticky xl:top-[calc(var(--shell-top)+5.5rem)]">
            <Panel
              title={panelTitle('Generate', 'A first draft from a brief.')}
              className="bg-neutral-50"
            >
              <form onSubmit={onGenerateSubmit} className="grid gap-4 p-5">
                <Field label="Brief" htmlFor="blog-brief">
                  <Textarea
                    id="blog-brief"
                    name="brief"
                    rows={3}
                    required
                    value={brief}
                    onChange={(event) => setBrief(event.target.value)}
                  />
                </Field>
                <Field label="Target search term" htmlFor="blog-term">
                  <Input
                    id="blog-term"
                    name="targetTerm"
                    required
                    value={targetTerm}
                    onChange={(event) => setTargetTerm(event.target.value)}
                  />
                </Field>
                <Field label="Related stock" htmlFor="blog-related" hint="Optional">
                  <Input id="blog-related" name="related" />
                </Field>
                <Button type="submit" variant="secondary" pending={genPending}>
                  <Icon name="sparkles" />
                  {genPending ? 'Generating' : 'Generate'}
                </Button>
              </form>
            </Panel>

            <Panel title={panelTitle('Search', 'How it reads in Google.')}>
              <div className="grid gap-4 p-5">
                <Field label="Category" htmlFor="blog-category" hint="Optional">
                  <Input
                    id="blog-category"
                    name="category"
                    form="blog-save"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  />
                </Field>
                <Field label="Tags" htmlFor="blog-tags" hint="Comma separated">
                  <Input
                    id="blog-tags"
                    name="tags"
                    form="blog-save"
                    value={tags}
                    onChange={(event) => setTags(event.target.value)}
                  />
                </Field>
                <Field label="Meta title" htmlFor="blog-meta-title" hint="Optional">
                  <Input
                    id="blog-meta-title"
                    name="metaTitle"
                    form="blog-save"
                    value={metaTitle}
                    onChange={(event) => setMetaTitle(event.target.value)}
                  />
                </Field>
                <Field label="Meta description" htmlFor="blog-meta-description" hint="Optional">
                  <Textarea
                    id="blog-meta-description"
                    name="metaDescription"
                    form="blog-save"
                    rows={3}
                    value={metaDescription}
                    onChange={(event) => setMetaDescription(event.target.value)}
                  />
                </Field>
              </div>
            </Panel>

            <Panel
              title={panelTitle('Cover', 'Beco photography only. Alt is required before publish.')}
            >
              <div className="grid gap-4 p-5">
                {coverSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverSrc}
                    alt=""
                    className="aspect-[16/9] w-full rounded-control border border-neutral-200 object-cover"
                  />
                ) : null}
                <Field label="Cover alt" htmlFor="blog-cover-alt" hint="Optional until publish">
                  <Input
                    id="blog-cover-alt"
                    name="coverImageAlt"
                    form="blog-save"
                    value={coverAlt}
                    onChange={(event) => setCoverAlt(event.target.value)}
                  />
                </Field>
                {post ? (
                  <form onSubmit={upload.onSubmit} className="grid gap-4">
                    <input type="hidden" name="postId" value={post.id} />
                    <input type="hidden" name="coverImageAlt" value={coverAlt} />
                    <Field
                      label="Cover photograph"
                      htmlFor="blog-cover-file"
                      hint="JPEG, PNG, WebP or HEIC, up to 40MB. Resized before upload"
                    >
                      <Input
                        id="blog-cover-file"
                        name="file"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                      />
                    </Field>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="submit"
                        variant="outline"
                        pending={coverPending || upload.phase !== 'idle'}
                      >
                        <Icon name="upload" />
                        {upload.label ?? 'Upload cover'}
                      </Button>
                      {post.coverImage ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setConfirmRemoveCover(true)}
                        >
                          Remove cover
                        </Button>
                      ) : null}
                    </div>
                  </form>
                ) : (
                  <p className="font-ui text-base text-neutral-500">
                    Save the draft before adding a cover.
                  </p>
                )}
              </div>
            </Panel>
          </aside>
        </div>
      )}

      <ConfirmDialog
        open={confirmPublish}
        onOpenChange={setConfirmPublish}
        title={`Publish ${title || 'this article'}?`}
        description="It will appear on the live blog. You can unpublish it later."
        confirmLabel="Publish article"
        onConfirm={() => {
          setConfirmPublish(false);
          save(fillSaveForm('published'));
        }}
      />
      <ConfirmDialog
        open={confirmUnpublish}
        onOpenChange={setConfirmUnpublish}
        title={`Unpublish ${title || 'this article'}?`}
        description="It leaves the live blog. The draft stays here."
        confirmLabel="Unpublish article"
        onConfirm={() => {
          setConfirmUnpublish(false);
          save(fillSaveForm('draft'));
        }}
      />
      <ConfirmDialog
        open={confirmRemoveCover}
        onOpenChange={setConfirmRemoveCover}
        title={`Remove the cover on ${title || 'this article'}?`}
        description="The photograph is deleted from storage. The article stays."
        confirmLabel="Remove cover"
        destructive
        onConfirm={() => {
          const form = new FormData();
          if (post) form.set('postId', post.id);
          setConfirmRemoveCover(false);
          removeCover(form);
        }}
      />
    </div>
  );
}
