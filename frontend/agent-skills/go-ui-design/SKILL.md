---
name: go-ui-design
description: Design and implement polished, accessible user-facing Go app screens and interactions in React Native. Use for page layouts, components, visual hierarchy, interaction feedback, accessibility, and UX refinements.
---

# Go UI Design

- Inspect existing patterns before adding visual primitives. Keep reusable primitives in `shared` and feature-specific UI in its owning slice.
- Establish hierarchy with typography, spacing, color, and grouping; do not add decoration without a user-facing purpose.
- Design loading, empty, disabled, error, pressed, and success feedback alongside the primary state.
- Use touch targets, accessible labels/roles, readable contrast, and safe-area-aware layouts.
- Keep platform conventions in mind while preserving the product’s visual consistency.
- Validate the resulting screen with relevant Jest, lint, and TypeScript checks.
