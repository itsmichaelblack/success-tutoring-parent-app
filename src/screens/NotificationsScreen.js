import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useParent } from '../config/ParentContext';
import { COLORS, SIZES } from '../config/theme';

export default function NotificationsScreen({ navigation }) {
  const { parentData, setParentData } = useParent();
  const prefs = parentData?.notifications || {};

  const [bookingReminders, setBookingReminders] = useState(prefs.bookingReminders !== false);
  const [promotionalOffers, setPromotionalOffers] = useState(prefs.promotionalOffers !== false);
  const [sessionUpdates, setSessionUpdates] = useState(prefs.sessionUpdates !== false);
  const [saving, setSaving] = useState(false);

  const savePrefs = async (key, value) => {
    const updated = {
      ...parentData?.notifications,
      [key]: value,
    };

    // Update locally first for instant UI
    setParentData(prev => ({ ...prev, notifications: updated }));

    try {
      await updateDoc(doc(db, 'parents', parentData.id), {
        notifications: updated,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('Failed to save notification prefs:', e);
    }
  };

  const toggleBooking = (val) => { setBookingReminders(val); savePrefs('bookingReminders', val); };
  const togglePromo = (val) => { setPromotionalOffers(val); savePrefs('promotionalOffers', val); };
  const toggleSession = (val) => { setSessionUpdates(val); savePrefs('sessionUpdates', val); };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color={COLORS.muted} />
        </TouchableOpacity>
        <Text style={s.title}>Notifications</Text>
      </View>

      <View style={{ paddingHorizontal: SIZES.padding, paddingTop: 16 }}>
        <View style={s.toggleRow}>
          <View style={[s.toggleIcon, { backgroundColor: COLORS.orangeLight }]}>
            <Feather name="calendar" size={16} color={COLORS.orange} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.toggleTitle}>Booking Reminders</Text>
            <Text style={s.toggleDesc}>Get reminders before upcoming sessions</Text>
          </View>
          <Switch
            value={bookingReminders}
            onValueChange={toggleBooking}
            trackColor={{ false: '#e8eaed', true: COLORS.orange }}
            thumbColor={COLORS.white}
          />
        </View>

        <View style={s.toggleRow}>
          <View style={[s.toggleIcon, { backgroundColor: COLORS.tealLight }]}>
            <Feather name="tag" size={16} color={COLORS.teal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.toggleTitle}>Promotional Offers</Text>
            <Text style={s.toggleDesc}>Receive special deals and promotions</Text>
          </View>
          <Switch
            value={promotionalOffers}
            onValueChange={togglePromo}
            trackColor={{ false: '#e8eaed', true: COLORS.orange }}
            thumbColor={COLORS.white}
          />
        </View>

        <View style={s.toggleRow}>
          <View style={[s.toggleIcon, { backgroundColor: COLORS.blueBg }]}>
            <Feather name="refresh-cw" size={16} color={COLORS.blue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.toggleTitle}>Session Updates</Text>
            <Text style={s.toggleDesc}>Changes to your booked sessions</Text>
          </View>
          <Switch
            value={sessionUpdates}
            onValueChange={toggleSession}
            trackColor={{ false: '#e8eaed', true: COLORS.orange }}
            thumbColor={COLORS.white}
          />
        </View>

        <View style={s.noteCard}>
          <Feather name="info" size={16} color={COLORS.muted} />
          <Text style={s.noteText}>Push notifications will be available in a future update. Your preferences are saved and will apply once notifications are enabled.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SIZES.padding, paddingTop: 12, paddingBottom: 4, backgroundColor: COLORS.white },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  toggleIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  toggleDesc: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  noteCard: { flexDirection: 'row', gap: 10, marginTop: 24, padding: 16, borderRadius: SIZES.radius, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  noteText: { flex: 1, fontSize: 12, color: COLORS.muted, lineHeight: 18 },
});
