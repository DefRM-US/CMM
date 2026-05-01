# Remote Telemetry Out of Scope for Rebuild

The rebuild should not include telemetry or remote error reporting. Future telemetry or
diagnostics can be added as an explicit product and privacy decision after the core local
desktop workflows are stable.

**Consequences**

- No remote analytics or error-reporting service is part of the rebuild architecture.
- User-visible errors and local logs remain useful for debugging.
- Any future telemetry should be opt-in or otherwise designed deliberately rather than
  added incidentally.
