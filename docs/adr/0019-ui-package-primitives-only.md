# UI Package Primitives Only

`@cmm/ui` should provide generic React DOM primitives and theme tokens, not CMM-specific
business components. Domain components such as the base matrix requirements editor belong
in renderer feature or widget folders where their product assumptions are explicit.

**Consequences**

- `@cmm/ui` can contain primitives such as buttons, inputs, modals, drawers, badges, and
  data table building blocks.
- Components that know about opportunities, requirements, member responses, or scoring
  stay out of the primitive UI package.
- The renderer owns CMM-specific composition and workflow UI.
