# TanStack Query for Renderer Server State

The renderer should use TanStack Query for async state loaded through typed IPC, because
CMM has local but still asynchronous server-state such as opportunities, base matrices,
opportunity comparisons, member response details, and import mutations. Draft editor
state remains local to the feature rather than being pushed into the query cache.

**Consequences**

- IPC-backed queries and mutations get consistent loading, error, caching, and
  invalidation behavior.
- Feature hooks can wrap the typed CMM API while keeping components focused on UI.
- Autosave and draft editing logic remain explicit feature state, not hidden cache writes.
