import { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import AuthStack from './AuthStack';
import AppStack from './AppStack';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';

const DEV_BYPASS = true; // set false to re-enable auth

export default function RootNavigator() {
  const { session, profile, loading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  if (DEV_BYPASS) {
    return (
      <NavigationContainer>
        <AppStack />
      </NavigationContainer>
    );
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={theme.colors.ink} size="large" />
      </View>
    );
  }

  if (!session && !showAuth) {
    return <OnboardingScreen onGoToLogin={() => setShowAuth(true)} />;
  }

  if (!session && showAuth) {
    return (
      <NavigationContainer>
        <AuthStack />
      </NavigationContainer>
    );
  }

  if (session && !profile?.onboarding_complete) {
    return <OnboardingScreen onGoToLogin={() => setShowAuth(true)} startAtStep={3} />;
  }

  return (
    <NavigationContainer>
      <AppStack />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: theme.colors.ivory,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
