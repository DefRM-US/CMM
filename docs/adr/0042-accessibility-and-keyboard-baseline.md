# Accessibility and Keyboard Baseline

The rebuild should preserve keyboard-first base matrix editing and avoid custom controls
that are inaccessible by design. Dense operational UI is acceptable, but core workflows
must remain usable with clear focus states, predictable keyboard behavior, and accessible
dialogs and controls.

**Consequences**

- The base matrix editor should support Enter to insert, Tab to indent, Shift+Tab to
  outdent, and spreadsheet-like navigation where practical.
- Import review and opportunity comparison should support keyboard access for core
  actions.
- Modals and drawers need focus handling and escape behavior.
- Score controls should be accessible form controls rather than click-only visuals.
