import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MatrixProvider } from '@cmm/state';
import { getDatabase } from '@cmm/db';
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    const initDb = async () => {
      try {
        await getDatabase();
        setIsDbReady(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setDbError(
          error instanceof Error ? error.message : 'Unknown database error'
        );
      }
    };

    initDb();
  }, []);

  if (dbError) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Database Error</Text>
        <Text style={styles.errorMessage}>{dbError}</Text>
      </View>
    );
  }

  if (!isDbReady) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4472C4" />
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <MatrixProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </MatrixProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
