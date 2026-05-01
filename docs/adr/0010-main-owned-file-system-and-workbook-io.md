# Main-Owned File System and Workbook IO

The Electron main process should own file dialogs, filesystem access, and workbook
reading/writing. The renderer should call narrow typed operations such as selecting and
parsing member response workbooks or exporting a base capability matrix, and should
receive safe DTOs rather than filesystem paths or generic file APIs.

**Consequences**

- Preload exposes purpose-specific CMM APIs instead of `ipcRenderer` or raw channel names.
- Workbook packages operate on buffers, while Electron adapters handle files.
- Renderer code cannot trigger arbitrary filesystem reads or writes by passing paths.
