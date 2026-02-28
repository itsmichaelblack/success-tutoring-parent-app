import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useParent } from '../config/ParentContext';
import { COLORS, SIZES } from '../config/theme';

// Map country names/codes from address to policy country codes
function getCountryCodeFromAddress(address) {
  if (!address) return null;
  const lower = address.toLowerCase();
  if (lower.includes('australia') || lower.match(/\b(nsw|vic|qld|wa|sa|tas|nt|act)\b/i)) return 'AU';
  if (lower.includes('new zealand') || lower.includes('nz')) return 'NZ';
  if (lower.includes('united states') || lower.includes('usa') || lower.match(/\b(ca|ny|tx|fl|il|pa)\s+\d{5}\b/)) return 'US';
  if (lower.includes('united kingdom') || lower.includes('uk') || lower.includes('england') || lower.includes('scotland') || lower.includes('wales')) return 'GB';
  return null;
}

// Simple HTML-to-Text renderer for rich text content in React Native
function RichTextRenderer({ html }) {
  if (!html) return null;

  // Convert HTML to simpler representation
  const cleanHtml = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li>/gi, '  •  ')
    .replace(/<h1[^>]*>/gi, '@@H1@@')
    .replace(/<h2[^>]*>/gi, '@@H2@@')
    .replace(/<h3[^>]*>/gi, '@@H3@@')
    .replace(/<strong>|<b>/gi, '@@BOLD@@')
    .replace(/<\/strong>|<\/b>/gi, '@@/BOLD@@')
    .replace(/<em>|<i>/gi, '@@ITALIC@@')
    .replace(/<\/em>|<\/i>/gi, '@@/ITALIC@@')
    .replace(/<u>/gi, '@@UNDERLINE@@')
    .replace(/<\/u>/gi, '@@/UNDERLINE@@')
    .replace(/<[^>]+>/g, '') // strip remaining tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Parse into styled segments
  const parts = cleanHtml.split(/(@@H[1-3]@@|@@\/?BOLD@@|@@\/?ITALIC@@|@@\/?UNDERLINE@@)/);
  let isBold = false;
  let isItalic = false;
  let isUnderline = false;
  let isHeading = 0;
  let key = 0;

  const elements = [];
  for (const part of parts) {
    if (part === '@@BOLD@@') { isBold = true; continue; }
    if (part === '@@/BOLD@@') { isBold = false; continue; }
    if (part === '@@ITALIC@@') { isItalic = true; continue; }
    if (part === '@@/ITALIC@@') { isItalic = false; continue; }
    if (part === '@@UNDERLINE@@') { isUnderline = true; continue; }
    if (part === '@@/UNDERLINE@@') { isUnderline = false; continue; }
    if (part === '@@H1@@') { isHeading = 1; continue; }
    if (part === '@@H2@@') { isHeading = 2; continue; }
    if (part === '@@H3@@') { isHeading = 3; continue; }
    if (!part) continue;

    const style = {
      fontSize: isHeading === 1 ? 22 : isHeading === 2 ? 18 : isHeading === 3 ? 16 : 14,
      fontWeight: (isBold || isHeading) ? '700' : '400',
      fontStyle: isItalic ? 'italic' : 'normal',
      textDecorationLine: isUnderline ? 'underline' : 'none',
      color: COLORS.dark,
      lineHeight: isHeading ? 30 : 22,
    };

    elements.push(
      <Text key={key++} style={style}>{part}</Text>
    );

    if (isHeading) isHeading = 0;
  }

  return (
    <Text style={{ fontSize: 14, color: COLORS.dark, lineHeight: 22 }}>
      {elements}
    </Text>
  );
}

export default function SignUpAgreeScreen({ navigation, route }) {
  const { locationId, locationName } = route.params;
  const { setParentData, loadChildren } = useParent();
  const [checks, setChecks] = useState({});
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalPolicy, setModalPolicy] = useState(null);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [policyItems, setPolicyItems] = useState([]);
  const [locationCountry, setLocationCountry] = useState(null);

  // Fetch location data to determine country, then fetch policies
  useEffect(() => {
    const loadPolicies = async () => {
      setPoliciesLoading(true);
      try {
        // Get location to determine country
        let country = null;
        try {
          const locSnap = await getDoc(doc(db, 'locations', locationId));
          if (locSnap.exists()) {
            const locData = locSnap.data();
            country = getCountryCodeFromAddress(locData.address);
          }
        } catch (e) {
          console.warn('Could not load location for country detection:', e);
        }
        setLocationCountry(country);

        // Fetch policies from HQ settings
        const settingsSnap = await getDoc(doc(db, 'settings', 'hq'));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data();
          const policiesData = data.policies || {};

          const allPolicies = [
            { key: 'membershipPolicy', label: 'Membership Policy', data: policiesData.membershipPolicy },
            { key: 'termsAndConditions', label: 'Terms & Conditions', data: policiesData.termsAndConditions },
            { key: 'privacyPolicy', label: 'Privacy Policy', data: policiesData.privacyPolicy },
          ];

          // Filter: only show enabled policies that apply to this country
          const filtered = allPolicies.filter(p => {
            if (!p.data) return false;
            if (!p.data.enabled) return false;
            // If no countries specified, don't show (HQ hasn't configured it)
            if (!p.data.countries || p.data.countries.length === 0) return false;
            // If we couldn't detect country, show all enabled policies as fallback
            if (!country) return true;
            return p.data.countries.includes(country);
          });

          setPolicyItems(filtered);

          // Initialize all checks to false
          const initialChecks = {};
          filtered.forEach(p => { initialChecks[p.key] = false; });
          setChecks(initialChecks);
        } else {
          // No settings document — show default 3 policies with no content
          const defaults = [
            { key: 'membershipPolicy', label: 'Membership Policy', data: null },
            { key: 'termsAndConditions', label: 'Terms & Conditions', data: null },
            { key: 'privacyPolicy', label: 'Privacy Policy', data: null },
          ];
          setPolicyItems(defaults);
          setChecks({ membershipPolicy: false, termsAndConditions: false, privacyPolicy: false });
        }
      } catch (e) {
        console.error('Failed to load policies:', e);
        // Fallback to defaults
        const defaults = [
          { key: 'membershipPolicy', label: 'Membership Policy', data: null },
          { key: 'termsAndConditions', label: 'Terms & Conditions', data: null },
          { key: 'privacyPolicy', label: 'Privacy Policy', data: null },
        ];
        setPolicyItems(defaults);
        setChecks({ membershipPolicy: false, termsAndConditions: false, privacyPolicy: false });
      }
      setPoliciesLoading(false);
    };
    loadPolicies();
  }, [locationId]);

  const allChecked = policyItems.length > 0 && policyItems.every(p => checks[p.key]);
  const toggle = (key) => setChecks(prev => ({ ...prev, [key]: !prev[key] }));

  const openPolicyModal = (policy) => {
    setModalPolicy(policy);
    setModalVisible(true);
  };

  const handleCreateAccount = async () => {
    if (!allChecked) return;
    setLoading(true);
    try {
      const { firstName, lastName, mobile, email } = route.params;
      const parentId = `parent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

      // Build agreements object from checked policies
      const agreements = { agreedAt: new Date().toISOString() };
      policyItems.forEach(p => { agreements[p.key] = true; });

      const parentDoc = {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email,
        phone: mobile,
        locationId,
        locationName,
        children: [],
        agreements,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'parents', parentId), parentDoc);

      setParentData({ ...parentDoc, id: parentId, children: [] });
      await loadChildren(parentId);

      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (e) {
      console.error('Signup failed:', e);
      Alert.alert('Error', e.message || 'Failed to create account. Please try again.');
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color={COLORS.muted} />
        </TouchableOpacity>
        <Text style={s.title}>Almost there!</Text>
      </View>
      <Text style={s.desc}>Please review and agree to the following to complete your registration.</Text>

      {policiesLoading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={COLORS.orange} />
          <Text style={{ fontSize: 13, color: COLORS.muted, marginTop: 12 }}>Loading policies...</Text>
        </View>
      ) : policyItems.length === 0 ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 20 }}>
            No policies are currently configured for your region. Please contact your centre for assistance.
          </Text>
        </View>
      ) : (
        <View style={{ paddingHorizontal: SIZES.padding }}>
          {policyItems.map(item => (
            <TouchableOpacity key={item.key} style={s.checkRow} onPress={() => toggle(item.key)} activeOpacity={0.7}>
              <View style={[s.checkbox, checks[item.key] && s.checkboxChecked]}>
                {checks[item.key] && <Feather name="check" size={14} color={COLORS.white} />}
              </View>
              <Text style={s.checkLabel}>
                I agree to the{' '}
                <Text
                  style={{ color: COLORS.orange, fontWeight: '700' }}
                  onPress={() => openPolicyModal(item)}
                >
                  {item.label}
                </Text>
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ flex: 1 }} />

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.btnPrimary, (!allChecked || loading || policiesLoading) && { opacity: 0.4 }]}
          disabled={!allChecked || loading || policiesLoading}
          onPress={handleCreateAccount}
        >
          {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={s.btnText}>Create Account</Text>}
        </TouchableOpacity>
      </View>

      {/* Policy Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={s.modalContainer}>
          {/* Modal header */}
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{modalPolicy?.label || 'Policy'}</Text>
            <TouchableOpacity style={s.modalCloseBtn} onPress={() => setModalVisible(false)}>
              <Feather name="x" size={20} color={COLORS.dark} />
            </TouchableOpacity>
          </View>

          {/* Modal content */}
          <ScrollView style={s.modalBody} contentContainerStyle={s.modalBodyContent} showsVerticalScrollIndicator={true}>
            {modalPolicy?.data?.content ? (
              <RichTextRenderer html={modalPolicy.data.content} />
            ) : (
              <View style={s.placeholderContainer}>
                <Feather name="file-text" size={40} color={COLORS.border} />
                <Text style={s.placeholderTitle}>Policy content coming soon</Text>
                <Text style={s.placeholderDesc}>
                  This policy is currently being prepared. Please check back later or contact your Success Tutoring centre for more information.
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Modal footer */}
          <View style={s.modalFooter}>
            <TouchableOpacity style={s.modalDoneBtn} onPress={() => setModalVisible(false)}>
              <Text style={s.modalDoneBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SIZES.padding, paddingTop: 12, paddingBottom: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  desc: { fontSize: 13, color: COLORS.muted, paddingHorizontal: SIZES.padding, marginBottom: 24, lineHeight: 20 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  checkLabel: { fontSize: 14, color: COLORS.dark, lineHeight: 22, flex: 1 },
  footer: { paddingHorizontal: SIZES.padding, paddingBottom: 20, paddingTop: 12 },
  btnPrimary: { backgroundColor: COLORS.orange, padding: 16, borderRadius: SIZES.radius, alignItems: 'center' },
  btnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },

  // Modal styles
  modalContainer: { flex: 1, backgroundColor: COLORS.white },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.dark, flex: 1 },
  modalCloseBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center',
  },
  modalBody: { flex: 1 },
  modalBodyContent: { padding: SIZES.padding, paddingBottom: 40 },
  modalFooter: {
    paddingHorizontal: SIZES.padding, paddingVertical: 16,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  modalDoneBtn: {
    backgroundColor: COLORS.orange, padding: 16,
    borderRadius: SIZES.radius, alignItems: 'center',
  },
  modalDoneBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },

  // Placeholder styles
  placeholderContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  placeholderTitle: { fontSize: 16, fontWeight: '700', color: COLORS.dark, marginTop: 16, marginBottom: 8 },
  placeholderDesc: { fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 20 },
});
