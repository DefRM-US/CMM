# Import Review for Row-Level Workbook Issues

Returned member response workbooks should be rejected only when CMM cannot extract any
usable response rows or the file is clearly not a capability matrix response. Row-level
issues such as invalid scores, missing identifiers, text mismatches, or ambiguous
mappings should enter import review so the user can decide how each row is handled.

**Consequences**

- Import parsing must separate workbook-level failure from row-level review issues.
- The review workflow needs explicit per-row decisions rather than a single all-or-nothing
  validation result.
- Saved member responses may contain reviewed omissions or unresolved rows only when the
  user chose that outcome.
