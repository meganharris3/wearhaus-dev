// Expo CLI's own dotenv loading (.env.local, etc.) only runs under `expo start`/`expo export`,
// not under babel-jest — so src/lib/supabase.ts's process.env.EXPO_PUBLIC_SUPABASE_* reads would
// otherwise be undefined here. Deterministic test-only values so the client config always
// constructs with real strings, regardless of what's in any local .env file.
process.env.EXPO_PUBLIC_SUPABASE_URL ??= 'https://test-project.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock @expo/vector-icons so Ionicons doesn't fail in the test environment
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, ...rest }) => React.createElement(Text, rest, name),
  };
});

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    SafeAreaView: ({ children, ...rest }) =>
      React.createElement(View, rest, children),
    SafeAreaProvider: ({ children }) => children,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

// Silence non-actionable React Native warnings during tests
global.console.warn = jest.fn();
