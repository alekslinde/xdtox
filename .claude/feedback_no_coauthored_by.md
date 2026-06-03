---
name: feedback_no_coauthored_by
description: Do not add Co-Authored-By trailer to git commits in this project
metadata: 
  node_type: memory
  type: feedback
  originSessionId: d18c7268-1574-455c-891d-4ba257c26f60
---

Never append `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` (or any Claude co-author trailer) to commit messages.

**Why:** User explicitly rejected it and asked for it to be removed from commits.

**How to apply:** When writing any `git commit -m` command, omit the Co-Authored-By line entirely.
