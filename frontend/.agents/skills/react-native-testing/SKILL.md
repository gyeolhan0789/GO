<!-- GENERATED FILE. Edit agent-skills/... instead. -->

---
name: react-native-testing
description: Create, repair, or review Jest tests for this React Native Community CLI application. Use for component, hook, service, platform mock, accessibility, regression, and Android/iOS behavior tests.
---

# React Native Testing

- Test user-visible behavior, state transitions, and boundary conditions rather than implementation details.
- Prefer accessible role, label, and visible text queries. Add `testID` only when no semantic query is stable.
- Keep mocks at platform or service boundaries; do not mock the behavior under test.
- Cover loading, empty, error, and success states when the feature owns them.
- Isolate Android/iOS branches with explicit `Platform` mocks and test both intended outcomes when practical.
- Use the repository Jest configuration and run `npm test` after changes.
