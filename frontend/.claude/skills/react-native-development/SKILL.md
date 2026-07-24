<!-- GENERATED FILE. Edit agent-skills/... instead. -->

---
name: react-native-development
description: Implement and review TypeScript React Native Community CLI features in this repository. Use for UI, state, services, native adapters, platform behavior, and any change with Android or iOS impact.
---

# React Native Development

- Use React Native Community CLI and TypeScript. Do not introduce Expo packages or Expo APIs.
- Start with the smallest affected FSD slice. Respect `app → pages → widgets → features → entities → shared`; import another slice only from its `index.ts`.
- Place reusable platform, device, and React Native adapters in `src/shared/native` and expose them through its public API.
- Keep page composition in `pages`/`widgets`, user actions in `features`, domain data in `entities`, and cross-domain primitives in `shared`.
- Prefer local component state. Add shared state only for real multi-consumer requirements.
- Check Android and iOS behavior for platform APIs, native modules, permissions, status bars, safe areas, and interaction differences.
- Run applicable TypeScript, lint, and Jest checks before handoff.
