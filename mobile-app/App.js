import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// AUTH & PROFILE SCREENS
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ProfileSettingsScreen from './src/screens/ProfileSettingsScreen';

// MAIN APP SCREENS
import DashboardScreen from './src/screens/DashboardScreen';
import VisitorScreen from './src/screens/VisitorScreen';
import ServiceRequestScreen from './src/screens/ServiceRequestScreen';
import SecurityVisitorApprovalScreen from './src/screens/SecurityVisitorApprovalScreen';
import QRCodeDisplayScreen from './src/screens/QRCodeDisplayScreen';
import AdminServiceRequestsScreen from './src/screens/AdminServiceRequestsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          {/* AUTH */}
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />

          {/* MAIN */}
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
          <Stack.Screen name="Visitors" component={VisitorScreen} />
          <Stack.Screen name="ServiceRequests" component={ServiceRequestScreen} />
          <Stack.Screen
            name="AdminServiceRequests"
            component={AdminServiceRequestsScreen}
          />
          <Stack.Screen
            name="SecurityVisitorApproval"
            component={SecurityVisitorApprovalScreen}
          />

          {/* PROFILE */}
          <Stack.Screen
            name="ProfileSettings"
            component={ProfileSettingsScreen}
          />

          {/* QR */}
          <Stack.Screen
            name="QRCodeDisplay"
            component={QRCodeDisplayScreen}
            options={{
              headerShown: true,
              title: 'QR Code',
              headerBackTitle: 'Back',
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
