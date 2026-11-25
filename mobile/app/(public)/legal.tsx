import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { Icon } from '../../components/Icon';

const BASE = 'https://gharkapaisa.in';

const DOCS: Record<string, { path: string; title: string }> = {
  privacy: { path: '/privacy-policy', title: 'Privacy Policy' },
  terms: { path: '/terms-and-conditions', title: 'Terms & Conditions' },
  refund: { path: '/refund-policy', title: 'Refund Policy' },
  shipping: { path: '/shipping-policy', title: 'Shipping Policy' },
};

export default function LegalScreen() {
  const { colors } = useTheme();
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const key = String(doc || 'privacy');
  const page = DOCS[key] || DOCS.privacy;
  const [loading, setLoading] = React.useState(true);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Icon name="chevron-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{page.title}</Text>
        <View style={{ width: 40 }} />
      </View>
      <WebView
        source={{ uri: `${BASE}${page.path}` }}
        style={{ flex: 1 }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        onLoadEnd={() => setLoading(false)}
      />
      {loading && (
        <View style={[styles.loaderOverlay, { backgroundColor: colors.bg }]} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700' },
  loader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  loaderOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
