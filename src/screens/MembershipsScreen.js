import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { doc, getDoc, addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useParent } from '../config/ParentContext';
import { COLORS, SIZES } from '../config/theme';

const AU_GRADES = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const NZ_GRADES = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Grade 13'];

const ALL_MEMBERSHIPS = {
  foundation_phase_1: { name: 'Foundation Phase 1', desc: 'Introductory membership for new students starting their learning journey. Includes foundational assessment and personalised learning plan.', credits: '2 Credits Per Week', category: 'membership' },
  foundation_phase_2: { name: 'Foundation Phase 2', desc: 'Building on Phase 1 foundations with expanded subject coverage and increased session frequency.', credits: '2 Credits Per Week', category: 'membership' },
  foundation_phase_3: { name: 'Foundation Phase 3', desc: 'Advanced foundation program with comprehensive subject mastery and exam preparation support.', credits: '2 Credits Per Week', category: 'membership' },
  membership_1_session: { name: 'Membership (1 Session)', desc: 'Standard weekly membership with one tutoring session per week covering core subjects.', credits: '1 Credit Per Week', category: 'membership' },
  membership_2_sessions: { name: 'Membership (2 Sessions)', desc: 'Enhanced weekly membership with two tutoring sessions per week for accelerated learning progress.', credits: '2 Credits Per Week', category: 'membership' },
  membership_unlimited: { name: 'Membership (Unlimited)', desc: 'Premium all-access membership with unlimited tutoring sessions across all available subjects.', credits: 'Unlimited Credits', category: 'membership' },
  one_on_one_primary: { name: 'One-on-One (Primary)', desc: 'Dedicated one-on-one tutoring for primary school students (K-6) tailored to individual learning needs.', credits: '1 Credit Per Week', category: 'one_on_one' },
  one_on_one_secondary: { name: 'One-on-One (Secondary)', desc: 'Personalised one-on-one tutoring for secondary school students (7-12) with subject-specific focus.', credits: '1 Credit Per Week', category: 'one_on_one' },
  camp_coding: { name: 'Coding Camp', desc: 'Fun and engaging coding camp teaching programming fundamentals through hands-on projects and games.', credits: '1 Credit Per Week', category: 'holiday_camps' },
  camp_public_speaking: { name: 'Public Speaking Camp', desc: 'Build confidence and communication skills through structured public speaking exercises and presentations.', credits: '1 Credit Per Week', category: 'holiday_camps' },
  camp_creative_writing: { name: 'Creative Writing Camp', desc: 'Unlock creativity through storytelling, poetry, and narrative writing workshops with published author mentors.', credits: '1 Credit Per Week', category: 'holiday_camps' },
  camp_learn_ai: { name: 'Learn AI Camp', desc: 'Introduction to artificial intelligence concepts with age-appropriate activities and real-world applications.', credits: '1 Credit Per Week', category: 'holiday_camps' },
  camp_speed_typing: { name: 'Speed Typing Camp', desc: 'Develop fast and accurate typing skills through gamified lessons and timed challenges.', credits: '1 Credit Per Week', category: 'holiday_camps' },
};

export default function MembershipsScreen({ navigation }) {
  const { parentData, addChild } = useParent();
  const children = parentData?.children || [];

  const [sales, setSales] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [loading, setLoading] = useState(true);

  // Purchase modal
  const [showPurchase, setShowPurchase] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);
  const [saving, setSaving] = useState(false);

  // Add child modal
  const [addChildVisible, setAddChildVisible] = useState(false);
  const [childName, setChildName] = useState('');
  const [childGrade, setChildGrade] = useState('');
  const [gradePickerOpen, setGradePickerOpen] = useState(false);
  const [addChildSaving, setAddChildSaving] = useState(false);

  const isNZ = ['new lynn', 'mt roskill', 'northwest', 'palmerston north', 'lower hutt', 'papanui'].some(
    nz => (parentData?.locationName || '').toLowerCase().includes(nz)
  );
  const GRADES = isNZ ? NZ_GRADES : AU_GRADES;

  const resetAddChildModal = () => { setChildName(''); setChildGrade(''); setGradePickerOpen(false); setAddChildSaving(false); };

  const handleAddChild = async () => {
    if (!childName.trim()) { Alert.alert('Missing Info', 'Please enter your child\'s name.'); return; }
    if (!childGrade) { Alert.alert('Missing Info', 'Please select a grade.'); return; }
    setAddChildSaving(true);
    try {
      await addChild({ name: childName.trim(), grade: childGrade });
      resetAddChildModal();
      setAddChildVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to add child. Please try again.');
    }
    setAddChildSaving(false);
  };

  useEffect(() => {
    if (parentData?.locationId) loadData();
  }, [parentData?.locationId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load sales for this parent
      const q = query(
        collection(db, 'sales'),
        where('locationId', '==', parentData.locationId),
        where('parentEmail', '==', parentData.email?.toLowerCase())
      );
      const snap = await getDocs(q);
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })));

      // Load pricing
      const pSnap = await getDoc(doc(db, 'pricing', parentData.locationId));
      if (pSnap.exists()) setPricing(pSnap.data());
    } catch (e) { console.error('Failed to load memberships:', e); }
    setLoading(false);
  };

  // Get active sales for a specific child
  const getChildSales = (child) => {
    return sales.filter(s => {
      if (s.status === 'cancelled') return false;
      const saleChildren = (s.children || []).map(c => c.name?.toLowerCase());
      return saleChildren.length === 0 || saleChildren.includes(child.name?.toLowerCase());
    });
  };

  // Available memberships from centre pricing
  const availableMemberships = Object.keys(ALL_MEMBERSHIPS)
    .filter(id => pricing?.[id]?.enabled)
    .map(id => ({ id, ...ALL_MEMBERSHIPS[id], price: pricing[id]?.price }));

  const handlePurchase = async (membershipId) => {
    if (!selectedChild) return;

    // Check if parent has a payment method on file
    const hasPayment = parentData?.paymentMethod || parentData?.stripeCustomerId;
    if (!hasPayment) {
      Alert.alert(
        'Payment Method Required',
        'You need to add a payment method before purchasing a membership.',
        [
          { text: 'Add Payment Method', onPress: () => { setShowPurchase(false); setSelectedChild(null); navigation.navigate('Billing'); } },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    const info = ALL_MEMBERSHIPS[membershipId];
    const price = pricing?.[membershipId]?.price || '0';
    const today = new Date().toISOString().split('T')[0];

    setSaving(true);
    try {
      const saleData = {
        locationId: parentData.locationId,
        children: [{ name: selectedChild.name, grade: selectedChild.grade || '' }],
        parentName: parentData.name,
        parentEmail: parentData.email?.toLowerCase(),
        parentPhone: parentData.phone,
        parentId: parentData.id,
        membershipId,
        membershipName: info?.name || membershipId,
        membershipCategory: info?.category || 'membership',
        basePrice: price,
        weeklyAmount: price,
        activationDate: today,
        firstPaymentDate: today,
        billingFrequency: 'weekly',
        status: 'active',
        stripeStatus: 'requires_payment_method',
        paymentMethod: null,
        createdAt: serverTimestamp(),
        source: 'mobile_app',
      };
      const ref = await addDoc(collection(db, 'sales'), saleData);
      setSales(prev => [...prev, { id: ref.id, ...saleData }]);
      setShowPurchase(false);
      setSelectedChild(null);
      Alert.alert('Membership Activated!', `${info?.name} is now active for ${selectedChild.name}.`);
    } catch (e) {
      console.error('Failed to purchase:', e);
      Alert.alert('Error', 'Failed to activate membership. Please try again.');
    }
    setSaving(false);
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color={COLORS.muted} />
        </TouchableOpacity>
        <Text style={s.title}>Memberships</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.orange} />
        </View>
      ) : (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: SIZES.padding, paddingTop: 12 }}>

            {/* Active Memberships per Child */}
            {children.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>👧</Text>
                <Text style={s.emptyText}>No children added yet</Text>
                <Text style={s.emptyDesc}>Add a child first to manage memberships.</Text>
                <TouchableOpacity style={[s.addBtn, { marginTop: 16, width: '100%' }]} onPress={() => setAddChildVisible(true)}>
                  <Feather name="plus" size={16} color={COLORS.orange} />
                  <Text style={s.addBtnText}>Add a Child</Text>
                </TouchableOpacity>
              </View>
            ) : (
              children.map((child, ci) => {
                const childSales = getChildSales(child);
                const activeSales = childSales.filter(s => s.status === 'active' || !s.status);

                return (
                  <View key={child.id || ci} style={{ marginBottom: 20 }}>
                    <View style={s.childHeader}>
                      <View style={[s.childAvatar, { backgroundColor: ci % 2 === 0 ? 'rgba(109,203,202,0.15)' : COLORS.orangeLight }]}>
                        <Text style={[s.childAvatarText, { color: ci % 2 === 0 ? COLORS.teal : COLORS.orange }]}>{child.name?.[0] || '?'}</Text>
                      </View>
                      <Text style={s.childName}>{child.name}</Text>
                      <Text style={s.childGrade}>{child.grade || ''}</Text>
                    </View>

                    {activeSales.length === 0 ? (
                      <View style={s.noMembershipCard}>
                        <Feather name="alert-circle" size={16} color={COLORS.orange} />
                        <Text style={s.noMembershipText}>No active membership</Text>
                      </View>
                    ) : (
                      activeSales.map((sale, si) => {
                        const info = ALL_MEMBERSHIPS[sale.membershipId] || {};
                        return (
                          <View key={sale.id || si} style={s.membershipCard}>
                            <View style={s.membershipTop}>
                              <View style={{ flex: 1 }}>
                                <Text style={s.membershipName}>{sale.membershipName || info.name || 'Membership'}</Text>
                                <Text style={s.membershipDesc}>{info.desc || ''}</Text>
                              </View>
                            </View>
                            <View style={s.membershipMeta}>
                              <View style={s.metaItem}>
                                <Text style={s.metaLabel}>Credits</Text>
                                <Text style={s.metaValue}>{info.credits || '—'}</Text>
                              </View>
                              <View style={s.metaItem}>
                                <Text style={s.metaLabel}>Price</Text>
                                <Text style={s.metaValue}>{sale.weeklyAmount ? `$${sale.weeklyAmount}/wk` : '—'}</Text>
                              </View>
                              <View style={s.metaItem}>
                                <Text style={s.metaLabel}>Status</Text>
                                <View style={s.activeBadge}><Text style={s.activeBadgeText}>Active</Text></View>
                              </View>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                );
              })
            )}

            {/* Add Membership Button */}
            {children.length > 0 && (
              <TouchableOpacity style={s.addBtn} onPress={() => { setSelectedChild(null); setShowPurchase(true); }}>
                <Feather name="plus" size={16} color={COLORS.orange} />
                <Text style={s.addBtnText}>Add a Membership</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* Purchase Modal */}
      <Modal visible={showPurchase} transparent animationType="slide" onRequestClose={() => { setShowPurchase(false); setSelectedChild(null); }}>
        <View style={s.purchaseOverlay}>
          <View style={s.purchaseContent}>
            <View style={s.purchaseHeader}>
              <Text style={s.purchaseTitle}>{selectedChild ? 'Choose a Plan' : 'Select a Child'}</Text>
              <TouchableOpacity onPress={() => { setShowPurchase(false); setSelectedChild(null); }}>
                <Feather name="x" size={22} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
              {/* Step 1: Select Child */}
              {!selectedChild ? (
                <>
                  <Text style={s.purchaseDesc}>Which child is this membership for?</Text>
                  {children.map((child, i) => (
                    <TouchableOpacity key={child.id || i} style={s.childSelectCard} onPress={() => setSelectedChild(child)}>
                      <View style={[s.childAvatar, { backgroundColor: i % 2 === 0 ? 'rgba(109,203,202,0.15)' : COLORS.orangeLight }]}>
                        <Text style={[s.childAvatarText, { color: i % 2 === 0 ? COLORS.teal : COLORS.orange }]}>{child.name?.[0] || '?'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.childSelectName}>{child.name}</Text>
                        <Text style={s.childSelectGrade}>{child.grade || ''}</Text>
                      </View>
                      <Feather name="chevron-right" size={18} color={COLORS.muted} />
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                /* Step 2: Select Plan */
                <>
                  <TouchableOpacity style={s.backLink} onPress={() => setSelectedChild(null)}>
                    <Feather name="chevron-left" size={16} color={COLORS.orange} />
                    <Text style={s.backLinkText}>Back to child selection</Text>
                  </TouchableOpacity>
                  <Text style={s.purchaseDesc}>Pick a plan for <Text style={{ fontWeight: '700', color: COLORS.dark }}>{selectedChild.name}</Text></Text>

                  {availableMemberships.length === 0 ? (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Text style={{ fontSize: 14, color: COLORS.muted, fontWeight: '600', textAlign: 'center' }}>No plans available at your centre yet.</Text>
                      <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 4, textAlign: 'center' }}>Contact your centre for more information.</Text>
                    </View>
                  ) : (
                    availableMemberships.map(m => (
                      <TouchableOpacity key={m.id} style={s.planCard} onPress={() => handlePurchase(m.id)} disabled={saving}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.planName}>{m.name}</Text>
                          <Text style={s.planDesc}>{m.desc}</Text>
                          <View style={s.creditBadge}><Text style={s.creditBadgeText}>{m.credits}</Text></View>
                        </View>
                        <View style={{ alignItems: 'flex-end', marginLeft: 12 }}>
                          {m.price ? (
                            <>
                              <Text style={s.planPrice}>${m.price}</Text>
                              <Text style={s.planPer}>/week</Text>
                            </>
                          ) : <Text style={s.planPrice}>—</Text>}
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </>
              )}
            </ScrollView>

            {saving && (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <ActivityIndicator color={COLORS.orange} />
                <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 6 }}>Activating...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Child Modal */}
      <Modal visible={addChildVisible} transparent animationType="fade" onRequestClose={() => { resetAddChildModal(); setAddChildVisible(false); }}>
        <KeyboardAvoidingView style={s.purchaseOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { resetAddChildModal(); setAddChildVisible(false); }} />
          <View style={[s.purchaseContent, { borderTopLeftRadius: 20, borderTopRightRadius: 20 }]}>
            <View style={s.purchaseHeader}>
              <Text style={s.purchaseTitle}>Add a Child</Text>
              <TouchableOpacity onPress={() => { resetAddChildModal(); setAddChildVisible(false); }}>
                <Feather name="x" size={22} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
            <Text style={s.addChildLabel}>Child's Full Name <Text style={{ color: COLORS.orange }}>*</Text></Text>
            <TextInput
              style={s.addChildInput}
              value={childName}
              onChangeText={setChildName}
              placeholder="e.g. Sarah Smith"
              placeholderTextColor="#c5c8cc"
              autoCapitalize="words"
            />
            <Text style={[s.addChildLabel, { marginTop: 16 }]}>Grade <Text style={{ color: COLORS.orange }}>*</Text></Text>
            <TouchableOpacity
              style={[s.addChildInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              onPress={() => setGradePickerOpen(!gradePickerOpen)}
            >
              <Text style={{ fontSize: 15, color: childGrade ? COLORS.dark : '#c5c8cc' }}>{childGrade || 'Select grade...'}</Text>
              <Feather name={gradePickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.muted} />
            </TouchableOpacity>
            {gradePickerOpen && (
              <ScrollView style={{ maxHeight: 200, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, marginTop: 4 }} nestedScrollEnabled>
                {GRADES.map(g => (
                  <TouchableOpacity key={g} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: childGrade === g ? COLORS.orangeLight : 'transparent' }} onPress={() => { setChildGrade(g); setGradePickerOpen(false); }}>
                    <Text style={{ fontSize: 14, color: childGrade === g ? COLORS.orange : COLORS.dark, fontWeight: childGrade === g ? '700' : '400' }}>{g}</Text>
                    {childGrade === g && <Feather name="check" size={16} color={COLORS.orange} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={[s.addBtn, { marginTop: 20, backgroundColor: COLORS.orange, borderStyle: 'solid', borderColor: COLORS.orange }, (!childName.trim() || !childGrade || addChildSaving) && { opacity: 0.4 }]}
              disabled={!childName.trim() || !childGrade || addChildSaving}
              onPress={handleAddChild}
            >
              {addChildSaving ? <ActivityIndicator color={COLORS.white} /> : <Text style={[s.addBtnText, { color: COLORS.white }]}>Add Child</Text>}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { resetAddChildModal(); setAddChildVisible(false); }} />
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SIZES.padding, paddingTop: 12, paddingBottom: 4, backgroundColor: COLORS.white },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.dark },

  // Child headers
  childHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  childAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  childAvatarText: { fontSize: 16, fontWeight: '800' },
  childName: { fontSize: 15, fontWeight: '700', color: COLORS.dark },
  childGrade: { fontSize: 12, color: COLORS.muted },

  // Membership cards
  membershipCard: { borderRadius: SIZES.radius, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8, overflow: 'hidden' },
  membershipTop: { flexDirection: 'row', padding: 14, gap: 12 },
  membershipName: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  membershipDesc: { fontSize: 12, color: COLORS.muted, marginTop: 4, lineHeight: 18 },
  membershipMeta: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: COLORS.border },
  metaItem: { flex: 1, padding: 10, alignItems: 'center', borderRightWidth: 1, borderRightColor: COLORS.border },
  metaLabel: { fontSize: 10, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  metaValue: { fontSize: 13, fontWeight: '700', color: COLORS.dark, marginTop: 2 },
  activeBadge: { marginTop: 2, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: COLORS.successBg },
  activeBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.success },

  // No membership
  noMembershipCard: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: SIZES.radius, backgroundColor: COLORS.orangeLight, borderWidth: 1, borderColor: COLORS.orange, marginBottom: 8 },
  noMembershipText: { fontSize: 13, color: COLORS.orange, fontWeight: '600' },

  // Empty
  emptyCard: { padding: 28, borderRadius: SIZES.radius, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  emptyText: { fontSize: 14, fontWeight: '700', color: COLORS.muted },
  emptyDesc: { fontSize: 12, color: COLORS.muted, marginTop: 4 },

  // Add button
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderRadius: SIZES.radius, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border, backgroundColor: COLORS.white, marginTop: 4 },
  addBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.orange },

  // Purchase modal
  purchaseOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  purchaseContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SIZES.padding, paddingBottom: 40, maxHeight: '85%' },
  purchaseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  purchaseTitle: { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  purchaseDesc: { fontSize: 13, color: COLORS.muted, marginBottom: 16, lineHeight: 20 },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  backLinkText: { fontSize: 13, color: COLORS.orange, fontWeight: '600' },

  // Child select
  childSelectCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, marginBottom: 8 },
  childSelectName: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  childSelectGrade: { fontSize: 12, color: COLORS.muted, marginTop: 1 },

  // Plan cards
  planCard: { flexDirection: 'row', padding: 14, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, marginBottom: 10 },
  planName: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  planDesc: { fontSize: 12, color: COLORS.muted, marginTop: 4, lineHeight: 18 },
  creditBadge: { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: COLORS.tealLight },
  creditBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.teal },
  planPrice: { fontSize: 20, fontWeight: '800', color: COLORS.orange },
  planPer: { fontSize: 11, color: COLORS.muted },

  // Add child modal
  addChildLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  addChildInput: { padding: 14, borderRadius: 12, borderWidth: 2, borderColor: COLORS.border, fontSize: 15, color: COLORS.dark },
});
