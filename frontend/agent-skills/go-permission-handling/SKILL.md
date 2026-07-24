---
name: go-permission-handling
description: Design or implement Android and iOS permission and consent flows for the Go React Native app. Use for location, motion, notifications, camera, background access, denied states, settings redirects, and privacy-sensitive native capabilities.
---

# Go Permission Handling

- Identify the minimum permission needed and explain its user benefit immediately before requesting it.
- Keep native permission adapters in `src/shared/native`; expose permission-specific actions through a feature public API.
- Handle unavailable, undetermined, granted, denied, blocked, and limited states explicitly where the platform supports them.
- Never request background or persistent access until the product flow requires it and the user has context.
- Provide a useful degraded experience or clear settings recovery path after denial.
- Verify Android manifest declarations and iOS usage descriptions together with TypeScript flow changes.
