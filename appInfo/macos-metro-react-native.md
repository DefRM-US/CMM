# macOS Metro React Native Resolution Fix

## Summary
The macOS app hit this error when `ThemedText` was imported from `@repo/ui`:

"View config getter callback for component 'RCTText' must be a function (received 'undefined')"

Root cause: Metro was loading multiple React Native module instances due to the monorepo layout. The macOS app uses `react-native-macos`, while the repo root also contained a different `react-native` version for Windows. When `@repo/ui` was resolved through the monorepo root, Metro could pull the wrong React Native instance, causing module identity mismatches and the RCTText crash.

## Fix
Force Metro (macOS) to always resolve `react-native` and `react-native/*` to the `react-native-macos` package inside the mac app, and block root copies.

The fix lives in:

`apps/macos/metro.config.js`

Key behaviors:
- Map `react-native` and `react-native-macos` to `apps/macos/node_modules/react-native-macos`.
- Block `react-native` and `react-native-macos` from the repo root `node_modules`.
- Use a custom `resolveRequest` to handle deep imports like `react-native/Libraries/...`.
- Enable symlink support for pnpm workspace packages.

## Notes
- The mac app does not have its own `react` dependency in `apps/macos/node_modules`, so Metro is pinned to the repo root `react` to keep a single React instance.
- If Metro settings are changed later, keep these constraints to avoid duplicate React Native instances.

## Verification
- Start Metro from `apps/macos`.
- Rebuild the mac app and refresh the bundle.
- Confirm the app renders normally and the RCTText error is gone.
