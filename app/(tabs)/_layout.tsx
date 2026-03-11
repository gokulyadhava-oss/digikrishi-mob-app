import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { HapticTab } from '@/components/haptic-tab';
import { useAuth } from '@/contexts/auth-context';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  const { user } = useAuth();

  if (user === null) {
    return <Redirect href="/login" />;
  }

  const isFieldOfficer = user.role === 'FIELD_OFFICER';

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
            <MaterialCommunityIcons name="view-dashboard-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add-farmer"
        options={{
          title: 'Add farmer',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="account-plus-outline" size={24} color={color} />
          ),
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
