import { Platform, StyleSheet } from 'react-native';

/** 纸墨风：暖纸底 + 松绿强调，中文用系统衬线栈（避免 Inter 体系） */
export const theme = {
  paper: '#f4f0e8',
  paper2: '#ebe4d6',
  card: '#fdfbf7',
  ink: '#1c1917',
  inkMuted: '#57534e',
  pine: '#1f5c4a',
  pineLight: '#d8ebe4',
  rust: '#9a3412',
  border: '#c9b8a3',
  shadow: 'rgba(28, 25, 23, 0.08)',
};

export const font = {
  /** 跨平台衬线：Web Georgia；iOS 宋体/宋体变体；Android serif */
  serif: Platform.select({
    web: 'Georgia, "Noto Serif SC", "Songti SC", serif',
    ios: 'Georgia',
    android: 'serif',
    default: 'serif',
  }) as string,
  display: Platform.select({
    web: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
    ios: 'Palatino',
    android: 'serif',
    default: 'serif',
  }) as string,
};

export const sheetHelpers = StyleSheet.create({});
