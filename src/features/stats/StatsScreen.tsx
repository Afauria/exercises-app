import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getExamSessions,
  getPracticeStats,
  getPracticeStatsLastDays,
  getQuestionCount,
} from '../../db/repository';
import { font, theme } from '../../shared/theme';

const BAR_H = 6;

export function StatsScreen() {
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState({
    totalQuestions: 0,
    practicedQuestions: 0,
    totalAttempts: 0,
    correctAttempts: 0,
  });
  const [recent, setRecent] = useState<{ day: string; attempts: number; correct: number }[]>([]);
  const [exams, setExams] = useState<
    { sessionId: string; total: number; correct: number; durationSec: number; endedAt: number }[]
  >([]);

  const load = useCallback(async () => {
    const allCount = await getQuestionCount(null);
    const p = await getPracticeStats();
    const trend = await getPracticeStatsLastDays(30);
    const examRows = await getExamSessions(20);
    setSummary({
      totalQuestions: allCount,
      practicedQuestions: p.practicedQuestions,
      totalAttempts: p.totalAttempts,
      correctAttempts: p.correctAttempts,
    });
    setRecent(trend);
    setExams(examRows);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const accuracy =
    summary.totalAttempts > 0
      ? ((summary.correctAttempts / summary.totalAttempts) * 100).toFixed(1)
      : '0.0';

  const maxAttempts = useMemo(
    () => Math.max(1, ...recent.map((r) => r.attempts), 1),
    [recent]
  );

  return (
    <View style={styles.root}>
      <View style={styles.rail} pointerEvents="none" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
      >
        <View style={styles.hero}>
          <Text style={styles.heroLabel}>练习正确率</Text>
          <Text style={styles.heroNum}>{accuracy}</Text>
          <Text style={styles.heroUnit}>%</Text>
        </View>

        <View style={styles.tileGrid}>
          <View style={[styles.tile, styles.tileDark]}>
            <Text style={[styles.tileVal, styles.tileValOnDark]}>{summary.totalQuestions}</Text>
            <Text style={[styles.tileLab, styles.tileLabOnDark]}>题库总量</Text>
          </View>
          <View style={styles.tile}>
            <Text style={[styles.tileVal, { color: theme.pine }]}>{summary.practicedQuestions}</Text>
            <Text style={styles.tileLab}>已练习</Text>
          </View>
          <View style={styles.tile}>
            <Text style={styles.tileVal}>{summary.totalAttempts}</Text>
            <Text style={styles.tileLab}>作答次数</Text>
          </View>
          <View style={styles.tile}>
            <Text style={[styles.tileVal, { color: theme.rust }]}>{summary.correctAttempts}</Text>
            <Text style={styles.tileLab}>答对次数</Text>
          </View>
        </View>

        <View style={styles.sectionHead}>
          <View style={styles.sectionRule} />
          <Text style={styles.sectionTitle}>近 30 日节奏</Text>
        </View>
        <View style={styles.trendCard}>
          {recent.length === 0 ? (
            <Text style={styles.muted}>还没有练习曲线，做几题后再来看</Text>
          ) : (
            recent.map((r) => {
              const w = Math.max(4, (r.attempts / maxAttempts) * 100);
              const ok = r.attempts > 0 ? (r.correct / r.attempts) * 100 : 0;
              return (
                <View key={r.day} style={styles.trendRow}>
                  <Text style={styles.trendDay}>{r.day.slice(5)}</Text>
                  <View style={styles.trendBarTrack}>
                    <View style={[styles.trendBarFill, { width: `${w}%` }]} />
                  </View>
                  <Text style={styles.trendMeta}>
                    {r.correct}/{r.attempts}
                    {r.attempts > 0 ? ` · ${ok.toFixed(0)}%` : ''}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        <View style={styles.sectionHead}>
          <View style={[styles.sectionRule, { backgroundColor: theme.rust }]} />
          <Text style={styles.sectionTitle}>考试记录</Text>
        </View>
        <View style={styles.examStack}>
          {exams.length === 0 ? (
            <Text style={styles.muted}>完成一场考试后，这里会留下足迹</Text>
          ) : (
            exams.map((e) => (
              <View key={e.sessionId} style={styles.examRow}>
                <View style={styles.examDateCol}>
                  <Text style={styles.examDate}>
                    {new Date(e.endedAt).toLocaleDateString(undefined, {
                      month: 'numeric',
                      day: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.examTime}>
                    {new Date(e.endedAt).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <View style={styles.examMid}>
                  <Text style={styles.examScore}>
                    {e.correct}/{e.total}
                  </Text>
                  <View style={styles.examPill}>
                    <Text style={styles.examPillText}>
                      {e.total > 0 ? `${Math.round((e.correct / e.total) * 100)}%` : '—'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.examDur}>
                  {Math.floor(e.durationSec / 60)}′{String(e.durationSec % 60).padStart(2, '0')}″
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.paper },
  rail: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: theme.rust,
    opacity: 0.55,
  },
  scroll: { flex: 1 },
  content: { paddingLeft: 20, paddingRight: 18, paddingTop: 12 },
  hero: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 22,
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  heroLabel: {
    fontFamily: font.serif,
    fontSize: 14,
    color: theme.inkMuted,
    width: '100%',
    marginBottom: 4,
    letterSpacing: 1,
  },
  heroNum: {
    fontFamily: font.display,
    fontSize: 56,
    lineHeight: 60,
    fontWeight: '700',
    color: theme.pine,
  },
  heroUnit: {
    fontFamily: font.display,
    fontSize: 22,
    color: theme.pine,
    opacity: 0.7,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 26,
  },
  tile: {
    width: '47%',
    backgroundColor: theme.card,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: theme.border,
  },
  tileDark: {
    backgroundColor: '#292524',
    borderColor: '#44403c',
  },
  tileValOnDark: { color: '#fafaf9' },
  tileLabOnDark: { color: '#a8a29e' },
  tileVal: {
    fontFamily: font.display,
    fontSize: 26,
    fontWeight: '700',
    color: theme.ink,
    marginBottom: 4,
  },
  tileLab: { fontFamily: font.serif, fontSize: 12, color: theme.inkMuted },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionRule: { width: 4, height: 18, backgroundColor: theme.pine, borderRadius: 2 },
  sectionTitle: {
    fontFamily: font.display,
    fontSize: 17,
    color: theme.ink,
    letterSpacing: 0.5,
  },
  trendCard: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 24,
  },
  muted: { fontFamily: font.serif, fontSize: 14, color: theme.inkMuted, lineHeight: 22 },
  trendRow: { marginBottom: 12 },
  trendDay: {
    fontFamily: font.display,
    fontSize: 11,
    color: theme.inkMuted,
    marginBottom: 4,
    letterSpacing: 1,
  },
  trendBarTrack: {
    height: BAR_H,
    backgroundColor: theme.paper2,
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 4,
  },
  trendBarFill: {
    height: BAR_H,
    backgroundColor: theme.pine,
    borderRadius: 999,
    opacity: 0.85,
  },
  trendMeta: { fontFamily: font.serif, fontSize: 12, color: theme.inkMuted },
  examStack: { gap: 0, marginBottom: 8 },
  examRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  examDateCol: { width: 52 },
  examDate: { fontFamily: font.display, fontSize: 15, fontWeight: '700', color: theme.ink },
  examTime: { fontFamily: font.serif, fontSize: 11, color: theme.inkMuted },
  examMid: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 12 },
  examScore: { fontFamily: font.display, fontSize: 20, color: theme.pine, fontWeight: '700' },
  examPill: {
    backgroundColor: theme.pineLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  examPillText: { fontFamily: font.serif, fontSize: 12, color: theme.pine, fontWeight: '600' },
  examDur: { fontFamily: font.display, fontSize: 13, color: theme.inkMuted, minWidth: 40, textAlign: 'right' },
});
