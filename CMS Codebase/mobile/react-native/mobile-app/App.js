import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import AnnouncementsScreen from './src/screens/AnnouncementsScreen';
import PaymentsScreen from './src/screens/PaymentsScreen';
import EventsScreen from './src/screens/EventsScreen';
import MembersScreen from './src/screens/MembersScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Import error boundary
import ErrorBoundary from './src/components/ErrorBoundary';

// Import offline indicator
import OfflineIndicator from './src/components/OfflineIndicator';

// Import services
import { APIProvider } from './src/services/api';
import { initDatabase } from './src/services/localDatabase';
import networkService from './src/services/networkService';
import syncService from './src/services/syncService';
import offlineQueueService from './src/services/offlineQueueService';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <ErrorBoundary>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: { backgroundColor: '#ffffff' },
        }}
      >
        <Tab.Screen 
          name="Dashboard" 
          component={DashboardScreen} 
          options={{
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <Icon name="home" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Announcements" 
          component={AnnouncementsScreen} 
          options={{
            tabBarLabel: 'Announcements',
            tabBarIcon: ({ color, size }) => (
              <Icon name="bullhorn" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Payments" 
          component={PaymentsScreen} 
          options={{
            tabBarLabel: 'Payments',
            tabBarIcon: ({ color, size }) => (
              <Icon name="credit-card" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Events" 
          component={EventsScreen} 
          options={{
            tabBarLabel: 'Events',
            tabBarIcon: ({ color, size }) => (
              <Icon name="event" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Members" 
          component={MembersScreen} 
          options={{
            tabBarLabel: 'Members',
            tabBarIcon: ({ color, size }) => (
              <Icon name="people" size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Profile" 
          component={ProfileScreen} 
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Icon name="account" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </ErrorBoundary>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="MainApp" component={MainTabs} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize offline-first services
    const initializeServices = async () => {
      try {
        // Initialize local database
        await initDatabase();
        console.log('Local database initialized');

        // Initialize network service
        await networkService.init();
        console.log('Network service initialized');

        // Initialize sync service
        await syncService.init();
        console.log('Sync service initialized');

        // Initialize offline queue service
        await offlineQueueService.init();
        console.log('Offline queue service initialized');

        // Trigger initial sync if online
        if (networkService.isOnline()) {
          console.log('Online, triggering initial sync...');
          await syncService.syncAll();
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing services:', error);
        setIsInitialized(true); // Still show app even if services fail
      }
    };

    initializeServices();
  }, []);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <APIProvider>
          <NavigationContainer>
            <OfflineIndicator />
            <AuthStack />
          </NavigationContainer>
        </APIProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
