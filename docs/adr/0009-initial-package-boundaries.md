# Initial Package Boundaries

The rebuild should start with focused `@cmm/*` packages for domain rules, application
services, IPC contracts, workbook parsing/building, SQLite persistence, React DOM UI
primitives, and shared TypeScript config. It should not include legacy persistence or a
generic tooling package until there is real duplicated configuration or validation logic
to justify one.

**Consequences**

- Initial packages are `@cmm/domain`, `@cmm/application`, `@cmm/contracts`,
  `@cmm/workbook`, `@cmm/persistence-sqlite`, `@cmm/ui`, and
  `@cmm/typescript-config`.
- Prototype JSON persistence is not carried forward as a package.
- Boundary checks, shared Vitest presets, or other tooling can move into a package later
  if they become substantial.
