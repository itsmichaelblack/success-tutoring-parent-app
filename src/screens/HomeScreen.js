import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useParent } from '../config/ParentContext';
import { COLORS, SIZES } from '../config/theme';

const AU_GRADES = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const NZ_GRADES = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Grade 13'];

export default function HomeScreen({ navigation }) {
  const { parentData, addChild, loadChildren } = useParent();

  // Load children from Firebase on mount
  useEffect(() => {
    if (parentData?.id) loadChildren(parentData.id);
  }, [parentData?.id]);

  const firstName = parentData?.firstName || 'there';
  const locationName = parentData?.locationName || 'Your Centre';
  const children = parentData?.children || [];

  // Determine if NZ based on location address
  const isNZ = (parentData?.locationName || '').toLowerCase().includes('new zealand') ||
    ['new lynn', 'mt roskill', 'northwest', 'palmerston north', 'lower hutt', 'papanui'].some(
      nz => (parentData?.locationName || '').toLowerCase().includes(nz)
    );
  const GRADES = isNZ ? NZ_GRADES : AU_GRADES;

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [childName, setChildName] = useState('');
  const [childGrade, setChildGrade] = useState('');
  const [gradePickerOpen, setGradePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const resetModal = () => {
    setChildName('');
    setChildGrade('');
    setGradePickerOpen(false);
    setSaving(false);
  };

  const handleAddChild = async () => {
    if (!childName.trim()) {
      Alert.alert('Missing Info', 'Please enter your child\'s name.');
      return;
    }
    if (!childGrade) {
      Alert.alert('Missing Info', 'Please select a grade.');
      return;
    }

    setSaving(true);
    try {
      await addChild({ name: childName.trim(), grade: childGrade });
      resetModal();
      setModalVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to add child. Please try again.');
    }
    setSaving(false);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.greeting}>Welcome back, <Text style={{ color: COLORS.orange }}>{firstName}</Text> 👋</Text>
          <Text style={s.location}>📍 {locationName}</Text>
        </View>

        <Text style={s.sectionTitle}>Quick Actions</Text>
        <View style={s.quickActions}>
          <TouchableOpacity style={s.quickCard} onPress={() => navigation.navigate('Explore')}>
            <View style={[s.quickIcon, { backgroundColor: COLORS.orangeLight }]}>
              <Feather name="calendar" size={18} color={COLORS.orange} />
            </View>
            <Text style={s.quickTitle}>Book Assessment</Text>
            <Text style={s.quickDesc}>Free 40-min session</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.quickCard} onPress={() => navigation.navigate('Bookings')}>
            <View style={[s.quickIcon, { backgroundColor: COLORS.tealLight }]}>
              <Feather name="clipboard" size={18} color={COLORS.teal} />
            </View>
            <Text style={s.quickTitle}>My Bookings</Text>
            <Text style={s.quickDesc}>View upcoming sessions</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.sectionTitle}>Your Children</Text>
        {children.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>👧</Text>
            <Text style={s.emptyText}>No children added yet</Text>
            <Text style={s.emptyDesc}>Add your child to start booking sessions</Text>
          </View>
        ) : (
          children.map((child, i) => (
            <View key={child.id || i} style={s.childCard}>
              <View style={[s.childAvatar, { backgroundColor: i % 2 === 0 ? 'rgba(109,203,202,0.15)' : COLORS.orangeLight }]}>
                <Text style={[s.childAvatarText, { color: i % 2 === 0 ? COLORS.teal : COLORS.orange }]}>{child.name?.[0] || '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.childName}>{child.name}</Text>
                <Text style={s.childGrade}>{child.grade || 'No grade set'}</Text>
              </View>
              <View style={[s.statusBadge, child.membership ? s.statusActive : s.statusNone]}>
                <Text style={[s.statusText, { color: child.membership ? COLORS.success : COLORS.muted }]}>{child.membership || 'No Membership'}</Text>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity style={s.addChildBtn} onPress={() => setModalVisible(true)}>
          <Feather name="plus" size={16} color={COLORS.orange} />
          <Text style={s.addChildText}>Add a Child</Text>
        </TouchableOpacity>
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Add Child Modal ── */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => { resetModal(); setModalVisible(false); }}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add a Child</Text>
              <TouchableOpacity onPress={() => { resetModal(); setModalVisible(false); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Feather name="x" size={22} color={COLORS.muted} />
              </TouchableOpacity>
            </View>

            <Text style={s.modalLabel}>Child's Full Name <Text style={{ color: COLORS.orange }}>*</Text></Text>
            <TextInput
              style={s.modalInput}
              value={childName}
              onChangeText={setChildName}
              placeholder="e.g. Sarah Smith"
              placeholderTextColor="#c5c8cc"
              autoCapitalize="words"
            />

            <Text style={[s.modalLabel, { marginTop: 16 }]}>Grade <Text style={{ color: COLORS.orange }}>*</Text></Text>
            <TouchableOpacity
              style={[s.modalInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
              onPress={() => setGradePickerOpen(!gradePickerOpen)}
            >
              <Text style={{ fontSize: 15, color: childGrade ? COLORS.dark : '#c5c8cc' }}>
                {childGrade || 'Select grade...'}
              </Text>
              <Feather name={gradePickerOpen ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.muted} />
            </TouchableOpacity>

            {gradePickerOpen && (
              <ScrollView style={s.gradeList} nestedScrollEnabled>
                {GRADES.map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[s.gradeItem, childGrade === g && s.gradeItemActive]}
                    onPress={() => { setChildGrade(g); setGradePickerOpen(false); }}
                  >
                    <Text style={[s.gradeItemText, childGrade === g && { color: COLORS.orange, fontWeight: '700' }]}>{g}</Text>
                    {childGrade === g && <Feather name="check" size={16} color={COLORS.orange} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[s.modalBtn, (!childName.trim() || !childGrade || saving) && { opacity: 0.4 }]}
              disabled={!childName.trim() || !childGrade || saving}
              onPress={handleAddChild}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={s.modalBtnText}>Add Child</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: SIZES.padding, paddingTop: 20, paddingBottom: 16, backgroundColor: COLORS.orangeLight },
  greeting: { fontSize: 22, fontWeight: '800', color: COLORS.dark },
  location: { fontSize: 13, color: COLORS.muted, marginTop: 4 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: SIZES.padding, paddingTop: 20, paddingBottom: 10 },
  quickActions: { flexDirection: 'row', gap: 10, paddingHorizontal: SIZES.padding },
  quickCard: { flex: 1, padding: 18, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  quickIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  quickTitle: { fontSize: 13, fontWeight: '700', color: COLORS.dark },
  quickDesc: { fontSize: 11, color: COLORS.muted, marginTop: 2 },
  childCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: SIZES.padding, marginBottom: 10, padding: 16, borderRadius: SIZES.radius, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  childAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  childAvatarText: { fontSize: 18, fontWeight: '800' },
  childName: { fontSize: 15, fontWeight: '700', color: COLORS.dark },
  childGrade: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusActive: { backgroundColor: COLORS.successBg },
  statusNone: { backgroundColor: 'rgba(156,163,175,0.1)' },
  statusText: { fontSize: 11, fontWeight: '700' },
  addChildBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: SIZES.padding, padding: 14, borderRadius: SIZES.radius, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border, backgroundColor: COLORS.white },
  addChildText: { fontSize: 14, fontWeight: '600', color: COLORS.orange },
  emptyCard: { marginHorizontal: SIZES.padding, padding: 28, borderRadius: SIZES.radius, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', marginBottom: 10 },
  emptyText: { fontSize: 14, fontWeight: '700', color: COLORS.muted },
  emptyDesc: { fontSize: 12, color: COLORS.muted, marginTop: 4, textAlign: 'center' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: SIZES.padding, paddingBottom: 40, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  modalLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  modalInput: { padding: 14, borderRadius: 12, borderWidth: 2, borderColor: COLORS.border, fontSize: 15, color: COLORS.dark },
  gradeList: { maxHeight: 200, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, marginTop: 4 },
  gradeItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  gradeItemActive: { backgroundColor: COLORS.orangeLight },
  gradeItemText: { fontSize: 14, color: COLORS.dark },
  modalBtn: { backgroundColor: COLORS.orange, padding: 16, borderRadius: SIZES.radius, alignItems: 'center', marginTop: 20 },
  modalBtnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});
