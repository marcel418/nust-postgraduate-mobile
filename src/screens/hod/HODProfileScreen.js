// src/screens/hod/HODProfileScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { hodService } from '../../services/api/hodService';

export default function HODProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    hodService.getProfile()
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => navigation.replace('Login') },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0D1B3E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.name?.split(' ').map(w => w[0]).slice(0, 2).join('')}
          </Text>
        </View>
        <Text style={styles.profileName}>{profile?.name}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>Head of Department</Text>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.card}>
        <InfoRow icon="📧" label="Email" value={profile?.email} />
        <InfoRow icon="🏛️" label="Department" value={profile?.department} />
        <InfoRow icon="📞" label="Phone" value={profile?.phone} />
        <InfoRow icon="🔑" label="Role" value={profile?.role} last />
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      {/* Bottom Nav */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('HODDashboard')}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('HODSubmissions')}>
          <Text style={styles.navIcon}>📋</Text>
          <Text style={styles.navLabel}>Submissions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('HODAssignments')}>
          <Text style={styles.navIcon}>👥</Text>
          <Text style={styles.navLabel}>Assignments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={[styles.navLabel, styles.navActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function InfoRow({ icon, label, value, last }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#0D1B3E',
    paddingTop: 52,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backArrow: { color: '#fff', fontSize: 22, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },

  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#0D1B3E',
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  profileName: { fontSize: 20, fontWeight: '700', color: '#0D1B3E', marginBottom: 8 },
  roleBadge: {
    backgroundColor: '#E8EDF5', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 4,
  },
  roleText: { fontSize: 13, color: '#0D1B3E', fontWeight: '600' },

  card: {
    backgroundColor: '#fff', borderRadius: 14, marginHorizontal: 16,
    paddingHorizontal: 16, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowIcon: { fontSize: 18, marginRight: 14, width: 24, textAlign: 'center' },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 12, color: '#888', marginBottom: 2 },
  rowValue: { fontSize: 14, color: '#1A1A2E', fontWeight: '500' },

  logoutBtn: {
    marginHorizontal: 16, marginTop: 24,
    borderWidth: 1.5, borderColor: '#E53935',
    borderRadius: 12, padding: 14, alignItems: 'center',
  },
  logoutText: { color: '#E53935', fontSize: 15, fontWeight: '700' },

  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: '#E8E8E8',
    paddingBottom: 24, paddingTop: 10, elevation: 10,
  },
  navItem: { flex: 1, alignItems: 'center' },
  navIcon: { fontSize: 22 },
  navLabel: { fontSize: 11, color: '#888', marginTop: 3 },
  navActive: { color: '#0D1B3E', fontWeight: '600' },
});