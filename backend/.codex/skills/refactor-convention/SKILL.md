---
name: refactor-convention
description: Refactor backend Java code using the repository's backend and test conventions.
argument-hint: "[diff]"
---

# Backend convention refactoring

1. Read `docs/convention/java-convention.md`, `docs/convention/spring-boot-convention.md`, and `docs/convention/back-test-convention.md` before changing code. Read `docs/convention/git-convention.md` when the task changes branch, commit, or MR behavior. Do not invent conventions absent from those documents.
2. With no argument, inspect Java files under `src/main/java`. With `diff`, obtain changed Java files using `git diff --name-only $(git merge-base HEAD origin/develop)`.
3. Check each target against the loaded conventions.
4. Apply only safe mechanical repairs, such as imports, Lombok, JPA annotations, and clear code-style violations. Report structural, controller-business-logic, or architectural violations for manual repair rather than guessing.
5. Report completed automatic fixes and remaining violations by convention item and file/line. Summarize each changed file when any edits were made.
