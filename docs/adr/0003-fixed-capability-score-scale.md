# Fixed Capability Score Scale

CMM should use a fixed 0-3 capability score scale for member responses because that scale
is standard for the procurement workflow this app supports. Opportunity-specific legend
text may explain the score meanings, but the stored score values, workbook validation,
and comparison logic should treat 0, 1, 2, and 3 as the only valid scores.

**Consequences**

- Score storage and comparison logic can use a constrained numeric value rather than a
  configurable scale model.
- Workbook exports should validate against 0, 1, 2, and 3.
- Imports with other score values should enter review as invalid rather than expanding
  the allowed scale.
