<!-- GENERATED FILE. Edit agent-skills/... instead. -->

---
name: react-native-testing
description: Create, repair, or review Jest tests for this React Native Community CLI application. Use for component, hook, service, platform mock, accessibility, regression, and Android/iOS behavior tests.
---

# React Native Testing

- Inspect the repository Jest configuration, existing mocks, and test patterns before adding tests.
- Test user-observable behavior, navigation flow, state transitions, and boundary conditions rather than implementation details.
- Prefer React Native Testing Library queries by accessible role, label, and visible text. Add `testID` only when no stable semantic query exists.
- Keep mocks at native-module, service, and network boundaries; do not mock the behavior under test.
- Cover loading, empty, error, success, permission, and walking-session transition states when the feature owns them.
- Isolate Android/iOS branches with explicit `Platform` mocks and document manual platform checks that cannot run in Jest.
- Use the repository Jest configuration and run `npm test` after changes.
