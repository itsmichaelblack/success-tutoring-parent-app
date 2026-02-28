import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ParentProvider } from './src/config/ParentContext';

import WelcomeScreen from './src/screens/WelcomeScreen';
import SignUpLocationScreen from './src/screens/SignUpLocationScreen';
import SignUpDetailsScreen from './src/screens/SignUpDetailsScreen';
import SignUpAgreeScreen from './src/screens/SignUpAgreeScreen';
import MainTabs from './src/navigation/MainTabs';
import EditProfileScreen from './src/screens/EditProfileScreen';
import ManageChildrenScreen from './src/screens/ManageChildrenScreen';
import BillingScreen from './src/screens/BillingScreen';
import MyCentreScreen from './src/screens/MyCentreScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <ParentProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="SignUpLocation" component={SignUpLocationScreen} />
          <Stack.Screen name="SignUpDetails" component={SignUpDetailsScreen} />
          <Stack.Screen name="SignUpAgree" component={SignUpAgreeScreen} />
          <Stack.Screen name="Main" component={MainTabs} options={{ gestureEnabled: false }} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="ManageChildren" component={ManageChildrenScreen} />
          <Stack.Screen name="Billing" component={BillingScreen} />
          <Stack.Screen name="MyCentre" component={MyCentreScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ParentProvider>
  );
}
