# Commit

Review staged and unstaged changes, write a meaningful commit message, and create the commit.

## Steps

1. Check the current branch hasn't already been merged via a closed PR:
   ```
   gh pr list --head $(git branch --show-current) --state merged
   ```
   If a merged PR is found, **stop** and tell the user: the branch was already merged — they should switch to a new branch before committing.

2. Check what is staged and what is not:
   ```
   git status --short
   git diff --cached --stat
   git diff --cached
   ```

3. If nothing is staged, stage all changes:
   ```
   git add -A
   ```

4. Write a commit message that:
   - Follows Conventional Commits: `type(scope): short summary`
   - Types: `feat`, `fix`, `refactor`, `style`, `chore`, `docs`, `test`
   - Summary is imperative, lowercase, no period, max 72 chars
   - Includes a short body (1–3 lines) only if the why is non-obvious
   - Does NOT describe what files changed — describes what the change does

   Examples:
   - `feat(screenshots): add desktop and mobile screenshot section`
   - `fix(mobile): use microlink API to get true mobile viewport`
   - `refactor(styles): extract inline css into scss with tokens`
   - `chore(build): auto-create dist dir if missing`

5. Show the proposed commit message and ask the user to confirm or edit it.

6. Once confirmed, commit:
   ```
   git commit -m "<message>"
   ```

7. Confirm the commit hash and summary.
