import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useParent } from '../config/ParentContext';
import { COLORS, SIZES } from '../config/theme';

const AU_GRADES = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
const NZ_GRADES = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Grade 13'];

export default function ManageChildrenScreen({ navigation }) {
  const { parentData, addChild, setParentData } = useParent();
  const children = parentData?.children || [];

  const isNZ = ['new lynn', 'mt roskill', 'northwest', 'palmerston north', 'lower hutt', 'papanui'].some(
    nz => (parentData?.locationName || '').toLowerCase().includes(nz)
  );
  const GRADES = isNZ ? NZ_GRADES : AU_GRADES;

  // Add modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [childName, setChildName] = useState('');
  const [childGrade, setChildGrade] = useState('');
  const [gradePickerOpen, setGradePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editChild, setEditChild] = useState(null);
  const [editName, setEditName] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editGradePickerOpen, setEditGradePickerOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const resetAddModal = () => { setChildName(''); setChildGrade(''); setGradePickerOpen(false); setSaving(false); };

  const handleAddChild = async () => {
    if (!childName.trim()) { Alert.alert('Missing Info', 'Please enter your child\'s name.'); return; }
    if (!childGrade) { Alert.alert('Missing Info', 'Please select a grade.'); return; }
    setSaving(true);
    try {
      await addChild({ name: childName.trim(), grade: childGrade });
      resetAddModal();
      setAddModalVisible(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to add child. Please try again.');
    }
    setSaving(false);
  };

  const openEditModal = (child) => {
    setEditChild(child);
    setEditName(child.name || '');
    setEditGrade(child.grade || '');
    setEditGradePickerOpen(false);
    setEditModalVisible(true);
  };

  const handleEditChild = async () => {
    if (!editName.trim() || !editGrade) { Alert.alert('Missing Info', 'All fields are required.'); return; }
    setEditSaving(true);
    try {
      await updateDoc(doc(db, 'parents', parentData.id, 'children', editChild.id), {
        name: editName.trim(),
        grade: editGrade,
        updatedAt: serverTimestamp(),
      });
      // Update local context
      const updatedChildren = children.map(c =>
        c.id === editChild.id ? { ...c, name: editName.trim(), grade: editGrade } : c
      );
      setParentData(prev => ({ ...prev, children: updatedChildren }));
      setEditModalVisible(false);
      Alert.alert('Saved', 'Child details updated.');
    } catch (e) {
      console.error('Failed to update child:', e);
      Alert.alert('Error', 'Failed to save. Please try again.');
    }
    setEditSaving(false);
  };

  const renderGradePicker = (grades, selected, onSelect, open, setOpen) => (
    <>
      <TouchableOpacity
        style={[s.modalInput, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
        onPress={() => setOpen(!open)}
      >
        <Text style={{ fontSize: 15, color: selected ? COLORS.dark : '#c5c8cc' }}>{selected || 'Select grade...'}</Text>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.muted} />
      </TouchableOpacity>
      {open && (
        <ScrollView style={s.gradeList} nestedScrollEnabled>
          {grades.map(g => (
            <TouchableOpacity key={g} style={[s.gradeItem, selected === g && s.gradeItemActive]} onPress={() => { onSelect(g); setOpen(false); }}>
              <Text style={[s.gradeItemText, selected === g && { color: COLORS.orange, fontWeight: '700' }]}>{g}</Text>
              {selected === g && <Feather name="check" size={16} color={COLORS.orange} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </>
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color={COLORS.muted} />
        </TouchableOpacity>
        <Text style={s.title}>Manage Children</Text>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: SIZES.padding }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 16 }} />

        {children.length === 0 ? (
          <View style={s.emptyCard}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>👧</Text>
            <Text style={s.emptyText}>No children added yet</Text>
          </View>
        ) : (
          children.map((child, i) => (
            <TouchableOpacity key={child.id || i} style={s.childCard} onPress={() => openEditModal(child)}>
              <View style={[s.childAvatar, { backgroundColor: i % 2 === 0 ? 'rgba(109,203,202,0.15)' : COLORS.orangeLight }]}>
                <Text style={[s.childAvatarText, { color: i % 2 === 0 ? COLORS.teal : COLORS.orange }]}>{child.name?.[0] || '?'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.childName}>{child.name}</Text>
                <Text style={s.childGradeText}>{child.grade || 'No grade set'}</Text>
              </View>
              <Feather name="edit-2" size={16} color={COLORS.muted} />
            </TouchableOpacity>
          ))
        )}

        <TouchableOpacity style={s.addBtn} onPress={() => setAddModalVisible(true)}>
          <Feather name="plus" size={16} color={COLORS.orange} />
          <Text style={s.addBtnText}>Add a Child</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Add Child Modal */}
      <Modal visible={addModalVisible} transparent animationType="slide" onRequestClose={() => { resetAddModal(); setAddModalVisible(false); }}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add a Child</Text>
              <TouchableOpacity onPress={() => { resetAddModal(); setAddModalVisible(false); }}><Feather name="x" size={22} color={COLORS.muted} /></TouchableOpacity>
            </View>
            <Text style={s.modalLabel}>Child's Full Name <Text style={{ color: COLORS.orange }}>*</Text></Text>
            <TextInput style={s.modalInput} value={childName} onChangeText={setChildName} placeholder="e.g. Sarah Smith" placeholderTextColor="#c5c8cc" autoCapitalize="words" />
            <Text style={[s.modalLabel, { marginTop: 16 }]}>Grade <Text style={{ color: COLORS.orange }}>*</Text></Text>
            {renderGradePicker(GRADES, childGrade, setChildGrade, gradePickerOpen, setGradePickerOpen)}
            <TouchableOpacity style={[s.modalBtn, (!childName.trim() || !childGrade || saving) && { opacity: 0.4 }]} disabled={!childName.trim() || !childGrade || saving} onPress={handleAddChild}>
              {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={s.modalBtnText}>Add Child</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Child Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide" onRequestClose={() => setEditModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit Child</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}><Feather name="x" size={22} color={COLORS.muted} /></TouchableOpacity>
            </View>
            <Text style={s.modalLabel}>Child's Full Name <Text style={{ color: COLORS.orange }}>*</Text></Text>
            <TextInput style={s.modalInput} value={editName} onChangeText={setEditName} placeholder="Full name" placeholderTextColor="#c5c8cc" autoCapitalize="words" />
            <Text style={[s.modalLabel, { marginTop: 16 }]}>Grade <Text style={{ color: COLORS.orange }}>*</Text></Text>
            {renderGradePicker(GRADES, editGrade, setEditGrade, editGradePickerOpen, setEditGradePickerOpen)}
            <TouchableOpacity style={[s.modalBtn, (!editName.trim() || !editGrade || editSaving) && { opacity: 0.4 }]} disabled={!editName.trim() || !editGrade || editSaving} onPress={handleEditChild}>
              {editSaving ? <ActivityIndicator color={COLORS.white} /> : <Text style={s.modalBtnText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SIZES.padding, paddingTop: 12, paddingBottom: 4, backgroundColor: COLORS.white },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  childCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: SIZES.radius, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, marginBottom: 10 },
  childAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  childAvatarText: { fontSize: 18, fontWeight: '800' },
  childName: { fontSize: 15, fontWeight: '700', color: COLORS.dark },
  childGradeText: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  emptyCard: { padding: 28, borderRadius: SIZES.radius, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', marginBottom: 10 },
  emptyText: { fontSize: 14, fontWeight: '700', color: COLORS.muted },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14, borderRadius: SIZES.radius, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border, backgroundColor: COLORS.white },
  addBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.orange },
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
