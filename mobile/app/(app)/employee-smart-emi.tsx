import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Share, RefreshControl, Modal, Image, Linking, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../../components/Icon';
import { spacing } from '../../theme/spacing';
import apiClient from '../../services/api';
import { resolveMediaUrl } from '../../services/messenger.service';

// Website accent for Smart EMI pages
const ACCENT = '#4338CA';
const SCHEME_ACCENT = '#2563EB';

const DEFAULT_SMART_EMI_APPLY_URL = 'https://applyonline.hdfc.bank.in/loan-against-assets/smartemi/smartemi?rpo=total&Channel=DSA&DSACode=XYOH&LC1=YOH5&LC2=YOH5&SMCode=S54558&LGCode=YOH5';

const DEFAULT_HDFC_FEATURES = [
  'Instant 1-click conversion via NetBanking, MobileBanking, or SMS',
  'Convert big-ticket credit card purchases within 60 days of transaction',
  'No-Cost EMI options available across 5,000+ top retail & online merchant outlets',
  'Retain original reward points earned on card before EMI conversion',
];

interface SmartEmiScheme {
  id: string;
  bank_id?: string;
  bank: string;
  title: string;
  logo?: string | null;
  accent: string;
  minTransaction: string;
  minRoi: string;
  tenure: string;
  processingFee: string;
  conversionSpeed: string;
  badge: string;
  apply_url?: string;
  features: string[];
}

const parseFeatures = (raw: any): string[] => {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const CALC_TENURES = [3, 6, 9, 12, 18, 24, 36];
const RATE_TYPES = [
  { id: 'NO_COST', label: '0% No-Cost', sub: '0.00% / mo' },
  { id: 'LOW_COST', label: 'Low Cost', sub: '1.15% / mo' },
  { id: 'STANDARD', label: 'Standard', sub: '1.35% / mo' },
] as const;
const MONTHLY_RATE_MAP: Record<string, number> = { NO_COST: 0, LOW_COST: 1.15, STANDARD: 1.35 };
const TENURE_OPTIONS = ['06 Months', '01 Year', '02 Years', '03 Years', '04 Years'];

const defaultHdfcScheme: SmartEmiScheme = {
  id: 'hdfc-smart-emi',
  bank: 'HDFC Bank',
  title: 'HDFC Bank EMI on Credit Card',
  logo: null,
  accent: SCHEME_ACCENT,
  minTransaction: '₹2,500',
  minRoi: '1.15% per month (13.80% p.a.)',
  tenure: '3 - 48 Months',
  processingFee: '₹199 + GST',
  conversionSpeed: 'Instant / Within 24 Hrs',
  badge: 'Popular Scheme',
  apply_url: DEFAULT_SMART_EMI_APPLY_URL,
  features: DEFAULT_HDFC_FEATURES,
};

export default function EmployeeSmartEmiScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState('ALL');
  const [schemes, setSchemes] = useState<SmartEmiScheme[]>([defaultHdfcScheme]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const isMountedRef = useRef(true);

  // Calculator state (website parity)
  const [purchaseAmt, setPurchaseAmt] = useState('75000');
  const [tenure, setTenure] = useState(12);
  const [rateType, setRateType] = useState<string>('LOW_COST');

  // Apply / Benefits / Compare state
  const [benefitsScheme, setBenefitsScheme] = useState<SmartEmiScheme | null>(null);
  const [applyScheme, setApplyScheme] = useState<SmartEmiScheme | null>(null);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [custName, setCustName] = useState('');
  const [custMobile, setCustMobile] = useState('');
  const [smartEmiAmt, setSmartEmiAmt] = useState('');
  const [smartEmiTenure, setSmartEmiTenure] = useState('06 Months');
  const [processBy, setProcessBy] = useState('Punching Only');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const empCode = (user as any)?.partner_code || (user as any)?.employee_id || (user as any)?.emp_code || (user as any)?.referral_code || user?.id || '';
  const isPartner = (user as any)?.role === 'PARTNER' || (user as any)?.role === 'TEAM_MEMBER' || !!(user as any)?.partner_code;

  const fetchDynamicSchemes = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      const res = await apiClient.get('/products', { params: { limit: 1000 } });
      if (!isMountedRef.current) return;

      const prods = res.data?.data?.rows || res.data?.data || res.data?.products || [];
      if (Array.isArray(prods) && prods.length > 0) {
        // Website parity: only loc_eoc products with EOC / Smart EMI subcategory
        const smartEmiProds = prods.filter((p: any) => {
          const cat = String(p.category || '').toLowerCase().trim();
          const subCat = String(p.sub_category || '').toUpperCase().trim();
          return cat === 'loc_eoc' && (subCat === 'EOC' || subCat === 'SMART EMI ON CREDIT CARD');
        });

        if (smartEmiProds.length > 0) {
          const mapped = smartEmiProds.map((p: any): SmartEmiScheme => {
            const parsedFeatures = parseFeatures(p.features);
            const bName = p.bank_name || p.bank || 'HDFC Bank';
            return {
              id: String(p.id),
              bank_id: p.bank_id,
              bank: bName,
              title: p.name || 'Credit Card EMI & Smart EMI',
              logo: resolveMediaUrl(p.bank_logo || p.logo || p.image_url),
              accent: SCHEME_ACCENT,
              minTransaction: p.joining_fee && p.joining_fee !== 'Nil' ? String(p.joining_fee) : '₹2,500',
              minRoi: p.interest_rate || '1.15% per month (13.80% p.a.)',
              tenure: p.time_period || p.tenure || '3 - 48 Months',
              processingFee: p.annual_fee || p.fees_charges || '₹199 + GST',
              conversionSpeed: 'Instant / Within 24 Hrs',
              badge: p.badge || 'Popular Scheme',
              apply_url: p.apply_url || p.direct_url || p.link || DEFAULT_SMART_EMI_APPLY_URL,
              features: parsedFeatures.length > 0 ? parsedFeatures : DEFAULT_HDFC_FEATURES,
            };
          });
          setSchemes(mapped);
        } else {
          setSchemes([defaultHdfcScheme]);
        }
      } else {
        setSchemes([defaultHdfcScheme]);
      }
    } catch (err) {
      console.error('Failed to load dynamic Smart EMI schemes:', err);
      if (isMountedRef.current) setSchemes([defaultHdfcScheme]);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchDynamicSchemes();
    return () => { isMountedRef.current = false; };
  }, [fetchDynamicSchemes]);

  const availableBanks = useMemo(() => {
    const set = new Set<string>();
    schemes.forEach((s) => { if (s.bank) set.add(s.bank); });
    return Array.from(set);
  }, [schemes]);

  // EMI calc — website parity (rate type map, no-cost = 0%)
  const emiDetails = useMemo(() => {
    const P = parseFloat(purchaseAmt) || 0;
    const mRate = MONTHLY_RATE_MAP[rateType] || 0;
    const r = mRate / 100;
    const n = parseInt(String(tenure), 10) || 12;
    if (P <= 0 || n <= 0) return { emi: 0, totalInterest: 0, totalPayable: 0, processingFee: 0 };

    let emi = 0, totalPayable = 0, totalInterest = 0;
    if (r === 0) {
      emi = P / n;
      totalPayable = P;
    } else {
      emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      totalPayable = emi * n;
      totalInterest = totalPayable - P;
    }
    const processingFee = rateType === 'NO_COST' ? 0 : 199;
    return {
      emi: Math.round(emi),
      totalInterest: Math.round(totalInterest),
      totalPayable: Math.round(totalPayable),
      processingFee,
    };
  }, [purchaseAmt, tenure, rateType]);

  const filteredSchemes = useMemo(() => {
    const q = search.toLowerCase();
    return schemes.filter((s) => {
      const matchesSearch =
        s.title.toLowerCase().includes(q) ||
        s.bank.toLowerCase().includes(q) ||
        s.features.some((f) => f.toLowerCase().includes(q));
      const matchesBank = selectedBank === 'ALL' || s.bank === selectedBank;
      return matchesSearch && matchesBank;
    });
  }, [schemes, search, selectedBank]);

  const handleToggleCompare = (scheme: SmartEmiScheme) => {
    setCompareList((prev) => prev.includes(scheme.id) ? prev.filter((id) => id !== scheme.id) : [...prev, scheme.id]);
  };

  const shareLinkFor = (scheme: SmartEmiScheme) =>
    `https://gharkapaisa.in/apply/${encodeURIComponent(String(empCode))}/${scheme.id}?type=smart_emi`;

  const handleWhatsAppShare = async (scheme: SmartEmiScheme) => {
    const link = shareLinkFor(scheme);
    const msg = encodeURIComponent(
      `Convert your large purchases into easy EMIs with ${scheme.bank} ${scheme.title}! Low interest, flexible tenures up to 36 months.\nApply here: ${link}`
    );
    const waUrl = `https://wa.me/?text=${msg}`;
    try {
      const supported = await Linking.canOpenURL(waUrl);
      if (supported) await Linking.openURL(waUrl);
      else await Share.share({ message: decodeURIComponent(msg) });
    } catch {
      await Share.share({ message: decodeURIComponent(msg) });
    }
  };

  const resetApplyModal = () => {
    setApplyScheme(null);
    setCustName('');
    setCustMobile('');
    setSmartEmiAmt('');
    setSmartEmiTenure('06 Months');
    setProcessBy('Punching Only');
  };

  const handleSubmitLead = async () => {
    if (!applyScheme || !custName || !custMobile || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(applyScheme.id);
      const payload: any = {
        full_name: custName,
        mobile: custMobile,
        product_type: 'smart_emi',
        smart_emi_amount: smartEmiAmt,
        tenure: smartEmiTenure,
        process_by: processBy,
        card_bank: applyScheme.bank,
        card_name: applyScheme.title,
        ...(isUuid ? { product_id: applyScheme.id } : {}),
      };

      if (isPartner) {
        try {
          await apiClient.post('/applications/partner-apply', {
            ...payload,
            process_type: 'lead_punching',
            agree_terms: true,
          });
        } catch {
          await apiClient.post('/employee/leads', payload);
        }
      } else {
        await apiClient.post('/employee/leads', payload);
      }

      const targetDirectUrl = applyScheme.apply_url || applyScheme.apply_url || DEFAULT_SMART_EMI_APPLY_URL;
      if (processBy === 'Direct link') {
        Linking.openURL(targetDirectUrl).catch(() => {});
      } else if (processBy === 'Linked share') {
        const msg = encodeURIComponent(`Apply for ${applyScheme.bank || 'HDFC Bank'} Smart EMI on Credit Card here: ${targetDirectUrl}`);
        Linking.openURL(`https://wa.me/?text=${msg}`).catch(() => {});
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        resetApplyModal();
      }, 2500);
    } catch (err: any) {
      console.error('Failed to submit Smart EMI lead:', err);
      Alert.alert('Error', err?.response?.data?.message || 'Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cardBg = isDark ? '#1E293B' : '#FFFFFF';
  const borderCol = colors.border;

  const renderMetric = (label: string, value: string, valueColor?: string) => (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 11, color: colors.textLight, fontWeight: '600' }}>{label}</Text>
      <Text style={{ fontSize: 13.5, color: valueColor || colors.text, fontWeight: '900', marginTop: 2 }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );

  const renderSchemeCard = (scheme: SmartEmiScheme) => (
    <View key={scheme.id} style={[styles.offerCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
      {/* Row 1: logo | bank | badge */}
      <View style={styles.offerTopRow}>
        <View style={{ width: 44 }}>
          {scheme.logo ? (
            <Image source={{ uri: scheme.logo }} style={{ height: 30 }} resizeMode="contain" />
          ) : (
            <View style={[styles.logoFallback, { backgroundColor: `${scheme.accent}15` }]}>
              <Text style={{ color: scheme.accent, fontWeight: '900', fontSize: 13 }}>{scheme.bank.charAt(0)}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.offerBank, { color: colors.text }]} numberOfLines={1}>{scheme.bank}</Text>
        <View style={[styles.badgeChip, { backgroundColor: `${scheme.accent}15` }]}>
          <Text style={{ color: scheme.accent, fontSize: 11, fontWeight: '800' }} numberOfLines={1}>{scheme.badge}</Text>
        </View>
      </View>

      {/* Row 2: centered title */}
      <View style={[styles.titleWrap, { borderBottomColor: borderCol }]}>
        <Text style={[styles.offerTitle, { color: scheme.accent }]} numberOfLines={2}>{scheme.title}</Text>
      </View>

      {/* Metrics grid */}
      <View style={[styles.metricsBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <View style={styles.metricsGrid}>
          {renderMetric('Min Purchase Value', scheme.minTransaction)}
          {renderMetric('Interest Rate', scheme.minRoi, '#10B981')}
          {renderMetric('Tenure', scheme.tenure)}
          {renderMetric('Processing Fee', scheme.processingFee, scheme.accent)}
        </View>
      </View>

      {/* Features */}
      <View style={{ gap: 6 }}>
        {scheme.features.map((feat, idx) => (
          <View key={idx} style={styles.featureRow}>
            <Icon name="check-circle" size={13} color="#10B981" />
            <Text style={[styles.featureText, { color: colors.textMid }]}>{feat}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={[styles.actionsBox, { borderTopColor: borderCol }]}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol }]} onPress={() => handleWhatsAppShare(scheme)}>
            <Icon name="share-2" size={13} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, {
              backgroundColor: compareList.includes(scheme.id) ? `${ACCENT}15` : (isDark ? '#0F172A' : '#F8FAFC'),
              borderColor: compareList.includes(scheme.id) ? ACCENT : borderCol,
            }]}
            onPress={() => handleToggleCompare(scheme)}
          >
            <Icon name="git-merge" size={13} color={compareList.includes(scheme.id) ? ACCENT : colors.text} />
            <Text style={[styles.actionBtnText, { color: compareList.includes(scheme.id) ? ACCENT : colors.text }]}>
              {compareList.includes(scheme.id) ? '✓ Compared' : 'Compare'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol }]} onPress={() => setBenefitsScheme(scheme)}>
            <Icon name="information-circle" size={13} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Benefits</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.applyBtn, { backgroundColor: ACCENT }]} onPress={() => setApplyScheme(scheme)}>
            <Icon name="person-circle" size={13} color="#fff" />
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const processOptions = [
    { id: 'Punching Only', title: '1. Lead punching only', desc: 'Records lead directly into your Partner CRM & Applications queue for internal processing.' },
    { id: 'Linked share', title: '2. Linked share', desc: 'Generates & opens a pre-filled WhatsApp share link embedded with the official bank URL.' },
    { id: 'Direct link', title: '3. Direct bank process', desc: 'Immediately opens the official bank portal for direct customer application.' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDynamicSchemes(true)} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Smart EMI on Credit Card ({filteredSchemes.length})</Text>
            <Text style={[styles.pageSub, { color: colors.textMid }]}>Convert credit card spends into easy monthly EMIs</Text>
          </View>
          <TouchableOpacity
            style={[styles.calcToggle, {
              borderColor: showCalculator ? ACCENT : borderCol,
              backgroundColor: showCalculator ? `${ACCENT}15` : cardBg,
            }]}
            onPress={() => setShowCalculator(!showCalculator)}
          >
            <Icon name="calculator" size={14} color={showCalculator ? ACCENT : colors.text} />
            <Text style={[styles.calcToggleText, { color: showCalculator ? ACCENT : colors.text }]}>EMI Calculator</Text>
            <Text style={{ fontSize: 10, color: showCalculator ? ACCENT : colors.textMid }}>{showCalculator ? '▲' : '▼'}</Text>
          </TouchableOpacity>
        </View>

        {/* Collapsible calculator */}
        {showCalculator && (
          <View style={[styles.calcCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={styles.calcHead}>
              <View style={[styles.calcIcon, { backgroundColor: `${ACCENT}15` }]}>
                <Icon name="calculator" size={16} color={ACCENT} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.calcTitle, { color: colors.text }]}>Smart Purchase-to-EMI Converter Calculator</Text>
                <Text style={[styles.calcSub, { color: colors.textMid }]}>Estimate monthly installments for card spend conversions.</Text>
              </View>
            </View>

            {/* Purchase amount */}
            <Text style={[styles.fieldLabel, { color: colors.textMid }]}>Transaction / Purchase Value:</Text>
            <View style={styles.amountRow}>
              <Text style={[styles.amountValue, { color: ACCENT }]}>₹{(parseFloat(purchaseAmt) || 0).toLocaleString('en-IN')}</Text>
            </View>
            <TextInput
              style={[styles.calcInput, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol, color: colors.text }]}
              value={purchaseAmt}
              onChangeText={setPurchaseAmt}
              keyboardType="numeric"
              placeholder="75000"
              placeholderTextColor={colors.textLight}
            />
            <View style={styles.rangeLabels}>
              <Text style={{ fontSize: 11, color: colors.textLight }}>₹5,000</Text>
              <Text style={{ fontSize: 11, color: colors.textLight }}>₹5,00,000</Text>
            </View>

            {/* Rate type */}
            <Text style={[styles.fieldLabel, { color: colors.textMid, marginTop: 14 }]}>EMI Rate Type:</Text>
            <View style={styles.rateGrid}>
              {RATE_TYPES.map((rt) => {
                const active = rateType === rt.id;
                return (
                  <TouchableOpacity
                    key={rt.id}
                    style={[styles.rateCard, {
                      borderColor: active ? ACCENT : borderCol,
                      backgroundColor: active ? ACCENT : (isDark ? '#0F172A' : '#F8FAFC'),
                    }]}
                    onPress={() => setRateType(rt.id)}
                  >
                    <Text style={{ fontSize: 12.5, fontWeight: '800', color: active ? '#fff' : colors.text }}>{rt.label}</Text>
                    <Text style={{ fontSize: 10.5, color: active ? 'rgba(255,255,255,0.85)' : colors.textMid, marginTop: 2 }}>{rt.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tenure */}
            <Text style={[styles.fieldLabel, { color: colors.textMid, marginTop: 14 }]}>Select Repayment Tenure (Months):</Text>
            <View style={styles.tenureWrap}>
              {CALC_TENURES.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.tenureChip, {
                    borderColor: tenure === m ? ACCENT : borderCol,
                    backgroundColor: tenure === m ? ACCENT : (isDark ? '#0F172A' : '#F8FAFC'),
                  }]}
                  onPress={() => setTenure(m)}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: tenure === m ? '#fff' : colors.text }}>{m} Months</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Results */}
            <View style={[styles.resultBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol }]}>
              <Text style={[styles.resultCap, { color: colors.textLight }]}>MONTHLY EMI INSTALLMENT</Text>
              <View style={styles.emiRow}>
                <Text style={[styles.emiVal, { color: ACCENT }]}>₹{emiDetails.emi.toLocaleString('en-IN')}</Text>
                <Text style={{ fontSize: 13, color: colors.textMid }}>/ month</Text>
              </View>
              <View style={[styles.resultDivider, { backgroundColor: borderCol }]} />
              <View style={styles.resultLine}>
                <Text style={{ color: colors.textMid, fontWeight: '600' }}>Purchase Value:</Text>
                <Text style={{ color: colors.text, fontWeight: '800' }}>₹{(parseFloat(purchaseAmt) || 0).toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.resultLine}>
                <Text style={{ color: colors.textMid, fontWeight: '600' }}>Total Interest Charged:</Text>
                <Text style={{ color: '#F59E0B', fontWeight: '800' }}>₹{emiDetails.totalInterest.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.resultLine}>
                <Text style={{ color: colors.textMid, fontWeight: '600' }}>One-time Processing Fee:</Text>
                <Text style={{ color: colors.text, fontWeight: '800' }}>₹{emiDetails.processingFee}</Text>
              </View>
              <View style={[styles.resultLine, { borderTopWidth: 1, borderTopColor: borderCol, borderStyle: 'dashed', paddingTop: 10 }]}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>Total Repayment Amount:</Text>
                <Text style={{ color: colors.text, fontWeight: '900' }}>₹{emiDetails.totalPayable.toLocaleString('en-IN')}</Text>
              </View>
              <View style={[styles.noteBox, { backgroundColor: `${ACCENT}10` }]}>
                <Icon name="information-circle" size={13} color={ACCENT} />
                <Text style={[styles.noteText, { color: ACCENT }]}>Note: Customer can convert purchases via SMS or NetBanking after swipe.</Text>
              </View>
            </View>
          </View>
        )}

        {/* Search + bank filter */}
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <Icon name="search" size={13} color={colors.textLight} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search EMI scheme or bank..."
              placeholderTextColor={colors.textLight}
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <TouchableOpacity
              style={[styles.bankChip, {
                borderColor: selectedBank === 'ALL' ? ACCENT : borderCol,
                backgroundColor: selectedBank === 'ALL' ? ACCENT : cardBg,
              }]}
              onPress={() => setSelectedBank('ALL')}
            >
              <Text style={{ fontSize: 12.5, fontWeight: '700', color: selectedBank === 'ALL' ? '#fff' : colors.text }}>
                All Banks{availableBanks.length > 0 ? ` (${availableBanks.length})` : ''}
              </Text>
            </TouchableOpacity>
            {availableBanks.map((b) => (
              <TouchableOpacity
                key={b}
                style={[styles.bankChip, {
                  borderColor: selectedBank === b ? ACCENT : borderCol,
                  backgroundColor: selectedBank === b ? ACCENT : cardBg,
                }]}
                onPress={() => setSelectedBank(b)}
              >
                <Text style={{ fontSize: 12.5, fontWeight: '700', color: selectedBank === b ? '#fff' : colors.text }}>{b}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Schemes */}
        {loading ? (
          <View style={[styles.stateCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <ActivityIndicator size="large" color={ACCENT} />
          </View>
        ) : filteredSchemes.length === 0 ? (
          <View style={[styles.stateCard, { backgroundColor: cardBg, borderColor: borderCol, alignItems: 'center' }]}>
            <Icon name="flash" size={34} color={colors.textLight} />
            <Text style={[styles.stateTitle, { color: colors.text }]}>No Smart EMI Schemes Found</Text>
            <Text style={[styles.stateSub, { color: colors.textMid }]}>
              There are currently no products under "Smart EMI on Credit Card".
            </Text>
          </View>
        ) : (
          filteredSchemes.map(renderSchemeCard)
        )}
      </ScrollView>

      {/* Benefits modal */}
      <Modal visible={!!benefitsScheme} transparent animationType="fade" onRequestClose={() => setBenefitsScheme(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.modalHead, { borderBottomColor: borderCol }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {benefitsScheme?.bank} — {benefitsScheme?.title}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMid }}>Product Details & Key Benefits</Text>
              </View>
              <TouchableOpacity onPress={() => setBenefitsScheme(null)} style={styles.modalCloseBtn}>
                <Icon name="close" size={18} color={colors.textMid} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ padding: 18, gap: 16 }}>
              {benefitsScheme && (
                <>
                  <View style={[styles.benefitMetrics, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                    {renderMetric('Min Purchase Value', benefitsScheme.minTransaction)}
                    {renderMetric('Interest Rate', benefitsScheme.minRoi, '#10B981')}
                    {renderMetric('Tenure', benefitsScheme.tenure)}
                    {renderMetric('Processing Fee', benefitsScheme.processingFee, benefitsScheme.accent)}
                  </View>
                  <View>
                    <Text style={[styles.benefitHeading, { color: colors.text }]}>Key Product Features:</Text>
                    <View style={{ gap: 8 }}>
                      {benefitsScheme.features.map((feat, idx) => (
                        <View key={idx} style={styles.featureRow}>
                          <Icon name="check-circle" size={14} color="#10B981" />
                          <Text style={[styles.featureText, { color: colors.textMid, fontSize: 13 }]}>{feat}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
            <View style={[styles.modalFoot, { borderTopColor: borderCol, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: borderCol, backgroundColor: cardBg }]} onPress={() => setBenefitsScheme(null)}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: ACCENT, borderColor: 'transparent' }]}
                onPress={() => { const s = benefitsScheme; setBenefitsScheme(null); if (s) setApplyScheme(s); }}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Apply for Customer Now →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Apply modal */}
      <Modal visible={!!applyScheme} transparent animationType="slide" onRequestClose={resetApplyModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.applyModal, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.modalTitle, { color: colors.text, fontSize: 18 }]}>
                  Apply {applyScheme?.bank} {applyScheme?.title}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMid, marginTop: 4 }}>
                  Submit lead details for customer Smart EMI eligibility verification.
                </Text>
              </View>
              <TouchableOpacity onPress={resetApplyModal} style={styles.modalCloseBtn}>
                <Icon name="close" size={18} color={colors.textMid} />
              </TouchableOpacity>
            </View>

            {submitSuccess ? (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <Icon name="check-circle" size={46} color="#10B981" />
                <Text style={[styles.stateTitle, { color: colors.text, marginTop: 10 }]}>Application Submitted!</Text>
                <Text style={[styles.stateSub, { color: colors.textMid }]}>
                  Lead has been mapped under your referral ID ({String(empCode)}).
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 14, paddingTop: 16 }}>
                <View>
                  <Text style={[styles.inputLabel, { color: colors.textMid }]}>Name</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol, color: colors.text }]}
                    placeholder="Enter customer name..."
                    placeholderTextColor={colors.textLight}
                    value={custName}
                    onChangeText={setCustName}
                  />
                </View>
                <View>
                  <Text style={[styles.inputLabel, { color: colors.textMid }]}>Number</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol, color: colors.text }]}
                    placeholder="10-digit mobile number..."
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    maxLength={10}
                    value={custMobile}
                    onChangeText={(t) => setCustMobile(t.replace(/\D/g, ''))}
                  />
                </View>
                <View>
                  <Text style={[styles.inputLabel, { color: colors.textMid }]}>Smart EMI Amount</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol, color: colors.text }]}
                    placeholder="Enter Smart EMI Amount..."
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={smartEmiAmt}
                    onChangeText={setSmartEmiAmt}
                  />
                </View>
                <View>
                  <Text style={[styles.inputLabel, { color: colors.textMid }]}>Tenure</Text>
                  <View style={styles.tenureWrap}>
                    {TENURE_OPTIONS.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.tenureChip, {
                          borderColor: smartEmiTenure === t ? ACCENT : borderCol,
                          backgroundColor: smartEmiTenure === t ? ACCENT : (isDark ? '#0F172A' : '#F8FAFC'),
                        }]}
                        onPress={() => setSmartEmiTenure(t)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: smartEmiTenure === t ? '#fff' : colors.text }}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View>
                  <Text style={[styles.inputLabel, { color: colors.text, fontWeight: '800', fontSize: 12.5 }]}>3. Process By *</Text>
                  <View style={{ gap: 10 }}>
                    {processOptions.map((opt) => {
                      const active = processBy === opt.id;
                      return (
                        <TouchableOpacity
                          key={opt.id}
                          style={[styles.processOption, {
                            borderColor: active ? ACCENT : borderCol,
                            backgroundColor: active ? `${ACCENT}0D` : cardBg,
                          }]}
                          onPress={() => setProcessBy(opt.id)}
                        >
                          <View style={[styles.radioOuter, { borderColor: active ? ACCENT : colors.textLight }]}>
                            {active && <View style={[styles.radioInner, { backgroundColor: ACCENT }]} />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13.5, fontWeight: '800', color: colors.text }}>{opt.title}</Text>
                            <Text style={{ fontSize: 11.5, color: colors.textMid, marginTop: 2 }}>{opt.desc}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity style={[styles.modalBtn, { flex: 1, borderColor: borderCol, backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]} onPress={resetApplyModal}>
                    <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, { flex: 1, backgroundColor: ACCENT, borderColor: 'transparent' }]}
                    onPress={handleSubmitLead}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={[styles.modalBtnText, { color: '#fff' }]}>Submit Application</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl, gap: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pageTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  pageSub: { fontSize: 12.5, marginTop: 2 },
  calcToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1,
  },
  calcToggleText: { fontSize: 12.5, fontWeight: '800' },
  calcCard: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 14 },
  calcHead: { flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, paddingBottom: 12 },
  calcIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  calcTitle: { fontSize: 16, fontWeight: '900' },
  calcSub: { fontSize: 12, marginTop: 2 },
  fieldLabel: { fontSize: 12.5, fontWeight: '700', marginBottom: 6 },
  amountRow: { marginBottom: 4 },
  amountValue: { fontSize: 18, fontWeight: '900' },
  calcInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 14, fontWeight: '600',
  },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  rateGrid: { flexDirection: 'row', gap: 8 },
  rateCard: {
    flex: 1, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1,
  },
  tenureWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tenureChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  resultBox: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  resultCap: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  emiRow: { flexDirection: 'row', alignItems: 'baseline' },
  emiVal: { fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  resultDivider: { height: 1 },
  resultLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  noteBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
  },
  noteText: { fontSize: 11.5, fontWeight: '700', flex: 1 },
  searchRow: { gap: 10 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '600' },
  bankChip: {
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  stateCard: {
    borderRadius: 18, borderWidth: 1, padding: 40, alignItems: 'center', gap: 8,
  },
  stateTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  stateSub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  // Offer card
  offerCard: {
    borderRadius: 18, borderWidth: 1, padding: 18, gap: 16,
  },
  offerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  offerBank: { flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '900' },
  badgeChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  logoFallback: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  titleWrap: { borderBottomWidth: 1, paddingBottom: 10, alignItems: 'center' },
  offerTitle: { fontSize: 14.5, fontWeight: '800', textAlign: 'center' },
  metricsBox: { borderRadius: 12, padding: 12 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: 8 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  featureText: { fontSize: 12.5, fontWeight: '600', flex: 1, lineHeight: 17 },
  actionsBox: { borderTopWidth: 1, paddingTop: 14, gap: 8 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 10, borderWidth: 1,
  },
  actionBtnText: { fontSize: 12.5, fontWeight: '700' },
  applyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 10,
  },
  applyBtnText: { color: '#fff', fontSize: 12.5, fontWeight: '800' },
  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  modalCard: { borderRadius: 22, borderWidth: 1, maxHeight: '88%', overflow: 'hidden' },
  applyModal: { padding: 20 },
  modalHead: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center' },
  modalTitle: { fontSize: 16, fontWeight: '900' },
  modalCloseBtn: { padding: 4 },
  benefitMetrics: { borderRadius: 12, padding: 12 },
  benefitHeading: { fontSize: 13.5, fontWeight: '800', marginBottom: 10 },
  modalFoot: {
    flexDirection: 'row', gap: 10, padding: 14,
    borderTopWidth: 1,
  },
  modalBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: 'transparent',
  },
  modalBtnText: { fontSize: 13, fontWeight: '700' },
  inputLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  textInput: {
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 13, fontWeight: '600',
  },
  processOption: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 2,
  },
  radioOuter: {
    width: 18, height: 18, borderRadius: 9, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  radioInner: { width: 9, height: 9, borderRadius: 4.5 },
});
