import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { TextInput, Button, ActivityIndicator, useTheme, Text } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/auth-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const colorScheme = useColorScheme() ?? 'dark';
  const emeraldBorder = Colors[colorScheme].emeraldBorder ?? Colors[colorScheme].cardBorder;

  const handleLoginAsFarmer = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    try {
      await login(email.trim(), password, 'FARMER');
      router.replace('/(tabs)');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Login failed';
      Alert.alert('Login failed', message);
    }
  };

  const handleLoginAsFieldOfficer = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    try {
      await login(email.trim(), password, 'FIELD_OFFICER');
      router.replace('/(tabs)');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Login failed';
      Alert.alert('Login failed', message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: emeraldBorder }]}>
          <View style={styles.logoWrap}>
            <Image
              source={require('@/assets/images/digi-prishi-logo.webp')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text variant="headlineMedium" style={styles.title}>
            Digi Krishi
          </Text>
          <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
            Sign in to continue
          </Text>

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            mode="outlined"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            disabled={isLoading}
            style={styles.input}
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            mode="outlined"
            secureTextEntry
            autoComplete="password"
            disabled={isLoading}
            style={styles.input}
          />

          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
          ) : (
            <>
              <Button
                mode="contained"
                onPress={handleLoginAsFarmer}
                style={styles.primaryBtn}>
                Login as farmer
              </Button>
              <Button
                mode="outlined"
                onPress={handleLoginAsFieldOfficer}
                style={styles.secondaryBtn}>
                Login as field officer
              </Button>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  keyboard: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    padding: 24,
    borderRadius: 12,
    gap: 16,
    borderWidth: 1,
  },
  logoWrap: {
    alignSelf: 'center',
    marginBottom: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  input: {
    marginBottom: 0,
  },
  primaryBtn: {
    marginTop: 8,
  },
  secondaryBtn: {},
  loader: {
    marginTop: 16,
  },
});
