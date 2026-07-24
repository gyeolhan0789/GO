<!-- GENERATED FILE. Edit agent-skills/... instead. -->

---
name: go-walking-session
description: Build or modify Go walking-session product flows in this React Native app. Use for starting, tracking, pausing, resuming, completing, or presenting a walking session and its session-specific state.
---

# Go Walking Session

- Model a walking session as an entity; expose session-specific user actions from feature slices.
- Keep screen composition in pages or widgets and keep display-only UI out of service adapters.
- Define explicit states for idle, preparing, active, paused, completed, and recoverable failure when applicable.
- Preserve user progress across transient UI changes. Confirm persistence, background, and location requirements before adding them.
- Treat pace, distance, elapsed time, and permissions as potentially unavailable data and present safe fallback states.
- Test state transitions and completion/error paths.
