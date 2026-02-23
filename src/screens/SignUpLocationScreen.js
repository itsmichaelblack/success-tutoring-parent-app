import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { COLORS, SIZES } from '../config/theme';

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function SignUpLocationScreen({ navigation }) {
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [userLoc, setUserLoc] = useState(null);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => { loadLocations(); }, []);

  const loadLocations = async () => {
    try {
      const snap = await getDocs(collection(db, 'locations'));
      const locs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLocations(locs);
    } catch (e) {
      console.error('Failed to load locations:', e);
    }
  };

  const detectLocation = async () => {
    setDetecting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Enable location access to auto-detect your nearest centre.');
        setDetecting(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      const sorted = locations
        .filter(l => l.lat && l.lng)
        .map(l => ({ ...l, distance: getDistance(loc.coords.latitude, loc.coords.longitude, l.lat, l.lng) }))
        .sort((a, b) => a.distance - b.distance);
      if (sorted.length > 0) {
        setLocations(sorted);
        setSelected(sorted[0].id);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not detect location. Please select manually.');
    }
    setDetecting(false);
  };

  const locsWithDist = userLoc
    ? locations.map(l => ({ ...l, distance: l.lat && l.lng ? getDistance(userLoc.lat, userLoc.lng, l.lat, l.lng) : null })).sort((a, b) => (a.distance || 999) - (b.distance || 999))
    : locations;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="chevron-left" size={20} color={COLORS.muted} />
        </TouchableOpacity>
        <Text style={s.title}>Choose your centre</Text>
      </View>
      <Text style={s.desc}>Select the Success Tutoring centre nearest to you.</Text>

      <ScrollView style={{ flex: 1, paddingHorizontal: SIZES.padding }} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={s.detectBtn} onPress={detectLocation} disabled={detecting}>
          <Feather name="crosshair" size={16} color={COLORS.teal} />
          <Text style={s.detectText}>{detecting ? 'Detecting...' : userLoc ? '✓ Location detected' : 'Use my location'}</Text>
        </TouchableOpacity>

        {locsWithDist.map(loc => (
          <TouchableOpacity key={loc.id} style={[s.locCard, selected === loc.id && s.locCardActive]} onPress={() => setSelected(loc.id)}>
            <View style={[s.locIcon, selected === loc.id && s.locIconActive]}>
              <Text style={[s.locIconText, selected === loc.id && { color: COLORS.white }]}>ST</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.locName}>{loc.name}</Text>
              <Text style={s.locAddr}>{loc.address}</Text>
            </View>
            {loc.distance != null && <Text style={s.locDist}>{loc.distance.toFixed(1)} km</Text>}
          </TouchableOpacity>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={s.footer}>
        <TouchableOpacity
          style={[s.btnPrimary, !selected && { opacity: 0.4 }]}
          disabled={!selected}
          onPress={() => navigation.navigate('SignUpDetails', { locationId: selected, locationName: locsWithDist.find(l => l.id === selected)?.name || '' })}
        >
          <Text style={s.btnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SIZES.padding, paddingTop: 12, paddingBottom: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.dark },
  desc: { fontSize: 13, color: COLORS.muted, paddingHorizontal: SIZES.padding, marginBottom: 16, lineHeight: 20 },
  detectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border, marginBottom: 16 },
  detectText: { fontSize: 13, fontWeight: '600', color: COLORS.teal },
  locCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: SIZES.radius, borderWidth: 2, borderColor: COLORS.border, marginBottom: 10 },
  locCardActive: { borderColor: COLORS.orange, backgroundColor: COLORS.orangeLight },
  locIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: COLORS.orangeLight, alignItems: 'center', justifyContent: 'center' },
  locIconActive: { backgroundColor: COLORS.orange },
  locIconText: { fontSize: 14, fontWeight: '800', color: COLORS.orange },
  locName: { fontSize: 14, fontWeight: '700', color: COLORS.dark },
  locAddr: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  locDist: { fontSize: 12, fontWeight: '700', color: COLORS.orange },
  footer: { paddingHorizontal: SIZES.padding, paddingBottom: 20, paddingTop: 12 },
  btnPrimary: { backgroundColor: COLORS.orange, padding: 16, borderRadius: SIZES.radius, alignItems: 'center' },
  btnText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
});
