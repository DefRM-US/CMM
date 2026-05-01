# Internationalization Out of Scope for Rebuild

Internationalization should not be part of the architecture rebuild. UI copy should still
be kept reasonably centralized in renderer code so future localization is not made
unnecessarily hard, but no translation framework or locale workflow is needed now.

**Consequences**

- Product language can stabilize before any translation system is introduced.
- Renderer components should avoid scattering repeated copy where practical.
- Tests and contracts do not need locale variation for the rebuild.
