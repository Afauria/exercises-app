import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Platform } from 'react-native';
import type { PracticeStackParamList } from '../../types/navigation';
import { AppHeaderActions } from '../../shared/AppHeaderActions';
import { PracticeHomeScreen } from './PracticeHomeScreen';
import { PracticeQuizScreen } from './PracticeQuizScreen';

const Stack = createNativeStackNavigator<PracticeStackParamList>();

export function PracticeNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#f4f0e8' },
        headerTintColor: '#1c1917',
        headerTitleStyle: {
          fontFamily: Platform.select({
            ios: 'Palatino',
            android: 'serif',
            web: 'Georgia, "Noto Serif SC", serif',
            default: 'serif',
          }),
          fontWeight: '700',
        },
      }}
    >
      <Stack.Screen
        name="PracticeHome"
        component={PracticeHomeScreen}
        options={{ title: '练习', headerRight: () => <AppHeaderActions /> }}
      />
      <Stack.Screen name="PracticeQuiz" component={PracticeQuizScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
