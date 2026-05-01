# Product-Scoped Package Names

Workspace packages should use the `@cmm/*` scope because the monorepo represents one
product and product-scoped names make package responsibilities clearer than generic
`@repo/*` names. The rebuild should use package names such as `@cmm/domain`,
`@cmm/application`, `@cmm/contracts`, `@cmm/workbook`, `@cmm/persistence-sqlite`, and
`@cmm/ui`.

**Consequences**

- Internal workspace dependencies should use the `workspace:*` protocol under the
  `@cmm/*` package names.
- Imports should communicate product responsibility directly.
- The rebuild can remove placeholder or generic package names that do not reflect CMM's
  domain.
