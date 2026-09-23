if (typeof (global as any).TextDecoder !== 'undefined') {
  const NativeTextDecoder = (global as any).TextDecoder;
  function SafeTextDecoder(this: any, encoding?: string, _options?: any) {
    if (!(this instanceof SafeTextDecoder)) {
      return new (SafeTextDecoder as any)(encoding);
    }
    return new NativeTextDecoder(encoding);
  }
  SafeTextDecoder.prototype = NativeTextDecoder.prototype;
  (global as any).TextDecoder = SafeTextDecoder;
}

require('fast-text-encoding');

import { LogBox } from 'react-native';
import { Stack } from 'expo-router';

// Suppress development yellow box overlays
LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#ffffff' },
        headerTintColor: '#0f172a',
        headerTitleStyle: { fontWeight: 'bold' },
        contentStyle: { backgroundColor: '#ffffff' },
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="select-cab" />
      <Stack.Screen name="my-bookings" />
      <Stack.Screen name="login" />
      <Stack.Screen name="dashboard" />
    </Stack>
  );
}
