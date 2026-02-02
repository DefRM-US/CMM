import '@testing-library/jest-native/extend-expect';

// Mock native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock AsyncStorage if used
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
