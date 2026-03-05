import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

SplashScreen.preventAutoHideAsync();

import { LoadingScreen } from '@/components/loading-screen';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { registerTranslation, en } from 'react-native-paper-dates';
import 'react-native-reanimated';

registerTranslation('en', en);

// Log uncaught JS errors so they appear in adb logcat when debugging release crashes
const originalHandler = ErrorUtils.getGlobalHandler?.();
if (typeof ErrorUtils !== 'undefined' && ErrorUtils.setGlobalHandler) {
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    const message = error?.message ?? String(error);
    const stack = error?.stack ?? '';
    console.error('[JS CRASH]', message, '\n', stack);
    if (__DEV__ && typeof alert === 'function') {
      alert(`JS Error: ${message}\n\n${stack.slice(0, 500)}`);
    }
    originalHandler?.(error, isFatal);
  });
}

import { AuthProvider } from '@/contexts/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import { paperLightTheme, paperDarkTheme } from '@/constants/paper-theme';

const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.primary,
    background: Colors.light.background,
    text: Colors.light.text,
    border: Colors.light.border,
  },
};

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.dark.primary,
    background: Colors.dark.background,
    text: Colors.dark.text,
    border: Colors.dark.border,
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const paperTheme = colorScheme === 'dark' ? paperDarkTheme : paperLightTheme;
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PaperProvider theme={paperTheme}>
          <ThemeProvider value={colorScheme === 'dark' ? CustomDarkTheme : LightTheme}>
            <View style={{ flex: 1 }}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="farmer/[id]"
                  options={{
                    headerShown: true,
                    title: 'Farmer',
                    headerBackTitle: 'Back',
                  }}
                />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              </Stack>
              {showLoadingScreen && (
                <LoadingScreen onFinish={() => setShowLoadingScreen(false)} />
              )}
            </View>
            <StatusBar style="light" />
          </ThemeProvider>
        </PaperProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
