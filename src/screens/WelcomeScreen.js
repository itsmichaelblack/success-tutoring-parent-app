import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../config/theme';

export default function WelcomeScreen({ navigation }) {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>
        <View style={s.logoBox}>
          <Text style={s.logoText}>S</Text>
        </View>
        <Text style={s.title}>
          <Text style={{ color: COLORS.orange }}>Success</Text> Tutoring
        </Text>
        <Text style={s.subtitle}>
          Your child's learning journey starts here. Book sessions, track progress, and manage memberships.
        </Text>
        <View style={s.buttons}>
          <TouchableOpacity style={s.btnPrimary} onPress={() => navigation.navigate('SignUpLocation')}>
            <Text style={s.btnPrimaryText}>Sign Up</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnOutline} onPress={() => navigation.navigate('Main')}>
            <Text style={s.btnOutlineText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  logoBox: { width: 72, height: 72, borderRadius: 18, backgroundColor: COLORS.orangeLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoText: { fontSize: 32, fontWeight: '900', color: COLORS.orange },
  title: { fontSize: 26, fontWeight: '900', color: COLORS.dark, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.muted, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  buttons: { width: '100%', marginTop: 40, gap: 10 },
  btnPrimary: { backgroundColor: COLORS.orange, padding: 16, borderRadius: SIZES.radius, alignItems: 'center' },
  btnPrimaryText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  btnOutline: { backgroundColor: COLORS.white, padding: 16, borderRadius: SIZES.radius, alignItems: 'center', borderWidth: 2, borderColor: COLORS.border },
  btnOutlineText: { color: COLORS.dark, fontSize: 15, fontWeight: '700' },
});
