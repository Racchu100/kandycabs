import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { registerRootComponent } from 'expo';

function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>KANDY CABS DRIVER</Text>
      <Text style={styles.subtitle}>Test C: Pure React Native (No Router)</Text>
      <Text style={styles.status}>✓ Direct Root Component Rendered</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f59e0b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 16,
  },
  status: {
    fontSize: 14,
    color: '#38bdf8',
    fontWeight: '600',
  },
});

registerRootComponent(App);
export default App;
