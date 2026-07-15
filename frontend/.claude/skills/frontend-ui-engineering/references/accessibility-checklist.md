# Accessibility Review Checklist

Use this checklist for user-facing changes. Apply only the items relevant to the affected interface.

## Structure and Semantics

- The page has a meaningful title and heading structure.
- Landmarks such as `main`, `nav`, and `aside` are used appropriately.
- Lists, tables, buttons, links, and form controls use native semantics.
- ARIA does not duplicate or contradict native semantics.

## Keyboard and Focus

- Every action can be completed without a mouse.
- Tab order follows visual and logical order.
- Focus is clearly visible.
- Focus is moved only when a new interaction context requires it.
- Dialogs, menus, and popovers follow the existing accessible primitive's behavior.
- Focus returns to the initiating control after a temporary context closes.

## Forms

- Every field has an accessible label.
- Required fields are communicated in text and programmatically.
- Validation messages identify the field and explain how to recover.
- Error summaries link or move focus to affected fields when appropriate.
- Input types, input modes, and autocomplete values match the requested data.
- Disabled controls do not hide the reason an action is unavailable.

## Dynamic Content

- Loading states expose an accessible status where needed.
- Important success and error feedback is announced.
- Background refreshes do not repeatedly interrupt screen-reader output.
- Content changes do not unexpectedly move focus.

## Visual Presentation

- Text and interactive controls meet the project's contrast target.
- State is not conveyed using color alone.
- Text remains readable at browser zoom and enlarged text sizes.
- Content is not clipped or lost at narrow widths.
- Touch targets are large enough for the supported devices.

## Media and Motion

- Meaningful images have useful alternative text.
- Decorative images are ignored by assistive technology.
- Audio and video controls are keyboard-accessible.
- Captions or equivalent alternatives are provided when required.
- Reduced-motion preferences are respected.

## Verification

- Navigate the changed flow using only the keyboard.
- Inspect the accessibility tree for incorrect names, roles, or states.
- Run the repository's existing accessibility checks when available.
- Test with at least one screen reader for high-risk or core flows when practical.
