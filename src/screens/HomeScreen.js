import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useParent } from '../config/ParentContext';
import { COLORS, SIZES } from '../config/theme';

export default function HomeScreen({ navigation }) {
  const { parentData } = useParent();
  const firstName = parentData?.firstName || 'there';
  const locationName = parentData?.locationName || 'Your Centre';
  const children = parentData?.children || [];

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
            <Text style={s.emptyDesc}>Add your child from the Profile tab to start booking</Text>
          </View>
        ) : (
          children.map((child, i) => (
            <View key={i} style={s.childCard}>
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

        <TouchableOpacity style={s.addChildBtn} onPress={() => navigation.navigate('Profile')}>
          <Feather name="plus" size={16} color={COLORS.orange} />
          <Text style={s.addChildText}>Add a Child</Text>
        </TouchableOpacity>
        <View style={{ height: 20 }} />
      </ScrollView>
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
});
