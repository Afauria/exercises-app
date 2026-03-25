import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Question } from '../types/models';
import { searchQuestions } from '../db/repository';
import { font, theme } from './theme';

type Props = {
  bankId: string | null;
  onOpenPracticeQuiz: (questionIds: number[], startIndex?: number) => void;
};

function stemPreview(stem: string, max = 56) {
  const t = stem.replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export function GlobalSearchBar({ bankId, onOpenPracticeQuiz }: Props) {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Question[]>([]);

  const runSearch = async () => {
    const t = q.trim();
    if (!bankId || !t) return;
    setLoading(true);
    try {
      const rows = await searchQuestions(bankId, t, 200, 0);
      setResults(rows);
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const onPick = (item: Question, index: number) => {
    const ids = results.map((r) => r.id);
    setOpen(false);
    onOpenPracticeQuiz(ids, index);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="搜索题号或题干"
          placeholderTextColor={theme.inkMuted}
          style={styles.input}
          onSubmitEditing={() => void runSearch()}
          returnKeyType="search"
        />
        <Pressable
          style={[styles.go, (!bankId || loading) && styles.goDisabled]}
          onPress={() => void runSearch()}
          disabled={!bankId || loading}
        >
          <Text style={styles.goText}>{loading ? '…' : '搜索'}</Text>
        </Pressable>
      </View>

      <Modal visible={open} animationType="slide" transparent>
        <Pressable style={styles.modalMask} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.sheetTitle}>搜索结果 · 全题库</Text>
            <Text style={styles.sheetSub}>共 {results.length} 条，点选进入练习</Text>
            <FlatList
              data={results}
              keyExtractor={(item) => String(item.id)}
              style={styles.list}
              renderItem={({ item, index }) => (
                <Pressable style={styles.hit} onPress={() => onPick(item, index)}>
                  <Text style={styles.hitOrd}>第 {item.ordinal} 题</Text>
                  <Text style={styles.hitStem}>{stemPreview(item.stem)}</Text>
                </Pressable>
              )}
              ListEmptyComponent={
                <Text style={styles.empty}>无匹配题目</Text>
              }
            />
            <Pressable style={styles.close} onPress={() => setOpen(false)}>
              <Text style={styles.closeText}>关闭</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    flex: 1,
    fontFamily: font.serif,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: theme.ink,
    backgroundColor: theme.card,
  },
  go: {
    backgroundColor: theme.pine,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  goDisabled: { opacity: 0.45 },
  goText: { color: '#fff', fontFamily: font.serif, fontWeight: '700' },
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(28,25,23,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.paper,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: '78%',
    borderWidth: 1,
    borderColor: theme.border,
  },
  sheetTitle: {
    fontFamily: font.display,
    fontSize: 20,
    color: theme.ink,
    marginBottom: 4,
  },
  sheetSub: { fontFamily: font.serif, color: theme.inkMuted, marginBottom: 12 },
  list: { flexGrow: 0 },
  hit: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  hitOrd: {
    fontFamily: font.display,
    fontSize: 14,
    fontWeight: '700',
    color: theme.pine,
    marginBottom: 4,
  },
  hitStem: { fontFamily: font.serif, fontSize: 14, color: theme.ink, lineHeight: 20 },
  empty: { fontFamily: font.serif, color: theme.inkMuted, paddingVertical: 24, textAlign: 'center' },
  close: {
    marginTop: 8,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  closeText: { fontFamily: font.serif, color: theme.pine, fontWeight: '700' },
});
