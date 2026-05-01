# better-sqlite3 for Local Persistence

The SQLite persistence package should use `better-sqlite3` because CMM is a local
single-user Electron app and synchronous main-process database operations keep repository
code simple. The dependency should remain isolated inside `@cmm/persistence-sqlite` so
application services do not depend on the driver API.

**Consequences**

- Electron packaging must account for the native `better-sqlite3` module.
- Repository methods can use straightforward transactions and prepared statements.
- If native packaging becomes a problem, only the SQLite adapter package should need to
  change.
