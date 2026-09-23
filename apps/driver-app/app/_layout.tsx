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

// Suppress development yellow box overlays so they do not block driver workflow
LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" options={{ title: 'Driver Sign In' }} />
      <Stack.Screen name="onboarding" options={{ title: 'Driver Onboarding' }} />
      <Stack.Screen name="dashboard" options={{ title: 'Driver Dashboard' }} />
      <Stack.Screen name="trip/en-route" options={{ title: 'En Route to Pickup' }} />
      <Stack.Screen name="trip/start" options={{ title: 'Start Trip' }} />
      <Stack.Screen name="trip/active" options={{ title: 'Active Trip' }} />
      <Stack.Screen name="trip/complete" options={{ title: 'Trip Summary' }} />
    </Stack>
  );
}
