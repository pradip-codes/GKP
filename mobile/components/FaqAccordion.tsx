import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { Icon } from './Icon';
import { FAQ_CATEGORIES } from '../data/faqData';
import { spacing } from '../theme/spacing';

interface FaqAccordionProps {
  /** Optional subset of category ids to show. Defaults to all. */
  categories?: string[];
  title?: string;
}

/**
 * Categorized FAQ accordion — tap a question to reveal its answer.
 * Used in Support, employee/partner settings and other help surfaces.
 */
export function FaqAccordion({ categories, title = 'Frequently Asked Questions' }: FaqAccordionProps) {
  const { colors, isDark } = useTheme();
  const [activeCategory, setActiveCategory] = useState(categories?.[0] || FAQ_CATEGORIES[0].id);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const visible = categories?.length
    ? FAQ_CATEGORIES.filter((c) => categories.includes(c.id))
    : FAQ_CATEGORIES;
  const current = visible.find((c) => c.id === activeCategory) || visible[0];

  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const bgSecondary = isDark ? '#0F172A' : '#F8FAFC';
  const borderCol = colors.border;
  const accent = '#0F766E';

  if (!current) return null;

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: borderCol }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

      {/* Category chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {visible.map((cat) => {
          const active = cat.id === current.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, {
                backgroundColor: active ? accent : bgSecondary,
                borderColor: active ? accent : borderCol,
              }]}
              onPress={() => { setActiveCategory(cat.id); setOpenIndex(null); }}
              activeOpacity={0.7}
            >
              <Icon name={cat.icon} size={13} color={active ? '#fff' : colors.textMid} />
              <Text style={{ fontSize: 12, fontWeight: active ? '800' : '600', color: active ? '#fff' : colors.textMid }}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Q&A list */}
      <View style={{ gap: 8 }}>
        {current.items.map((item, idx) => {
          const open = openIndex === idx;
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.faqItem, { backgroundColor: bgSecondary, borderColor: borderCol }]}
              onPress={() => setOpenIndex(open ? null : idx)}
              activeOpacity={0.7}
            >
              <View style={styles.faqQuestionRow}>
                <Text style={[styles.faqQuestion, { color: colors.text }]}>{item.q}</Text>
                <Icon name={open ? 'chevron-up' : 'chevron-down'} size={15} color={colors.textLight} />
              </View>
              {open && (
                <Text style={[styles.faqAnswer, { color: colors.textMid }]}>{item.a}</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 12,
  },
  chipRow: {
    gap: 8,
    paddingBottom: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  faqItem: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  faqAnswer: {
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: 8,
  },
});
