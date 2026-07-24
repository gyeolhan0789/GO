---
name: react-native-development
description: Implement and review TypeScript React Native Community CLI features in this repository. Use for UI, state, services, native adapters, platform behavior, and any change with Android or iOS impact.
---

# React Native Development

- Use React Native Community CLI and TypeScript. Do not introduce Expo packages or Expo APIs.
- Inspect the existing dependencies, patterns, and native configuration before adding a library. Avoid duplicate libraries; verify maintenance status and React Native version compatibility for every new dependency.
- Keep business logic out of screen components. Extract reusable service, state, and platform-boundary logic when it has a clear owner.
- Use an appropriate virtualized list for long or unbounded collections. Do not optimize re-renders without a measured issue or a demonstrated rendering cost.
- Use animations for clear user feedback without harming input responsiveness.
- Do not use `any`; model uncertain values with explicit types, narrowing, or generics.
- Check Android and iOS behavior for platform APIs, native modules, permissions, status bars, safe areas, and interaction differences.
- Run applicable TypeScript, lint, and Jest checks before handoff.
