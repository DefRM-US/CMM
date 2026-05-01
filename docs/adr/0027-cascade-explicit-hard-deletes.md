# Cascade Explicit Hard Deletes

Normal CMM workflows should archive opportunities, retire requirements, and archive
previous member responses, but explicit confirmed hard deletes should cascade child data.
Hard-deleting an archived opportunity removes its requirements, member responses, and
response rows; hard-deleting a previous submission removes its rows.

**Consequences**

- SQLite foreign keys should be enabled and use appropriate cascade behavior for hard
  deletes.
- Soft deletion remains the default user workflow.
- Hard-deleting retired requirements that are referenced by response rows should require
  an impact-aware cleanup flow rather than being a casual row deletion.
