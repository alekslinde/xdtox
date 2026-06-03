# Code Review

Review the current branch's changes against main through a TDD and BDD lens, then produce a structured report.

## Steps

1. Gather the diff:
   ```
   git diff main...HEAD --stat
   git diff main...HEAD
   ```

2. Review the changes across four dimensions:

   ### Correctness
   - Does the code do what it claims to do?
   - Are there off-by-one errors, null/undefined paths, or unhandled rejections?
   - Are external inputs validated at the boundary?

   ### TDD — Test-Driven Development
   - Is there test coverage for the changed behaviour?
   - Were tests written before or alongside the implementation (red-green-refactor)?
   - Do tests cover the happy path, edge cases, and failure modes?
   - Are there any logic branches that have no corresponding test?
   - Flag any new functions or modules with zero test coverage.

   ### BDD — Behaviour-Driven Development
   - Are behaviours described from the user's perspective (Given / When / Then)?
   - Do test descriptions read as plain-language specifications, not implementation details?
   - Is it clear from the tests alone what the feature is supposed to do?
   - Are acceptance criteria traceable from requirements → tests → implementation?

   ### Code Quality
   - Is the code readable and consistently styled?
   - Are there unnecessary abstractions, duplications, or dead code?
   - Are side effects isolated and functions kept focused?

3. Produce a report with this structure:

   ```
   ## Code Review

   ### Summary
   <1–2 sentences on what the change does overall>

   ### TDD
   - ✅ / ⚠️ / ❌  <finding>
   ...

   ### BDD
   - ✅ / ⚠️ / ❌  <finding>
   ...

   ### Correctness
   - ✅ / ⚠️ / ❌  <finding>
   ...

   ### Code Quality
   - ✅ / ⚠️ / ❌  <finding>
   ...

   ### Verdict
   APPROVE | REQUEST CHANGES | NEEDS TESTS
   <one sentence rationale>
   ```

   Use ✅ for passing, ⚠️ for minor concerns, ❌ for blockers.

4. If tests are missing or insufficient, suggest concrete test cases in the project's existing test style — describe the scenario in Given/When/Then terms before showing any code.

5. Ask the user if they want to action any of the findings before finishing.
