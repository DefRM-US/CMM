import { Buffer as BufferPolyfill } from 'buffer';
import process from 'process';

// Polyfill Buffer for React Native
globalThis.Buffer = BufferPolyfill;

// Polyfill process for React Native
if (typeof globalThis.process === 'undefined') {
  globalThis.process = process;
}
// @ts-expect-error - Setting browser flag for ExcelJS
globalThis.process.browser = true;
