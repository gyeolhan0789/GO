---
name: frontend-ui-engineering
description: Builds and modifies production-quality, accessible, responsive user-facing interfaces while following the repository's existing architecture and design system. Use for page and component implementation, layout work, UX fixes, state selection, responsive behavior, accessibility, and visual polish.
---

# Frontend UI Engineering

## Objective

Build maintainable user interfaces that follow the product's actual design language, repository conventions, and technical constraints. The result must feel intentional and production-ready rather than template-generated.

## Apply This Skill When

- Building or modifying pages and user-facing components
- Translating a design or specification into code
- Implementing responsive layouts and interactive states
- Choosing where UI, URL, server, or shared client state belongs
- Fixing visual, usability, accessibility, or interaction defects
- Reviewing a frontend implementation before completion

## Priority Order

When instructions conflict, use this order:

1. Explicit user requirements
2. Existing repository architecture and project conventions
3. Existing design system, components, tokens, and product patterns
4. This skill's general recommendations
5. Examples in this document

Do not reorganize the codebase or introduce a new architectural pattern merely to match an example in this skill.

## Repository Inspection

Before editing code:

1. Inspect the relevant route, feature, and nearby components.
2. Identify the framework, rendering model, styling approach, package manager, test runner, and state libraries already in use.
3. Find reusable components, hooks, types, design tokens, utilities, and API conventions.
4. Check local instruction files and project documentation.
5. Determine the smallest coherent change that satisfies the request.

Preserve established naming, file placement, import aliases, component APIs, and state-management patterns unless the user explicitly requests an architectural change.

## Technology Neutrality

Code samples are illustrative, not mandatory.

Do not introduce Tailwind CSS, React Query, SWR, Zustand, Redux, Storybook, a component library, or any other dependency unless:

- the project already uses it,
- the user explicitly requests it, or
- there is a clear requirement that cannot reasonably be met with the current stack.

Before adding a dependency, verify that an existing project utility or platform API cannot solve the problem.

## Implementation Workflow

1. Restate the requested behavior in implementation terms.
2. Trace the existing data and interaction flow.
3. Identify reusable code before creating new abstractions.
4. Define the required states and edge cases.
5. Implement the smallest complete vertical slice.
6. Verify behavior, accessibility, responsiveness, and repository checks.
7. Summarize changed behavior, affected files, and any unverified assumptions.

## Component Architecture

### Follow the Existing File Structure

Do not force component colocation or a specific folder structure. Use the repository's existing organization, whether it is route-based, feature-based, domain-based, or component-based.

When no clear convention exists, colocating tightly related files is a reasonable default:

```text
TaskList/
  TaskList.tsx
  TaskList.test.tsx
  useTaskList.ts
  types.ts
```

Only create files that are justified by the feature. Do not create empty tests, hooks, type modules, barrel files, or Storybook stories by default.

### Keep Responsibilities Clear

A component should have a coherent responsibility. Split it when one or more of these signals appear:

- unrelated state transitions are mixed together,
- data access and rendering cannot be understood independently,
- multiple substantial UI regions change for different reasons,
- the component is difficult to test without mocking unrelated behavior,
- repeated logic has a stable reusable boundary.

Line count is a review signal, not an automatic refactoring rule.

### Prefer Composition When It Improves Clarity

```tsx
<Card>
  <CardHeader>
    <CardTitle>Tasks</CardTitle>
  </CardHeader>
  <CardBody>
    <TaskList tasks={tasks} />
  </CardBody>
</Card>
```

Configuration-driven APIs are acceptable when they make repeated patterns simpler and remain type-safe. Do not prefer composition mechanically.

### Separate Data and Presentation Deliberately

Separate data access from presentation when it improves reuse, testing, or clarity. Do not create a container component solely to satisfy a pattern.

```tsx
export function TaskListSection() {
  const tasksQuery = useTasks();

  if (tasksQuery.isLoading) return <TaskListSkeleton />;
  if (tasksQuery.isError) {
    return <ErrorState onRetry={() => tasksQuery.refetch()} />;
  }
  if (tasksQuery.data.length === 0) return <TaskListEmpty />;

  return <TaskList tasks={tasksQuery.data} />;
}

export function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <ul>
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </ul>
  );
}
```

## State Management

Choose the narrowest state owner that preserves clarity.

```text
Local component state     -> transient UI state owned by one component
Lifted state              -> state shared by a small, closely related subtree
URL state                 -> filters, tabs, pagination, and shareable navigation state
Server-state library      -> remote data, caching, invalidation, and mutations
Context                   -> stable cross-tree dependencies such as theme or auth
Global client store       -> complex client-owned state shared across distant features
```

Rules:

- Do not copy server data into client state without a concrete need.
- Do not use a global store for state that can remain local or in the URL.
- Do not move state into Context solely because props cross an arbitrary number of levels.
- Restructure the component tree when that produces a clearer ownership boundary.
- Preserve existing cache keys, invalidation conventions, and mutation patterns.
- Use optimistic updates only when rollback behavior is reliable and the action is easy to reconcile.

Prop depth and component size are warning signals, not hard limits.

## Design-System Adherence

### Reuse Before Creating

Before creating a new UI primitive, search for:

- existing buttons, inputs, dialogs, menus, cards, alerts, and form controls,
- spacing, radius, typography, elevation, and color tokens,
- existing patterns for loading, empty, error, and permission states,
- similar pages or flows already implemented.

Extend existing primitives only when the new behavior is broadly reusable. Avoid feature-specific options that make shared components difficult to understand.

### Avoid Generic AI Styling

Do not default to:

- purple or indigo palettes unrelated to the product,
- decorative gradients without a design-system basis,
- uniformly oversized rounded cards,
- generic hero sections,
- excessive whitespace without hierarchy,
- stock dashboard grids,
- heavy shadows and glass effects,
- placeholder copy that hides real wrapping and overflow behavior.

Use product-specific content, hierarchy, density, and interaction patterns.

### Spacing and Sizing

- Use existing spacing and sizing tokens.
- Avoid arbitrary pixel values when a project token exists.
- Arbitrary values are acceptable for genuine design constraints, media geometry, or browser workarounds; document unusual cases.
- Check long labels, localization expansion, zoom, and text wrapping.

### Typography

- Preserve semantic heading order.
- Use one primary page heading unless the existing page structure requires otherwise.
- Do not use heading elements purely for visual styling.
- Avoid truncation where users need the full value to make a decision.

### Color and Meaning

- Use semantic tokens rather than raw colors where available.
- Maintain sufficient contrast.
- Do not communicate status using color alone.
- Preserve visible focus indicators.

## Accessibility

Target WCAG 2.1 AA unless the project specifies a stricter standard.

### Semantic HTML First

Use native elements before ARIA:

```tsx
<button type="button" onClick={handleClick}>
  Continue
</button>
```

Avoid clickable `div` or `span` elements. When a custom interaction is unavoidable, implement the complete keyboard, focus, role, and state behavior.

### Forms

- Every input needs an accessible name.
- Associate validation text using `aria-describedby` where appropriate.
- Expose invalid state with `aria-invalid` when useful.
- Do not disable submission without explaining the missing requirement.
- Preserve entered data after recoverable errors.
- Use suitable input types and autocomplete attributes.

### Focus Management

- Move focus when opening a modal or entering a new interaction context.
- Return focus to the triggering control when the context closes.
- Ensure dialogs trap focus using the project's established dialog primitive.
- Avoid unexpected focus movement during ordinary updates.

### Dynamic Content

- Use `aria-live` or status roles for important asynchronous feedback.
- Do not announce every minor visual update.
- Provide accessible loading labels and actionable error messages.

### Motion

- Respect `prefers-reduced-motion`.
- Avoid essential information being available only through animation.
- Keep transitions short and purposeful.

See `references/accessibility-checklist.md` for review details.

## Responsive Design

Follow the project's responsive strategy. Prefer content-driven breakpoints rather than mechanically adding common device widths.

At minimum, inspect:

- the narrowest supported mobile layout,
- the main tablet or intermediate layout,
- the primary desktop layout,
- very wide containers if the page supports them,
- browser zoom and enlarged text where practical.

Check:

- navigation reachability,
- horizontal overflow,
- fixed and sticky elements,
- dialog and drawer sizing,
- touch target size,
- table and chart behavior,
- virtual keyboard overlap on mobile,
- long content and empty content.

## Loading, Empty, Error, and Permission States

Every asynchronous surface must deliberately handle applicable states:

- initial loading,
- background refresh,
- empty result,
- recoverable error,
- terminal error,
- unauthorized or forbidden access,
- stale or unavailable data,
- offline or connection loss when relevant.

Skeletons are useful for predictable content layouts, but they are not mandatory. Use a spinner, progress indicator, placeholder, or retained previous data when that better communicates the operation.

Error states should explain what happened in user terms and provide a realistic next action. Do not expose raw stack traces or internal identifiers.

## Performance

- Avoid premature memoization.
- Measure or identify a credible rendering problem before adding `memo`, `useMemo`, or `useCallback` broadly.
- Avoid duplicate requests and unstable cache keys.
- Lazy-load genuinely heavy, infrequently used code where supported by the architecture.
- Optimize images and media using the project's established pipeline.
- Prevent layout shifts by reserving stable space for known content.
- Clean up event listeners, timers, observers, subscriptions, media tracks, and pending asynchronous effects.

## Security and Privacy

For user-facing code:

- Never log access tokens, session data, private messages, form secrets, or sensitive personal information.
- Do not persist sensitive values in local storage unless the project explicitly requires and protects that behavior.
- Treat authorization responses as server-enforced; frontend hiding is not access control.
- Escape or sanitize untrusted rich content using the existing approved approach.
- Use safe defaults when privacy or sharing state is missing or ambiguous.
- Do not infer consent from preselected controls, inactivity, or navigation.

## Copy and Interaction Quality

- Use the product's language and tone.
- Prefer specific labels over generic labels such as “OK” or “Submit.”
- Make destructive actions explicit and reversible where practical.
- Do not shame users for errors, incomplete tasks, or inactivity.
- Avoid introducing product behavior or claims that are absent from the requirements.

## Testing

Add or update tests according to repository conventions and feature risk.

Prioritize tests for:

- state transitions and conditional rendering,
- forms and validation,
- keyboard interaction,
- loading, empty, error, and permission states,
- regressions fixed by the change,
- data transformation and complex hooks,
- privacy or consent-sensitive behavior.

Do not create brittle tests that primarily assert implementation details or styling class strings unless those classes encode required behavior.

## Engineering Verification

After implementation, run the relevant existing project commands when available:

1. Formatter or format check
2. Linter
3. Type checker
4. Relevant unit and integration tests
5. Production build or affected package build
6. Existing accessibility checks

Also inspect:

- runtime console warnings and errors,
- failed network requests,
- keyboard navigation,
- visible focus states,
- loading, empty, error, and permission states,
- narrow and wide layouts,
- resource cleanup after navigation or unmount.

Do not invent command names. Inspect `package.json`, workspace configuration, or project documentation first. Report checks that could not be run and the reason.

## Review Signals

Investigate these conditions; do not refactor automatically:

- a component has several unrelated responsibilities,
- repeated UI has begun to diverge,
- state ownership is unclear,
- the same remote data is fetched through multiple incompatible paths,
- loading, empty, error, or unauthorized states are missing,
- raw values bypass design tokens without justification,
- interactive elements are not keyboard-operable,
- status is conveyed only by color,
- effects lack cleanup,
- user data appears in logs, URLs, storage, analytics, or error output,
- the result resembles a generic template rather than the project's design.

## Completion Checklist

- [ ] The implementation matches the requested behavior.
- [ ] Existing project structure and conventions are preserved.
- [ ] Existing components and tokens are reused where appropriate.
- [ ] No unnecessary dependency or architecture change was introduced.
- [ ] State ownership matches the type and scope of the state.
- [ ] Loading, empty, error, and permission states are handled where applicable.
- [ ] Interactive elements are keyboard-accessible.
- [ ] Focus, labels, validation, and dynamic feedback are accessible.
- [ ] The layout works at the project's supported viewport sizes.
- [ ] Sensitive data is not exposed in logs, storage, URLs, or UI.
- [ ] Relevant formatting, lint, type, test, and build checks pass, or failures are reported.
