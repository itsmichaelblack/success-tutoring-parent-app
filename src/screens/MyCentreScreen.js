import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useParent } from '../config/ParentContext';
import { COLORS, SIZES } from '../config/theme';

export default function MyCentreScreen({ navigation }) {
  const { parentData } = useParent();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!parentData?.locationId) { setLoading(false); return; }
      try {
        const snap = await getDoc(doc(db, 'locations', parentData.locationId));
        if (snap.exists()) setLocation({ id: snap.id, ...snap.data() });
      } catch (e) {
        console.error('Failed to load centre:', e);
      }
      setLoading(false);
    };
    load();
  }, [parentData?.locationId]);

  const openLink = (url) => {
    if (!url) return;
    const full = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(full).catch(() => {});
  };

  const openPhone = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\s/g, '')}`).catch(() => {});
  };

  const openMaps = (address) => {
    if (!address) return;
    const encoded = encodeURIComponent(address);
    Linking.openURL(`https://maps.google.com/?q=${encoded}`).catch(() => {});
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.orange} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color={COLORS.muted} />
        </TouchableOpacity>
        <Text style={s.title}>My Centre</Text>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Centre Name */}
        <View style={s.centreHeader}>
          <View style={s.centreIcon}>
            <Text style={s.centreIconText}>ST</Text>
          </View>
          <Text style={s.centreName}>{location?.name || parentData?.locationName || 'Your Centre'}</Text>
          {location?.status === 'open' && (
            <View style={s.statusBadge}><Text style={s.statusText}>Open</Text></View>
          )}
        </View>

        <View style={{ paddingHorizontal: SIZES.padding }}>
          {/* Address */}
          {location?.address && (
            <TouchableOpacity style={s.infoRow} onPress={() => openMaps(location.address)}>
              <View style={[s.infoIcon, { backgroundColor: COLORS.orangeLight }]}>
                <Feather name="map-pin" size={16} color={COLORS.orange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>Address</Text>
                <Text style={s.infoValue}>{location.address}</Text>
              </View>
              <Feather name="external-link" size={14} color={COLORS.muted} />
            </TouchableOpacity>
          )}

          {/* Phone */}
          {location?.phone && (
            <TouchableOpacity style={s.infoRow} onPress={() => openPhone(location.phone)}>
              <View style={[s.infoIcon, { backgroundColor: COLORS.tealLight }]}>
                <Feather name="phone" size={16} color={COLORS.teal} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>Phone</Text>
                <Text style={s.infoValue}>{location.phone}</Text>
              </View>
              <Feather name="phone-call" size={14} color={COLORS.muted} />
            </TouchableOpacity>
          )}

          {/* Email */}
          {location?.email && (
            <TouchableOpacity style={s.infoRow} onPress={() => Linking.openURL(`mailto:${location.email}`).catch(() => {})}>
              <View style={[s.infoIcon, { backgroundColor: COLORS.blueBg }]}>
                <Feather name="mail" size={16} color={COLORS.blue} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>Email</Text>
                <Text style={s.infoValue}>{location.email}</Text>
              </View>
              <Feather name="external-link" size={14} color={COLORS.muted} />
            </TouchableOpacity>
          )}

          {/* Social Media */}
          {(location?.instagramUrl || location?.facebookUrl) && (
            <>
              <Text style={s.sectionTitle}>Social Media</Text>
              {location?.instagramUrl && (
                <TouchableOpacity style={s.infoRow} onPress={() => openLink(location.instagramUrl)}>
                  <View style={[s.infoIcon, { backgroundColor: '#fce4ec' }]}>
                    <Feather name="instagram" size={16} color="#e91e63" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.infoLabel}>Instagram</Text>
                    <Text style={s.infoValue} numberOfLines={1}>{location.instagramUrl}</Text>
                  </View>
                  <Feather name="external-link" size={14} color={COLORS.muted} />
                </TouchableOpacity>
              )}
              {location?.facebookUrl && (
                <TouchableOpacity style={s.infoRow} onPress={() => openLink(location.facebookUrl)}>
                  <View style={[s.infoIcon, { backgroundColor: '#e3f2fd' }]}>
                    <Feather name="facebook" size={16} color="#1877f2" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.infoLabel}>Facebook</Text>
                    <Text style={s.infoValue} numberOfLines={1}>{location.facebookUrl}</Text>
                  </View>
                  <Feather name="external-link" size={14} color={COLORS.muted} />
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Change Centre Note */}
          <View style={s.noteCard}>
            <Feather name="info" size={16} color={COLORS.muted} />
            <Text style={s.noteText}>To change your home centre, please contact your current centre or email support@successtutoring.com.au</Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SIZES.padding, paddingTop: 12, paddingBottom: 4, backgroundColor: COLORS.white },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  centreHeader: { alignItems: 'center', paddingVertical: 28, backgroundColor: COLORS.orangeLight },
  centreIcon: { width: 64, height: 64, borderRadius: 16, backgroundColor: COLORS.orange, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  centreIconText: { fontSize: 24, fontWeight: '900', color: COLORS.white },
  centreName: { fontSize: 18, fontWeight: '800', color: COLORS.dark, textAlign: 'center', paddingHorizontal: 20 },
  statusBadge: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: COLORS.successBg },
  statusText: { fontSize: 12, fontWeight: '700', color: COLORS.success },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 24, marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  infoValue: { fontSize: 14, color: COLORS.dark, marginTop: 2 },
  noteCard: { flexDirection: 'row', gap: 10, marginTop: 24, padding: 16, borderRadius: SIZES.radius, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  noteText: { flex: 1, fontSize: 12, color: COLORS.muted, lineHeight: 18 },
});
