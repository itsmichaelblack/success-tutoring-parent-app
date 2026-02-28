import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth } from '../config/firebase';
import { useParent } from '../config/ParentContext';
import { COLORS, SIZES } from '../config/theme';

export default function SignUpAgreeScreen({ navigation, route }) {
  const { locationId, locationName, firstName, lastName, mobile, email } = route.params;
  const { setParentData, loadChildren } = useParent();
  const [checks, setChecks] = useState({ membership: false, terms: false, privacy: false });
  const [loading, setLoading] = useState(false);

  const allChecked = checks.membership && checks.terms && checks.privacy;
  const toggle = (key) => setChecks(prev => ({ ...prev, [key]: !prev[key] }));

  const handleCreateAccount = async () => {
    if (!allChecked) return;
    setLoading(true);
    try {
      // Sign in anonymously so we get a Firebase UID for Cloud Functions
      const cred = await signInAnonymously(auth);
      const firebaseUid = cred.user.uid;

      const parentId = `parent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const parentDoc = {
        firstName,
        lastName,
        name: `${firstName} ${lastName}`,
        email,
        phone: mobile,
        locationId,
        locationName,
        firebaseUid,
        children: [],
        agreements: {
          membershipPolicy: true,
          termsAndConditions: true,
          privacyPolicy: true,
          agreedAt: new Date().toISOString(),
        },
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'parents', parentId), parentDoc);

      // Store in context for use across screens
      setParentData({ ...parentDoc, id: parentId, children: [] });
      await loadChildren(parentId);

      // Navigate to main app
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

      <View style={{ paddingHorizontal: SIZES.padding }}>
        {[
          { key: 'membership', label: 'Membership Policy' },
          { key: 'terms', label: 'Terms & Conditions' },
          { key: 'privacy', label: 'Privacy Policy' },
        ].map(item => (
          <TouchableOpacity key={item.key} style={s.checkRow} onPress={() => toggle(item.key)} activeOpacity={0.7}>
            <View style={[s.checkbox, checks[item.key] && s.checkboxChecked]}>
              {checks[item.key] && <Feather name="check" size={14} color={COLORS.white} />}
            </View>
            <Text style={s.checkLabel}>
              I agree to the <Text style={{ color: COLORS.orange, fontWeight: '700' }}>{item.label}</Text>
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }} />

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.btnPrimary, (!allChecked || loading) && { opacity: 0.4 }]}
          disabled={!allChecked || loading}
          onPress={handleCreateAccount}
        >
          {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={s.btnText}>Create Account</Text>}
        </TouchableOpacity>
      </View>
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
});
