import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import { COLORS } from '../config/theme';

import HomeScreen from '../screens/HomeScreen';
import ExploreScreen from '../screens/ExploreScreen';
import BookingsScreen from '../screens/BookingsScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.orange,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelStyle: { fontWeight: '700', fontSize: 10, marginTop: -2 },
        tabBarStyle: {
          height: 85,
          paddingTop: 8,
          paddingBottom: 28,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          backgroundColor: COLORS.white,
        },
        tabBarIcon: ({ color }) => {
          const icons = { Home: 'home', Explore: 'search', Bookings: 'calendar', Profile: 'user' };
          return <Feather name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Bookings" component={BookingsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
