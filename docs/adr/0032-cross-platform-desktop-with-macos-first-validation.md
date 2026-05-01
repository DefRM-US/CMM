# Cross-Platform Desktop with macOS-First Validation

CMM should remain a cross-platform Electron desktop app, but rebuild validation will
primarily happen on macOS because that is the current development environment. Code should
use Electron and Node path APIs instead of platform assumptions, while Windows and Linux
packaging validation can wait until the product behavior is stable.

**Consequences**

- File dialogs, user data paths, and path handling must remain platform-safe.
- Tests should avoid hardcoded path separators.
- Release packaging for Windows and Linux is later work, not a blocker for the rebuild.
