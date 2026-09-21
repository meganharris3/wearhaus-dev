module.exports = {
  preset: 'jest-expo',
  // On a cold transform cache the first render in a file compiles React Native and
  // jest-expo lazily, which can take 10-25s and blows the 5s default.
  testTimeout: 30000,
  // Prefer TypeScript sources over stray legacy .js/.jsx files (e.g. the old Vite app's
  // src/components/ItemCard.jsx, which is gitignored but may exist in a local checkout).
  moduleFileExtensions: ['ts', 'tsx', 'js', 'mjs', 'cjs', 'jsx', 'json', 'node'],
  setupFiles: ['./src/__tests__/setup/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@supabase/.*)',
  ],
  testMatch: [
    '**/__tests__/**/*.test.{ts,tsx}',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/services/**/*.{ts,tsx}',
    'src/components/**/*.{ts,tsx}',
    'src/context/**/*.{ts,tsx}',
    'src/screens/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches:   80,
      functions:  80,
      lines:      80,
      statements: 80,
    },
  },
};
