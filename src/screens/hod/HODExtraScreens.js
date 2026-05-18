// src/screens/hod/HODExtraScreens.js

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import HODHeader from '../../components/HODHeader';
import { submissionsApi } from '../../api/submissionsApi';
import { api } from '../../api/http';
import { useAuthStore } from '../../store/authStore';

const HOD_VISIBLE_STATES = [
  'APPROVED_BY_SUPERVISOR',
  'UNDER_INTERNAL_EVAL',
  'INTERNAL_EVAL_COMPLETED',
  'FORWARDED_TO_FPGCR',
  'REVISIONS_REQUIRED',
  'APPROVED',
  'REJECTED',
];

const FILTER_MAP = {
  WITH_HOD: 'APPROVED_BY_SUPERVISOR',
  UNDER_INTERNAL_EVAL: 'UNDER_INTERNAL_EVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

const getStatusColor = (status) =>
  ({
    APPROVED_BY_SUPERVISOR: '#F59E0B',
    WITH_HOD: '#F59E0B',
    UNDER_INTERNAL_EVAL: '#7C3AED',
    INTERNAL_EVAL_COMPLETED: '#22C55E',
    FORWARDED_TO_FPGCR: '#1E56A0',
    REVISIONS_REQUIRED: '#F97316',
    APPROVED: '#22C55E',
    REJECTED: '#EF4444',
  }[status] || '#6B7280');

const getStatusLabel = (status) =>
  ({
    APPROVED_BY_SUPERVISOR: 'Awaiting HOD Action',
    WITH_HOD: 'Awaiting Action',
    UNDER_INTERNAL_EVAL: 'Under Internal Evaluation',
    INTERNAL_EVAL_COMPLETED: 'Internal Evaluation Complete',
    FORWARDED_TO_FPGCR: 'Forwarded to FPGC-R',
    REVISIONS_REQUIRED: 'Revisions Required',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
  }[status] || formatLabel(status));

function formatLabel(value) {
  if (!value) return 'N/A';

  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return 'N/A';

  try {
    return new Date(value).toLocaleDateString('en-NA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

function parseDescription(description) {
  if (!description) {
    return {
      comments: '',
      reportingPeriod: 'N/A',
      fileName: '',
      fileSize: '',
    };
  }

  try {
    const parsed = JSON.parse(description);

    return {
      comments: parsed.comments || '',
      reportingPeriod: parsed.reportingPeriod || 'N/A',
      fileName: parsed.fileName || '',
      fileSize: parsed.fileSize || '',
    };
  } catch {
    return {
      comments: description,
      reportingPeriod: 'N/A',
      fileName: '',
      fileSize: '',
    };
  }
}

function normalizeSubmission(item) {
  const details = parseDescription(item.description);
  const state = item.current_state || item.workflow_state || 'UNKNOWN';
  const studentId = item.student_id || item.student?.id || 'N/A';

  return {
    ...item,
    status: state,
    type: formatLabel(item.submission_type),
    title: item.title || details.fileName || 'Submission',
    document: details.fileName || item.title || 'Attached document',
    documentSize: details.fileSize || 'Metadata saved',
    reportingPeriod: details.reportingPeriod || 'N/A',
    comments: details.comments || '',
    deadline: item.updated_at || item.created_at,
    student: {
      id: studentId,
      name:
        item.student_name ||
        item.student?.name ||
        `Student ${String(studentId).slice(0, 8)}`,
      course: item.student_course || item.student?.course || 'Postgraduate Programme',
    },
    supervisor: {
      id: item.updated_by || null,
      name: item.supervisor_name || 'Supervisor Review Completed',
    },
  };
}

async function getHODBackendSubmissions() {
  const response = await submissionsApi.list();
  const items = response?.data?.items || response?.items || [];

  return items
    .map(normalizeSubmission)
    .filter((item) => HOD_VISIBLE_STATES.includes(item.status))
    .sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at || 0) -
        new Date(a.updated_at || a.created_at || 0)
    );
}

// ─── Submissions Screen ──────────────────────────────────────────────────────
export function HODSubmissionsScreen({ navigation, route }) {
  const incomingFilter = route?.params?.filter || null;
  const mappedFilter = FILTER_MAP[incomingFilter] || incomingFilter;

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getHODBackendSubmissions();

      setSubmissions(
        mappedFilter ? data.filter((item) => item.status === mappedFilter) : data
      );
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Could not load submissions',
        error?.message || 'Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mappedFilter]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#1E56A0" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <HODHeader title="Submissions" navigation={navigation} />

      <FlatList
        data={submissions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() =>
              navigation.navigate('HODReviewSubmission', {
                submission: item,
              })
            }
          >
            <View style={s.cardTop}>
              <View style={s.typePill}>
                <Text style={s.typePillText}>{item.type}</Text>
              </View>

              <View
                style={[
                  s.statusPill,
                  {
                    backgroundColor: getStatusColor(item.status),
                  },
                ]}
              >
                <Text style={s.statusPillText}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
            </View>

            <Text style={s.title} numberOfLines={2}>
              {item.title}
            </Text>

            <View style={s.meta}>
              <View style={s.metaRow}>
                <Ionicons name="person-outline" size={14} color="#6B7280" />
                <Text style={s.metaText}> {item.student.name}</Text>
              </View>

              <View style={s.metaRow}>
                <Ionicons name="school-outline" size={14} color="#6B7280" />
                <Text style={s.metaText}> {item.supervisor.name}</Text>
              </View>

              <View style={s.metaRow}>
                <Ionicons name="calendar-outline" size={14} color="#F59E0B" />
                <Text style={[s.metaText, { color: '#F59E0B' }]}>
                  {' '}
                  {formatDate(item.updated_at || item.created_at)}
                </Text>
              </View>
            </View>

            {!!item.comments && (
              <View style={s.feedbackBox}>
                <Text style={s.feedbackLabel}>Student comments</Text>
                <Text style={s.feedbackText} numberOfLines={2}>
                  {item.comments}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="folder-open-outline" size={48} color="#9BA4B5" />
            <Text style={s.emptyText}>No HOD submissions found.</Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Assignments Screen ───────────────────────────────────────────────────────
export function HODAssignmentsScreen({ navigation }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getHODBackendSubmissions();

      setSubmissions(
        data.filter((item) => item.status === 'APPROVED_BY_SUPERVISOR')
      );
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Could not load assignments',
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

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#1E56A0" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <HODHeader title="Assignments" navigation={navigation} />

      <FlatList
        data={submissions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.assignmentTop}>
              <View>
                <Text style={s.studentName}>{item.student.name}</Text>
                <Text style={s.infoText}>Student ID: {item.student.id}</Text>
                <Text style={s.infoText}>Course: {item.student.course}</Text>
              </View>

              <View
                style={[
                  s.statusPill,
                  {
                    backgroundColor: getStatusColor(item.status),
                  },
                ]}
              >
                <Text style={s.statusPillText}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
            </View>

            <View style={s.divider} />

            <View style={s.docRow}>
              <View style={s.docIconBox}>
                <Ionicons
                  name="document-attach-outline"
                  size={22}
                  color="#1E56A0"
                />
              </View>

              <View style={s.docInfo}>
                <Text style={s.docName} numberOfLines={1}>
                  {item.document}
                </Text>
                <Text style={s.docSize}>
                  {item.documentSize} · {item.type}
                </Text>
              </View>

              <TouchableOpacity
                style={s.openBtn}
                onPress={() =>
                  navigation.navigate('HODReviewSubmission', {
                    submission: item,
                  })
                }
              >
                <Text style={s.openBtnText}>Open</Text>
              </TouchableOpacity>
            </View>

            <View style={s.divider} />

            <TouchableOpacity
              style={s.assignBtn}
              onPress={() =>
                navigation.navigate('HODAssignInternalEvaluator', {
                  submission: item,
                })
              }
            >
              <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
              <Text style={s.assignBtnText}>Assign Internal Evaluator</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons
              name="checkmark-circle-outline"
              size={48}
              color="#22C55E"
            />
            <Text style={s.emptyText}>
              No submissions are currently awaiting evaluator assignment.
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Notifications Screen ─────────────────────────────────────────────────────
export function HODNotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const response = await api.get('/notifications');
      const items = response?.data?.items || response?.items || [];

      setNotifications(
        [...items].sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        )
      );
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Could not load notifications',
        error?.message || 'Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (item) => {
    if (item.read_at) return;

    try {
      await api.post(`/notifications/${item.id}/read`);
      await loadNotifications();
    } catch (error) {
      Alert.alert(
        'Could not update notification',
        error?.message || 'Please try again.'
      );
    }
  };

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#1E56A0" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <HODHeader title="Notifications" navigation={navigation} showBack />

      <FlatList
        data={notifications}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadNotifications();
            }}
          />
        }
        renderItem={({ item }) => {
          const read = !!item.read_at;

          return (
            <TouchableOpacity
              style={[s.notifCard, !read && s.notifUnread]}
              onPress={() => markAsRead(item)}
            >
              <Ionicons
                name={read ? 'mail-open-outline' : 'mail-unread-outline'}
                size={22}
                color={read ? '#6B7280' : '#1E56A0'}
              />

              <View style={s.notifBody}>
                <Text
                  style={[
                    s.notifMessage,
                    !read && {
                      fontWeight: '600',
                      color: '#0D1B2A',
                    },
                  ]}
                >
                  {item.message || item.title}
                </Text>

                <Text style={s.notifTime}>
                  {formatDate(item.created_at)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons
              name="notifications-off-outline"
              size={48}
              color="#9BA4B5"
            />
            <Text style={s.emptyText}>No notifications yet.</Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────
export function HODProfileScreen({ navigation }) {
  const logout = useAuthStore((state) => state.logout);
  const authUser = useAuthStore((state) => state.user);

  const [signingOut, setSigningOut] = useState(false);

  const profile = {
    name: authUser?.name || 'Prof. Ndapewa Iyambo',
    email: authUser?.email || 'hod@nust.na',
    role: 'Head of Department',
    department: 'Software Engineering',
    phone: '+264 61 207 2000',
  };

  const initials = profile.name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            setSigningOut(true);
            await logout();
          } catch (error) {
            Alert.alert(
              'Logout Failed',
              error?.message || 'Could not log out. Please try again.'
            );
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={s.container}>
      <HODHeader title="Profile" navigation={navigation} />

      <View style={s.avatarSection}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>

        <Text style={s.profileName}>{profile.name}</Text>

        <View style={s.rolePill}>
          <Text style={s.rolePillText}>{profile.role}</Text>
        </View>
      </View>

      <View style={s.infoCard}>
        {[
          {
            icon: 'mail-outline',
            label: 'Email',
            value: profile.email,
          },
          {
            icon: 'business-outline',
            label: 'Department',
            value: profile.department,
          },
          {
            icon: 'call-outline',
            label: 'Phone',
            value: profile.phone,
          },
        ].map((row, index, array) => (
          <View
            key={row.label}
            style={[s.infoRow, index < array.length - 1 && s.infoRowBorder]}
          >
            <Ionicons
              name={row.icon}
              size={20}
              color="#1E56A0"
              style={{ width: 28 }}
            />

            <View>
              <Text style={s.infoLabel}>{row.label}</Text>
              <Text style={s.infoValue}>{row.value}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[s.logoutBtn, signingOut && { opacity: 0.7 }]}
        onPress={handleLogout}
        disabled={signingOut}
      >
        {signingOut ? (
          <ActivityIndicator color="#EF4444" />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={s.logoutText}>Log Out</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F2F5',
  },
  list: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  typePill: {
    backgroundColor: '#0D1B2A',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  typePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D1B2A',
    lineHeight: 22,
    marginBottom: 10,
  },
  meta: {
    gap: 5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  feedbackBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    gap: 4,
  },
  feedbackLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  feedbackText: {
    color: '#374151',
    fontSize: 13,
    lineHeight: 19,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  assignmentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D1B2A',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  docSize: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  openBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  openBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  assignBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  assignBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  notifCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
  },
  notifUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#1E56A0',
  },
  notifBody: {
    flex: 1,
  },
  notifMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 6,
  },
  notifTime: {
    fontSize: 12,
    color: '#9BA4B5',
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E56A0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0D1B2A',
    marginBottom: 8,
  },
  rolePill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  rolePillText: {
    fontSize: 13,
    color: '#1E56A0',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    paddingHorizontal: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: '#0D1B2A',
    fontWeight: '500',
  },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '700',
  },
});