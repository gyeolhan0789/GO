# Repository Agent Instructions

## Frontend UI work

For tasks involving frontend pages, user-facing components, responsive layouts, interactions, state placement, accessibility, UX fixes, or visual polish, use the `frontend-ui-engineering` skill.

- Codex skill entry: `.agents/skills/frontend-ui-engineering/SKILL.md`
- Claude Code skill entry: `.claude/skills/frontend-ui-engineering/SKILL.md`

## Instruction priority

When instructions conflict, use this order:

1. The user's explicit request
2. Repository-specific architecture, conventions, and local instruction files
3. Existing design-system components, tokens, and product patterns
4. The frontend UI engineering skill
5. Examples in the skill document

## General execution rules

- Inspect the relevant repository code before editing.
- Prefer the smallest coherent change that satisfies the request.
- Reuse existing components, utilities, types, tokens, and state patterns before adding new abstractions.
- Do not introduce dependencies or reorganize the architecture unless the request clearly requires it.
- Run only checks that exist in the repository, such as formatting, linting, type checking, tests, and builds.
- Report checks that could not be run and assumptions that could not be verified.
