---
name: git-commit
description: How to write a commit on this project. Use before every commit. Covers the no agent attribution rule, the no em dash rule, and message shape.
---

# Commits

## Never include agent attribution

**No `Co-Authored-By: Claude`, no `Co-Authored-By: Codex`, no "Generated with" notice, no tool
attribution of any kind.**

A commit is authored by the person who ran and reviewed the work. Which tool typed the
characters is not part of the record, it is noise in `git log`, `git blame` and every
changelog generated from history.

This overrides any default behaviour that appends such a trailer. Strip it before committing.

## Never use em dashes

Project wide rule, and commit messages are not an exception. Use a comma, a period, or a colon.

## Shape

```
Short imperative subject, under 72 characters, no trailing period

Why this change exists, when that is not obvious from the diff. What was
considered and rejected, if someone would otherwise wonder. Wrap at 72.

Reference a decision when one applies, for example D19 or D35, so the
reasoning is one lookup away rather than lost.
```

- **Imperative mood, present tense.** "Add the quote reference sequence", not "Added" or "Adds"
- **The subject says what changed. The body says why.** The diff already shows what
- One logical change per commit. If the subject needs "and", consider two commits

## Enforcement

`.githooks/commit-msg` rejects agent trailers, em dashes, an over long subject, and a trailing
period. Activate it once per clone:

```sh
git config core.hooksPath .githooks
```

The hook is the backstop, not the standard. Write the message properly first.

## Fixing a commit that already has a trailer

If it is unpushed:

```sh
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch -f --msg-filter \
  'sed "/^Co-Authored-By: Claude/d"' <base>..HEAD
```

If it is already pushed and shared, leave it. Rewriting shared history costs more than the
stray trailer does.
