# Branch Namer

Look at the current working changes and suggest + create a meaningful git branch name.

## Steps

1. Run the following to understand what has changed:
   ```
   git diff --stat HEAD
   git diff --cached --stat
   git status --short
   ```

2. Based on the changes, derive a branch name that:
   - Uses kebab-case
   - Starts with a type prefix: `feat/`, `fix/`, `refactor/`, `chore/`, or `docs/`
   - Is concise (3–6 words max after the prefix)
   - Describes the actual work, not the files changed

   Examples: `feat/screenshots-section`, `fix/mobile-viewport-cors`, `refactor/scss-styles`, `docs/readme-update`

3. Show the suggested branch name and ask the user to confirm or provide an alternative.

4. Once confirmed, create the branch:
   ```
   git checkout -b <branch-name>
   ```

5. Confirm the branch was created and is now active.
