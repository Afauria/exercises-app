import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  addWrong,
  getDefaultBankId,
  getQuestionsByIds,
  isFavorite,
  recordPractice,
  removeWrong,
  toggleFavorite,
} from '../../db/repository';
import { getBankBootstrapPromise } from '../importer/importService';
import type { Question } from '../../types/models';
import { QuestionCard } from '../../shared/questionCard';
import { useRevealAnswersStore } from '../../shared/revealAnswersStore';
import { getOrLoadSectionQuestions } from '../../shared/sectionQuestionCache';
import { font, theme } from '../../shared/theme';
import type { PracticeStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<PracticeStackParamList, 'PracticeQuiz'>;
type R = RouteProp<PracticeStackParamList, 'PracticeQuiz'>;

function orderByIds(questions: Question[], ids: number[]): Question[] {
  const map = new Map(questions.map((q) => [q.id, q]));
  return ids.map((id) => map.get(id)).filter(Boolean) as Question[];
}

export function PracticeQuizScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const insets = useSafeAreaInsets();
  const params = route.params;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showSingle, setShowSingle] = useState(false);
  const [favorited, setFavorited] = useState(false);

  const current = questions[idx] ?? null;
  const revealAll = useRevealAnswersStore((s) => s.revealAll);
  const showAnswer = showSingle || revealAll;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      await getBankBootstrapPromise().catch(() => {});
      const bid = await getDefaultBankId();
      if (!bid) {
        setLoadError('无题库');
        setQuestions([]);
        return;
      }
      if (params.mode === 'search') {
        const rows = await getQuestionsByIds(params.questionIds);
        const ordered = orderByIds(rows, params.questionIds);
        setQuestions(ordered);
        const start = Math.min(
          Math.max(0, params.startIndex ?? 0),
          Math.max(0, ordered.length - 1)
        );
        setIdx(start);
      } else {
        const list = await getOrLoadSectionQuestions(bid, params.sectionIndex);
        setQuestions(list);
        setIdx(0);
      }
      setSelected(null);
      setShowSingle(false);
    } catch (e) {
      setLoadError(String(e));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!current) {
      setFavorited(false);
      return;
    }
    void isFavorite(current.id).then(setFavorited);
  }, [current?.id]);

  const goNext = async () => {
    if (!current) return;
    if (selected) {
      const ok =
        selected.trim() === String(current.answer ?? '').trim();
      try {
        await recordPractice(current.id, ok, selected);
        if (ok) await removeWrong(current.id);
        else await addWrong(current.id);
      } catch (e) {
        // Web SQLite 等环境下写库失败不应阻塞翻页（否则表现为「下一题」无反应，「上一题」仍可用）
        console.warn('[PracticeQuiz] 保存答题记录失败', e);
      }
    }
    if (idx >= questions.length - 1) {
      navigation.goBack();
      return;
    }
    setIdx((v) => v + 1);
    setSelected(null);
    setShowSingle(false);
  };

  const goPrev = () => {
    if (idx <= 0) return;
    setIdx((v) => v - 1);
    setSelected(null);
    setShowSingle(false);
  };

  const onToggleFav = async () => {
    if (!current) return;
    setFavorited(await toggleFavorite(current.id));
  };

  const progress = useMemo(() => {
    if (questions.length === 0) return '';
    return `${idx + 1} / ${questions.length}`;
  }, [idx, questions.length]);

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.pine} />
        <Text style={styles.loadText}>载入本题组…</Text>
      </View>
    );
  }

  if (loadError || !current) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.err}>{loadError ?? '无题目'}</Text>
        <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>返回</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.topBar}>
        <Pressable
          style={styles.iconHit}
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="返回练习列表"
        >
          <Ionicons name="chevron-back" size={26} color={theme.ink} />
        </Pressable>
        <Text style={styles.progress}>{progress}</Text>
        <View style={styles.topRight}>
          <Pressable style={styles.iconHit} onPress={() => setShowSingle((s) => !s)} hitSlop={8}>
            <Ionicons
              name={showAnswer ? 'eye' : 'eye-outline'}
              size={22}
              color={showAnswer ? theme.pine : theme.inkMuted}
            />
          </Pressable>
          <Pressable style={styles.iconHit} onPress={() => void onToggleFav()} hitSlop={8}>
            <Ionicons
              name={favorited ? 'heart' : 'heart-outline'}
              size={22}
              color={favorited ? theme.rust : theme.inkMuted}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <QuestionCard
          question={current}
          selected={selected}
          onSelect={setSelected}
          showAnswer={showAnswer}
          minimal
        />
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.navIcon, idx === 0 && styles.navIconOff]}
          onPress={goPrev}
          disabled={idx === 0}
          accessibilityRole="button"
          accessibilityLabel="上一题"
        >
          <Ionicons name="chevron-back" size={28} color={theme.ink} />
        </Pressable>
        <Pressable
          style={styles.navIcon}
          onPress={() => void goNext()}
          accessibilityRole="button"
          accessibilityLabel="下一题"
        >
          <Ionicons name="chevron-forward" size={28} color={theme.pine} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.paper },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.paper },
  loadText: { marginTop: 12, fontFamily: font.serif, color: theme.inkMuted },
  err: { fontFamily: font.serif, color: theme.rust, marginBottom: 12 },
  backLink: { padding: 12 },
  backLinkText: { fontFamily: font.serif, color: theme.pine, fontWeight: '700' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  iconHit: { padding: 8 },
  progress: {
    flex: 1,
    textAlign: 'center',
    fontFamily: font.display,
    fontSize: 15,
    color: theme.inkMuted,
  },
  topRight: { flexDirection: 'row', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 24 },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
    backgroundColor: theme.paper,
    // Web 上避免 ScrollView 叠在底栏之上吞掉右侧「下一题」点击
    position: 'relative',
    zIndex: 2,
    elevation: 6,
  },
  navIcon: { padding: 12 },
  navIconOff: { opacity: 0.25 },
});
