import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import AuthStack from './AuthStack';
import AppStack from './AppStack';

export default function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={theme.colors.ink} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? <AppStack /> : <AuthStack />}
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
