import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { Platform } from 'react-native';
import type { ExamStackParamList } from '../../types/navigation';
import { AppHeaderActions } from '../../shared/AppHeaderActions';
import { ExamHomeScreen } from './ExamHomeScreen';
import { ExamQuizScreen } from './ExamQuizScreen';
import { ExamResultScreen } from './ExamResultScreen';

const Stack = createNativeStackNavigator<ExamStackParamList>();

export function ExamNavigator() {
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
        name="ExamHome"
        component={ExamHomeScreen}
        options={{ title: '考试', headerRight: () => <AppHeaderActions /> }}
      />
      <Stack.Screen name="ExamQuiz" component={ExamQuizScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ExamResult" component={ExamResultScreen} options={{ title: '成绩' }} />
    </Stack.Navigator>
  );
}
