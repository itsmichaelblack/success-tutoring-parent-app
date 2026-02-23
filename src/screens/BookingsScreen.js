import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useParent } from '../config/ParentContext';
import { COLORS, SIZES } from '../config/theme';

export default function BookingsScreen() {
  const { parentData } = useParent();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => { loadBookings(); }, [parentData])
  );

  const loadBookings = async () => {
    if (!parentData?.id) { setLoading(false); return; }
    try {
      const q = query(collection(db, 'bookings'), where('parentId', '==', parentData.id));
      const snap = await getDocs(q);
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      all.sort((a, b) => b.date.localeCompare(a.date));
      setBookings(all);
    } catch (e) { console.error('Failed to load bookings:', e); }
    setLoading(false);
  };

  const today = new Date().toISOString().split('T')[0];
  const upcoming = bookings.filter(b => b.date >= today);
  const past = bookings.filter(b => b.date < today);

  const fmtTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const fmtEndTime = (t, dur) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const total = h * 60 + m + (dur || 40);
    const eh = Math.floor(total / 60);
    const em = total % 60;
    return `${eh > 12 ? eh - 12 : eh === 0 ? 12 : eh}:${String(em).padStart(2, '0')} ${eh >= 12 ? 'PM' : 'AM'}`;
  };

  const renderBooking = (b, isPast) => {
    const dateObj = new Date(b.date + 'T00:00:00');
    const dayName = dateObj.toLocaleDateString('en-AU', { weekday: 'long' });
    const childName = b.children?.[0]?.name || b.customerName || 'Assessment';
    return (
      <View key={b.id} style={[s.card, isPast && { opacity: 0.5 }]}>
        <View style={s.cardTop}>
          <View style={[s.dateBox, isPast && { backgroundColor: COLORS.bg }]}>
            <Text style={[s.dateBoxDay, isPast && { color: COLORS.muted }]}>{dateObj.getDate()}</Text>
            <Text style={[s.dateBoxMon, isPast && { color: COLORS.muted }]}>{dateObj.toLocaleDateString('en-AU', { month: 'short' })}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bookingChild}>{childName}</Text>
            <Text style={s.bookingLoc}>{b.locationName || 'Success Tutoring'}</Text>
          </View>
          <View style={[s.statusBadge, isPast ? s.statusPast : s.statusConfirmed]}>
            <Text style={[s.statusText, { color: isPast ? COLORS.muted : COLORS.success }]}>{isPast ? 'Completed' : 'Confirmed'}</Text>
          </View>
        </View>
        <View style={s.timeRow}>
          <Feather name="clock" size={14} color={COLORS.muted} />
          <Text style={s.timeText}>{dayName} · {fmtTime(b.time)} — {fmtEndTime(b.time, b.duration)} ({b.duration || 40} min)</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>Your Bookings</Text>
          <Text style={s.desc}>Assessment sessions for your children.</Text>
        </View>

        {loading ? (
          <View style={s.emptyCard}><Text style={s.emptyText}>Loading...</Text></View>
        ) : bookings.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>📅</Text>
            <Text style={s.emptyText}>No bookings yet</Text>
            <Text style={s.emptyDesc}>Book a free assessment from the Explore tab.</Text>
          </View>
        ) : (
          <>
            {upcoming.length > 0 && (
              <><Text style={s.sectionTitle}>Upcoming</Text>{upcoming.map(b => renderBooking(b, false))}</>
            )}
            {past.length > 0 && (
              <><Text style={s.sectionTitle}>Past</Text>{past.map(b => renderBooking(b, true))}</>
            )}
          </>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: SIZES.padding, paddingTop: 20, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  desc: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: SIZES.padding, paddingTop: 16, paddingBottom: 10 },
  card: { marginHorizontal: SIZES.padding, marginBottom: 10, padding: 16, borderRadius: SIZES.radius, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  dateBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: COLORS.orangeLight, alignItems: 'center', justifyContent: 'center' },
  dateBoxDay: { fontSize: 16, fontWeight: '800', color: COLORS.orange, lineHeight: 18 },
  dateBoxMon: { fontSize: 9, fontWeight: '700', color: COLORS.orange, textTransform: 'uppercase' },
  bookingChild: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  bookingLoc: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusConfirmed: { backgroundColor: COLORS.successBg },
  statusPast: { backgroundColor: 'rgba(156,163,175,0.1)' },
  statusText: { fontSize: 11, fontWeight: '700' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, backgroundColor: COLORS.bg, borderRadius: 8 },
  timeText: { fontSize: 12, color: COLORS.muted },
  emptyCard: { marginHorizontal: SIZES.padding, padding: 32, borderRadius: SIZES.radius, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  emptyText: { fontSize: 14, fontWeight: '700', color: COLORS.muted },
  emptyDesc: { fontSize: 12, color: COLORS.muted, marginTop: 4 },
});
