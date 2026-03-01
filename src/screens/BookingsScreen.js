import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { collection, getDocs, getDoc, doc, updateDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useParent } from '../config/ParentContext';
import { COLORS, SIZES } from '../config/theme';

export default function BookingsScreen() {
  const { parentData } = useParent();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [locationPhone, setLocationPhone] = useState(null);

  useFocusEffect(
    useCallback(() => { loadBookings(); }, [parentData])
  );

  const loadBookings = async () => {
    if (!parentData?.id) { setLoading(false); return; }
    try {
      const q = query(collection(db, 'bookings'), where('parentId', '==', parentData.id));
      const snap = await getDocs(q);
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(b => b.status !== 'cancelled');
      all.sort((a, b) => b.date?.localeCompare(a.date));
      setBookings(all);
    } catch (e) { console.error('Failed to load bookings:', e); }
    setLoading(false);
  };

  const today = new Date().toISOString().split('T')[0];

  // Group recurring bookings — show one card for each recurringGroupId
  const groupedBookings = (() => {
    const groups = {};
    const singles = [];
    bookings.forEach(b => {
      if (b.recurringGroupId && b.bookingType === 'recurring') {
        if (!groups[b.recurringGroupId]) {
          groups[b.recurringGroupId] = { ...b, occurrences: [b], isRecurring: true };
        } else {
          groups[b.recurringGroupId].occurrences.push(b);
        }
      } else {
        singles.push(b);
      }
    });
    // For each recurring group, pick the next upcoming occurrence as the display card
    const recurringCards = Object.values(groups).map(g => {
      const futureOccurrences = g.occurrences.filter(o => o.date >= today).sort((a, b) => a.date.localeCompare(b.date));
      const pastOccurrences = g.occurrences.filter(o => o.date < today);
      const nextOccurrence = futureOccurrences[0] || g.occurrences[0];
      return {
        ...nextOccurrence,
        isRecurring: true,
        totalOccurrences: g.occurrences.length,
        futureCount: futureOccurrences.length,
        pastCount: pastOccurrences.length,
        recurringGroupId: g.recurringGroupId,
      };
    });
    return [...singles, ...recurringCards].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  })();

  const upcoming = groupedBookings.filter(b => b.date >= today);
  const past = groupedBookings.filter(b => b.date < today);

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

  const getHoursUntilSession = (booking) => {
    if (!booking?.date || !booking?.time) return 999;
    const [h, m] = booking.time.split(':').map(Number);
    const sessionDate = new Date(booking.date + 'T00:00:00');
    sessionDate.setHours(h, m, 0, 0);
    const now = new Date();
    return (sessionDate - now) / (1000 * 60 * 60);
  };

  const handleOpenBooking = async (booking) => {
    setSelectedBooking(booking);
    setLocationPhone(null);
    // Load centre phone number
    if (booking.locationId) {
      try {
        const snap = await getDoc(doc(db, 'locations', booking.locationId));
        if (snap.exists()) setLocationPhone(snap.data().phone || null);
      } catch (e) {}
    }
  };

  const handleCancel = async () => {
    if (!selectedBooking) return;
    const hoursUntil = getHoursUntilSession(selectedBooking);

    if (hoursUntil < 4) {
      // Too late to cancel — show centre contact
      Alert.alert(
        'Unable to Cancel',
        `This session is less than 4 hours away. Please contact your centre directly to make changes.${locationPhone ? `\n\nPhone: ${locationPhone}` : ''}`,
        [
          ...(locationPhone ? [{ text: 'Call Centre', onPress: () => Linking.openURL(`tel:${locationPhone.replace(/\s/g, '')}`).catch(() => {}) }] : []),
          { text: 'OK', style: 'cancel' },
        ]
      );
      return;
    }

    Alert.alert(
      'Cancel Booking',
      'Are you sure you want to cancel this booking? This cannot be undone.',
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              await updateDoc(doc(db, 'bookings', selectedBooking.id), {
                status: 'cancelled',
                cancelledAt: serverTimestamp(),
              });
              setBookings(prev => prev.filter(b => b.id !== selectedBooking.id));
              setSelectedBooking(null);
            } catch (e) {
              console.error('Cancel failed:', e);
              Alert.alert('Error', 'Failed to cancel. Please try again.');
            }
            setCancelling(false);
          }
        },
      ]
    );
  };

  const renderBooking = (b, isPast) => {
    const dateObj = new Date(b.date + 'T00:00:00');
    const dayName = dateObj.toLocaleDateString('en-AU', { weekday: 'long' });
    const childName = b.children?.[0]?.name || b.customerName || 'Booking';
    const serviceName = b.serviceName || (b.type === 'parent_session_booking' ? 'Tutoring Session' : 'Free Assessment');

    return (
      <TouchableOpacity key={b.id} style={[s.card, isPast && { opacity: 0.5 }]} onPress={() => !isPast && handleOpenBooking(b)} activeOpacity={isPast ? 1 : 0.7}>
        <View style={s.cardTop}>
          <View style={[s.dateBox, isPast && { backgroundColor: COLORS.bg }]}>
            <Text style={[s.dateBoxDay, isPast && { color: COLORS.muted }]}>{dateObj.getDate()}</Text>
            <Text style={[s.dateBoxMon, isPast && { color: COLORS.muted }]}>{dateObj.toLocaleDateString('en-AU', { month: 'short' })}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.bookingChild}>{childName}</Text>
            <Text style={s.bookingService}>{serviceName}</Text>
            <Text style={s.bookingLoc}>{b.locationName || 'Success Tutoring'}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={[s.statusBadge, isPast ? s.statusPast : s.statusConfirmed]}>
              <Text style={[s.statusText, { color: isPast ? COLORS.muted : COLORS.success }]}>{isPast ? 'Completed' : 'Confirmed'}</Text>
            </View>
            {b.isRecurring && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, backgroundColor: 'rgba(109,203,202,0.12)' }}>
                <Feather name="repeat" size={10} color={COLORS.teal} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.teal }}>Every {dayName}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={s.timeRow}>
          <Feather name="clock" size={14} color={COLORS.muted} />
          <Text style={s.timeText}>
            {b.isRecurring ? `Every ${dayName}` : dayName} · {fmtTime(b.time)} — {fmtEndTime(b.time, b.duration)} ({b.duration || 40} min)
          </Text>
        </View>
        {b.isRecurring && b.futureCount > 0 && (
          <Text style={{ fontSize: 11, color: COLORS.muted, marginTop: 4, paddingLeft: 4 }}>
            {b.futureCount} upcoming session{b.futureCount !== 1 ? 's' : ''}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>Your Bookings</Text>
          <Text style={s.desc}>Your booked sessions and assessments.</Text>
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

      {/* Booking Detail Modal */}
      <Modal visible={!!selectedBooking} transparent animationType="fade" onRequestClose={() => setSelectedBooking(null)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            {selectedBooking && (() => {
              const b = selectedBooking;
              const dateObj = new Date(b.date + 'T00:00:00');
              const dayName = dateObj.toLocaleDateString('en-AU', { weekday: 'long' });
              const fullDate = dateObj.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
              const childName = b.children?.[0]?.name || b.customerName || 'Booking';
              const serviceName = b.serviceName || (b.type === 'parent_session_booking' ? 'Tutoring Session' : 'Free Assessment');
              const hoursUntil = getHoursUntilSession(b);
              const canCancel = hoursUntil >= 4;

              return (
                <>
                  <View style={s.modalHeader}>
                    <Text style={s.modalTitle}>Booking Details</Text>
                    <TouchableOpacity onPress={() => setSelectedBooking(null)}>
                      <Feather name="x" size={22} color={COLORS.muted} />
                    </TouchableOpacity>
                  </View>

                  <View style={s.detailRow}>
                    <Feather name="user" size={16} color={COLORS.orange} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.detailLabel}>Child</Text>
                      <Text style={s.detailValue}>{childName}</Text>
                    </View>
                  </View>

                  <View style={s.detailRow}>
                    <Feather name="book-open" size={16} color={COLORS.teal} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.detailLabel}>Service</Text>
                      <Text style={s.detailValue}>{serviceName}</Text>
                    </View>
                  </View>

                  {b.tutorName ? (
                    <View style={s.detailRow}>
                      <Feather name="award" size={16} color={COLORS.blue} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.detailLabel}>Tutor</Text>
                        <Text style={s.detailValue}>{b.tutorName}</Text>
                      </View>
                    </View>
                  ) : null}

                  <View style={s.detailRow}>
                    <Feather name="calendar" size={16} color={COLORS.orange} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.detailLabel}>Date</Text>
                      <Text style={s.detailValue}>{fullDate}</Text>
                    </View>
                  </View>

                  <View style={s.detailRow}>
                    <Feather name="clock" size={16} color={COLORS.muted} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.detailLabel}>Time</Text>
                      <Text style={s.detailValue}>{fmtTime(b.time)} — {fmtEndTime(b.time, b.duration)} ({b.duration || 40} min)</Text>
                    </View>
                  </View>

                  <View style={s.detailRow}>
                    <Feather name="map-pin" size={16} color={COLORS.success} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.detailLabel}>Centre</Text>
                      <Text style={s.detailValue}>{b.locationName || 'Success Tutoring'}</Text>
                    </View>
                  </View>

                  <View style={{ height: 16 }} />

                  {canCancel ? (
                    <TouchableOpacity style={s.cancelBtn} onPress={handleCancel} disabled={cancelling}>
                      {cancelling ? (
                        <ActivityIndicator color={COLORS.error} />
                      ) : (
                        <>
                          <Feather name="x-circle" size={16} color={COLORS.error} />
                          <Text style={s.cancelBtnText}>Cancel Booking</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={s.cantCancelCard}>
                      <Feather name="alert-circle" size={16} color={COLORS.orange} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.cantCancelText}>This session is less than 4 hours away and can no longer be cancelled online.</Text>
                        {locationPhone && (
                          <TouchableOpacity style={s.callBtn} onPress={() => Linking.openURL(`tel:${locationPhone.replace(/\s/g, '')}`).catch(() => {})}>
                            <Feather name="phone" size={14} color={COLORS.white} />
                            <Text style={s.callBtnText}>Call Centre: {locationPhone}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
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
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  dateBox: { width: 44, height: 44, borderRadius: 10, backgroundColor: COLORS.orangeLight, alignItems: 'center', justifyContent: 'center' },
  dateBoxDay: { fontSize: 16, fontWeight: '800', color: COLORS.orange, lineHeight: 18 },
  dateBoxMon: { fontSize: 9, fontWeight: '700', color: COLORS.orange, textTransform: 'uppercase' },
  bookingChild: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  bookingService: { fontSize: 12, color: COLORS.teal, fontWeight: '600', marginTop: 2 },
  bookingLoc: { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusConfirmed: { backgroundColor: COLORS.successBg },
  statusPast: { backgroundColor: 'rgba(156,163,175,0.1)' },
  statusText: { fontSize: 11, fontWeight: '700' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 10, backgroundColor: COLORS.bg, borderRadius: 8 },
  timeText: { fontSize: 12, color: COLORS.muted },
  emptyCard: { marginHorizontal: SIZES.padding, padding: 32, borderRadius: SIZES.radius, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  emptyText: { fontSize: 14, fontWeight: '700', color: COLORS.muted },
  emptyDesc: { fontSize: 12, color: COLORS.muted, marginTop: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', paddingHorizontal: 20 },
  modalCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: SIZES.padding },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  detailLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  detailValue: { fontSize: 14, color: COLORS.dark, marginTop: 2 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderRadius: SIZES.radius, borderWidth: 2, borderColor: COLORS.error, backgroundColor: COLORS.errorBg },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.error },
  cantCancelCard: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: SIZES.radius, backgroundColor: COLORS.orangeLight, borderWidth: 1, borderColor: COLORS.orange },
  cantCancelText: { fontSize: 12, color: COLORS.orange, fontWeight: '600', lineHeight: 18 },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: COLORS.orange, alignSelf: 'flex-start' },
  callBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
});
