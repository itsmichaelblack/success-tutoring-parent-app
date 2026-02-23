import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { COLORS, SIZES } from '../config/theme';

// Disposable/temporary email domains to block
const BLOCKED_EMAIL_DOMAINS = [
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'dispostable.com', 'trashmail.com', 'fakeinbox.com', 'mailnesia.com',
  'maildrop.cc', 'discard.email', 'getnada.com', 'temp-mail.org',
  'tempail.com', 'mohmal.com', 'burnermail.io', 'mailtemp.net',
  'tmail.com', 'harakirimail.com', 'spam4.me', 'trashmail.me',
  'mailfence.com', '10minutemail.com', 'mintemail.com',
];

export default function SignUpDetailsScreen({ navigation, route }) {
  const { locationId, locationName } = route.params;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});

  const validateName = (name) => {
    // Must be at least 2 characters, only letters, hyphens, apostrophes, spaces
    return /^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF'-]{2,}(?: [a-zA-Z\u00C0-\u024F\u1E00-\u1EFF'-]+)*$/.test(name.trim());
  };

  const validateEmail = (emailStr) => {
    const trimmed = emailStr.trim().toLowerCase();
    // Basic format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) return 'Please enter a valid email address.';
    // Block disposable email domains
    const domain = trimmed.split('@')[1];
    if (BLOCKED_EMAIL_DOMAINS.includes(domain)) return 'Please use a permanent email address, not a temporary one.';
    // Block obviously fake patterns
    if (/^(test|fake|spam|asdf|qwer|xxxx|aaaa|1234)/.test(trimmed)) return 'Please enter your real email address.';
    return null;
  };

  const validateMobile = (phone) => {
    // Remove all non-digit characters except leading +
    const cleaned = phone.trim().replace(/[^\d+]/g, '');
    // Australian mobile: 04xx xxx xxx (10 digits) or +614xx xxx xxx (12 chars)
    // Also accept international formats: at least 8 digits
    const digitsOnly = cleaned.replace(/\D/g, '');
    if (digitsOnly.length < 8 || digitsOnly.length > 15) return 'Please enter a valid mobile number.';
    // Block obviously fake numbers
    if (/^0{8,}$/.test(digitsOnly) || /^1{8,}$/.test(digitsOnly) || /^(.)\1{7,}$/.test(digitsOnly)) return 'Please enter a real mobile number.';
    // Block premium/special numbers
    if (/^(1900|1300|1800|190)/.test(digitsOnly)) return 'Please enter a mobile number, not a landline or premium number.';
    return null;
  };

  const canContinue = firstName.trim() && lastName.trim() && mobile.trim() && email.trim();

  const handleContinue = () => {
    const newErrors = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required.';
    } else if (!validateName(firstName)) {
      newErrors.firstName = 'Please enter a valid first name.';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required.';
    } else if (!validateName(lastName)) {
      newErrors.lastName = 'Please enter a valid last name.';
    }

    const mobileError = validateMobile(mobile);
    if (!mobile.trim()) {
      newErrors.mobile = 'Mobile number is required.';
    } else if (mobileError) {
      newErrors.mobile = mobileError;
    }

    const emailError = validateEmail(email);
    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (emailError) {
      newErrors.email = emailError;
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      Alert.alert('Please check your details', firstError);
      return;
    }

    navigation.navigate('SignUpAgree', {
      locationId,
      locationName,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      mobile: mobile.trim(),
      email: email.trim().toLowerCase(),
    });
  };

  const clearError = (field) => {
    if (errors[field]) {
      setErrors(prev => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color={COLORS.muted} />
        </TouchableOpacity>
        <Text style={s.title}>Your details</Text>
      </View>
      <Text style={s.desc}>Create your parent account to get started. All fields are required.</Text>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1, paddingHorizontal: SIZES.padding }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Text style={s.label}>First Name <Text style={s.required}>*</Text></Text>
          <TextInput
            style={[s.input, errors.firstName && s.inputError]}
            value={firstName}
            onChangeText={(t) => { setFirstName(t); clearError('firstName'); }}
            placeholder="First name"
            placeholderTextColor="#c5c8cc"
            autoCapitalize="words"
            autoComplete="given-name"
          />
          {errors.firstName && <Text style={s.errorText}>{errors.firstName}</Text>}

          <Text style={s.label}>Last Name <Text style={s.required}>*</Text></Text>
          <TextInput
            style={[s.input, errors.lastName && s.inputError]}
            value={lastName}
            onChangeText={(t) => { setLastName(t); clearError('lastName'); }}
            placeholder="Last name"
            placeholderTextColor="#c5c8cc"
            autoCapitalize="words"
            autoComplete="family-name"
          />
          {errors.lastName && <Text style={s.errorText}>{errors.lastName}</Text>}

          <Text style={s.label}>Mobile Number <Text style={s.required}>*</Text></Text>
          <TextInput
            style={[s.input, errors.mobile && s.inputError]}
            value={mobile}
            onChangeText={(t) => { setMobile(t); clearError('mobile'); }}
            placeholder="0412 345 678"
            placeholderTextColor="#c5c8cc"
            keyboardType="phone-pad"
            autoComplete="tel"
          />
          {errors.mobile && <Text style={s.errorText}>{errors.mobile}</Text>}

          <Text style={s.label}>Email <Text style={s.required}>*</Text></Text>
          <TextInput
            style={[s.input, errors.email && s.inputError]}
            value={email}
            onChangeText={(t) => { setEmail(t); clearError('email'); }}
            placeholder="email@example.com"
            placeholderTextColor="#c5c8cc"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          {errors.email && <Text style={s.errorText}>{errors.email}</Text>}

          <View style={{ height: 20 }} />
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
  required: { color: COLORS.orange, fontSize: 11 },
  input: { width: '100%', padding: 14, borderRadius: 12, borderWidth: 2, borderColor: COLORS.border, fontSize: 15, color: COLORS.dark, marginBottom: 4 },
  inputError: { borderColor: '#e74c3c' },
  errorText: { fontSize: 11, color: '#e74c3c', marginBottom: 10, marginLeft: 4 },
  footer: { paddingHorizontal: SIZES.padding, paddingBottom: 20, paddingTop: 12 },
  btnPrimary: { backgroundColor: COLORS.orange, padding: 16, borderRadius: SIZES.radius, alignItems: 'center' },
  btnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});
