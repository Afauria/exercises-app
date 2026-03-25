import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PracticeNavigator } from './src/features/practice/PracticeNavigator';
import { ExamNavigator } from './src/features/exam/ExamNavigator';
import { WrongBookScreen } from './src/features/wrongbook/WrongBookScreen';
import { StatsScreen } from './src/features/stats/StatsScreen';
import { webDatabaseIsEphemeral } from './src/db/database';
import { AppHeaderActions } from './src/shared/AppHeaderActions';
import { getBankBootstrapPromise } from './src/features/importer/importService';

const Tab = createBottomTabNavigator();

export default function App() {
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  useEffect(() => {
    void getBankBootstrapPromise().catch((e) => setBootstrapError(String(e)));
  }, []);

  return (
    <SafeAreaProvider>
      {bootstrapError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>题库自动加载失败：{bootstrapError}</Text>
        </View>
      ) : null}
      {webDatabaseIsEphemeral ? (
        <View style={styles.warnBanner}>
          <Text style={styles.warnText}>
            当前浏览器不支持本地持久化（无 OPFS），关闭或刷新页面后数据将清空。如需长期保存记录，请使用桌面版
            Chrome/Edge，或安装 iOS/Android 应用。
          </Text>
        </View>
      ) : null}
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            lazy: true,
            tabBarActiveTintColor: '#1f5c4a',
            tabBarInactiveTintColor: '#78716c',
            tabBarStyle: {
              backgroundColor: '#ebe4d6',
              borderTopColor: '#c9b8a3',
            },
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
          <Tab.Screen
            name="练习"
            component={PracticeNavigator}
            options={{ headerShown: false }}
          />
          <Tab.Screen
            name="考试"
            component={ExamNavigator}
            options={{ headerShown: false }}
          />
          <Tab.Screen
            name="错题"
            component={WrongBookScreen}
            options={{ headerRight: () => <AppHeaderActions /> }}
          />
          <Tab.Screen
            name="统计"
            component={StatsScreen}
            options={{ headerRight: () => <AppHeaderActions /> }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errorBanner: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 8 },
  errorText: { color: '#991b1b' },
  warnBanner: { backgroundColor: '#fef3c7', paddingHorizontal: 12, paddingVertical: 8 },
  warnText: { color: '#92400e', fontSize: 13 },
});
