// src/screens/hod/HODDashboardScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import { hodService } from '../../services/api/hodService';

export default function HODDashboardScreen({ navigation }) {
  const [submissions, setSubmissions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [subs, notifs] = await Promise.all([
        hodService.getSubmissions(),
        hodService.getNotifications(),
      ]);
      setSubmissions(subs);
      setNotifications(notifs);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const newSubmissions = submissions.filter((s) => s.status === 'WITH_HOD').length;
  const needsEvaluator = submissions.filter((s) => s.status === 'WITH_HOD').length;
  const pendingApprovals = submissions.filter((s) => s.status === 'UNDER_INTERNAL_EVAL').length;
  const unreadNotifs = notifications.filter((n) => !n.read).length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#003366" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1B3E" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('HODNotifications')}
          >
            <Text style={styles.iconText}>🔔</Text>
            {unreadNotifs > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadNotifs}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => navigation.navigate('HODProfile')}
          >
            <Text style={styles.iconText}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.statCard}>
          <View style={styles.statLeft}>
            <Text style={styles.statIcon}>📝</Text>
          </View>
          <View style={styles.statMiddle}>
            <Text style={styles.statNumber}>{newSubmissions}</Text>
            <Text style={styles.statLabel}>New submissions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('HODSubmissions')}>
              <Text style={styles.viewMore}>View More Info</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statLeft}>
            <Text style={styles.statIcon}>👥</Text>
          </View>
          <View style={styles.statMiddle}>
            <Text style={styles.statNumber}>{needsEvaluator}</Text>
            <Text style={styles.statLabel}>Assign evaluators</Text>
            <TouchableOpacity onPress={() => navigation.navigate('HODAssignments')}>
              <Text style={styles.viewMore}>View More Info</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statLeft}>
            <Text style={styles.statIcon}>⏳</Text>
          </View>
          <View style={styles.statMiddle}>
            <Text style={styles.statNumber}>{pendingApprovals}</Text>
            <Text style={styles.statLabel}>Pending approvals</Text>
            <TouchableOpacity onPress={() => navigation.navigate('HODSubmissions')}>
              <Text style={styles.viewMore}>View More Info</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('HODDashboard')}>
          <Text style={styles.navIcon}>🏠</Text>
          <Text style={[styles.navLabel, styles.navActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('HODSubmissions')}>
          <Text style={styles.navIcon}>📋</Text>
          <Text style={styles.navLabel}>Submissions</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('HODAssignments')}>
          <Text style={styles.navIcon}>👥</Text>
          <Text style={styles.navLabel}>Assignments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('HODProfile')}>
          <Text style={styles.navIcon}>👤</Text>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '700' },
  headerIcons: { flexDirection: 'row', gap: 12 },
  iconBtn: { position: 'relative', padding: 4 },
  iconText: { fontSize: 22 },
  badge: {
    position: 'absolute', top: 0, right: 0,
    backgroundColor: '#E53935', borderRadius: 8,
    width: 16, height: 16, justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 100 },
  statCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 20,
    flexDirection: 'row', alignItems: 'center', elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  statLeft: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: '#F0F2F5',
    justifyContent: 'center', alignItems: 'center', marginRight: 16,
  },
  statIcon: { fontSize: 22 },
  statMiddle: { flex: 1 },
  statNumber: { fontSize: 28, fontWeight: '800', color: '#0D1B3E', lineHeight: 32 },
  statLabel: { fontSize: 14, color: '#555', marginTop: 2, marginBottom: 6 },
  viewMore: { fontSize: 13, color: '#1A73E8', fontWeight: '500' },
  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#FFFFFF', flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: '#E8E8E8',
    paddingBottom: 24, paddingTop: 10, elevation: 10,
  },
  navItem: { flex: 1, alignItems: 'center' },
  navIcon: { fontSize: 22 },
  navLabel: { fontSize: 11, color: '#888', marginTop: 3 },
  navActive: { color: '#0D1B3E', fontWeight: '600' },
});