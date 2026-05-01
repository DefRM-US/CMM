# React DOM Renderer for Electron

The rebuilt Electron renderer should use normal React DOM rather than React Native Web,
because CMM is a desktop-only app and its core workflows need desktop tables, keyboard
editing, dialogs, and dense comparison views. React Native Web and platform shims should
not be carried forward unless mobile becomes a real product target later.

**Consequences**

- Renderer components can use standard DOM elements and desktop web interaction patterns.
- The existing React Native Web compatibility shim should be removed during the rebuild.
- Shared UI primitives should target React DOM, not cross-platform React Native APIs.
