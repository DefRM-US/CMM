# Revision-Guarded Base Matrix Saves

Saving a base capability matrix should include the revision the editor loaded, and the
application service should reject stale saves instead of silently overwriting newer data.
Single-user desktop workflows can still race through debounced autosave, project
switching, and multiple in-flight saves, so revision checks are needed even without
multi-user collaboration.

**Consequences**

- Loading and saving the base matrix returns a revision or content hash.
- Autosave calls include the revision they are based on.
- The renderer needs a conflict state instead of treating every save failure as a generic
  error.
- The rebuild should not auto-merge conflicting base matrix edits; the user should choose
  whether to reload the saved version or intentionally keep and save their local draft.
