# Lightweight Renderer Layering

The rebuilt renderer should use a lightweight layered structure with `app`, `pages`,
`widgets`, `features`, `entities`, and `shared`, while enforcing downward-only imports.
This keeps feature ownership clear and avoids another monolithic screen without turning
the renderer into a ceremony-heavy implementation of Feature-Sliced Design.

**Consequences**

- Pages compose widgets and should contain minimal workflow logic.
- Features own user actions and local workflow state.
- Entities contain small domain-specific renderers and view models.
- Shared renderer code stays generic to the renderer and should not import feature code.
