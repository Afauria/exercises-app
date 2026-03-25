import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Question } from '../types/models';
import { font, theme } from './theme';

interface Props {
  question: Question;
  selected?: string | null;
  showAnswer?: boolean;
  onSelect?: (value: string) => void;
  onToggleAnswer?: () => void;
  favorited?: boolean;
  onToggleFavorite?: () => void;
  /** 答题页精简样式：弱化卡片装饰 */
  minimal?: boolean;
}

export function QuestionCard({
  question,
  selected,
  showAnswer,
  onSelect,
  onToggleAnswer,
  favorited,
  onToggleFavorite,
  minimal,
}: Props) {
  const revealed = !!showAnswer;
  const showIconBar = onToggleAnswer != null || onToggleFavorite != null;

  return (
    <View style={[styles.card, minimal && styles.cardMinimal]}>
      <View style={styles.topRow}>
        <Text style={[styles.stem, !showIconBar && styles.stemFull]}>
          <Text style={styles.ordinal}>{question.ordinal}.</Text>{' '}
          {question.stem}
        </Text>
        {showIconBar ? (
          <View style={styles.iconCol}>
            {onToggleAnswer ? (
              <Pressable
                style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                onPress={onToggleAnswer}
                accessibilityRole="button"
                accessibilityLabel={revealed ? '隐藏本题答案' : '显示本题答案'}
              >
                <Ionicons
                  name={revealed ? 'eye' : 'eye-outline'}
                  size={22}
                  color={revealed ? theme.pine : theme.inkMuted}
                />
              </Pressable>
            ) : null}
            {onToggleFavorite ? (
              <Pressable
                style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                onPress={onToggleFavorite}
                accessibilityRole="button"
                accessibilityLabel={favorited ? '取消收藏' : '收藏本题'}
              >
                <Ionicons
                  name={favorited ? 'heart' : 'heart-outline'}
                  size={22}
                  color={favorited ? theme.rust : theme.inkMuted}
                />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      {question.qtype === 'choice' ? (
        question.options?.map((opt) => {
          const isSelected = selected === opt.label;
          return (
            <Pressable
              key={opt.label}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => onSelect?.(opt.label)}
            >
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                <Text style={styles.optLabel}>{opt.label}.</Text> {opt.text}
              </Text>
            </Pressable>
          );
        })
      ) : (
        <View style={styles.booleanRow}>
          {['正确', '错误'].map((item) => {
            const isSelected = selected === item;
            return (
              <Pressable
                key={item}
                style={[styles.boolChip, isSelected && styles.boolChipSelected]}
                onPress={() => onSelect?.(item)}
              >
                <Text style={[styles.boolText, isSelected && styles.boolTextSelected]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {revealed ? (
        <View style={styles.answerBox}>
          <Text style={styles.answerText}>答案：{question.answer}</Text>
          {!!question.explanation && (
            <Text style={styles.explanation}>解析：{question.explanation}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardMinimal: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    paddingHorizontal: 0,
    marginBottom: 0,
    borderRadius: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 14,
  },
  stem: {
    flex: 1,
    fontFamily: font.serif,
    fontSize: 17,
    lineHeight: 26,
    color: theme.ink,
    letterSpacing: 0.2,
  },
  stemFull: { marginRight: 0 },
  ordinal: {
    fontFamily: font.display,
    fontWeight: '700',
    color: theme.pine,
  },
  iconCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: 2,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 10,
  },
  iconBtnPressed: {
    backgroundColor: theme.paper2,
  },
  option: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 10,
    backgroundColor: theme.card,
  },
  optionSelected: {
    borderColor: theme.pine,
    backgroundColor: theme.pineLight,
  },
  optionText: {
    fontFamily: font.serif,
    fontSize: 15,
    lineHeight: 22,
    color: theme.ink,
  },
  optionTextSelected: {
    color: theme.ink,
  },
  optLabel: {
    fontWeight: '700',
    color: theme.pine,
  },
  booleanRow: {
    flexDirection: 'row',
    gap: 12,
  },
  boolChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    backgroundColor: theme.card,
  },
  boolChipSelected: {
    borderColor: theme.pine,
    backgroundColor: theme.pineLight,
  },
  boolText: {
    fontFamily: font.serif,
    fontSize: 16,
    color: theme.ink,
  },
  boolTextSelected: {
    fontWeight: '700',
    color: theme.pine,
  },
  answerBox: {
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.paper2,
  },
  answerText: {
    fontFamily: font.serif,
    color: theme.pine,
    fontWeight: '700',
    fontSize: 16,
  },
  explanation: {
    fontFamily: font.serif,
    marginTop: 8,
    color: theme.inkMuted,
    lineHeight: 24,
    fontSize: 15,
  },
});
