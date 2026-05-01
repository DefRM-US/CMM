# Protect Exported Workbook Structure

Exported base capability matrix workbooks should protect structural columns such as
requirement numbers, requirement text, and hidden requirement IDs while leaving response
fields editable. Protection is intended to reduce accidental edits, not to be a security
boundary, and imports still need review fallbacks for modified workbooks.

**Consequences**

- Workbook generation must apply sheet or cell protection around structural fields.
- Score, past performance reference, and comments remain editable for potential
  consortium members.
- Score cells should use Excel validation or dropdowns for 0, 1, 2, and 3, with
  conditional formatting for readability.
- Import parsing cannot rely on protection being intact.
