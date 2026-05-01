# Schema-Validated IPC Contracts

IPC between the renderer and Electron main process should be defined in `@cmm/contracts`
with runtime schemas and derived TypeScript types. TypeScript alone is not enough at this
process boundary, so handler registration should validate renderer input and main output
before data crosses the preload bridge.

**Consequences**

- The renderer uses typed, purpose-specific CMM APIs rather than raw channel names.
- Main process handlers validate IPC input before calling application services.
- Contract tests can verify every declared channel has a registered handler.
