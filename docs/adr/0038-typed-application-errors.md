# Typed Application Errors

Application services should use typed errors for expected failure modes and map them to
safe IPC error DTOs. Generic unexpected exceptions should be logged locally and returned
to the renderer as safe unexpected-error responses rather than leaking implementation
details.

**Consequences**

- Expected failures such as validation errors, not found records, save conflicts, wrong
  opportunity workbooks, no usable response rows, and required import review can drive
  specific UI recovery states.
- IPC handlers should translate service errors consistently.
- Final user-facing error copy belongs in the renderer; services and contracts expose
  stable error codes and structured details.
- Logs can retain diagnostic context while renderer errors stay user-safe.
