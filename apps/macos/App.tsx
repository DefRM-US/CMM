import { ThemeProvider } from '@repo/ui';
import React from 'react';
import { Text as RNText, View } from 'react-native';
import { ComponentShowcase } from './src/screens/ComponentShowcase';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#000', padding: 20 }}>
          <RNText style={{ color: '#ff0000', fontSize: 18, fontWeight: 'bold' }}>Error:</RNText>
          <RNText style={{ color: '#ff6666', fontSize: 14, marginTop: 10 }}>
            {this.state.error?.message}
          </RNText>
        </View>
      );
    }
    return this.props.children;
  }
}

function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ComponentShowcase />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
