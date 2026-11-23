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

// Employee accent — website uses C.employeePrimary || '#0F766E'
const ACCENT = '#0F766E';

const CANONICAL_HDFC_APPLY_URL = 'https://applyonline.hdfc.bank.in/loan-against-assets/insta-jumbo-loan/insta-jumbo-form.html?&XSELLINSHI=Y&XSELLINSLP=Y&Channel=DSA&DSACode=XYOH&LGCode=XYOH&LC1=YOH5&LC2=YOH5&SMCode=S54558#nbb';

const CANONICAL_HDFC_FEATURES = [
  'Instant 10-second cash credit directly into your bank savings account',
  'Insta Jumbo Loan option available over and above existing credit card limit',
  'Zero physical documentation with complete digital journey',
  'Flexible foreclosure options after 12 monthly installments',
];

interface CardLoanOffer {
  id: string;
  bank_id?: string;
  bank: string;
  title: string;
  logo?: string | null;
  accent: string;
  maxLoan: string;
  minRoi: string;
  tenure: string;
  processingFee: string;
  disbursalTime: string;
  badge: string;
  apply_url?: string;
  features: string[];
}

// Port of the website's stable matcher for the canonical HDFC Instant & Jumbo Loan offer
const isHdfcInstantJumboLoanOffer = (p: any): boolean => {
  if (!p) return false;
  const pName = String(p.name || p.title || '').toLowerCase().trim();
  const slug = String(p.slug || '').toLowerCase().trim();
  const pId = String(p.id || '').toLowerCase().trim();
  const bName = String(p.bank_name || p.bank || '').toLowerCase().trim();

  if (pName.includes('canara') || bName.includes('canara')) return false;
  if (pName.includes('union') || bName.includes('union')) return false;

  if (slug === 'hdfc-bank-instant-jumbo-loan' || slug === 'hdfc-instant-jumbo-loan') return true;
  if (pId === 'hdfc-instant-jumbo-loan') return true;
  if (pName === 'hdfc bank instant & jumbo loan' || pName === 'hdfc bank insta loan & jumbo loan') return true;

  const isHdfc = bName.includes('hdfc') || pName.includes('hdfc');
  const isJumboOrInstant = pName.includes('jumbo') || pName.includes('instant') || pName.includes('insta');
  return isHdfc && isJumboOrInstant;
};

const parseFeatures = (raw: any): string[] => {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const TENURE_OPTIONS = ['6 Months', '1 Year', '2 Years', '3 Years', '4 Years', '5 Years'];
const CALC_TENURES = [6, 12, 18, 24, 36, 48, 60];

export default function EmployeeLoanOnCreditCardScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [selectedBank, setSelectedBank] = useState('ALL');
  const [offers, setOffers] = useState<CardLoanOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const isMountedRef = useRef(true);

  // Calculator state (website parity)
  const [loanAmount, setLoanAmount] = useState('150000');
  const [interestRate, setInterestRate] = useState('13.5');
  const [tenureMonths, setTenureMonths] = useState(24);

  // Apply / Benefits / Compare state
  const [benefitsOffer, setBenefitsOffer] = useState<CardLoanOffer | null>(null);
  const [applyOffer, setApplyOffer] = useState<CardLoanOffer | null>(null);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [custName, setCustName] = useState('');
  const [custMobile, setCustMobile] = useState('');
  const [loanRequiredAmt, setLoanRequiredAmt] = useState('');
  const [loanTenure, setLoanTenure] = useState('6 Months');
  const [processBy, setProcessBy] = useState('Punching Only');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const empCode = (user as any)?.partner_code || (user as any)?.employee_id || (user as any)?.emp_code || (user as any)?.referral_code || user?.id || '';
  const isPartner = (user as any)?.role === 'PARTNER' || (user as any)?.role === 'TEAM_MEMBER' || !!(user as any)?.partner_code;

  const fetchDynamicOffers = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setApiError(null);
      const res = await apiClient.get('/products', { params: { limit: 1000 } });
      if (!isMountedRef.current) return;

      const prods = res.data?.data?.rows || res.data?.data || res.data?.products || [];
      if (Array.isArray(prods) && prods.length > 0) {
        const hdfcOffers = prods.filter(isHdfcInstantJumboLoanOffer);
        if (hdfcOffers.length > 0) {
          const targetProd =
            hdfcOffers.find((p: any) =>
              p.slug === 'hdfc-bank-instant-jumbo-loan' ||
              String(p.name || '').toLowerCase() === 'hdfc bank instant & jumbo loan'
            ) || hdfcOffers[0];

          const parsedFeatures = parseFeatures(targetProd.features);
          const singleOffer: CardLoanOffer = {
            id: String(targetProd.id),
            bank_id: targetProd.bank_id,
            bank: 'HDFC Bank',
            title: targetProd.name || 'HDFC Bank Instant & Jumbo Loan',
            logo: resolveMediaUrl(targetProd.bank_logo || targetProd.logo || targetProd.image_url),
            accent: ACCENT,
            maxLoan: targetProd.joining_fee && targetProd.joining_fee !== 'Nil' ? String(targetProd.joining_fee) : '₹10,00,000',
            minRoi: targetProd.interest_rate || '11.49% - 15.50% p.a.',
            tenure: targetProd.time_period || targetProd.tenure || '12 - 60 Months',
            processingFee: targetProd.annual_fee || targetProd.fees_charges || '₹999 + GST',
            disbursalTime: 'Instant (10 Seconds)',
            badge: targetProd.badge || 'Pre-Approved',
            apply_url: targetProd.apply_url || targetProd.direct_url || targetProd.link || CANONICAL_HDFC_APPLY_URL,
            features: parsedFeatures.length > 0 ? parsedFeatures : CANONICAL_HDFC_FEATURES,
          };
          setOffers([singleOffer]);
        } else {
          setOffers([]);
        }
      } else {
        setOffers([]);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Failed to load dynamic Card Loan offers:', err);
      setApiError('Unable to load loan offers at this time. Please check your connection.');
      setOffers([]);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchDynamicOffers();
    return () => { isMountedRef.current = false; };
  }, [fetchDynamicOffers]);

  const availableBanks = useMemo(() => {
    const set = new Set<string>();
    offers.forEach((o) => { if (o.bank) set.add(o.bank); });
    return Array.from(set);
  }, [offers]);

  // EMI calc — website parity
  const emiDetails = useMemo(() => {
    const P = parseFloat(loanAmount) || 0;
    const r = (parseFloat(interestRate) || 0) / 12 / 100;
    const n = parseInt(String(tenureMonths), 10) || 12;
    if (P <= 0 || r <= 0 || n <= 0) return { emi: 0, totalInterest: 0, totalPayable: 0 };
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPayable = emi * n;
    return { emi: Math.round(emi), totalInterest: Math.round(totalPayable - P), totalPayable: Math.round(totalPayable) };
  }, [loanAmount, interestRate, tenureMonths]);

  const filteredOffers = useMemo(() => {
    const q = search.toLowerCase();
    return offers.filter((offer) => {
      const matchesSearch =
        offer.title.toLowerCase().includes(q) ||
        offer.bank.toLowerCase().includes(q) ||
        offer.features.some((f) => f.toLowerCase().includes(q));
      const matchesBank = selectedBank === 'ALL' || offer.bank === selectedBank;
      return matchesSearch && matchesBank;
    });
  }, [offers, search, selectedBank]);

  const handleToggleCompare = (offer: CardLoanOffer) => {
    setCompareList((prev) => prev.includes(offer.id) ? prev.filter((id) => id !== offer.id) : [...prev, offer.id]);
  };

  const shareLinkFor = (offer: CardLoanOffer) =>
    `https://gharkapaisa.in/apply/${encodeURIComponent(String(empCode))}/${offer.id}?type=card_loan`;

  const handleWhatsAppShare = async (offer: CardLoanOffer) => {
    const link = shareLinkFor(offer);
    const msg = encodeURIComponent(
      `Avail instant loan on your ${offer.bank} Credit Card! Interest starting from ${offer.minRoi}, flexible tenures up to ${offer.tenure}.\nApply here: ${link}`
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
    setApplyOffer(null);
    setCustName('');
    setCustMobile('');
    setLoanRequiredAmt('');
    setLoanTenure('6 Months');
    setProcessBy('Punching Only');
  };

  const handleSubmitLead = async () => {
    if (!applyOffer || !custName || !custMobile || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(applyOffer.id);
      const payload: any = {
        full_name: custName,
        mobile: custMobile,
        product_type: 'loan_on_credit_card',
        loan_required_amount: loanRequiredAmt,
        tenure: loanTenure,
        process_by: processBy,
        card_bank: applyOffer.bank,
        card_name: applyOffer.title,
        ...(isUuid ? { product_id: applyOffer.id } : {}),
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

      const targetDirectUrl = applyOffer.apply_url || applyOffer.apply_url || CANONICAL_HDFC_APPLY_URL;
      if (processBy === 'Direct link') {
        Linking.openURL(targetDirectUrl).catch(() => {});
      } else if (processBy === 'Linked share') {
        const msg = encodeURIComponent(`Apply for ${applyOffer.bank || 'HDFC Bank'} Loan on Credit Card here: ${targetDirectUrl}`);
        Linking.openURL(`https://wa.me/?text=${msg}`).catch(() => {});
      }

      setSubmitSuccess(true);
      setTimeout(() => {
        setSubmitSuccess(false);
        resetApplyModal();
      }, 2500);
    } catch (err: any) {
      console.error('Failed to submit card loan lead:', err);
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

  const renderOfferCard = (offer: CardLoanOffer) => (
    <View key={offer.id} style={[styles.offerCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
      {/* Row 1: logo | bank | badge */}
      <View style={styles.offerTopRow}>
        <View style={{ width: 44 }}>
          {offer.logo ? (
            <Image source={{ uri: offer.logo }} style={{ height: 30 }} resizeMode="contain" />
          ) : (
            <View style={[styles.logoFallback, { backgroundColor: `${offer.accent}15` }]}>
              <Text style={{ color: offer.accent, fontWeight: '900', fontSize: 13 }}>{offer.bank.charAt(0)}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.offerBank, { color: colors.text }]} numberOfLines={1}>{offer.bank}</Text>
        <View style={[styles.badgeChip, { backgroundColor: `${offer.accent}15` }]}>
          <Text style={{ color: offer.accent, fontSize: 11, fontWeight: '800' }} numberOfLines={1}>{offer.badge}</Text>
        </View>
      </View>

      {/* Row 2: centered title */}
      <View style={[styles.titleWrap, { borderBottomColor: borderCol }]}>
        <Text style={[styles.offerTitle, { color: offer.accent }]} numberOfLines={2}>{offer.title}</Text>
      </View>

      {/* Metrics grid */}
      <View style={[styles.metricsBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
        <View style={styles.metricsGrid}>
          {renderMetric('Max Loan Limit', offer.maxLoan)}
          {renderMetric('Interest Rate', offer.minRoi, '#10B981')}
          {renderMetric('Tenure', offer.tenure)}
          {renderMetric('Disbursal Time', offer.disbursalTime, offer.accent)}
        </View>
      </View>

      {/* Features */}
      <View style={{ gap: 6 }}>
        {offer.features.map((feat, idx) => (
          <View key={idx} style={styles.featureRow}>
            <Icon name="check-circle" size={13} color="#10B981" />
            <Text style={[styles.featureText, { color: colors.textMid }]}>{feat}</Text>
          </View>
        ))}
      </View>

      {/* Actions: Share | Compare / Benefits | Apply */}
      <View style={[styles.actionsBox, { borderTopColor: borderCol }]}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol }]} onPress={() => handleWhatsAppShare(offer)}>
            <Icon name="share-2" size={13} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, {
              backgroundColor: compareList.includes(offer.id) ? `${ACCENT}15` : (isDark ? '#0F172A' : '#F8FAFC'),
              borderColor: compareList.includes(offer.id) ? ACCENT : borderCol,
            }]}
            onPress={() => handleToggleCompare(offer)}
          >
            <Icon name="git-compare" size={13} color={compareList.includes(offer.id) ? ACCENT : colors.text} />
            <Text style={[styles.actionBtnText, { color: compareList.includes(offer.id) ? ACCENT : colors.text }]}>
              {compareList.includes(offer.id) ? '✓ Compared' : 'Compare'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol }]} onPress={() => setBenefitsOffer(offer)}>
            <Icon name="information-circle" size={13} color={colors.text} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Benefits</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.applyBtn, { backgroundColor: ACCENT }]} onPress={() => setApplyOffer(offer)}>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDynamicOffers(true)} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Loan on Credit Card Offers ({filteredOffers.length})</Text>
            <Text style={[styles.pageSub, { color: colors.textMid }]}>Pre-approved instant cash loans & Jumbo card loans</Text>
          </View>
          <TouchableOpacity
            style={[styles.calcToggle, {
              borderColor: showCalculator ? ACCENT : borderCol,
              backgroundColor: showCalculator ? `${ACCENT}15` : cardBg,
            }]}
            onPress={() => setShowCalculator(!showCalculator)}
          >
            <Icon name="calculator" size={14} color={showCalculator ? ACCENT : colors.text} />
            <Text style={[styles.calcToggleText, { color: showCalculator ? ACCENT : colors.text }]}>Loan Calculator</Text>
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
                <Text style={[styles.calcTitle, { color: colors.text }]}>Card Loan Eligibility & Loan Calculator</Text>
                <Text style={[styles.calcSub, { color: colors.textMid }]}>Calculate exact monthly EMI installments and total interest payable for customers.</Text>
              </View>
            </View>

            {/* Amount */}
            <Text style={[styles.fieldLabel, { color: colors.textMid }]}>Loan Amount Required:</Text>
            <View style={styles.amountRow}>
              <Text style={[styles.amountValue, { color: ACCENT }]}>₹{(parseFloat(loanAmount) || 0).toLocaleString('en-IN')}</Text>
            </View>
            <TextInput
              style={[styles.calcInput, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol, color: colors.text }]}
              value={loanAmount}
              onChangeText={setLoanAmount}
              keyboardType="numeric"
              placeholder="150000"
              placeholderTextColor={colors.textLight}
            />
            <View style={styles.rangeLabels}>
              <Text style={{ fontSize: 11, color: colors.textLight }}>₹20,000</Text>
              <Text style={{ fontSize: 11, color: colors.textLight }}>₹10,00,000</Text>
            </View>

            {/* Rate */}
            <Text style={[styles.fieldLabel, { color: colors.textMid, marginTop: 14 }]}>Interest Rate (% p.a.):</Text>
            <View style={styles.amountRow}>
              <Text style={[styles.amountValue, { color: ACCENT }]}>{interestRate}%</Text>
            </View>
            <TextInput
              style={[styles.calcInput, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol, color: colors.text }]}
              value={interestRate}
              onChangeText={setInterestRate}
              keyboardType="numeric"
              placeholder="13.5"
              placeholderTextColor={colors.textLight}
            />
            <View style={styles.rangeLabels}>
              <Text style={{ fontSize: 11, color: colors.textLight }}>10.0%</Text>
              <Text style={{ fontSize: 11, color: colors.textLight }}>24.0%</Text>
            </View>

            {/* Tenure */}
            <Text style={[styles.fieldLabel, { color: colors.textMid, marginTop: 14 }]}>Select Repayment Tenure (Months):</Text>
            <View style={styles.tenureWrap}>
              {CALC_TENURES.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.tenureChip, {
                    borderColor: tenureMonths === m ? ACCENT : borderCol,
                    backgroundColor: tenureMonths === m ? ACCENT : (isDark ? '#0F172A' : '#F8FAFC'),
                  }]}
                  onPress={() => setTenureMonths(m)}
                >
                  <Text style={{ fontSize: 12.5, fontWeight: '800', color: tenureMonths === m ? '#fff' : colors.text }}>{m} Months</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Results */}
            <View style={[styles.resultBox, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol }]}>
              <Text style={[styles.resultCap, { color: colors.textLight }]}>ESTIMATED MONTHLY INSTALLMENT</Text>
              <View style={styles.emiRow}>
                <Text style={[styles.emiVal, { color: ACCENT }]}>₹{emiDetails.emi.toLocaleString('en-IN')}</Text>
                <Text style={{ fontSize: 13, color: colors.textMid }}>/ month</Text>
              </View>
              <View style={[styles.resultDivider, { backgroundColor: borderCol }]} />
              <View style={styles.resultLine}>
                <Text style={{ color: colors.textMid, fontWeight: '600' }}>Principal Amount:</Text>
                <Text style={{ color: colors.text, fontWeight: '800' }}>₹{(parseFloat(loanAmount) || 0).toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.resultLine}>
                <Text style={{ color: colors.textMid, fontWeight: '600' }}>Total Interest Payable:</Text>
                <Text style={{ color: '#F59E0B', fontWeight: '800' }}>₹{emiDetails.totalInterest.toLocaleString('en-IN')}</Text>
              </View>
              <View style={[styles.resultLine, { borderTopWidth: 1, borderTopColor: borderCol, borderStyle: 'dashed', paddingTop: 10 }]}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>Total Amount Payable:</Text>
                <Text style={{ color: colors.text, fontWeight: '900' }}>₹{emiDetails.totalPayable.toLocaleString('en-IN')}</Text>
              </View>
              <View style={[styles.noteBox, { backgroundColor: `${ACCENT}10` }]}>
                <Icon name="information-circle" size={13} color={ACCENT} />
                <Text style={[styles.noteText, { color: ACCENT }]}>Note: Actual loan limit and interest rate depend on customer bank credit card history.</Text>
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
              placeholder="Search scheme or bank..."
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

        {/* Offers */}
        {loading ? (
          <View style={[styles.stateCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <ActivityIndicator size="large" color={ACCENT} />
          </View>
        ) : apiError ? (
          <View style={[styles.stateCard, { backgroundColor: cardBg, borderColor: borderCol, alignItems: 'center' }]}>
            <Icon name="information-circle" size={34} color="#EF4444" />
            <Text style={[styles.stateTitle, { color: colors.text }]}>Failed to Load Offers</Text>
            <Text style={[styles.stateSub, { color: colors.textMid }]}>{apiError}</Text>
            <TouchableOpacity style={[styles.retryBtn, { backgroundColor: ACCENT }]} onPress={() => fetchDynamicOffers()}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredOffers.length === 0 ? (
          <View style={[styles.stateCard, { backgroundColor: cardBg, borderColor: borderCol, alignItems: 'center' }]}>
            <Icon name="cash" size={34} color={colors.textLight} />
            <Text style={[styles.stateTitle, { color: colors.text }]}>No Dynamic Loan Offers Found</Text>
            <Text style={[styles.stateSub, { color: colors.textMid }]}>
              There are currently no products under "Loan on Credit Card". You can add new products in Super Admin Product Management.
            </Text>
          </View>
        ) : (
          filteredOffers.map(renderOfferCard)
        )}
      </ScrollView>

      {/* Benefits modal */}
      <Modal visible={!!benefitsOffer} transparent animationType="fade" onRequestClose={() => setBenefitsOffer(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={[styles.modalHead, { borderBottomColor: borderCol }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {benefitsOffer?.bank} — {benefitsOffer?.title}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMid }}>Product Details & Key Benefits</Text>
              </View>
              <TouchableOpacity onPress={() => setBenefitsOffer(null)} style={styles.modalCloseBtn}>
                <Icon name="close" size={18} color={colors.textMid} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ padding: 18, gap: 16 }}>
              {benefitsOffer && (
                <>
                  <View style={[styles.benefitMetrics, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' }]}>
                    {renderMetric('Max Loan Limit', benefitsOffer.maxLoan)}
                    {renderMetric('Interest Rate', benefitsOffer.minRoi, '#10B981')}
                    {renderMetric('Tenure', benefitsOffer.tenure)}
                    {renderMetric('Disbursal Time', benefitsOffer.disbursalTime, benefitsOffer.accent)}
                  </View>
                  <View>
                    <Text style={[styles.benefitHeading, { color: colors.text }]}>Key Product Features:</Text>
                    <View style={{ gap: 8 }}>
                      {benefitsOffer.features.map((feat, idx) => (
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
              <TouchableOpacity style={[styles.modalBtn, { borderColor: borderCol, backgroundColor: cardBg }]} onPress={() => setBenefitsOffer(null)}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary, { backgroundColor: ACCENT }]}
                onPress={() => { const o = benefitsOffer; setBenefitsOffer(null); if (o) setApplyOffer(o); }}
              >
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Apply for Customer Now →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Apply modal */}
      <Modal visible={!!applyOffer} transparent animationType="slide" onRequestClose={resetApplyModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.applyModal, { backgroundColor: cardBg, borderColor: borderCol }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.modalTitle, { color: colors.text, fontSize: 18 }]}>
                  Apply {applyOffer?.bank} {applyOffer?.title}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMid, marginTop: 4 }}>
                  Submit lead details for customer card loan eligibility verification.
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
                  <Text style={[styles.inputLabel, { color: colors.textMid }]}>Loan Required Amount</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: isDark ? '#0F172A' : '#F8FAFC', borderColor: borderCol, color: colors.text }]}
                    placeholder="Enter Loan Required Amount..."
                    placeholderTextColor={colors.textLight}
                    keyboardType="numeric"
                    value={loanRequiredAmt}
                    onChangeText={setLoanRequiredAmt}
                  />
                </View>
                <View>
                  <Text style={[styles.inputLabel, { color: colors.textMid }]}>Loan Tenure</Text>
                  <View style={styles.tenureWrap}>
                    {TENURE_OPTIONS.map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.tenureChip, {
                          borderColor: loanTenure === t ? ACCENT : borderCol,
                          backgroundColor: loanTenure === t ? ACCENT : (isDark ? '#0F172A' : '#F8FAFC'),
                        }]}
                        onPress={() => setLoanTenure(t)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: loanTenure === t ? '#fff' : colors.text }}>{t}</Text>
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
                    style={[styles.modalBtn, styles.modalBtnPrimary, { flex: 1, backgroundColor: ACCENT }]}
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
  stateSub: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 10, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10 },
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
  modalBtnPrimary: {},
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
