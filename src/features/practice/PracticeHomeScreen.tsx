import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import {
  InteractionManager,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import type { PracticeStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<PracticeStackParamList, 'PracticeHome'>;

export function PracticeHomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [bankId, setBankId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  /** 本轮 focus 拉取是否结束（供 E2E 区分「加载中」与「确无题库」） */
  const [listLoaded, setListLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      await getBankBootstrapPromise().catch(() => {});
      const bid = await getDefaultBankId();
      setBankId(bid);
      if (!bid) {
        setTotalCount(0);
        return;
      }
      const c = await getQuestionCount(bid);
      setTotalCount(c);
    } finally {
      setListLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setListLoaded(false);
      void refresh();
    }, [refresh])
  );

  useFocusEffect(
    useCallback(() => {
      if (!bankId || totalCount === 0) return;
      const task = InteractionManager.runAfterInteractions(() => {
        prefetchInitialSections(bankId, totalCount, 5);
      });
      return () => task.cancel();
    }, [bankId, totalCount])
  );

  const nSec = useMemo(() => sectionCountFromTotal(totalCount), [totalCount]);

  const openSearchQuiz = (questionIds: number[], startIndex = 0) => {
    navigation.navigate('PracticeQuiz', {
      mode: 'search',
      questionIds,
      startIndex,
    });
  };

  const randomSection = () => {
    if (nSec <= 0) return;
    const i = Math.floor(Math.random() * nSec);
    navigation.navigate('PracticeQuiz', { mode: 'section', sectionIndex: i });
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: 12, paddingBottom: insets.bottom + 28 },
      ]}
    >
      {bankId && totalCount > 0 ? (
        <Text style={styles.meta}>
          共 {totalCount} 题 · 每节 {PAGE_SIZE} 题
        </Text>
      ) : null}

      <GlobalSearchBar bankId={bankId} onOpenPracticeQuiz={openSearchQuiz} />

      <View style={styles.rowActions}>
        <Pressable style={styles.ghostBtn} onPress={randomSection} disabled={nSec === 0}>
          <Text style={styles.ghostBtnText}>随机一节</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionHeading}>选择一节</Text>
      {listLoaded ? (
        <View
          testID="practice-home-list-loaded"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.a11yMarker}
        />
      ) : null}
      {nSec === 0 ? (
        <Text style={styles.empty}>无可用章节</Text>
      ) : (
        <View style={styles.grid}>
          {Array.from({ length: nSec }, (_, i) => (
            <Pressable
              key={i}
              style={styles.tile}
              onPress={() =>
                navigation.navigate('PracticeQuiz', { mode: 'section', sectionIndex: i })
              }
            >
              <Text style={styles.tileNum}>第 {i + 1} 节</Text>
              <Text style={styles.tileRange}>{sectionRangeLabel(i, totalCount)}</Text>
            </Pressable>
          ))}
        </View>
      )}
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
  },
  rowActions: { flexDirection: 'row', marginBottom: 8 },
  ghostBtn: {
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.card,
  },
  ghostBtnText: { fontFamily: font.serif, color: theme.ink },
  sectionHeading: {
    fontFamily: font.display,
    fontSize: 16,
    color: theme.ink,
    marginTop: 8,
    marginBottom: 12,
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
  tileNum: {
    fontFamily: font.display,
    fontSize: 16,
    fontWeight: '700',
    color: theme.pine,
    marginBottom: 4,
  },
  tileRange: { fontFamily: font.serif, fontSize: 13, color: theme.inkMuted },
  empty: { fontFamily: font.serif, color: theme.inkMuted },
  a11yMarker: { height: 1, width: 1, opacity: 0, alignSelf: 'flex-start' },
});
