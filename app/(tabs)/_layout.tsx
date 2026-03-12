import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { HapticTab } from '@/components/haptic-tab';
import { useAuth } from '@/contexts/auth-context';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  const { user, hydrated } = useAuth();

  // Wait until auth state has been rehydrated from secure storage before
  // deciding whether to redirect to the login screen.
  if (!hydrated) {
    return null;
  }

  if (user === null) {
    return <Redirect href="/login" />;
  }

  const isFieldOfficer = user.role === 'FIELD_OFFICER';
  const isFarmer = user.role === 'FARMER';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="account-circle-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="home-plot"
        options={{
          title: 'Plot',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="sprout" size={24} color={color} />
          ),
          // Only farmers see this tab
          href: isFarmer ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="home-tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="clipboard-check-outline" size={24} color={color} />
          ),
          // Only farmers see this tab
          href: isFarmer ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="add-farmer"
        options={{
          title: 'Add farmer',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="account-plus-outline" size={24} color={color} />
          ),
          // Only field officers see this tab
          href: isFieldOfficer ? undefined : null,
        }}
      />
    </Tabs>
  );
}
