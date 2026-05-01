# Single-User Local Desktop App

CMM should be rebuilt as a single-user local Electron desktop app with local persistence,
because the target workflow is one user managing procurement opportunities and returned
member responses on their machine. The architecture can keep services and repositories
clean enough to support future sync, but the rebuild should not introduce accounts,
tenancy, shared databases, collaboration, or conflict resolution.

**Consequences**

- SQLite can be local to the Electron app's user data directory.
- IPC and application services can assume one local user session.
- No cloud sync or server-side API is part of the rebuild scope.
