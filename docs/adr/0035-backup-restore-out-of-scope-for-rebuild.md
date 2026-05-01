# Backup and Restore Out of Scope for Rebuild

The rebuild should not include app-data backup or restore workflows. CMM will store local
SQLite data in the standard Electron user data directory, and workbook export remains a
member-response workflow artifact rather than an app-state backup mechanism.

**Consequences**

- The persistence layer does not need portable backup packaging or restore conflict logic.
- Development docs can mention where local data lives.
- Backup/export of full app state can be revisited after core opportunity, matrix, import,
  and comparison workflows are stable.
