import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export interface PartnerDockItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  isCenter?: boolean;
  badgeCount?: number;
  onPress: () => void;
}

interface PartnerDockProps {
  items: PartnerDockItem[];
}

// Partner bottom nav — Dashboard · Applications · [+ Add Lead] · Chat · More
// Center item renders as an elevated primary "+" button.
export const PartnerDock: React.FC<PartnerDockProps> = ({ items }) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomOffset = Math.max(insets.bottom, Platform.OS === 'ios' ? 12 : 8);

  const activeColor = isDark ? '#2DD4BF' : '#6E3FD6';
  const inactiveColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(15,23,42,0.42)';

  return (
    <View pointerEvents="box-none" style={styles.outer}>
      <View
        style={[
          styles.pill,
          {
            bottom: bottomOffset,
            backgroundColor: isDark ? 'rgba(15,23,42,0.94)' : 'rgba(255,255,255,0.96)',
            borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(110,63,214,0.14)',
          },
        ]}
      >
        {items.map((item) => {
          if (item.isCenter) {
            return (
              <View key={item.id} style={styles.centerWrap}>
                <TouchableOpacity
                  style={[styles.centerBtn, { backgroundColor: '#6E3FD6', borderColor: isDark ? '#0F172A' : '#FFFFFF' }]}
                  onPress={item.onPress}
                  activeOpacity={0.85}
                >
                  <Ionicons name={item.icon} size={26} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={[styles.centerLabel, { color: inactiveColor }]} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
            );
          }

          const color = item.active ? activeColor : inactiveColor;
          return (
            <TouchableOpacity key={item.id} style={styles.item} onPress={item.onPress} activeOpacity={0.7}>
              <View style={[styles.iconWrap, item.active && { backgroundColor: isDark ? 'rgba(45,212,191,0.14)' : 'rgba(110,63,214,0.10)' }]}>
                <Ionicons name={item.icon} size={21} color={color} />
                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badgeCount > 99 ? '99+' : item.badgeCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.label, { color, fontWeight: item.active ? '800' : '600' }]} numberOfLines={1}>
                {item.label}
              </Text>
              <View style={[styles.dot, { backgroundColor: item.active ? activeColor : 'transparent' }]} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 9999,
  },
  pill: {
    position: 'absolute',
    width: '94%',
    maxWidth: 430,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 30,
    borderWidth: 1,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  item: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 2,
  },
  iconWrap: {
    width: 42,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    marginTop: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },
  centerWrap: {
    alignItems: 'center',
    flex: 1,
    marginTop: -26,
  },
  centerBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#6E3FD6',
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  centerLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 3,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
});
