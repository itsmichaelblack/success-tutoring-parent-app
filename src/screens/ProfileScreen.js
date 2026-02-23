import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useParent } from '../config/ParentContext';
import { COLORS, SIZES } from '../config/theme';

export default function ProfileScreen({ navigation }) {
  const { parentData, setParentData } = useParent();
  const name = parentData?.name || 'User';
  const email = parentData?.email || '';
  const phone = parentData?.phone || '';

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => {
        setParentData(null);
        navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
      }},
    ]);
  };

  const menuItems = [
    { icon: 'user', iconBg: COLORS.orangeLight, iconColor: COLORS.orange, title: 'Edit Profile', desc: 'Name, email, phone number' },
    { icon: 'users', iconBg: COLORS.tealLight, iconColor: COLORS.teal, title: 'Manage Children', desc: 'Add, edit, or remove children' },
    { icon: 'credit-card', iconBg: COLORS.blueBg, iconColor: COLORS.blue, title: 'Billing & Payments', desc: 'Manage payment methods' },
    { icon: 'map-pin', iconBg: COLORS.successBg, iconColor: COLORS.success, title: 'My Centre', desc: parentData?.locationName || 'Your centre' },
    { icon: 'bell', iconBg: 'rgba(156,163,175,0.08)', iconColor: COLORS.muted, title: 'Notifications', desc: 'Booking reminders, updates' },
  ];

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{name[0]}</Text>
          </View>
          <View>
            <Text style={s.name}>{name}</Text>
            <Text style={s.email}>{email}</Text>
            {phone ? <Text style={s.phone}>{phone}</Text> : null}
          </View>
        </View>

        <View style={s.menu}>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={i} style={s.menuItem}>
              <View style={[s.menuIcon, { backgroundColor: item.iconBg }]}>
                <Feather name={item.icon} size={16} color={item.iconColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.menuTitle}>{item.title}</Text>
                <Text style={s.menuDesc}>{item.desc}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={COLORS.muted} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={s.menuItem} onPress={handleSignOut}>
            <View style={[s.menuIcon, { backgroundColor: COLORS.errorBg }]}>
              <Feather name="log-out" size={16} color={COLORS.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.menuTitle, { color: COLORS.error }]}>Sign Out</Text>
              <Text style={s.menuDesc}>Log out of your account</Text>
            </View>
            <Feather name="chevron-right" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        </View>
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: SIZES.padding, paddingVertical: 30, backgroundColor: COLORS.orangeLight },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 24, fontWeight: '900', color: COLORS.white },
  name: { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  email: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  phone: { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  menu: { paddingHorizontal: SIZES.padding, paddingTop: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuTitle: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  menuDesc: { fontSize: 12, color: COLORS.muted, marginTop: 1 },
});
