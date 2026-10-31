import React, { createContext, useState, useEffect } from 'react';
import { View, ActivityIndicator, StatusBar, TouchableOpacity, Text, Alert } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './components/HomeScreen';
import DetailsScreen from './components/DetailsScreen';
import EditScreen from './components/EditScreen';
import DevScreen from './components/DevScreen';
import SettingsScreen from './components/SettingsScreen'; // NEW

export const DocContext = createContext();
const Stack = createNativeStackNavigator();

const MyTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: '#0D0D0D', card: '#1A1A1A', text: '#FFFFFF', primary: '#E50914' },
};

const DOCS_KEY = 'SECURE_VAULT_DOCS';
const PREFS_KEY = 'SECURE_VAULT_PREFS';

export default function App() {
  const [documents, setDocumentsState] = useState({});
  const [preferences, setPreferencesState] = useState({ pinnedDocs: [], pinnedFields: {}, docOrder: [], appSettings: {} });
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Tracks Biometrics

  useEffect(() => {
    async function loadData() {
      try {
        const storedDocs = await SecureStore.getItemAsync(DOCS_KEY);
        const storedPrefs = await SecureStore.getItemAsync(PREFS_KEY);
        
        let loadedPrefs = storedPrefs ? JSON.parse(storedPrefs) : {};
        if (storedDocs) setDocumentsState(JSON.parse(storedDocs));
        if (storedPrefs) setPreferencesState(loadedPrefs);

        // --- BIOMETRIC CHECK ---
        if (loadedPrefs?.appSettings?.biometric) {
          const hasHardware = await LocalAuthentication.hasHardwareAsync();
          const isEnrolled = await LocalAuthentication.isEnrolledAsync();
          
          if (hasHardware && isEnrolled) {
            const authResult = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Unlock Secure Vault',
              fallbackLabel: 'Use Passcode',
            });
            if (authResult.success) {
              setIsAuthenticated(true);
            } else {
              Alert.alert("Locked", "Authentication failed. Restart app to try again.");
              return; // Stop loading if auth fails
            }
          } else {
            setIsAuthenticated(true); // Bypass if phone has no lock set up
          }
        } else {
          setIsAuthenticated(true); // Bypass if setting is off
        }
      } catch (error) {
        console.error("Failed to load", error);
      } finally {
        setIsReady(true);
      }
    }
    loadData();
  }, []);

  const setDocuments = async (newDocs) => {
    setDocumentsState(newDocs); 
    await SecureStore.setItemAsync(DOCS_KEY, JSON.stringify(newDocs));
  };
  const setPreferences = async (newPrefs) => {
    setPreferencesState(newPrefs);
    await SecureStore.setItemAsync(PREFS_KEY, JSON.stringify(newPrefs));
  };

  if (!isReady || !isAuthenticated) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0D0D', justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="lock-closed" size={50} color="#E50914" style={{ marginBottom: 20 }} />
        <ActivityIndicator size="large" color="#E50914" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DocContext.Provider value={{ documents, setDocuments, preferences, setPreferences }}>
        <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />
        <NavigationContainer theme={MyTheme}>
          <Stack.Navigator initialRouteName="Home">
            
            <Stack.Screen 
              name="Home" 
              component={HomeScreen} 
              options={({ navigation }) => ({ 
                headerTitle: () => (
                  <TouchableOpacity activeOpacity={0.5} onPress={() => navigation.navigate('Dev')}>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>My Vault</Text>
                  </TouchableOpacity>
                ),
                // NEW: SETTINGS BUTTON
                headerRight: () => (
                  <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={{ padding: 5 }}>
                    <Ionicons name="settings-outline" size={24} color="#fff" />
                  </TouchableOpacity>
                )
              })} 
            />

            <Stack.Screen name="Details" component={DetailsScreen} />
            <Stack.Screen name="Edit" component={EditScreen} />
            <Stack.Screen name="Dev" component={DevScreen} options={{ title: 'Developer Tools' }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />

          </Stack.Navigator>
        </NavigationContainer>
      </DocContext.Provider>
    </GestureHandlerRootView>
  );
}