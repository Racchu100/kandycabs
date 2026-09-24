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

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { LogBox, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

// Suppress development yellow box overlays
LogBox.ignoreAllLogs(true);

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('RootErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Kandy Cabs</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message || 'Something unexpected occurred. Tap below to reload.'}
          </Text>
          <TouchableOpacity style={styles.reloadBtn} onPress={this.handleReload} activeOpacity={0.8}>
            <Text style={styles.reloadText}>Reload App</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <RootErrorBoundary>
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
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#023c69',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  reloadBtn: {
    backgroundColor: '#023c69',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  reloadText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
