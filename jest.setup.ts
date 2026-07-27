// El mock oficial de @react-native-async-storage/async-storage no está cableado en ningún lado del repo todavía.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
