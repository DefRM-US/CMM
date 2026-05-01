# SQLite Without Legacy JSON Migration

The rebuilt app should use SQLite as its first durable persistence model and should not
include migration support for the prototype `capability-matrix-manager.json` store,
because CMM has not launched and there is no user data compatibility obligation yet.
Prototype reset and seed flows can remain for development, but legacy JSON storage should
not shape the production architecture.

**Consequences**

- The new persistence package can model opportunities, requirements, member responses,
  and response rows directly in SQLite.
- Application services do not need a legacy migration service for the rebuild.
- Existing prototype data can be discarded during the architecture reset.
