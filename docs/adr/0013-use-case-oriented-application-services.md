# Use-Case-Oriented Application Services

Application services should expose product use cases rather than CRUD operations to the
renderer. The renderer can manage local draft UI state, but persistence and workflows
that touch multiple domain concepts should go through methods such as creating an
opportunity, saving a base matrix, importing reviewed member responses, and building an
opportunity comparison.

**Consequences**

- Renderer APIs stay aligned with user workflows instead of database tables.
- Cross-entity rules such as archiving previous active member responses stay inside
  application services.
- Repository interfaces remain internal ports, not the renderer-facing contract.
