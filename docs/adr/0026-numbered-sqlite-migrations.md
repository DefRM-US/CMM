# Numbered SQLite Migrations

SQLite schema changes should use explicit numbered SQL migrations from the start, even
before launch. Development databases can still be reset during the rebuild, but migration
tests should prove that a fresh database reaches the current schema.

**Consequences**

- `@cmm/persistence-sqlite` owns migration files and migration execution.
- Tests should cover fresh database creation and migration ordering.
- Schema changes are reviewed as durable changes rather than hidden in repository code.
