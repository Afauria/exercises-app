import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import {
  InteractionManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getDefaultBankId, getQuestionCount } from '../../db/repository';
import { getBankBootstrapPromise } from '../importer/importService';
import { GlobalSearchBar } from '../../shared/GlobalSearchBar';
import {
  PAGE_SIZE,
  sectionCountFromTotal,
  sectionRangeLabel,
} from '../../shared/sectionConstants';
import { prefetchInitialSections } from '../../shared/sectionQuestionCache';
import { font, theme } from '../../shared/theme';
import type { ExamStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<ExamStackParamList, 'ExamHome'>;

export function ExamHomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [bankId, setBankId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedSection, setSelectedSection] = useState<number | null>(null);
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [questionCount, setQuestionCount] = useState('50');

  const refresh = useCallback(async () => {
    await getBankBootstrapPromise().catch(() => {});
    const bid = await getDefaultBankId();
    setBankId(bid);
    if (!bid) {
      setTotalCount(0);
      return;
    }
    setTotalCount(await getQuestionCount(bid));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  useFocusEffect(
    useCallback(() => {
      if (!bankId || totalCount === 0) return;
      const task = InteractionManager.runAfterInteractions(() => {
        prefetchInitialSections(bankId, totalCount, 4);
      });
      return () => task.cancel();
    }, [bankId, totalCount])
  );

  const nSec = useMemo(() => sectionCountFromTotal(totalCount), [totalCount]);

  const sectionSize = useMemo(() => {
    if (selectedSection === null || totalCount === 0) return 0;
    const start = selectedSection * PAGE_SIZE;
    return Math.min(PAGE_SIZE, totalCount - start);
  }, [selectedSection, totalCount]);

  const openSearchInPractice = (questionIds: number[], startIndex = 0) => {
    const tab = navigation.getParent() as { navigate: (name: string, params: object) => void } | undefined;
    tab?.navigate('练习', {
      screen: 'PracticeQuiz',
      params: { mode: 'search', questionIds, startIndex },
    });
  };

  const startExam = () => {
    if (selectedSection === null || !bankId) return;
    const mins = Math.max(1, Number(durationMinutes) || 30);
    const want = Math.max(1, Number(questionCount) || 50);
    const n = Math.min(want, sectionSize || PAGE_SIZE);
    navigation.navigate('ExamQuiz', {
      sectionIndex: selectedSection,
      durationMinutes: mins,
      questionCount: n,
    });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: 12, paddingBottom: insets.bottom + 28 },
      ]}
    >
      {bankId ? (
        <Text style={styles.meta}>本节每节最多 {PAGE_SIZE} 题，先选节再开考</Text>
      ) : null}

      <GlobalSearchBar bankId={bankId} onOpenPracticeQuiz={openSearchInPractice} />

      <Text style={styles.h}>1. 选择一节</Text>
      {nSec === 0 ? (
        <Text style={styles.empty}>无可用章节</Text>
      ) : (
        <View style={styles.grid}>
          {Array.from({ length: nSec }, (_, i) => {
            const on = selectedSection === i;
            return (
              <Pressable
                key={i}
                style={[styles.tile, on && styles.tileOn]}
                onPress={() => setSelectedSection(i)}
              >
                <Text style={[styles.tileNum, on && styles.tileNumOn]}>第 {i + 1} 节</Text>
                <Text style={[styles.tileRange, on && styles.tileRangeOn]}>
                  {sectionRangeLabel(i, totalCount)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={styles.h}>2. 本场设置</Text>
      <Text style={styles.label}>时长（分钟）</Text>
      <TextInput
        value={durationMinutes}
        onChangeText={setDurationMinutes}
        keyboardType="number-pad"
        style={styles.input}
      />
      <Text style={styles.label}>
        题量（不超过本节剩余题数{selectedSection !== null ? `，当前节最多 ${sectionSize}` : ''}）
      </Text>
      <TextInput
        value={questionCount}
        onChangeText={setQuestionCount}
        keyboardType="number-pad"
        style={styles.input}
      />

      <Pressable
        style={[styles.start, selectedSection === null && styles.startOff]}
        onPress={startExam}
        disabled={selectedSection === null}
      >
        <Text style={styles.startText}>进入考试</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.paper },
  content: { paddingHorizontal: 18 },
  meta: {
    fontFamily: font.serif,
    fontSize: 13,
    color: theme.inkMuted,
    marginBottom: 10,
    lineHeight: 20,
  },
  h: {
    fontFamily: font.display,
    fontSize: 16,
    color: theme.ink,
    marginTop: 16,
    marginBottom: 10,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '47%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.card,
  },
  tileOn: { borderColor: theme.pine, backgroundColor: theme.pineLight },
  tileNum: {
    fontFamily: font.display,
    fontSize: 16,
    fontWeight: '700',
    color: theme.pine,
    marginBottom: 4,
  },
  tileNumOn: { color: theme.pine },
  tileRange: { fontFamily: font.serif, fontSize: 13, color: theme.inkMuted },
  tileRangeOn: { color: theme.pine },
  empty: { fontFamily: font.serif, color: theme.inkMuted },
  label: { fontFamily: font.serif, fontSize: 13, color: theme.inkMuted, marginBottom: 6 },
  input: {
    fontFamily: font.serif,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.ink,
    backgroundColor: theme.card,
    marginBottom: 12,
  },
  start: {
    marginTop: 20,
    backgroundColor: theme.rust,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  startOff: { opacity: 0.4 },
  startText: {
    color: '#fff',
    fontFamily: font.serif,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 3,
  },
});
