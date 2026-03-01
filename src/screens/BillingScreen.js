import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useParent } from '../config/ParentContext';
import { COLORS, SIZES } from '../config/theme';

const FUNCTIONS_URL = 'https://us-central1-success-tutoring-test.cloudfunctions.net';

export default function BillingScreen({ navigation }) {
  const { parentData, setParentData } = useParent();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [webViewVisible, setWebViewVisible] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState('');

  useEffect(() => { loadPaymentMethods(); }, []);

  const loadPaymentMethods = async () => {
    setLoading(true);
    try {
      const methods = [];

      // Single source of truth: parent document in Firestore
      if (parentData?.id) {
        const parentSnap = await getDoc(doc(db, 'parents', parentData.id));
        if (parentSnap.exists()) {
          const pm = parentSnap.data().paymentMethod;
          if (pm?.last4) {
            methods.push(pm);
          }
        }
      }

      setPaymentMethods(methods);
    } catch (e) { console.error('Failed to load payment methods:', e); }
    setLoading(false);
  };

  const handleAddPaymentMethod = async () => {
    setAdding(true);
    try {
      const response = await fetch(`${FUNCTIONS_URL}/createPaymentLinkPublic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentEmail: parentData.email, locationId: parentData.locationId, saleId: 'none' }),
      });
      const result = await response.json();

      if (result?.url) {
        setCheckoutUrl(result.url);
        setWebViewVisible(true);
      } else {
        const errorMsg = result?.error || 'Failed to create payment link.';
        if (errorMsg.includes('not connected') || errorMsg.includes('Stripe not connected')) {
          Alert.alert('Stripe Not Connected', 'Your centre has not connected Stripe yet. Please contact your centre.');
        } else {
          Alert.alert('Error', errorMsg);
        }
      }
    } catch (e) {
      console.error('Payment link error:', e);
      Alert.alert('Error', 'Failed to set up payment. Please try again.');
    }
    setAdding(false);
  };

  const handleWebViewClose = async (wasSuccess, sessionId) => {
    setWebViewVisible(false);
    setCheckoutUrl('');

    if (!wasSuccess) return;

    // Show loading while confirming
    setAdding(true);
    try {
      // Small delay to let Stripe process
      await new Promise(r => setTimeout(r, 2000));

      const confirmResponse = await fetch(`${FUNCTIONS_URL}/savePaymentFromCheckoutPublic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentEmail: parentData.email,
          locationId: parentData.locationId,
          sessionId: sessionId || null,
          oldPaymentMethodId: parentData?.paymentMethod?.id || null,
        }),
      });
      const confirmResult = await confirmResponse.json();

      if (confirmResult?.success) {
        const pmInfo = {
          brand: confirmResult.brand || 'Card',
          last4: confirmResult.last4 || '****',
          type: confirmResult.type || 'card',
        };
        await updateDoc(doc(db, 'parents', parentData.id), {
          paymentMethod: pmInfo,
          stripeCustomerId: confirmResult.customerId,
        });
        setParentData(prev => ({ ...prev, paymentMethod: pmInfo, stripeCustomerId: confirmResult.customerId }));
        setPaymentMethods([pmInfo]);
        Alert.alert('Success!', `Your ${pmInfo.brand} card ending in ${pmInfo.last4} has been saved.`);
      } else {
        Alert.alert('Processing', 'Your card may take a moment to appear. Pull down to refresh.');
      }
    } catch (e) {
      console.error('Confirm error:', e);
      Alert.alert('Processing', 'Your card may take a moment to appear.');
    }
    setAdding(false);
    await loadPaymentMethods();
  };

  // Detect when Stripe redirects to success URL
  // Detect when Stripe redirects to success/cancel URL
  const handleNavigationChange = (navState) => {
    const url = navState.url || '';
    if (url.includes('payment_setup=success')) {
      // Extract session_id from URL
      const match = url.match(/session_id=([^&]+)/);
      const sessionId = match ? match[1] : null;
      handleWebViewClose(true, sessionId);
    } else if (url.includes('payment_setup=cancelled')) {
      handleWebViewClose(false);
    }
  };

  // Also intercept URL loads (more reliable than onNavigationStateChange)
  const handleShouldStartLoad = (request) => {
    const url = request.url || '';
    if (url.includes('payment_setup=success')) {
      const match = url.match(/session_id=([^&]+)/);
      const sessionId = match ? match[1] : null;
      handleWebViewClose(true, sessionId);
      return false;
    }
    if (url.includes('payment_setup=cancelled')) {
      handleWebViewClose(false);
      return false;
    }
    return true;
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color={COLORS.muted} />
        </TouchableOpacity>
        <Text style={s.title}>Billing & Payments</Text>
      </View>
      <ScrollView style={{ flex: 1, paddingHorizontal: SIZES.padding }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 16 }} />
        <Text style={s.sectionTitle}>Payment Methods</Text>
        {loading ? (
          <View style={{ padding: 30, alignItems: 'center' }}><ActivityIndicator color={COLORS.orange} /></View>
        ) : paymentMethods.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIcon}><Feather name="credit-card" size={24} color={COLORS.muted} /></View>
            <Text style={s.emptyText}>No payment methods</Text>
            <Text style={s.emptyDesc}>Add a card to enable automatic payments for your child's membership.</Text>
          </View>
        ) : (
          paymentMethods.map((pm, i) => (
            <View key={i} style={s.cardRow}>
              <View style={s.cardIcon}>
                <Feather name={pm.type === 'au_becs_debit' ? 'dollar-sign' : 'credit-card'} size={18} color={COLORS.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardBrand}>{pm.brand || 'Card'} •••• {pm.last4 || '****'}</Text>
                {pm.expMonth && <Text style={s.cardExpiry}>Expires {pm.expMonth}/{pm.expYear}</Text>}
                {pm.type === 'au_becs_debit' && <Text style={s.cardExpiry}>BECS Direct Debit</Text>}
              </View>
              <View style={s.defaultBadge}><Text style={s.defaultText}>Active</Text></View>
            </View>
          ))
        )}
        {paymentMethods.length === 0 ? (
          <TouchableOpacity style={[s.addBtn, adding && { opacity: 0.5 }]} onPress={handleAddPaymentMethod} disabled={adding}>
            {adding ? <ActivityIndicator color={COLORS.orange} size="small" /> : (
              <><Feather name="plus" size={16} color={COLORS.orange} /><Text style={s.addBtnText}>Add Payment Method</Text></>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[s.editBtn, adding && { opacity: 0.5 }]} onPress={handleAddPaymentMethod} disabled={adding}>
            {adding ? <ActivityIndicator color={COLORS.orange} size="small" /> : (
              <><Feather name="edit-2" size={14} color={COLORS.muted} /><Text style={s.editBtnText}>Edit Payment Method</Text></>
            )}
          </TouchableOpacity>
        )}
        <Text style={[s.sectionTitle, { marginTop: 28 }]}>Billing History</Text>
        <View style={s.emptyCard}>
          <Text style={s.emptyText}>No transactions yet</Text>
          <Text style={s.emptyDesc}>Your payment history will appear here once you have an active membership.</Text>
        </View>
        <View style={s.noteCard}>
          <Feather name="lock" size={16} color={COLORS.success} />
          <Text style={s.noteText}>Your payment information is securely processed by Stripe. We never store your full card details.</Text>
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Stripe Checkout WebView Modal */}
      <Modal visible={webViewVisible} animationType="slide" onRequestClose={() => handleWebViewClose(false)}>
        <View style={[s.webViewContainer, { paddingTop: insets.top }]}>
          <View style={s.webViewHeader}>
            <Text style={s.webViewTitle}>{paymentMethods.length > 0 ? 'Update Payment Method' : 'Add Payment Method'}</Text>
            <TouchableOpacity onPress={() => handleWebViewClose(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={22} color={COLORS.muted} />
            </TouchableOpacity>
          </View>
          {checkoutUrl ? (
            <WebView
              source={{ uri: checkoutUrl }}
              onNavigationStateChange={handleNavigationChange}
              onShouldStartLoadWithRequest={handleShouldStartLoad}
              startInLoadingState
              renderLoading={() => (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: COLORS.white }}>
                  <ActivityIndicator size="large" color={COLORS.orange} />
                  <Text style={{ marginTop: 12, color: COLORS.muted, fontSize: 13 }}>Loading Stripe...</Text>
                </View>
              )}
              style={{ flex: 1 }}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={COLORS.orange} />
            </View>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SIZES.padding, paddingTop: 12, paddingBottom: 4, backgroundColor: COLORS.white },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  emptyCard: { padding: 28, borderRadius: SIZES.radius, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', marginBottom: 10 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(156,163,175,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyText: { fontSize: 14, fontWeight: '700', color: COLORS.muted },
  emptyDesc: { fontSize: 12, color: COLORS.muted, marginTop: 4, textAlign: 'center', lineHeight: 18 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: SIZES.radius, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  cardIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.orangeLight, alignItems: 'center', justifyContent: 'center' },
  cardBrand: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  cardExpiry: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  defaultBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, backgroundColor: COLORS.successBg },
  defaultText: { fontSize: 11, fontWeight: '700', color: COLORS.success },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderRadius: SIZES.radius, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border, backgroundColor: COLORS.white },
  addBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.orange },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  editBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.muted },
  noteCard: { flexDirection: 'row', gap: 10, marginTop: 16, padding: 16, borderRadius: SIZES.radius, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  noteText: { flex: 1, fontSize: 12, color: COLORS.muted, lineHeight: 18 },
  // WebView modal
  webViewContainer: { flex: 1, backgroundColor: COLORS.white },
  webViewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SIZES.padding, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  webViewTitle: { fontSize: 18, fontWeight: '800', color: COLORS.dark },
});
