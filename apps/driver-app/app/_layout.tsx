import 'fast-text-encoding';
import '@kandy-cabs/shared';
import React from 'react';
import { LogBox } from 'react-native';
import { Stack } from 'expo-router';
import '../lib/location-tracker';

// Suppress development yellow box overlays so they do not block driver workflow
LogBox.ignoreAllLogs(true);

export default function RootLayout() {
  return (
    <Stack initialRouteName="index" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" options={{ title: 'Driver Sign In' }} />
      <Stack.Screen name="onboarding" options={{ title: 'Driver Onboarding' }} />
      <Stack.Screen name="dashboard" options={{ title: 'Driver Dashboard' }} />
      <Stack.Screen name="documents" options={{ title: 'Driver Documents' }} />
      <Stack.Screen name="trip" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
