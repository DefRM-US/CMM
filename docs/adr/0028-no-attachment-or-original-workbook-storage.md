# No Attachment or Original Workbook Storage

CMM should not manage file attachments or retain original returned Excel files in the
database. Importing a member response extracts the relevant workbook data, source
filename, and import timestamp, then stores the parsed response record needed for review
and comparison.

**Consequences**

- The app avoids file lifecycle, path portability, and backup concerns for attachments.
- Member response detail views rely on stored parsed row data, not reopening the original
  workbook.
- Stored member response rows should retain both the original parsed workbook values and
  the final reviewed/mapped values.
- Users can re-import a returned workbook if they need to replace or restore response
  data from the original file.
