import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { Image, View, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/auth-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function HeaderLogo() {
  return (
    <View style={headerStyles.wrap}>
      <Image
        source={require('@/assets/images/digi-prishi-logo.webp')}
        style={headerStyles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const headerStyles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    maxHeight: 40,
  },
  logo: {
    height: 36,
    width: 120,
  },
});

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();

  if (user === null) {
    return <Redirect href="/login" />;
  }

  const isFieldOfficer = user.role === 'FIELD_OFFICER';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'dark'].tint,
        headerShown: true,
        headerTitle: HeaderLogo,
        headerTitleAlign: 'center',
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="add-farmer"
        options={{
          title: 'Add farmer',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.badge.plus" color={color} />,
          href: isFieldOfficer ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="plot"
        options={{
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
