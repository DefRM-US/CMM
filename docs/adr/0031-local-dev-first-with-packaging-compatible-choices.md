# Local Dev First with Packaging-Compatible Choices

The rebuild should prioritize local development and test builds first, while avoiding
architecture or dependency choices that would block packaging CMM as a real desktop app
later. Installer, signing, and notarization work should not block the architecture reset,
but native dependencies and Electron wiring should remain packaging-compatible.

**Consequences**

- Native modules such as `better-sqlite3` stay isolated and should be checked against
  Electron packaging before release work.
- Packaging smoke tests can be added after the core rebuild stabilizes.
- The rebuild should not depend on local-only hacks that cannot ship in an Electron app.
