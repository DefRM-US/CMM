# Critical Characterization Tests Before Rebuild

Before replacing the prototype architecture, CMM should add focused characterization tests
for critical behavior rather than attempting exhaustive coverage of the current
implementation. The rebuild can then wipe and replace most prototype code while preserving
the essential workflows users will depend on.

**Consequences**

- Tests should prioritize outline numbering/editing, workbook export and parse round
  trips, import review decisions, active versus archived member responses, and persistence
  across app relaunch.
- Large prototype components do not need comprehensive tests before being replaced.
- New packages should add domain, application, workbook, persistence, IPC, and e2e tests
  around the rebuilt architecture.
