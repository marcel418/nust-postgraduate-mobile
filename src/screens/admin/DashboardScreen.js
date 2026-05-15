import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import { CURRENT_ADMIN } from '../../data/mockData';
import { getSystemStats, getAllUsers, getAllSubmissions } from '../../services/api';

export default function AdminDashboardScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const statsData = await getSystemStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load admin dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E56A0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title="Admin Dashboard" navigation={navigation} />

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

        {/* ── WELCOME ── */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeLeft}>
            <Text style={styles.welcomeText}>
              Welcome back 👋
            </Text>
            <Text style={styles.welcomeName}>{CURRENT_ADMIN.name}</Text>
            <Text style={styles.welcomeRole}>{CURRENT_ADMIN.role}</Text>
          </View>
          <View style={styles.welcomeIcon}>
            <Ionicons name="shield-checkmark" size={40} color="#1E56A0" />
          </View>
        </View>

        {/* ── STATS GRID ── */}
        <Text style={styles.sectionTitle}>System Overview</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="school-outline" size={24} color="#1E56A0" />
            <Text style={styles.statNumber}>{stats?.totalStudents}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="person-outline" size={24} color="#22C55E" />
            <Text style={styles.statNumber}>{stats?.totalSupervisors}</Text>
            <Text style={styles.statLabel}>Supervisors</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="document-text-outline" size={24} color="#F59E0B" />
            <Text style={styles.statNumber}>{stats?.totalSubmissions}</Text>
            <Text style={styles.statLabel}>Submissions</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="time-outline" size={24} color="#EF4444" />
            <Text style={styles.statNumber}>{stats?.pendingReviews}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F0FDF4' }]}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#22C55E" />
            <Text style={styles.statNumber}>{stats?.approved}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="arrow-undo-outline" size={24} color="#EF4444" />
            <Text style={styles.statNumber}>{stats?.returned}</Text>
            <Text style={styles.statLabel}>Returned</Text>
          </View>
        </View>

        {/* ── QUICK ACTIONS ── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Users')}
          >
            <Ionicons name="people-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>Manage Users</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Submissions')}
          >
            <Ionicons name="documents-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>All Submissions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="bar-chart-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>Reports</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F2F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  body: {
    padding: 16,
  },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  welcomeLeft: {
    flex: 1,
    gap: 4,
  },
  welcomeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  welcomeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D1B2A',
  },
  welcomeRole: {
    fontSize: 13,
    color: '#1E56A0',
    fontWeight: '500',
  },
  welcomeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0D1B2A',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: '30%',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    flexGrow: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0D1B2A',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  actionBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '47%',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});