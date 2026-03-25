import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  createExamSession,
  getDefaultBankId,
  insertExamAnswer,
} from '../../db/repository';
import { getBankBootstrapPromise } from '../importer/importService';
import type { Question } from '../../types/models';
import { QuestionCard } from '../../shared/questionCard';
import { getOrLoadSectionQuestions } from '../../shared/sectionQuestionCache';
import { font, theme } from '../../shared/theme';
import type { ExamStackParamList } from '../../types/navigation';

type Nav = NativeStackNavigationProp<ExamStackParamList, 'ExamQuiz'>;
type R = RouteProp<ExamStackParamList, 'ExamQuiz'>;

export function ExamQuizScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<R>();
  const insets = useSafeAreaInsets();
  const { sectionIndex, durationMinutes, questionCount } = route.params;

  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [timeLeftSec, setTimeLeftSec] = useState(0);
  const [bankId, setBankId] = useState<string | null>(null);
  const doneRef = useRef(false);

  const answersRef = useRef(answers);
  answersRef.current = answers;

  const running = startedAt !== null;
  const current = questions[idx] ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    doneRef.current = false;
    try {
      await getBankBootstrapPromise().catch(() => {});
      const bid = await getDefaultBankId();
      setBankId(bid);
      if (!bid) {
        setQuestions([]);
        return;
      }
      const full = await getOrLoadSectionQuestions(bid, sectionIndex);
      const take = Math.min(questionCount, full.length);
      if (take === 0) {
        setQuestions([]);
        navigation.goBack();
        return;
      }
      setQuestions(full.slice(0, take));
      setIdx(0);
      setAnswers({});
      const start = Date.now();
      setStartedAt(start);
      setTimeLeftSec(Math.max(60, durationMinutes * 60));
    } finally {
      setLoading(false);
    }
  }, [durationMinutes, navigation, questionCount, sectionIndex]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = useCallback(
    async () => {
      if (!startedAt || !bankId || doneRef.current) return;
      doneRef.current = true;
      const endedAt = Date.now();
      const sessionId = `exam_${endedAt}`;
      let correct = 0;
      const ans = answersRef.current;

      for (const q of questions) {
        const selected = ans[q.id] ?? null;
        const ok = selected === q.answer;
        if (ok) correct += 1;
        else await addWrong(q.id);
        await insertExamAnswer(sessionId, q.id, selected, ok);
      }

      await createExamSession(
        sessionId,
        bankId,
        startedAt,
        endedAt,
        Math.floor((endedAt - startedAt) / 1000),
        questions.length,
        correct
      );
      setStartedAt(null);
      navigation.replace('ExamResult', { correct, total: questions.length });
    },
    [bankId, navigation, questions, startedAt]
  );

  const submitRef = useRef(submit);
  submitRef.current = submit;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setTimeLeftSec((v) => {
        if (v <= 1) {
          clearInterval(t);
          void submitRef.current();
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [running]);

  const formattedTime = useMemo(() => {
    const mm = String(Math.floor(timeLeftSec / 60)).padStart(2, '0');
    const ss = String(timeLeftSec % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }, [timeLeftSec]);

  if (loading || !current) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={theme.pine} />
        <Text style={styles.loadText}>载入试卷…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.topBar}>
        <Pressable style={styles.iconHit} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={24} color={theme.inkMuted} />
        </Pressable>
        <Text style={styles.timer}>{formattedTime}</Text>
        <Pressable style={styles.iconHit} onPress={() => void submit()} hitSlop={8}>
          <Ionicons name="paper-plane" size={22} color={theme.rust} />
        </Pressable>
      </View>

      <Text style={styles.progress}>
        {idx + 1} / {questions.length}
      </Text>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <QuestionCard
          question={current}
          selected={answers[current.id] ?? null}
          onSelect={(v) => setAnswers((p) => ({ ...p, [current.id]: v }))}
          showAnswer={false}
          minimal
        />
      </ScrollView>

      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.navIcon, idx === 0 && styles.navIconOff]}
          onPress={() => setIdx((v) => Math.max(0, v - 1))}
          disabled={idx === 0}
        >
          <Ionicons name="chevron-back" size={28} color={theme.ink} />
        </Pressable>
        <Pressable
          style={[styles.navIcon, idx >= questions.length - 1 && styles.navIconOff]}
          onPress={() => setIdx((v) => Math.min(questions.length - 1, v + 1))}
          disabled={idx >= questions.length - 1}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  iconHit: { padding: 10 },
  timer: {
    flex: 1,
    textAlign: 'center',
    fontFamily: font.display,
    fontSize: 22,
    fontWeight: '700',
    color: theme.rust,
  },
  progress: {
    textAlign: 'center',
    fontFamily: font.serif,
    fontSize: 13,
    color: theme.inkMuted,
    marginBottom: 4,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 20 },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  navIcon: { padding: 12 },
  navIconOff: { opacity: 0.25 },
});
