import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useParent } from '../config/ParentContext';
import { COLORS, SIZES } from '../config/theme';

const FUNCTIONS_URL = 'https://us-central1-success-tutoring-test.cloudfunctions.net';

export default function BillingScreen({ navigation }) {
  const { parentData, setParentData } = useParent();
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'sales'),
        where('parentEmail', '==', parentData?.email?.toLowerCase()),
        where('locationId', '==', parentData?.locationId)
      );
      const snap = await getDocs(q);
      const methods = [];
      const seen = new Set();
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.paymentMethod?.last4 && !seen.has(data.paymentMethod.last4)) {
          seen.add(data.paymentMethod.last4);
          methods.push(data.paymentMethod);
        }
      });

      // Also check parent doc
      if (parentData?.paymentMethod?.last4 && !seen.has(parentData.paymentMethod.last4)) {
        methods.push(parentData.paymentMethod);
      }

      setPaymentMethods(methods);
    } catch (e) {
      console.error('Failed to load payment methods:', e);
    }
    setLoading(false);
  };

  const handleAddPaymentMethod = async () => {
    setAdding(true);
    try {
      // Call createPaymentLink Cloud Function via HTTPS
      // This creates a Stripe Checkout session and returns a URL
      const response = await fetch(`${FUNCTIONS_URL}/createPaymentLink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            parentEmail: parentData.email,
            locationId: parentData.locationId,
            saleId: 'none',
          }
        }),
      });

      const result = await response.json();

      if (result?.result?.url) {
        // Open Stripe Checkout in browser
        const { Linking } = require('react-native');
        await Linking.openURL(result.result.url);

        // After user returns, try to confirm the payment method was saved
        Alert.alert(
          'Payment Setup',
          'After completing payment setup in the browser, tap "Confirm" to update your account.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Confirm',
              onPress: async () => {
                try {
                  const confirmResponse = await fetch(`${FUNCTIONS_URL}/savePaymentFromCheckout`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      data: {
                        parentEmail: parentData.email,
                        locationId: parentData.locationId,
                      }
                    }),
                  });

                  const confirmResult = await confirmResponse.json();
                  if (confirmResult?.result?.success) {
                    const pmInfo = {
                      brand: confirmResult.result.brand || 'Card',
                      last4: confirmResult.result.last4 || '****',
                      type: confirmResult.result.type || 'card',
                    };

                    await updateDoc(doc(db, 'parents', parentData.id), {
                      paymentMethod: pmInfo,
                      stripeCustomerId: confirmResult.result.customerId,
                    });

                    setParentData(prev => ({
                      ...prev,
                      paymentMethod: pmInfo,
                      stripeCustomerId: confirmResult.result.customerId,
                    }));

                    setPaymentMethods(prev => {
                      if (prev.some(p => p.last4 === pmInfo.last4)) return prev;
                      return [...prev, pmInfo];
                    });

                    Alert.alert('Success!', `Your ${pmInfo.brand} card ending in ${pmInfo.last4} has been saved.`);
                  } else {
                    Alert.alert('Not Found', 'No payment method found yet. It may take a moment to process. Try again shortly.');
                  }
                } catch (e) {
                  console.error('Confirm error:', e);
                  Alert.alert('Error', 'Could not confirm payment method. Try again.');
                }
              }
            }
          ]
        );
      } else {
        const errorMsg = result?.error?.message || 'Failed to create payment link.';
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
          <View style={{ padding: 30, alignItems: 'center' }}>
            <ActivityIndicator color={COLORS.orange} />
          </View>
        ) : paymentMethods.length === 0 ? (
          <View style={s.emptyCard}>
            <View style={s.emptyIcon}>
              <Feather name="credit-card" size={24} color={COLORS.muted} />
            </View>
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
              <View style={s.defaultBadge}>
                <Text style={s.defaultText}>Active</Text>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity style={[s.addBtn, adding && { opacity: 0.5 }]} onPress={handleAddPaymentMethod} disabled={adding}>
          {adding ? (
            <ActivityIndicator color={COLORS.orange} size="small" />
          ) : (
            <>
              <Feather name="plus" size={16} color={COLORS.orange} />
              <Text style={s.addBtnText}>Add Payment Method</Text>
            </>
          )}
        </TouchableOpacity>

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
  noteCard: { flexDirection: 'row', gap: 10, marginTop: 16, padding: 16, borderRadius: SIZES.radius, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  noteText: { flex: 1, fontSize: 12, color: COLORS.muted, lineHeight: 18 },
});
