import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { doc, getDoc, addDoc, updateDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useParent } from '../config/ParentContext';
import { COLORS, SIZES } from '../config/theme';

const DURATION = 40;
const DAYS = { 0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday' };

const CREDITS_MAP = {
  foundation_phase_1: 2, foundation_phase_2: 2, foundation_phase_3: 2,
  membership_1_session: 1, membership_2_sessions: 2, membership_unlimited: 999,
  one_on_one_primary: 1, one_on_one_secondary: 1,
  camp_coding: 1, camp_public_speaking: 1, camp_creative_writing: 1, camp_learn_ai: 1, camp_speed_typing: 1,
};

const ALL_MEMBERSHIPS = [
  { id: 'foundation_phase_1', name: 'Foundation Phase 1', credits: '2/week', category: 'membership' },
  { id: 'foundation_phase_2', name: 'Foundation Phase 2', credits: '2/week', category: 'membership' },
  { id: 'foundation_phase_3', name: 'Foundation Phase 3', credits: '2/week', category: 'membership' },
  { id: 'membership_1_session', name: '1 Session / Week', credits: '1/week', category: 'membership' },
  { id: 'membership_2_sessions', name: '2 Sessions / Week', credits: '2/week', category: 'membership' },
  { id: 'membership_unlimited', name: 'Unlimited', credits: 'Unlimited', category: 'membership' },
  { id: 'one_on_one_primary', name: 'One-on-One (Primary)', credits: '1/week', category: 'one_on_one' },
  { id: 'one_on_one_secondary', name: 'One-on-One (Secondary)', credits: '1/week', category: 'one_on_one' },
];

export default function ExploreScreen({ navigation }) {
  const { parentData } = useParent();
  const [tab, setTab] = useState('assessment');

  // Shared
  const [availability, setAvailability] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedChild, setSelectedChild] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [booking, setBooking] = useState(false);

  // Assessment
  const [assessmentSlots, setAssessmentSlots] = useState([]);

  // Sessions
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // Membership
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [pricing, setPricing] = useState(null);
  const [sales, setSales] = useState([]);
  const [pendingSession, setPendingSession] = useState(null);
  const [membershipSaving, setMembershipSaving] = useState(false);

  const children = parentData?.children || [];

  const dates = [];
  for (let i = 1; i <= 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d);
  }

  useEffect(() => {
    if (parentData?.locationId) {
      loadAvailability();
      loadPricing();
      loadSales();
    }
  }, [parentData?.locationId]);

  const loadAvailability = async () => {
    try {
      const snap = await getDoc(doc(db, 'availability', parentData.locationId));
      if (snap.exists()) setAvailability(snap.data());
    } catch (e) { console.error('Failed to load availability:', e); }
  };

  const loadPricing = async () => {
    try {
      const snap = await getDoc(doc(db, 'pricing', parentData.locationId));
      if (snap.exists()) setPricing(snap.data());
    } catch (e) { console.error('Failed to load pricing:', e); }
  };

  const loadSales = async () => {
    try {
      const q2 = query(
        collection(db, 'sales'),
        where('locationId', '==', parentData.locationId),
        where('parentEmail', '==', parentData.email?.toLowerCase())
      );
      const snap = await getDocs(q2);
      setSales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error('Failed to load sales:', e); }
  };

  // Assessment slots
  useEffect(() => {
    if (!selectedDate || !availability?.schedule || tab !== 'assessment') { setAssessmentSlots([]); return; }
    const dayName = DAYS[selectedDate.getDay()];
    const sched = availability.schedule.find(s => s.day === dayName);
    if (!sched?.enabled) { setAssessmentSlots([]); return; }
    const buffer = availability.bufferMinutes || 0;
    const slots = [];
    const periods = sched.periods?.length ? sched.periods : (sched.start && sched.end ? [{ start: sched.start, end: sched.end }] : []);
    periods.forEach(p => {
      if (!p.start || !p.end) return;
      const [sh, sm] = p.start.split(':').map(Number);
      const [eh, em] = p.end.split(':').map(Number);
      let cur = sh * 60 + sm;
      const end = eh * 60 + em;
      while (cur + DURATION <= end) {
        slots.push(`${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`);
        cur += DURATION + buffer;
      }
    });
    setAssessmentSlots(slots);
  }, [selectedDate, availability, tab]);

  // Sessions for date
  useEffect(() => {
    if (!selectedDate || tab !== 'sessions' || !parentData?.locationId) { setSessions([]); return; }
    const load = async () => {
      setSessionsLoading(true);
      try {
        const dateStr = selectedDate.toISOString().split('T')[0];
        const q2 = query(
          collection(db, 'bookings'),
          where('locationId', '==', parentData.locationId),
          where('date', '==', dateStr),
          where('type', '==', 'session')
        );
        const snap = await getDocs(q2);
        const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Load student counts + service allowedMemberships for each session
        const enriched = await Promise.all(results.map(async (session) => {
          // Count students in subcollection
          let studentCount = 0;
          try {
            const studSnap = await getDocs(collection(db, 'bookings', session.id, 'students'));
            studentCount = studSnap.size;
          } catch (e) { /* ignore */ }

          // Load service to get allowedMemberships and maxStudents
          let allowedMemberships = [];
          let maxStudents = 6;
          if (session.serviceId) {
            try {
              const svcSnap = await getDoc(doc(db, 'services', session.serviceId));
              if (svcSnap.exists()) {
                const svcData = svcSnap.data();
                allowedMemberships = svcData.allowedMemberships || [];
                maxStudents = svcData.maxStudents || 6;
              }
            } catch (e) { /* ignore */ }
          }

          return { ...session, studentCount, maxStudents, allowedMemberships };
        }));

        enriched.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        setSessions(enriched);
      } catch (e) {
        console.error('Failed to load sessions:', e);
        setSessions([]);
      }
      setSessionsLoading(false);
    };
    load();
  }, [selectedDate, tab]);

  const isDayAvailable = (d) => {
    if (tab === 'sessions') return true;
    if (!availability?.schedule) return false;
    const sched = availability.schedule.find(s => s.day === DAYS[d.getDay()]);
    if (!sched?.enabled) return false;
    const periods = sched.periods?.length ? sched.periods : (sched.start && sched.end ? [{ start: sched.start, end: sched.end }] : []);
    return periods.some(p => p.start && p.end);
  };

  const fmtTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${h > 12 ? h - 12 : h === 0 ? 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  // Credit check — rolling 7-day window
  const getChildCreditStatus = (child) => {
    const parentEmail = parentData?.email?.toLowerCase();
    const childSales = sales.filter(s =>
      s.parentEmail?.toLowerCase() === parentEmail &&
      (s.status === 'active' || s.status === 'pending' || !s.status) &&
      s.activationDate
    );
    if (childSales.length === 0) return { allowed: false, reason: 'No active membership' };

    let bestSale = null;
    let maxCredits = 0;
    childSales.forEach(s => {
      const saleChildren = (s.children || []).map(c => c.name?.toLowerCase());
      if (saleChildren.length > 0 && !saleChildren.includes(child.name?.toLowerCase())) return;
      const credits = CREDITS_MAP[s.membershipId] || 0;
      if (credits > maxCredits) { maxCredits = credits; bestSale = s; }
    });

    if (!bestSale) return { allowed: false, reason: 'No active membership for this child' };
    if (maxCredits >= 999) return { allowed: true, remaining: '∞', sale: bestSale, membershipId: bestSale.membershipId };

    // Rolling 7-day window: count bookings from today-6 to today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 6);
    const weekKey = `rolling_${weekAgo.toISOString().split('T')[0]}`;

    // For backward compatibility, check both old and new format
    const creditsUsed = bestSale.creditsUsed || {};
    let used = 0;

    // Count used credits across all week keys that overlap the rolling window
    Object.entries(creditsUsed).forEach(([key, weekData]) => {
      const childUsed = weekData[child.name?.toLowerCase()] || 0;
      // Check if this week key is within our rolling window
      const keyDate = key.replace('week_', '').replace('rolling_', '');
      if (keyDate >= weekAgo.toISOString().split('T')[0]) {
        used += childUsed;
      }
    });

    const remaining = maxCredits - used;

    if (remaining <= 0) return { allowed: false, reason: `No credits left this week`, sale: bestSale, membershipId: bestSale.membershipId };
    return { allowed: true, remaining, total: maxCredits, sale: bestSale, weekKey, membershipId: bestSale.membershipId };
  };

  // Book assessment
  const handleBookAssessment = async (time) => {
    if (selectedChild === null) { Alert.alert('Select a child', 'Please select which child this is for.'); return; }
    setBooking(true);
    try {
      const child = children[selectedChild] || {};
      await addDoc(collection(db, 'bookings'), {
        locationId: parentData.locationId,
        locationName: parentData.locationName,
        date: selectedDate.toISOString().split('T')[0],
        time, duration: DURATION,
        parentId: parentData.id,
        parentFirstName: parentData.firstName,
        parentLastName: parentData.lastName,
        customerName: parentData.name,
        customerEmail: parentData.email,
        customerPhone: parentData.phone,
        children: child.name ? [{ name: child.name, grade: child.grade || '' }] : [],
        status: 'confirmed', source: 'mobile_app',
        createdAt: serverTimestamp(),
      });
      setShowConfirm(true);
    } catch (e) { Alert.alert('Error', 'Failed to book. Please try again.'); }
    setBooking(false);
  };

  // Book session
  const handleBookSession = async (session) => {
    if (selectedChild === null) { Alert.alert('Select a child', 'Please select which child to book.'); return; }
    const child = children[selectedChild];
    const creditStatus = getChildCreditStatus(child);

    // Check capacity
    if (session.studentCount >= session.maxStudents) {
      Alert.alert('Session Full', `This session is full (${session.maxStudents}/${session.maxStudents} spots taken).`);
      return;
    }

    if (!creditStatus.allowed) {
      setPendingSession(session);
      setShowMembershipModal(true);
      return;
    }

    // Check if membership allows this service
    if (session.allowedMemberships && session.allowedMemberships.length > 0 && creditStatus.membershipId) {
      if (!session.allowedMemberships.includes(creditStatus.membershipId)) {
        Alert.alert(
          'Membership Mismatch',
          `Your current membership doesn't include this session type. Please upgrade your membership or choose a different session.`
        );
        return;
      }
    }

    // Check if child is already booked into this session
    try {
      const studSnap = await getDocs(collection(db, 'bookings', session.id, 'students'));
      const alreadyBooked = studSnap.docs.some(d => d.data().name?.toLowerCase() === child.name?.toLowerCase());
      if (alreadyBooked) {
        Alert.alert('Already Booked', `${child.name} is already booked into this session.`);
        return;
      }
    } catch (e) { /* proceed */ }

    await doBookSession(session, child, creditStatus);
  };

  const doBookSession = async (session, child, creditStatus) => {
    setBooking(true);
    try {
      // Add to session's students sub-collection
      await addDoc(collection(db, 'bookings', session.id, 'students'), {
        name: child.name, grade: child.grade || '',
        parentName: parentData.name, parentEmail: parentData.email, parentId: parentData.id,
        addedAt: serverTimestamp(),
      });

      // Create parent-facing booking
      await addDoc(collection(db, 'bookings'), {
        type: 'parent_session_booking',
        sessionBookingId: session.id,
        locationId: parentData.locationId,
        locationName: parentData.locationName,
        date: session.date, time: session.time,
        duration: session.duration || DURATION,
        serviceId: session.serviceId || '',
        serviceName: session.serviceName || 'Tutoring Session',
        tutorName: session.tutorName || '',
        parentId: parentData.id,
        customerName: parentData.name,
        customerEmail: parentData.email,
        customerPhone: parentData.phone,
        children: [{ name: child.name, grade: child.grade || '' }],
        status: 'confirmed', source: 'mobile_app',
        createdAt: serverTimestamp(),
      });

      // Deduct credit
      if (creditStatus.sale && creditStatus.weekKey && creditStatus.remaining !== '∞') {
        const creditsUsed = { ...(creditStatus.sale.creditsUsed || {}) };
        const weekData = { ...(creditsUsed[creditStatus.weekKey] || {}) };
        weekData[child.name.toLowerCase()] = (weekData[child.name.toLowerCase()] || 0) + 1;
        creditsUsed[creditStatus.weekKey] = weekData;
        await updateDoc(doc(db, 'sales', creditStatus.sale.id), { creditsUsed });
      }

      setShowConfirm(true);
    } catch (e) {
      console.error('Session booking failed:', e);
      Alert.alert('Error', 'Failed to book session. Please try again.');
    }
    setBooking(false);
  };

  // Purchase membership — navigate to checkout
  const handlePurchaseMembership = async (membershipId) => {
    if (selectedChild === null) return;
    const child = children[selectedChild];
    const info = ALL_MEMBERSHIPS.find(m => m.id === membershipId);
    const price = pricing?.[membershipId]?.price || '0';

    setShowMembershipModal(false);
    setPendingSession(null);
    navigation.navigate('Checkout', {
      child,
      membership: { id: membershipId, name: info?.name, desc: '', credits: info?.credits, category: info?.category },
      price,
    });
  };

  const availableMemberships = ALL_MEMBERSHIPS.filter(m => pricing?.[m.id]?.enabled);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          {/* Tab Toggle */}
          <View style={s.tabRow}>
            <TouchableOpacity style={[s.tabBtn, tab === 'assessment' && s.tabBtnActive]} onPress={() => { setTab('assessment'); setSelectedDate(null); }}>
              <Text style={[s.tabText, tab === 'assessment' && s.tabTextActive]}>Free Assessment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.tabBtn, tab === 'sessions' && s.tabBtnActive]} onPress={() => { setTab('sessions'); setSelectedDate(null); }}>
              <Text style={[s.tabText, tab === 'sessions' && s.tabTextActive]}>Sessions</Text>
            </TouchableOpacity>
          </View>
          <Text style={s.title}>{tab === 'assessment' ? 'Book Assessment' : 'Book a Session'}</Text>
          <Text style={s.desc}>{tab === 'assessment' ? 'Select a date and time for a free 40-min assessment.' : 'Select a date to see available sessions at your centre.'}</Text>
        </View>

        {/* Child Picker */}
        {children.length > 0 ? (
          <View style={{ paddingHorizontal: SIZES.padding, marginBottom: 12 }}>
            <Text style={s.label}>Booking for <Text style={{ color: COLORS.orange }}>*</Text></Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              {children.map((c, i) => (
                <TouchableOpacity key={c.id || i} style={[s.childPill, selectedChild === i && s.childPillActive]} onPress={() => setSelectedChild(i)}>
                  <Text style={[s.childPillText, selectedChild === i && { color: COLORS.white }]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          <TouchableOpacity style={[s.addChildPrompt, { marginHorizontal: SIZES.padding, marginBottom: 12 }]} onPress={() => navigation.navigate('Home')}>
            <Feather name="plus-circle" size={16} color={COLORS.orange} />
            <Text style={{ fontSize: 13, color: COLORS.orange, fontWeight: '600' }}>Add a child first to book</Text>
          </TouchableOpacity>
        )}

        {/* Date Picker */}
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

        {/* Assessment Slots */}
        {tab === 'assessment' && selectedDate && (
          <>
            <Text style={[s.label, { paddingHorizontal: SIZES.padding }]}>Available Times</Text>
            {assessmentSlots.length === 0 ? (
              <View style={s.noSlots}><Text style={s.noSlotsText}>No available times on this day</Text></View>
            ) : assessmentSlots.map((t, i) => (
              <TouchableOpacity key={i} style={s.slotCard} onPress={() => handleBookAssessment(t)} disabled={booking}>
                <View>
                  <Text style={s.slotTime}>{fmtTime(t)}</Text>
                  <Text style={s.slotDur}>40 min · Free Assessment</Text>
                </View>
                <View style={s.bookBtn}><Text style={s.bookBtnText}>{booking ? '...' : 'Book'}</Text></View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Sessions */}
        {tab === 'sessions' && selectedDate && (
          <>
            <Text style={[s.label, { paddingHorizontal: SIZES.padding }]}>Available Sessions</Text>
            {sessionsLoading ? (
              <View style={{ padding: 30, alignItems: 'center' }}><ActivityIndicator color={COLORS.orange} /></View>
            ) : sessions.length === 0 ? (
              <View style={s.noSlots}>
                <Text style={s.noSlotsText}>No sessions on this day</Text>
                <Text style={{ fontSize: 11, color: COLORS.muted, marginTop: 4 }}>Your centre may not have sessions scheduled for this date.</Text>
              </View>
            ) : sessions.map((session, i) => {
              const endTime = (() => {
                if (!session.time) return '';
                const [h, m] = session.time.split(':').map(Number);
                const t = h * 60 + m + (session.duration || DURATION);
                return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
              })();
              const isFull = session.studentCount >= session.maxStudents;
              const spotsLeft = session.maxStudents - session.studentCount;

              // Check membership match for selected child
              let membershipMatch = true;
              if (selectedChild !== null && session.allowedMemberships?.length > 0) {
                const child = children[selectedChild];
                const creditStatus = getChildCreditStatus(child);
                if (creditStatus.membershipId && !session.allowedMemberships.includes(creditStatus.membershipId)) {
                  membershipMatch = false;
                }
              }

              return (
                <TouchableOpacity key={session.id || i} style={[s.sessionCard, isFull && { opacity: 0.5 }, !membershipMatch && { opacity: 0.5 }]} onPress={() => handleBookSession(session)} disabled={booking || isFull}>
                  <View style={s.sessionTimeCol}>
                    <Text style={s.sessionTime}>{fmtTime(session.time)}</Text>
                    <Text style={s.sessionTimeEnd}>{fmtTime(endTime)}</Text>
                  </View>
                  <View style={s.sessionDivider} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.sessionService}>{session.serviceName || 'Tutoring Session'}</Text>
                    {session.tutorName ? <Text style={s.sessionTutor}>with {session.tutorName}</Text> : null}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                      <Text style={s.sessionDur}>{session.duration || DURATION} min</Text>
                      <Text style={{ fontSize: 11, color: isFull ? COLORS.orange : COLORS.muted }}>
                        {isFull ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}
                      </Text>
                    </View>
                    {!membershipMatch && (
                      <Text style={{ fontSize: 10, color: COLORS.orange, marginTop: 2 }}>Not included in your plan</Text>
                    )}
                  </View>
                  {isFull ? (
                    <View style={[s.bookBtn, { backgroundColor: COLORS.border }]}><Text style={[s.bookBtnText, { color: COLORS.muted }]}>Full</Text></View>
                  ) : (
                    <View style={s.bookBtn}><Text style={s.bookBtnText}>{booking ? '...' : 'Book'}</Text></View>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Credit status */}
            {selectedChild !== null && children[selectedChild] && (
              <View style={{ paddingHorizontal: SIZES.padding, marginTop: 12 }}>
                {(() => {
                  const child = children[selectedChild];
                  const st = getChildCreditStatus(child);
                  if (st.allowed) return (
                    <View style={s.creditInfo}>
                      <Feather name="check-circle" size={14} color={COLORS.success} />
                      <Text style={s.creditText}>{child.name} has {st.remaining === '∞' ? 'unlimited' : st.remaining} credit{st.remaining !== 1 && st.remaining !== '∞' ? 's' : ''} left this week</Text>
                    </View>
                  );
                  return (
                    <View style={[s.creditInfo, { backgroundColor: COLORS.orangeLight, borderColor: COLORS.orange }]}>
                      <Feather name="alert-circle" size={14} color={COLORS.orange} />
                      <Text style={[s.creditText, { color: COLORS.orange }]}>{child.name}: {st.reason}</Text>
                    </View>
                  );
                })()}
              </View>
            )}
          </>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 12 }}>✅</Text>
            <Text style={s.modalTitle}>{tab === 'assessment' ? 'Assessment Booked!' : 'Session Booked!'}</Text>
            <Text style={s.modalDesc}>{tab === 'assessment' ? 'Your free assessment has been confirmed.' : `${children[selectedChild]?.name || 'Your child'} has been booked into the session.`}</Text>
            <TouchableOpacity style={s.modalBtn} onPress={() => { setShowConfirm(false); navigation.navigate('Bookings'); }}>
              <Text style={s.modalBtnText}>View My Bookings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Membership Modal */}
      <Modal visible={showMembershipModal} transparent animationType="slide" onRequestClose={() => { setShowMembershipModal(false); setPendingSession(null); }}>
        <View style={s.membershipOverlay}>
          <View style={s.membershipContent}>
            <View style={s.membershipHeader}>
              <Text style={s.membershipTitle}>Choose a Membership</Text>
              <TouchableOpacity onPress={() => { setShowMembershipModal(false); setPendingSession(null); }}>
                <Feather name="x" size={22} color={COLORS.muted} />
              </TouchableOpacity>
            </View>
            <Text style={s.membershipDesc}>{children[selectedChild]?.name || 'Your child'} needs an active membership to book sessions.</Text>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {availableMemberships.length === 0 ? (
                <View style={{ padding: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, color: COLORS.muted, fontWeight: '600', textAlign: 'center' }}>No plans available at your centre yet.</Text>
                  <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 4, textAlign: 'center' }}>Contact your centre for more information.</Text>
                </View>
              ) : availableMemberships.map(m => {
                const price = pricing?.[m.id]?.price;
                return (
                  <TouchableOpacity key={m.id} style={s.membershipCard} onPress={() => handlePurchaseMembership(m.id)} disabled={membershipSaving}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.membershipName}>{m.name}</Text>
                      <View style={s.creditBadge}><Text style={s.creditBadgeText}>{m.credits} credits</Text></View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      {price ? (
                        <>
                          <Text style={s.membershipPrice}>${price}</Text>
                          <Text style={s.membershipPer}>/week</Text>
                        </>
                      ) : <Text style={s.membershipPrice}>Contact</Text>}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {membershipSaving && (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <ActivityIndicator color={COLORS.orange} />
                <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 6 }}>Activating...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: SIZES.padding, paddingTop: 12, paddingBottom: 8 },
  tabRow: { flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, padding: 3, marginBottom: 16 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: COLORS.orange },
  tabText: { fontSize: 13, fontWeight: '700', color: COLORS.muted },
  tabTextActive: { color: COLORS.white },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  desc: { fontSize: 13, color: COLORS.muted, marginTop: 4, lineHeight: 20 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  addChildPrompt: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.orange, backgroundColor: COLORS.orangeLight },
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
  sessionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: SIZES.padding, marginTop: 8, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  sessionTimeCol: { width: 56, alignItems: 'center' },
  sessionTime: { fontSize: 13, fontWeight: '800', color: COLORS.dark },
  sessionTimeEnd: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  sessionDivider: { width: 2, height: 36, backgroundColor: COLORS.orange, borderRadius: 1 },
  sessionService: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  sessionTutor: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  sessionDur: { fontSize: 11, color: COLORS.muted, marginTop: 1 },
  creditInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, backgroundColor: COLORS.successBg, borderWidth: 1, borderColor: COLORS.success },
  creditText: { fontSize: 12, color: COLORS.success, fontWeight: '600', flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 30 },
  modalCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 28, width: '100%' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.dark, textAlign: 'center', marginBottom: 6 },
  modalDesc: { fontSize: 13, color: COLORS.muted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  modalBtn: { backgroundColor: COLORS.orange, padding: 16, borderRadius: SIZES.radius, alignItems: 'center' },
  modalBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  membershipOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  membershipContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SIZES.padding, paddingBottom: 40, maxHeight: '85%' },
  membershipHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  membershipTitle: { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  membershipDesc: { fontSize: 13, color: COLORS.muted, marginBottom: 20, lineHeight: 20 },
  membershipCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, marginBottom: 10 },
  membershipName: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  creditBadge: { marginTop: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: COLORS.tealLight },
  creditBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.teal },
  membershipPrice: { fontSize: 18, fontWeight: '800', color: COLORS.orange },
  membershipPer: { fontSize: 11, color: COLORS.muted },
});
