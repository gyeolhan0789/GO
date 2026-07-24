---
name: go-ui-design
description: Design and implement polished, accessible user-facing Go app screens and interactions in React Native. Use for page layouts, components, visual hierarchy, interaction feedback, accessibility, and UX refinements.
---

# Go UI Design

- Design Go! as a warm mobile game: pixel-art characters and icons, parks or walking paths, and a green, cream, and yellow palette. Keep the result cute without becoming overly childish.
- Prioritize today’s goal and rewards over health-metrics dashboards. On the home screen, order information as: start today’s walk, current mission or bingo progress, expected reward, friend/team progress, then detailed statistics.
- Inspect existing tokens and common components before adding visual primitives. Centralize any new colors, spacing, and radii instead of scattering literal values across screens.
- Preserve pixel-art crispness; do not apply interpolation that makes pixel assets blurry.
- Establish hierarchy with typography, spacing, color, and grouping; do not add decoration without a user-facing purpose.
- Design loading, empty, disabled, error, pressed, reward, mission-complete, and bingo-complete feedback alongside the primary state. Favor animation for meaningful rewards, not idle decoration that burdens low-end devices.
- Use generous touch targets, accessible labels/roles, readable contrast, and safe-area-aware layouts.
- Keep platform conventions in mind while preserving the product’s visual consistency.
- Validate the resulting screen with relevant Jest, lint, and TypeScript checks.
