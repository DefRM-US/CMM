# Reducer State for Import Review

Import review should use a typed reducer rather than a generic form library, because it
is a workflow with row decisions, mapping targets, score fixes, ignored/unmatched states,
replacement choices, and save-and-review-next progression. Simple create/edit dialogs can
use straightforward local form state.

**Consequences**

- Import review behavior can be unit tested as reducer transitions.
- Row-level decisions remain explicit and typed.
- The UI is not forced into field-centric abstractions that do not match the review
  workflow.
