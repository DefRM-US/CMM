# ExcelJS for Workbook Build and Parse

`@cmm/workbook` should use ExcelJS for building and parsing base capability matrix and
member response workbooks, because it provides a maintained spreadsheet abstraction for
the formatting, validation, protection, and parsing CMM needs. If a required workbook
feature is not supported directly, the workaround should be isolated rather than
hand-authoring the entire XLSX package.

**Consequences**

- Workbook code works with buffers and exposes CMM-specific build/parse functions.
- Import parsing optimizes for CMM-authored response workbooks and fallback recovery from
  edited CMM workbooks, not arbitrary spreadsheet inference.
- Exported workbooks should include hidden CMM metadata such as workbook format version,
  opportunity ID, export timestamp, and stable requirement IDs.
- If a returned workbook's hidden opportunity ID does not match the current opportunity,
  import should warn and block by default, suggest the matching opportunity when known,
  and require explicit override plus usable requirement matches to continue.
- Exported workbooks should include an editable potential consortium member name field;
  imports prefer that value, fall back to filename, and require user confirmation.
- Opportunity title and solicitation metadata in exported workbooks should be protected;
  potential consortium members edit only their member name and response fields.
- Tests should cover the workbook features CMM relies on, including hidden IDs, protected
  structural cells, score validation, conditional formatting, frozen panes, and parsing.
- The current duplicate hand-authored XLSX implementations should not be carried forward.
