// src/screens/admin/DashboardScreen.js

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '../../components/AppHeader';
import { api } from '../../api/http';
import { useAuthStore } from '../../store/authStore';
import {
  buildRoleCounts,
  buildStatusCounts,
  extractItems,
  formatDate,
  formatLabel,
  getInitials,
  getRoleColor,
  getStatusColor,
  getStatusLabel,
  normalizeSubmission,
  normalizeUser,
  ROLE_CODES,
} from './adminHelpers';

async function loadAllUsers() {
  try {
    const response = await api.get('/users');
    const users = extractItems(response).map(normalizeUser);

    if (users.length > 0) return users;
  } catch {
    // Fallback below for APIs that require role-specific queries.
  }

  const responses = await Promise.allSettled(
    ROLE_CODES.map((role) => api.get('/users', { params: { role } }))
  );

  const unique = new Map();

  responses.forEach((result) => {
    if (result.status !== 'fulfilled') return;

    extractItems(result.value).forEach((item) => {
      const user = normalizeUser(item);
      if (user.id) unique.set(user.id, user);
    });
  });

  return Array.from(unique.values());
}

async function loadDashboardData() {
  const [usersResult, submissionsResult, notificationsResult] = await Promise.allSettled([
    loadAllUsers(),
    api.get('/submissions'),
    api.get('/notifications'),
  ]);

  const users =
    usersResult.status === 'fulfilled'
      ? usersResult.value.map(normalizeUser)
      : [];

  const submissions =
    submissionsResult.status === 'fulfilled'
      ? extractItems(submissionsResult.value).map(normalizeSubmission)
      : [];

  const notifications =
    notificationsResult.status === 'fulfilled'
      ? extractItems(notificationsResult.value)
      : [];

  return { users, submissions, notifications };
}

export default function AdminDashboardScreen({ navigation }) {
  const authUser = useAuthStore((state) => state.user);

  const [users, setUsers] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await loadDashboardData();
      setUsers(data.users);
      setSubmissions(data.submissions);
      setNotifications(data.notifications);
    } catch (error) {
      Alert.alert(
        'Could not load dashboard',
        error?.message || 'Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = () => {
    setRefreshing(true);
    load();
  };

  const roleCounts = useMemo(() => buildRoleCounts(users), [users]);
  const statusCounts = useMemo(() => buildStatusCounts(submissions), [submissions]);

  const unreadCount = notifications.filter((item) => !item.read_at).length;
  const pendingCount =
    (statusCounts.SUBMITTED || 0) +
    (statusCounts.APPROVED_BY_SUPERVISOR || 0) +
    (statusCounts.UNDER_INTERNAL_EVAL || 0) +
    (statusCounts.FORWARDED_TO_FPGCR || 0) +
    (statusCounts.FORWARDED_TO_FPGC || 0) +
    (statusCounts.EXTERNAL_EVAL_ASSIGNED || 0);

  const stats = [
    {
      label: 'Users',
      value: users.length,
      icon: 'people-outline',
      color: '#1E56A0',
      route: 'Users',
    },
    {
      label: 'Students',
      value: roleCounts.STUDENT || 0,
      icon: 'school-outline',
      color: '#1E56A0',
      route: 'Users',
      params: { role: 'STUDENT' },
    },
    {
      label: 'Supervisors',
      value: roleCounts.SUPERVISOR || 0,
      icon: 'person-outline',
      color: '#7C3AED',
      route: 'Users',
      params: { role: 'SUPERVISOR' },
    },
    {
      label: 'Submissions',
      value: submissions.length,
      icon: 'documents-outline',
      color: '#F59E0B',
      route: 'Submissions',
    },
    {
      label: 'Pending',
      value: pendingCount,
      icon: 'time-outline',
      color: '#F97316',
      route: 'Submissions',
      params: { status: 'PENDING' },
    },
    {
      label: 'Approved',
      value: statusCounts.APPROVED || 0,
      icon: 'checkmark-circle-outline',
      color: '#22C55E',
      route: 'Submissions',
      params: { status: 'APPROVED' },
    },
  ];

  const recentSubmissions = submissions.slice(0, 4);
  const recentUsers = users.slice(0, 4);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E56A0" />
        <Text style={styles.loadingText}>Loading admin dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Admin Dashboard"
        navigation={navigation}
        rightAction={
          <TouchableOpacity
            style={styles.headerNotifBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={22} color="#FFFFFF" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <View style={styles.welcomeCard}>
          <View style={styles.adminAvatar}>
            <Text style={styles.adminAvatarText}>
              {getInitials(authUser?.name || 'System Admin')}
            </Text>
          </View>

          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeText}>Welcome back</Text>
            <Text style={styles.welcomeName}>{authUser?.name || 'System Admin'}</Text>
            <Text style={styles.welcomeRole}>{authUser?.email || 'admin@nust.na'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>System Overview</Text>

        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <TouchableOpacity
              key={stat.label}
              style={styles.statCard}
              onPress={() => navigation.navigate(stat.route, stat.params)}
            >
              <View style={[styles.statIcon, { backgroundColor: `${stat.color}18` }]}>
                <Ionicons name={stat.icon} size={23} color={stat.color} />
              </View>
              <Text style={styles.statNumber}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Users')}
          >
            <Ionicons name="people-outline" size={26} color="#FFFFFF" />
            <Text style={styles.actionText}>Manage Users</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Submissions')}
          >
            <Ionicons name="documents-outline" size={26} color="#FFFFFF" />
            <Text style={styles.actionText}>All Submissions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={26} color="#FFFFFF" />
            <Text style={styles.actionText}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={26} color="#FFFFFF" />
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Submissions</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Submissions')}>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        {recentSubmissions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="folder-open-outline" size={36} color="#9BA4B5" />
            <Text style={styles.emptyText}>No submissions found.</Text>
          </View>
        ) : (
          recentSubmissions.map((item) => (
            <View key={item.id} style={styles.recentCard}>
              <View style={styles.recentTopRow}>
                <View style={styles.fileIcon}>
                  <Ionicons name="document-text-outline" size={20} color="#1E56A0" />
                </View>

                <View style={styles.recentInfo}>
                  <Text style={styles.recentTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.recentMeta} numberOfLines={1}>
                    {item.student.name} · {formatDate(item.updatedAt || item.createdAt)}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: getStatusColor(item.status) },
                  ]}
                >
                  <Text style={styles.statusText}>{getStatusLabel(item.status)}</Text>
                </View>
              </View>
            </View>
          ))
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Users</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Users')}>
            <Text style={styles.viewAllText}>View all</Text>
          </TouchableOpacity>
        </View>

        {recentUsers.map((user) => (
          <View key={user.id} style={styles.userMiniCard}>
            <View style={[styles.userMiniAvatar, { backgroundColor: getRoleColor(user.role) }]}>
              <Text style={styles.userMiniAvatarText}>{getInitials(user.name)}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.userMiniName}>{user.name}</Text>
              <Text style={styles.userMiniMeta}>{user.email}</Text>
            </View>

            <View style={[styles.rolePill, { backgroundColor: getRoleColor(user.role) }]}>
              <Text style={styles.rolePillText}>{formatLabel(user.role)}</Text>
            </View>
          </View>
        ))}
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
    gap: 10,
  },
  loadingText: { color: '#6B7280', fontSize: 14 },
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  body: { flex: 1, padding: 16 },
  headerNotifBtn: { position: 'relative', padding: 8 },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 17,
    height: 17,
    borderRadius: 8.5,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  welcomeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  adminAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#0D1B2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminAvatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 18 },
  welcomeContent: { flex: 1 },
  welcomeText: { color: '#6B7280', fontSize: 13 },
  welcomeName: { color: '#0D1B2A', fontSize: 20, fontWeight: '800', marginTop: 2 },
  welcomeRole: { color: '#1E56A0', fontSize: 13, marginTop: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0D1B2A', marginBottom: 10 },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  viewAllText: { color: '#1E56A0', fontWeight: '700', fontSize: 13, marginBottom: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  statCard: {
    width: '31%',
    minHeight: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flexGrow: 1,
  },
  statIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statNumber: { fontSize: 24, fontWeight: '900', color: '#0D1B2A' },
  statLabel: { fontSize: 12, color: '#6B7280', textAlign: 'center', fontWeight: '600' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 18 },
  actionBtn: {
    width: '47%',
    backgroundColor: '#1E56A0',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    gap: 8,
    flexGrow: 1,
  },
  actionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 22, alignItems: 'center', gap: 8, marginBottom: 14 },
  emptyText: { color: '#6B7280', fontSize: 14, textAlign: 'center' },
  recentCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10 },
  recentTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fileIcon: { width: 42, height: 42, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  recentInfo: { flex: 1 },
  recentTitle: { color: '#0D1B2A', fontWeight: '800', fontSize: 14 },
  recentMeta: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  statusPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, maxWidth: 118 },
  statusText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  userMiniCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  userMiniAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  userMiniAvatarText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },
  userMiniName: { color: '#0D1B2A', fontWeight: '800', fontSize: 14 },
  userMiniMeta: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  rolePill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  rolePillText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
});
