# Domain Without Schema Library Dependency

`@cmm/domain` should stay pure TypeScript and should not depend on Zod or another schema
library. Runtime schemas belong at boundaries such as IPC contracts, workbook parsing,
and persistence adapters, while domain rules expose typed functions and explicit
validation results.

**Consequences**

- Domain logic remains easy to test without transport or adapter dependencies.
- IPC DTO schemas can evolve without turning domain objects into transport objects.
- Boundary adapters are responsible for converting untrusted data into domain-safe input.
