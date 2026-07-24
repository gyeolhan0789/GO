# Agent Instructions

## Shared skills

Edit skills only in `agent-skills/`. Run `npm run agents:sync` to generate the identical skill sets consumed by Codex (`.agents/skills`) and Claude Code (`.claude/skills`). Never edit generated files directly; verify them with `npm run agents:check`.

Use the relevant skill before starting work:

- `react-native-development`: React Native CLI implementation, native adapters, iOS/Android impact.
- `react-native-testing`: React Native tests, mocks, and accessibility queries.
- `go-ui-design`: user-facing Go UI, interaction, and accessibility work.

## Engineering rules

- This is a TypeScript React Native Community CLI app. Do not add Expo APIs or Expo tooling.
- Consider both Android and iOS whenever changing native behavior, permissions, platform APIs, or UI.
- Keep state local by default; introduce shared state only when several consumers genuinely need it.
- Reuse existing components, tokens, types, and public APIs before adding abstractions.
- Before handoff, run the applicable checks from `package.json` and report anything that cannot be verified.
