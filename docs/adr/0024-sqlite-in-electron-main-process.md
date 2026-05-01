# SQLite in Electron Main Process

SQLite access should run in the Electron main process behind application service ports
for the rebuild. CMM's data is small, operations are user-driven, and a main-process
repository keeps the architecture simpler than introducing a worker thread or separate
process before there is evidence of responsiveness problems.

**Consequences**

- Persistence adapters are wired in Electron main through `createAppServices`.
- Renderer code never talks to SQLite directly.
- Repository boundaries should stay clean enough to move expensive work to a worker later
  if real performance issues appear.
