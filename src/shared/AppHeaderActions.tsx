import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { clearAllData } from '../db/repository';
import { importFromBundledBank, pickAndImportQuestionBank } from '../features/importer/importService';
import { clearQuestionSectionCache } from './sectionQuestionCache';
import { useRevealAnswersStore } from './revealAnswersStore';
import { font, theme } from './theme';

export function AppHeaderActions() {
  const insets = useSafeAreaInsets();
  const revealAll = useRevealAnswersStore((s) => s.revealAll);
  const toggleRevealAll = useRevealAnswersStore((s) => s.toggleRevealAll);
  const [dataOpen, setDataOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const onClear = () => {
    setDataOpen(false);
    Alert.alert('清空全部数据', '将删除题库、练习与考试记录、错题与收藏等，是否继续？', [
      { text: '取消', style: 'cancel' },
      {
        text: '清空',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await clearAllData();
            clearQuestionSectionCache();
            Alert.alert('已完成', '全部数据已清空。');
          } catch (e) {
            Alert.alert('失败', String(e));
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const onImportBundled = async () => {
    setBusy(true);
    try {
      const report = await importFromBundledBank();
      clearQuestionSectionCache();
      setDataOpen(false);
      Alert.alert('导入完成', `成功 ${report.parsed}，失败 ${report.failed}`);
    } catch (e) {
      Alert.alert('导入失败', String(e));
    } finally {
      setBusy(false);
    }
  };

  const onImportLocal = async () => {
    setBusy(true);
    try {
      const report = await pickAndImportQuestionBank();
      if (!report) {
        setBusy(false);
        return;
      }
      clearQuestionSectionCache();
      setDataOpen(false);
      Alert.alert('导入完成', `成功 ${report.parsed}，失败 ${report.failed}`);
    } catch (e) {
      Alert.alert('导入失败', String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <View style={styles.row}>
        <Pressable
          style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
          onPress={toggleRevealAll}
          accessibilityRole="button"
          accessibilityLabel={revealAll ? '隐藏全部题目答案' : '显示全部题目答案'}
        >
          <Ionicons
            name={revealAll ? 'eye' : 'eye-outline'}
            size={22}
            color={revealAll ? theme.pine : theme.inkMuted}
          />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
          onPress={() => setDataOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="清空或导入题库"
        >
          <Ionicons name="trash-outline" size={22} color={theme.rust} />
        </Pressable>
      </View>

      <Modal visible={dataOpen} animationType="fade" transparent>
        <Pressable style={styles.mask} onPress={() => !busy && setDataOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.sheetTitle}>数据与题库</Text>
            {busy ? (
              <ActivityIndicator size="small" color={theme.pine} style={styles.busy} />
            ) : (
              <>
                <Pressable style={styles.sheetRowDanger} onPress={onClear}>
                  <Ionicons name="trash-outline" size={20} color="#b91c1c" />
                  <Text style={styles.sheetRowDangerText}>清空全部数据</Text>
                </Pressable>
                <View style={styles.rule} />
                <Pressable style={styles.sheetRow} onPress={() => void onImportBundled()}>
                  <Ionicons name="cloud-download-outline" size={20} color={theme.pine} />
                  <Text style={styles.sheetRowText}>导入内置题库</Text>
                </Pressable>
                <Pressable style={styles.sheetRow} onPress={() => void onImportLocal()}>
                  <Ionicons name="document-text-outline" size={20} color={theme.pine} />
                  <Text style={styles.sheetRowText}>导入本地 TXT</Text>
                </Pressable>
              </>
            )}
            <Pressable style={styles.sheetClose} onPress={() => !busy && setDataOpen(false)}>
              <Text style={styles.sheetCloseText}>关闭</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 4 },
  hit: { padding: 8, borderRadius: 10 },
  hitPressed: { backgroundColor: theme.pineLight },
  mask: {
    flex: 1,
    backgroundColor: 'rgba(28,25,23,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sheetTitle: {
    fontFamily: font.display,
    fontSize: 18,
    color: theme.ink,
    marginBottom: 14,
    textAlign: 'center',
  },
  busy: { paddingVertical: 24 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  sheetRowText: { fontFamily: font.serif, fontSize: 16, color: theme.ink },
  sheetRowDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  sheetRowDangerText: { fontFamily: font.serif, fontSize: 16, color: '#b91c1c', fontWeight: '600' },
  rule: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border, marginVertical: 4 },
  sheetClose: { alignItems: 'center', paddingVertical: 14 },
  sheetCloseText: { fontFamily: font.serif, color: theme.inkMuted, fontSize: 15 },
});
