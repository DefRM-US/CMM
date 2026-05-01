# Local Structured Logging

CMM should write minimal structured main-process logs to a local file in the Electron user
data directory, while showing user-facing errors in the UI for save, import, export, and
persistence failures. The rebuild should not include a log viewer or remote log upload.

**Consequences**

- Main-process service and IPC boundaries should log actionable error context without
  dumping sensitive workbook contents.
- Local logs can help diagnose user-machine issues later.
- Renderer UI still owns clear error states and recovery actions for users.
