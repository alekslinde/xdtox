# Pull Request

Review the current branch's commits and changes against the base branch, then create a GitHub pull request.

## Steps

1. Check whether a PR already exists for this branch (open or merged):
   ```
   gh pr list --head $(git branch --show-current) --state all
   ```
   - If a **merged** PR is found — stop and tell the user the branch was already merged. They should create a new branch.
   - If an **open** PR is found — stop and share its URL; no need to create another.

2. Gather context:
   ```
   git branch --show-current
   git log main..HEAD --oneline
   git diff main...HEAD --stat
   git diff main...HEAD
   ```

3. Check the remote and confirm the branch is pushed:
   ```
   git remote -v
   git status -sb
   ```
   If the branch has no upstream, push it first:
   ```
   git push -u origin <branch-name>
   ```

4. Write a PR title and body that:
   - Title: concise, imperative, max 72 chars (same style as a commit summary)
   - Body includes:
     - **What** — a short summary of what changed
     - **Why** — motivation or context (skip if obvious)
     - **How to test** — any steps a reviewer needs to verify the change

5. Show the proposed title and body and ask the user to confirm or edit.

6. Once confirmed, create the PR using the GitHub CLI:
   ```
   gh pr create --title "<title>" --body "<body>"
   ```

7. Output the PR URL so the user can open it directly.
