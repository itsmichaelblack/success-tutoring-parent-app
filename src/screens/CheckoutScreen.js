import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useParent } from '../config/ParentContext';
import { COLORS, SIZES } from '../config/theme';
import RichTextRenderer from '../components/RichTextRenderer';

const FUNCTIONS_URL = 'https://us-central1-success-tutoring-test.cloudfunctions.net';

export default function CheckoutScreen({ route, navigation }) {
  const { parentData, setParentData } = useParent();
  const { child, membership, price: basePrice } = route.params || {};

  const [feeConfig, setFeeConfig] = useState(null); // { feePercent, feeFlat }
  const [membershipPolicy, setMembershipPolicy] = useState(null);
  const [policyAgreed, setPolicyAgreed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  // Calculate fees
  const basePriceNum = parseFloat(basePrice) || 0;
  const feePercent = parseFloat(feeConfig?.feePercent) || 0;
  const feeFlat = parseFloat(feeConfig?.feeFlat) || 0;
  const percentFee = basePriceNum * (feePercent / 100);
  const totalFee = Math.round((percentFee + feeFlat) * 100) / 100;
  const totalAmount = Math.round((basePriceNum + totalFee) * 100) / 100;

  // Fee description for display
  const feeDescParts = [];
  if (feePercent > 0) feeDescParts.push(`${feePercent}%`);
  if (feeFlat > 0) feeDescParts.push(`$${feeFlat.toFixed(2)}`);
  const feeDescription = feeDescParts.length > 0 ? `Transaction fee (${feeDescParts.join(' + ')})` : '';

  useEffect(() => {
    loadCheckoutData();
  }, []);

  const loadCheckoutData = async () => {
    try {
      // Load fee config from location doc
      if (parentData?.locationId) {
        const locSnap = await getDoc(doc(db, 'locations', parentData.locationId));
        if (locSnap.exists()) {
          const locData = locSnap.data();
          setFeeConfig({
            feePercent: locData.transactionFeePercent || '0',
            feeFlat: locData.transactionFeeFlat || '0',
          });
        }
      }

      // Load membership policy from HQ policies
      const policySnap = await getDoc(doc(db, 'settings', 'hq.policies'));
      if (policySnap.exists()) {
        const policies = policySnap.data();
        if (policies.membershipPolicy?.enabled && policies.membershipPolicy?.content) {
          setMembershipPolicy(policies.membershipPolicy.content);
        }
      }
    } catch (e) {
      console.error('Failed to load checkout data:', e);
    }
    setLoading(false);
  };

  const handleConfirm = async () => {
    if (membershipPolicy && !policyAgreed) {
      Alert.alert('Policy Required', 'Please agree to the membership policy to continue.');
      return;
    }

    // Check payment method
    if (!parentData?.paymentMethod?.last4) {
      Alert.alert(
        'Payment Method Required',
        'Please add a payment method before purchasing a membership.',
        [
          { text: 'Add Payment Method', onPress: () => navigation.navigate('Billing') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${FUNCTIONS_URL}/createSubscriptionPublic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentEmail: parentData.email,
          parentName: parentData.name,
          parentId: parentData.id,
          parentPhone: parentData.phone || '',
          locationId: parentData.locationId,
          childName: child.name,
          childGrade: child.grade || '',
          membershipId: membership.id,
          membershipName: membership.name,
          membershipCategory: membership.category || 'membership',
          basePrice: basePriceNum.toFixed(2),
          totalAmount: totalAmount.toFixed(2),
          feeAmount: totalFee.toFixed(2),
          feeDescription,
        }),
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert(
          'Membership Activated! 🎉',
          `${membership.name} is now active for ${child.name}.\n\nYou will be charged $${totalAmount.toFixed(2)}/week.`,
          [{ text: 'Done', onPress: () => navigation.navigate('Memberships') }]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to activate membership. Please try again.');
      }
    } catch (e) {
      console.error('Checkout error:', e);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.orange} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color={COLORS.muted} />
        </TouchableOpacity>
        <Text style={s.title}>Checkout</Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: SIZES.padding, paddingTop: 16 }}>

          {/* Child & Service */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>Service</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{child?.name?.[0] || '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.childName}>{child?.name}</Text>
                <Text style={s.childGrade}>{child?.grade || ''}</Text>
              </View>
            </View>
            <View style={s.divider} />
            <Text style={s.membershipName}>{membership?.name}</Text>
            <Text style={s.membershipDesc}>{membership?.desc}</Text>
            {membership?.credits && (
              <View style={s.creditBadge}>
                <Text style={s.creditText}>{membership.credits}</Text>
              </View>
            )}
          </View>

          {/* Membership Details */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>Membership</Text>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Billing frequency</Text>
              <Text style={s.detailValue}>Weekly</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>First charge</Text>
              <Text style={s.detailValue}>Today</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>Recurring</Text>
              <Text style={s.detailValue}>Every week from today</Text>
            </View>
          </View>

          {/* Price Breakdown */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>Total Price</Text>
            <View style={s.priceRow}>
              <Text style={s.priceLabel}>{membership?.name}</Text>
              <Text style={s.priceValue}>${basePriceNum.toFixed(2)}</Text>
            </View>
            {totalFee > 0 && (
              <View style={s.priceRow}>
                <Text style={s.feeLabel}>{feeDescription}</Text>
                <Text style={s.feeValue}>${totalFee.toFixed(2)}</Text>
              </View>
            )}
            <View style={[s.divider, { marginVertical: 12 }]} />
            <View style={s.priceRow}>
              <Text style={s.totalLabel}>Total per week</Text>
              <Text style={s.totalValue}>${totalAmount.toFixed(2)}</Text>
            </View>
          </View>

          {/* Payment Method */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>Payment Method</Text>
            {parentData?.paymentMethod?.last4 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.orangeLight, alignItems: 'center', justifyContent: 'center' }}>
                  <Feather name="credit-card" size={16} color={COLORS.orange} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.dark }}>
                  {parentData.paymentMethod.brand || 'Card'} •••• {parentData.paymentMethod.last4}
                </Text>
              </View>
            ) : (
              <TouchableOpacity style={s.addPayBtn} onPress={() => navigation.navigate('Billing')}>
                <Feather name="plus" size={14} color={COLORS.orange} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.orange }}>Add Payment Method</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Cancel Policy */}
          <View style={s.card}>
            <Text style={s.sectionLabel}>Cancellation Policy</Text>
            <Text style={s.cancelText}>
              A minimum of 2 weeks notice is required to cancel your membership. You may cancel at any time by contacting your centre, and your membership will remain active until the end of the notice period.
            </Text>
          </View>

          {/* Membership Policy Checkbox */}
          {membershipPolicy && (
            <View style={s.card}>
              <TouchableOpacity style={s.checkboxRow} onPress={() => setPolicyAgreed(!policyAgreed)}>
                <View style={[s.checkbox, policyAgreed && s.checkboxChecked]}>
                  {policyAgreed && <Feather name="check" size={14} color={COLORS.white} />}
                </View>
                <Text style={s.checkboxText}>
                  I have read and agree to the{' '}
                  <Text style={s.policyLink} onPress={() => setShowPolicy(true)}>Membership Policy</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Confirm Button */}
          <TouchableOpacity
            style={[s.confirmBtn, (submitting || (membershipPolicy && !policyAgreed) || !parentData?.paymentMethod?.last4) && { opacity: 0.5 }]}
            onPress={handleConfirm}
            disabled={submitting || (membershipPolicy && !policyAgreed) || !parentData?.paymentMethod?.last4}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Feather name="lock" size={16} color={COLORS.white} />
                <Text style={s.confirmBtnText}>Confirm & Pay ${totalAmount.toFixed(2)}/wk</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={s.secureNote}>
            <Feather name="shield" size={12} color={COLORS.success} /> Payments are securely processed by Stripe.
          </Text>

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Policy Modal */}
      {showPolicy && (
        <View style={StyleSheet.absoluteFill}>
          <View style={s.policyOverlay}>
            <SafeAreaView style={s.policyModal}>
              <View style={s.policyHeader}>
                <Text style={s.policyTitle}>Membership Policy</Text>
                <TouchableOpacity onPress={() => setShowPolicy(false)}>
                  <Feather name="x" size={22} color={COLORS.muted} />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ flex: 1, padding: SIZES.padding }}>
                <RichTextRenderer html={membershipPolicy} />
                <View style={{ height: 40 }} />
              </ScrollView>
            </SafeAreaView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SIZES.padding, paddingTop: 12, paddingBottom: 4, backgroundColor: COLORS.white },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.dark },

  card: { backgroundColor: COLORS.white, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.border, padding: 18, marginBottom: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 14 },

  // Child
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(109,203,202,0.15)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: COLORS.teal },
  childName: { fontSize: 15, fontWeight: '700', color: COLORS.dark },
  childGrade: { fontSize: 12, color: COLORS.muted, marginTop: 1 },

  // Membership
  membershipName: { fontSize: 15, fontWeight: '700', color: COLORS.dark },
  membershipDesc: { fontSize: 13, color: COLORS.muted, marginTop: 4, lineHeight: 20 },
  creditBadge: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, backgroundColor: 'rgba(109,203,202,0.12)' },
  creditText: { fontSize: 12, fontWeight: '600', color: COLORS.teal },

  // Details
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  detailLabel: { fontSize: 13, color: COLORS.muted },
  detailValue: { fontSize: 13, fontWeight: '600', color: COLORS.dark },

  // Price
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  priceLabel: { fontSize: 14, color: COLORS.dark },
  priceValue: { fontSize: 14, fontWeight: '600', color: COLORS.dark },
  feeLabel: { fontSize: 13, color: COLORS.muted },
  feeValue: { fontSize: 13, color: COLORS.muted },
  totalLabel: { fontSize: 15, fontWeight: '700', color: COLORS.dark },
  totalValue: { fontSize: 18, fontWeight: '800', color: COLORS.orange },

  // Payment
  addPayBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border },

  // Cancel policy
  cancelText: { fontSize: 13, color: COLORS.muted, lineHeight: 20, marginTop: 8 },

  // Checkbox
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 4 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  checkboxText: { flex: 1, fontSize: 13, color: COLORS.dark, lineHeight: 20 },
  policyLink: { color: COLORS.orange, fontWeight: '600', textDecorationLine: 'underline' },

  // Confirm
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.orange, paddingVertical: 16, borderRadius: SIZES.radius, marginTop: 8 },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  secureNote: { fontSize: 12, color: COLORS.muted, textAlign: 'center', marginTop: 12 },

  // Policy modal
  policyOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  policyModal: { flex: 1, backgroundColor: COLORS.white },
  policyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SIZES.padding, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  policyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.dark },
});
