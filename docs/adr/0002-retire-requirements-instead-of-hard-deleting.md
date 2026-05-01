# Retire Requirements Instead of Hard Deleting

Requirements removed from a base capability matrix should be retired rather than hard
deleted, because member responses may already be mapped to those requirements and users
still need to review historical answers. Retired requirements are hidden from the default
matrix and comparison views, but can be expanded or otherwise surfaced when reviewing old
responses.

**Consequences**

- Requirement records need lifecycle state rather than physical deletion as the only
  removal path.
- Member response mappings can remain valid after a requirement is removed from the
  current base matrix.
- The UI needs a way to reveal retired requirements or historical response items without
  cluttering the default opportunity comparison.
