import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (__DEV__) {
      console.error('ErrorBoundary caught:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          {this.props.onRetry && (
            <TouchableOpacity style={styles.button} onPress={this.props.onRetry}>
              <Text style={styles.buttonText}>Try again</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.bg,
  },
  title: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  message: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: { color: Colors.onPrimary, fontSize: 16, fontWeight: '600' },
});
