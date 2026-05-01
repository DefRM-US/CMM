# TanStack Table for Opportunity Comparison

The opportunity comparison grid should use TanStack Table because side-by-side response
review is central to CMM and will likely need sorting, pinned columns, flexible cell
rendering, and scalable table behavior. The base matrix requirements editor should remain
a custom editor because it needs specialized keyboard outline interactions.

**Consequences**

- Comparison-specific table behavior can build on a proven table model.
- The requirements editor is not forced into a grid abstraction that does not match its
  outline editing behavior.
- `@cmm/ui` can provide generic table primitives, while renderer features own
  CMM-specific TanStack Table configuration.
