# Big-Bang Rebuild Staged by Vertical Slices

CMM should use a mostly big-bang architecture rebuild because the app has not launched
and the prototype architecture is not worth preserving through a long strangler migration.
The rebuild should still be staged by vertical workflow slices so each increment can be
tested and reviewed before the old screen, core package, and JSON store are removed.

**Consequences**

- New architecture can replace prototype boundaries instead of maintaining compatibility
  adapters between old and new internals.
- Critical characterization tests should protect product behavior before replacement.
- Implementation planning should focus on vertical slices that cut through domain,
  application, persistence, IPC, and renderer UI where practical.
