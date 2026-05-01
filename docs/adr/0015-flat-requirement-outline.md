# Flat Requirement Outline

Requirements in the base capability matrix should be stored as a flat ordered outline
with a level and position, because the editor, Excel export, and computed numbering are
all row-oriented. This is the rebuild baseline and can be revisited if user feedback
shows that explicit tree persistence is needed.

**Consequences**

- Requirement numbers are computed from ordered rows and levels.
- Requirement records do not store visible numbers as source-of-truth; imported member
  response rows may store number snapshots for historical readability.
- Keyboard editing operations can work directly on the ordered list.
- Lifecycle fields such as `retiredAt` can be added without switching to parent/child
  persistence.
- Retired requirements remain in the same ordered outline and are filtered from the
  default view, preserving their original context for historical member responses.
