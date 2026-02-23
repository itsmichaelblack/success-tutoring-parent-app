import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS, SIZES } from '../config/theme';

export default function SignUpDetailsScreen({ navigation, route }) {
  const { locationId, locationName } = route.params;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');

  const canContinue = firstName.trim() && lastName.trim() && mobile.trim() && email.trim();

  const handleContinue = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    if (mobile.trim().length < 6) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number.');
      return;
    }
    navigation.navigate('SignUpAgree', { locationId, locationName, firstName: firstName.trim(), lastName: lastName.trim(), mobile: mobile.trim(), email: email.trim() });
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color={COLORS.muted} />
        </TouchableOpacity>
        <Text style={s.title}>Your details</Text>
      </View>
      <Text style={s.desc}>Create your parent account to get started.</Text>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1, paddingHorizontal: SIZES.padding }} showsVerticalScrollIndicator={false}>
          <Text style={s.label}>First Name</Text>
          <TextInput style={s.input} value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor="#c5c8cc" autoCapitalize="words" />
          <Text style={s.label}>Last Name</Text>
          <TextInput style={s.input} value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor="#c5c8cc" autoCapitalize="words" />
          <Text style={s.label}>Mobile Number</Text>
          <TextInput style={s.input} value={mobile} onChangeText={setMobile} placeholder="Phone number" placeholderTextColor="#c5c8cc" keyboardType="phone-pad" />
          <Text style={s.label}>Email</Text>
          <TextInput style={s.input} value={email} onChangeText={setEmail} placeholder="email@example.com" placeholderTextColor="#c5c8cc" keyboardType="email-address" autoCapitalize="none" />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={s.footer}>
        <TouchableOpacity style={[s.btnPrimary, !canContinue && { opacity: 0.4 }]} disabled={!canContinue} onPress={handleContinue}>
          <Text style={s.btnText}>Continue</Text>
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
  desc: { fontSize: 13, color: COLORS.muted, paddingHorizontal: SIZES.padding, marginBottom: 20, lineHeight: 20 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  input: { width: '100%', padding: 14, borderRadius: 12, borderWidth: 2, borderColor: COLORS.border, fontSize: 15, color: COLORS.dark, marginBottom: 14 },
  footer: { paddingHorizontal: SIZES.padding, paddingBottom: 20, paddingTop: 12 },
  btnPrimary: { backgroundColor: COLORS.orange, padding: 16, borderRadius: SIZES.radius, alignItems: 'center' },
  btnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});
