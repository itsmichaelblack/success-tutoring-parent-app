import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useParent } from '../config/ParentContext';
import { COLORS, SIZES } from '../config/theme';

const DURATION = 40;
const DAYS = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };

export default function ExploreScreen({ navigation }) {
  const { parentData } = useParent();
  const [availability, setAvailability] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedChild, setSelectedChild] = useState(0);
  const [timeSlots, setTimeSlots] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [booking, setBooking] = useState(false);

  const dates = [];
  for (let i = 1; i <= 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d);
  }

  useEffect(() => {
    if (parentData?.locationId) loadAvailability();
  }, [parentData]);

  const loadAvailability = async () => {
    try {
      const snap = await getDoc(doc(db, 'availability', parentData.locationId));
      if (snap.exists()) setAvailability(snap.data());
    } catch (e) { console.error('Failed to load availability:', e); }
  };

  useEffect(() => {
    if (!selectedDate || !availability?.schedule) { setTimeSlots([]); return; }
    const dayName = DAYS[selectedDate.getDay()];
    const sched = availability.schedule.find(s => s.day === dayName);
    if (!sched?.enabled) { setTimeSlots([]); return; }
    const buffer = availability.bufferMinutes || 0;
    const slots = [];
    (sched.periods || []).forEach(p => {
      const [sh, sm] = p.start.split(':').map(Number);
      const [eh, em] = p.end.split(':').map(Number);
      let startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      while (startMin + DURATION <= endMin) {
        const h = Math.floor(startMin / 60);
        const m = startMin % 60;
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        startMin += DURATION + buffer;
      }
    });
    setTimeSlots(slots);
  }, [selectedDate, availability]);

  const isDayAvailable = (d) => {
    if (!availability?.schedule) return false;
    const sched = availability.schedule.find(s => s.day === DAYS[d.getDay()]);
    return sched?.enabled && sched?.periods?.length > 0;
  };

  const fmtTime = (t) => {
    const [h, m] = t.split(':').map(Number);
    return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const handleBook = async (time) => {
    if (!parentData || !selectedDate) return;
    setBooking(true);
    try {
      const children = parentData.children || [];
      const child = children[selectedChild] || {};
      await addDoc(collection(db, 'bookings'), {
        locationId: parentData.locationId,
        locationName: parentData.locationName,
        date: selectedDate.toISOString().split('T')[0],
        time,
        duration: DURATION,
        parentId: parentData.id,
        parentFirstName: parentData.firstName,
        parentLastName: parentData.lastName,
        customerName: parentData.name,
        customerEmail: parentData.email,
        customerPhone: parentData.phone,
        children: child.name ? [{ name: child.name, grade: child.grade || '' }] : [],
        status: 'confirmed',
        source: 'mobile_app',
        createdAt: serverTimestamp(),
      });
      setShowConfirm(true);
    } catch (e) {
      console.error('Booking failed:', e);
      Alert.alert('Error', 'Failed to book. Please try again.');
    }
    setBooking(false);
  };

  const children = parentData?.children || [];

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>Book Assessment</Text>
          <Text style={s.desc}>Select a date and time for a free 40-min assessment.</Text>
        </View>

        {children.length > 0 && (
          <View style={{ paddingHorizontal: SIZES.padding, marginBottom: 12 }}>
            <Text style={s.label}>Booking for</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {children.map((c, i) => (
                <TouchableOpacity key={i} style={[s.childPill, selectedChild === i && s.childPillActive]} onPress={() => setSelectedChild(i)}>
                  <Text style={[s.childPillText, selectedChild === i && { color: COLORS.white }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <Text style={[s.label, { paddingHorizontal: SIZES.padding }]}>Select a date</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8, marginBottom: 16 }} contentContainerStyle={{ paddingHorizontal: SIZES.padding, gap: 8 }}>
          {dates.map((d, i) => {
            const avail = isDayAvailable(d);
            const isSel = selectedDate?.toDateString() === d.toDateString();
            return (
              <TouchableOpacity key={i} style={[s.dateBtn, isSel && s.dateBtnActive, !avail && { opacity: 0.3 }]} disabled={!avail} onPress={() => setSelectedDate(d)}>
                <Text style={[s.dateDay, isSel && { color: COLORS.orange }]}>{d.toLocaleDateString('en-AU', { weekday: 'short' })}</Text>
                <Text style={[s.dateNum, isSel && { color: COLORS.orange }]}>{d.getDate()}</Text>
                <Text style={[s.dateMon, isSel && { color: COLORS.orange }]}>{d.toLocaleDateString('en-AU', { month: 'short' })}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {selectedDate && (
          <>
            <Text style={[s.label, { paddingHorizontal: SIZES.padding }]}>Available Times</Text>
            {timeSlots.length === 0 ? (
              <View style={s.noSlots}><Text style={s.noSlotsText}>No available times on this day</Text></View>
            ) : (
              timeSlots.map((t, i) => (
                <TouchableOpacity key={i} style={s.slotCard} onPress={() => handleBook(t)} disabled={booking}>
                  <View>
                    <Text style={s.slotTime}>{fmtTime(t)}</Text>
                    <Text style={s.slotDur}>40 min · Free Assessment</Text>
                  </View>
                  <View style={s.bookBtn}><Text style={s.bookBtnText}>{booking ? '...' : 'Book'}</Text></View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>

      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>✅</Text>
            <Text style={s.modalTitle}>Assessment Booked!</Text>
            <Text style={s.modalDesc}>Your free assessment has been confirmed. You'll receive a confirmation email shortly.</Text>
            <TouchableOpacity style={s.modalBtn} onPress={() => { setShowConfirm(false); navigation.navigate('Bookings'); }}>
              <Text style={s.modalBtnText}>View My Bookings</Text>
            </TouchableOpacity>
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
  desc: { fontSize: 13, color: COLORS.muted, marginTop: 4, lineHeight: 20 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  childPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.white, marginRight: 8 },
  childPillActive: { backgroundColor: COLORS.orange, borderColor: COLORS.orange },
  childPillText: { fontSize: 13, fontWeight: '700', color: COLORS.dark },
  dateBtn: { minWidth: 60, paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: 'center' },
  dateBtnActive: { borderColor: COLORS.orange, backgroundColor: COLORS.orangeLight },
  dateDay: { fontSize: 10, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase' },
  dateNum: { fontSize: 18, fontWeight: '800', color: COLORS.dark, marginVertical: 2 },
  dateMon: { fontSize: 10, color: COLORS.muted },
  slotCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: SIZES.padding, marginTop: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  slotTime: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  slotDur: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  bookBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: COLORS.orange },
  bookBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  noSlots: { marginHorizontal: SIZES.padding, marginTop: 8, padding: 24, borderRadius: 12, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  noSlotsText: { fontSize: 13, color: COLORS.muted, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 30 },
  modalCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 28, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.dark, textAlign: 'center', marginBottom: 6 },
  modalDesc: { fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  modalBtn: { backgroundColor: COLORS.orange, padding: 16, borderRadius: SIZES.radius, alignItems: 'center' },
  modalBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});
