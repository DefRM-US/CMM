# Autosave with Manual Flush for Base Matrix

The base matrix editor should autosave changes while showing clear save status, and it
should also provide a manual save/flush action. Autosave protects long editing sessions,
while manual flush supports user confidence before export, opportunity switching, or app
close.

**Consequences**

- The editor feature needs explicit save states such as idle, dirty, saving, saved,
  conflict, and error.
- Actions that leave the editor or change opportunity lifecycle should flush pending edits
  when possible, including export, import, opportunity switch, archive, restore, hard
  delete, and app close.
- Exporting a base matrix should flush pending edits first and block if saving fails or
  conflicts, so the exported workbook matches what the user sees.
- Importing member responses should flush pending base matrix edits first and block if
  saving fails or conflicts, so import review maps against the current baseline.
- If flushing before opportunity switch or app close fails or conflicts, the UI should
  block the action and let the user retry, discard local edits, or stay on the current
  opportunity.
- Revision conflicts pause autosave and require user choice rather than silent overwrite.
