import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';
import bundledBank from '../../../assets/bundled-question-bank.txt';
import { parseQuestionBank } from '../../parsers/questionBankParser';
import { getDefaultBankId, getQuestionCount, importQuestionBank } from '../../db/repository';
import { clearQuestionSectionCache } from '../../shared/sectionQuestionCache';
import type { ImportReport } from '../../types/models';

async function importFromRaw(raw: string, bankName: string): Promise<ImportReport> {
  const parsed = parseQuestionBank(raw);
  const report = await importQuestionBank(bankName, parsed.questions);
  clearQuestionSectionCache();
  return {
    ...report,
    failed: report.failed + parsed.errors.length,
    errors: [...parsed.errors, ...report.errors],
  };
}

async function loadBundledBankRaw(): Promise<string> {
  const asset = Asset.fromModule(bundledBank);
  if (!asset.localUri) {
    await asset.downloadAsync();
  }
  const uri = asset.localUri ?? asset.uri;
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    if (!res.ok) {
      throw new Error(`读取内置题库失败: ${res.status}`);
    }
    return await res.text();
  }
  return await FileSystem.readAsStringAsync(uri);
}

export async function importFromBundledBank(): Promise<ImportReport> {
  const raw = await loadBundledBankRaw();
  return importFromRaw(raw, '内置题库_1432题');
}

export async function pickAndImportQuestionBank(): Promise<ImportReport | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/plain'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const file = result.assets[0];
  if (!file?.uri) return null;
  const raw = await FileSystem.readAsStringAsync(file.uri);
  const bankName = file.name?.replace(/\.txt$/i, '') || `题库_${Date.now()}`;
  return importFromRaw(raw, bankName);
}

export async function ensureDefaultBankLoaded(): Promise<void> {
  const bankId = await getDefaultBankId();
  if (bankId) {
    const n = await getQuestionCount(bankId);
    if (n > 0) return;
    const raw = await loadBundledBankRaw();
    const parsed = parseQuestionBank(raw);
    await importQuestionBank('内置题库_1432题', parsed.questions, bankId);
    clearQuestionSectionCache();
    return;
  }
  await importFromBundledBank();
}

let bankBootstrapPromise: Promise<void> | null = null;

/**
 * App 与各页面共用的「内置题库导入是否已跑完」。
 * 练习/考试首页若在导入完成前读库会得到空数据且不会自动重试，须先 await 再拉列表。
 */
export function getBankBootstrapPromise(): Promise<void> {
  bankBootstrapPromise ??= ensureDefaultBankLoaded();
  return bankBootstrapPromise;
}
