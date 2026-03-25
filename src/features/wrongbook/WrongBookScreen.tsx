import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getQuestionsByIds,
  listFavoriteIds,
  listWrongQuestionIds,
  removeWrong,
  toggleFavorite,
} from '../../db/repository';
import type { Question } from '../../types/models';
import { QuestionCard } from '../../shared/questionCard';
import { useRevealAnswersStore } from '../../shared/revealAnswersStore';
import { font, theme } from '../../shared/theme';

export function WrongBookScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<'wrong' | 'favorite'>('wrong');
  const [list, setList] = useState<Question[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const revealAll = useRevealAnswersStore((s) => s.revealAll);

  const load = useCallback(async () => {
    const ids = tab === 'wrong' ? await listWrongQuestionIds() : await listFavoriteIds();
    const questions = await getQuestionsByIds(ids);
    setList(questions);
  }, [tab]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <View style={styles.root}>
      <View style={styles.rail} pointerEvents="none" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 28 },
        ]}
      >
        <View style={styles.segmentWrap}>
          <Pressable
            style={[styles.segment, tab === 'wrong' && styles.segmentOn]}
            onPress={() => setTab('wrong')}
          >
            <Ionicons
              name="alert-circle-outline"
              size={16}
              color={tab === 'wrong' ? '#fff' : theme.inkMuted}
            />
            <Text style={[styles.segmentText, tab === 'wrong' && styles.segmentTextOn]}>错题</Text>
          </Pressable>
          <Pressable
            style={[styles.segment, tab === 'favorite' && styles.segmentOn]}
            onPress={() => setTab('favorite')}
          >
            <Ionicons
              name="bookmark-outline"
              size={16}
              color={tab === 'favorite' ? '#fff' : theme.inkMuted}
            />
            <Text style={[styles.segmentText, tab === 'favorite' && styles.segmentTextOn]}>收藏</Text>
          </Pressable>
        </View>

        <Text style={styles.caption}>
          {tab === 'wrong' ? '需要巩固的题目' : '标记留待回顾'}
        </Text>

        {list.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyKicker}>EMPTY</Text>
            <Text style={styles.emptyTitle}>
              {tab === 'wrong' ? '错题本是空的' : '还没有收藏'}
            </Text>
            <Text style={styles.emptySub}>去练习里答错或点收藏，会出现在这里</Text>
          </View>
        ) : (
          list.map((q) => {
            const show = revealAll || !!expanded[q.id];
            return (
              <View key={q.id} style={styles.cardWrap}>
                <View style={styles.cardAccent} />
                <QuestionCard question={q} showAnswer={show} />
                <View style={styles.cardActions}>
                  {!revealAll ? (
                    <Pressable
                      style={styles.textBtn}
                      onPress={() => setExpanded((s) => ({ ...s, [q.id]: !s[q.id] }))}
                    >
                      <Text style={styles.textBtnLabel}>
                        {expanded[q.id] ? '隐藏本题' : '显示本题'}
                      </Text>
                    </Pressable>
                  ) : (
                    <View style={styles.hintGlobalWrap}>
                      <Text style={styles.hintGlobal}>顶部眼睛已显示全部答案</Text>
                    </View>
                  )}
                  {tab === 'wrong' ? (
                    <Pressable
                      style={styles.textBtnDanger}
                      onPress={async () => {
                        await removeWrong(q.id);
                        await load();
                      }}
                    >
                      <Text style={styles.textBtnDangerLabel}>移出错题</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.textBtnDanger}
                      onPress={async () => {
                        await toggleFavorite(q.id);
                        await load();
                      }}
                    >
                      <Text style={styles.textBtnDangerLabel}>取消收藏</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })
        )}
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
    backgroundColor: theme.pine,
    opacity: 0.85,
  },
  scroll: { flex: 1 },
  content: { paddingLeft: 20, paddingRight: 18, paddingTop: 8 },
  segmentWrap: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: 0,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: theme.card,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  segmentOn: { backgroundColor: theme.pine },
  segmentText: { fontFamily: font.display, fontSize: 14, color: theme.inkMuted },
  segmentTextOn: { color: '#fff', fontWeight: '700' },
  caption: {
    fontFamily: font.serif,
    fontSize: 12,
    color: theme.inkMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 18,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: theme.border,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 28,
    backgroundColor: theme.card,
    alignItems: 'flex-start',
  },
  emptyKicker: {
    fontFamily: font.display,
    fontSize: 10,
    letterSpacing: 4,
    color: theme.inkMuted,
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: font.display,
    fontSize: 20,
    color: theme.ink,
    marginBottom: 8,
  },
  emptySub: { fontFamily: font.serif, fontSize: 14, color: theme.inkMuted, lineHeight: 22 },
  cardWrap: {
    marginBottom: 20,
    position: 'relative',
    paddingLeft: 12,
  },
  cardAccent: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 48,
    width: 3,
    backgroundColor: theme.rust,
    borderRadius: 2,
    opacity: 0.7,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingLeft: 4,
  },
  textBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  textBtnLabel: { fontFamily: font.serif, fontSize: 14, color: theme.pine, fontWeight: '600' },
  textBtnDanger: { paddingVertical: 8, paddingHorizontal: 4 },
  textBtnDangerLabel: { fontFamily: font.serif, fontSize: 14, color: theme.inkMuted },
  hintGlobalWrap: { flex: 1, justifyContent: 'center' },
  hintGlobal: { fontFamily: font.serif, fontSize: 12, color: theme.inkMuted, fontStyle: 'italic' },
});
