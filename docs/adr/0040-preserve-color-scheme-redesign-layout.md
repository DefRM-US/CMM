# Preserve Color Scheme and Redesign Layout

The rebuild should preserve CMM's existing color scheme and hard-edged operational feel,
but should redesign the layout and component structure around the new architecture and
workflows. The target UI should be dense, cohesive, and work-focused rather than a
surface-level recreation of the prototype screen.

**Consequences**

- Existing theme colors can seed the new `@cmm/ui` theme.
- The renderer should not preserve the 3,000-line prototype screen layout just because it
  exists today.
- AI-generated UI draft images can be used as design references before turning the design
  into real React components, but production UI should be implemented as maintainable
  components and CSS.
