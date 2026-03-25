import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, theme } from '../../shared/theme';
import type { ExamStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<ExamStackParamList, 'ExamResult'>;
type R = RouteProp<ExamStackParamList, 'ExamResult'>;

export function ExamResultScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const insets = useSafeAreaInsets();
  const { correct, total } = route.params;

  return (
    <View style={[styles.wrap, { paddingTop: 16, paddingBottom: insets.bottom + 24 }]}>
      <Text style={styles.score}>
        {correct} / {total}
      </Text>
      <Text style={styles.hint}>
        {total > 0 ? `${Math.round((correct / total) * 100)}%` : ''}
      </Text>
      <Pressable style={styles.btn} onPress={() => navigation.popToTop()}>
        <Text style={styles.btnText}>返回选节</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.paper, paddingHorizontal: 24 },
  score: {
    fontFamily: font.display,
    fontSize: 40,
    fontWeight: '700',
    color: theme.pine,
    marginBottom: 8,
  },
  hint: { fontFamily: font.serif, color: theme.inkMuted, marginBottom: 28 },
  btn: {
    backgroundColor: theme.pine,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontFamily: font.serif, fontWeight: '700', letterSpacing: 2 },
});
