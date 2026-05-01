# No App-Level Database Encryption in Rebuild

CMM should not add application-managed database encryption in the rebuild. The app runs
locally and should rely on the user's operating system account and disk encryption rather
than introducing key management, recovery, packaging, and support complexity before there
is a concrete compliance requirement.

**Consequences**

- SQLite can use the normal `better-sqlite3` database file.
- Sensitive-data requirements should be revisited before launch if customers require
  app-level encryption.
- The persistence adapter remains the boundary where SQLCipher or another encryption
  approach could be introduced later.
