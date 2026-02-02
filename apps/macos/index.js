/**
 * @format
 */

import { AppRegistry, LogBox } from 'react-native';

// Completely disable LogBox - it crashes on macOS with RCTText errors
LogBox.ignoreAllLogs(true);

// Prevent LogBox from installing (aggressive fix for macOS)
if (LogBox.install) {
  LogBox.install = () => {};
}
if (LogBox.uninstall) {
  LogBox.uninstall();
}

// Log errors to console instead
const originalConsoleError = console.error;
console.error = (...args) => {
  originalConsoleError('JS ERROR:', ...args);
};

import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
