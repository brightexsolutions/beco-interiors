---
name: blog-content
description: How a blog post is drafted with Gemini, edited, given SEO metadata and an image, and published. Use for any work on the Studio blog authoring flow or on blog content itself.
---

# Blog content

Blog publishing is **Brightex's job**, not Beco's. It happens in Studio, and Gemini drafts the
first version from a title or a short brief.

## The rule that governs this

**Gemini drafts. A person publishes.** Nothing reaches the site without being read, corrected
and approved by a human. This is not caution for its own sake:

- Google penalises **scaled content abuse**, meaning bulk generated pages made primarily to
  rank. It does not penalise AI assistance on genuinely useful content. Two reviewed articles a
  month is the former's opposite, but only if the review is real
- A model will state a product specification confidently and wrongly. **Every factual claim
  about a Beco product is checked against `products.specs`**, which is the actual source of
  truth, not against the model's recollection
- `blog_posts.author` names **a person**. Never "AI", never "Gemini". A byline is a claim of
  responsibility, and a person is taking it

## The em dash problem

**Language models produce em dashes constantly, and this project bans them everywhere.**

So: the system prompt forbids them, and a post save validator rejects any draft containing one
rather than trusting the prompt. Prompt instructions are guidance; the validator is the
guarantee. The same validator rejects the other tells worth avoiding: "delve", "tapestry",
"in today's fast paced world", and "it's not just X, it's Y".

## Generation inputs

| Input | Required | Notes |
|---|---|---|
| Title or brief | Yes | Either a finished title, or a description of the angle |
| Target search term | Yes | The post exists to own a term. Without one it is decoration |
| Related products or category | No | Passed as real context so the model writes about actual stock, and can link to it |
| Tone and length | No | Defaults to the house voice, 800 to 1200 words |

## What generation returns

Not just prose. A post is not done without its metadata.

| Field | Purpose |
|---|---|
| `title` | Under 60 characters, carries the term naturally |
| `slug` | Kebab case, checked unique before save |
| `excerpt` | One or two sentences, for cards and previews |
| `body` | Markdown. Headings in order, one `h1` |
| `meta_title`, `meta_description` | Under 60 and 155 characters. Written, not truncated from the body |
| `tags` | For the index and related posts |
| `category` | |
| `cover_image_alt` | Descriptive, written for a reader who cannot see it |
| `reading_time` | Computed, not guessed |

`BlogPosting` JSON-LD is emitted from these fields, per the `seo-checklist` skill.

## Images

Gemini's text API does not produce images. The editor offers two paths:

1. **Upload**, which goes through the same Sharp pipeline as product images: AVIF and WebP at
   four widths, a blur placeholder, into R2. Same size budgets apply
2. **Provide a URL**, which is fetched once, processed identically, and stored in R2. **Never
   hotlinked**, because a third party URL will eventually rot or change under you

Either way alt text is required before publish. A cover image with no alt fails validation.

**Licensing:** only Beco's own photography, or something with a licence Brightex can evidence.
The Drive folder already holds application photography that suits most articles, and it has the
advantage of being genuinely theirs.

## Workflow

```
  brief or title
        |
        v
  Gemini draft, server side in Studio
        |
        v
  validator: em dashes, banned phrases, heading order,
             metadata lengths, slug uniqueness
        |
        v
  HUMAN EDIT. Facts checked against products.specs.
              Internal links added to real category and
              product pages
        |
        v
  cover image uploaded or fetched, alt text written
        |
        v
  seo-checklist run
        |
        v
  status: draft -> published, published_at stamped,
          audit_log written, sitemap revalidated
```

## Storage

The prompt and model used are stored on the row. That is not bureaucracy: when a post
underperforms or contains an error, knowing what produced it is how the next one improves.
