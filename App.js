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
        </Stack.Navigator>
      </NavigationContainer>
    </ParentProvider>
  );
}
