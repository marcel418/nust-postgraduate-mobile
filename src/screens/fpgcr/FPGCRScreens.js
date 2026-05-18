// src/screens/fpgcr/FPGCRScreens.js

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../../api/http';
import { submissionsApi } from '../../api/submissionsApi';
import { documentsApi } from '../../api/documentsApi';
import { useAuthStore } from '../../store/authStore';

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
      documentId: null,
      mimeType: '',
    };
  }

  try {
    const parsed = JSON.parse(description);

    return {
      comments: parsed.comments || '',
      reportingPeriod: parsed.reportingPeriod || 'N/A',
      fileName: parsed.fileName || '',
      fileSize: parsed.fileSize || '',
      documentId: parsed.documentId || null,
      mimeType: parsed.mimeType || '',
    };
  } catch {
    return {
      comments: description,
      reportingPeriod: 'N/A',
      fileName: '',
      fileSize: '',
      documentId: null,
      mimeType: '',
    };
  }
}

function normalizeSubmission(item = {}) {
  const details = parseDescription(item.description);
  const state = item.current_state || item.workflow_state || 'UNKNOWN';

  return {
    id: item.id,
    raw: item,
    title: item.title || details.fileName || 'Submission',
    type: formatLabel(item.submission_type),
    status: state,
    document: details.fileName || item.title || 'Attached document',
    documentSize: details.fileSize || 'Metadata saved',
    documentId: details.documentId,
    mimeType: details.mimeType || '',
    reportingPeriod: details.reportingPeriod || 'N/A',
    studentComments: details.comments || '',
    student: {
      id: item.student_id || 'N/A',
      name:
        item.student_name ||
        item.student?.name ||
        `Student ${String(item.student_id || '').slice(0, 8)}`,
      course:
        item.student_course ||
        item.student?.course ||
        'Postgraduate Programme',
    },
    updatedAt: item.updated_at || item.created_at,
  };
}

function getStatusColor(status) {
  return (
    {
      FORWARDED_TO_FPGCR: '#F59E0B',
      FORWARDED_TO_FPGC: '#1E56A0',
      APPROVED: '#22C55E',
      REJECTED: '#EF4444',
      EXTERNAL_EVAL_ASSIGNED: '#7C3AED',
      EXTERNAL_EVAL_COMPLETED: '#22C55E',
    }[status] || '#6B7280'
  );
}

function getStatusLabel(status) {
  return (
    {
      FORWARDED_TO_FPGCR: 'Awaiting FPGC-R',
      FORWARDED_TO_FPGC: 'Forwarded to FPGC',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      EXTERNAL_EVAL_ASSIGNED: 'External Evaluator Assigned',
      EXTERNAL_EVAL_COMPLETED: 'External Evaluation Complete',
    }[status] || formatLabel(status)
  );
}

function FPGCRHeader({ title, navigation, showBack = false }) {
  return (
    <View style={s.header}>
      {showBack ? (
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ) : (
        <Text style={s.headerTitle}>{title}</Text>
      )}

      {showBack && <Text style={s.headerTitleCenter}>{title}</Text>}

      <View style={s.headerIcons}>
        <TouchableOpacity onPress={() => navigation.navigate('FPGCRNotifications')}>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('FPGCRProfile')}>
          <Ionicons name="person-circle-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function useFPGCRSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await submissionsApi.list();
      const items = response?.data?.items || response?.items || [];

      const normalized = items
        .map(normalizeSubmission)
        .filter((item) =>
          [
            'FORWARDED_TO_FPGCR',
            'FORWARDED_TO_FPGC',
            'APPROVED',
            'REJECTED',
            'EXTERNAL_EVAL_ASSIGNED',
            'EXTERNAL_EVAL_COMPLETED',
          ].includes(item.status)
        )
        .sort(
          (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
        );

      setSubmissions(normalized);
    } catch (error) {
      Alert.alert(
        'Could not load submissions',
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

  return {
    submissions,
    loading,
    refreshing,
    refresh,
    reload: load,
  };
}

export function FPGCRDashboard({ navigation }) {
  const { submissions, loading, refreshing, refresh } = useFPGCRSubmissions();

  const pending = submissions.filter((item) => item.status === 'FORWARDED_TO_FPGCR');
  const forwarded = submissions.filter((item) => item.status === 'FORWARDED_TO_FPGC');
  const completed = submissions.filter((item) =>
    ['APPROVED', 'REJECTED', 'EXTERNAL_EVAL_ASSIGNED', 'EXTERNAL_EVAL_COMPLETED'].includes(item.status)
  );

  const cards = [
    {
      count: pending.length,
      label: 'Pending FPGC-R Review',
      icon: 'documents-outline',
      color: '#F59E0B',
    },
    {
      count: forwarded.length,
      label: 'Forwarded to FPGC',
      icon: 'send-outline',
      color: '#1E56A0',
    },
    {
      count: completed.length,
      label: 'Finalised',
      icon: 'checkmark-circle-outline',
      color: '#22C55E',
    },
  ];

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#1E56A0" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <FPGCRHeader title="Dashboard" navigation={navigation} />

      <ScrollView
        style={s.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        {cards.map((card) => (
          <View key={card.label} style={s.statCard}>
            <View
              style={[
                s.statIconBox,
                {
                  backgroundColor: `${card.color}18`,
                },
              ]}
            >
              <Ionicons name={card.icon} size={28} color={card.color} />
            </View>

            <View style={s.statBody}>
              <Text style={s.statNumber}>{card.count}</Text>
              <Text style={s.statLabel}>{card.label}</Text>

              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('FPGCRTabs', {
                    screen: 'FPGCRReviews',
                  })
                }
              >
                <Text style={s.viewMore}>View More Info</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={s.sectionTitle}>Submissions to Review</Text>

        {pending.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={42} color="#9BA4B5" />
            <Text style={s.emptyTitle}>No pending reviews</Text>
            <Text style={s.emptyText}>
              Submissions forwarded by HOD will appear here.
            </Text>
          </View>
        ) : (
          pending.map((item) => (
            <SubmissionCard
              key={item.id}
              item={item}
              onPress={() =>
                navigation.navigate('FPGCRHdcDecision', {
                  submission: item,
                })
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function SubmissionCard({ item, onPress }) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress}>
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
          <Text style={s.statusPillText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>

      <Text style={s.cardTitle} numberOfLines={2}>
        {item.title}
      </Text>

      <Text style={s.infoText}>
        {item.student.name} · {item.student.course}
      </Text>

      <View style={s.cardMeta}>
        <Ionicons name="calendar-outline" size={13} color="#6B7280" />
        <Text style={s.cardMetaText}> Updated {formatDate(item.updatedAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export function FPGCRReviews({ navigation }) {
  const { submissions, loading, refreshing, refresh } = useFPGCRSubmissions();

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#1E56A0" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <FPGCRHeader title="Reviews" navigation={navigation} />

      <FlatList
        data={submissions.filter((item) => item.status === 'FORWARDED_TO_FPGCR')}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        renderItem={({ item }) => (
          <SubmissionCard
            item={item}
            onPress={() =>
              navigation.navigate('FPGCRHdcDecision', {
                submission: item,
              })
            }
          />
        )}
        ListEmptyComponent={
          <View style={s.emptyCard}>
            <Ionicons name="folder-open-outline" size={42} color="#9BA4B5" />
            <Text style={s.emptyTitle}>No submissions found</Text>
            <Text style={s.emptyText}>
              FPGC-R workflow items will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

export function FPGCRHdcDecision({ route, navigation }) {
  const { submission } = route.params;
  const [comments, setComments] = useState(
    'Reviewed by FPGC-R and forwarded to FPGC for final review.'
  );
  const [loading, setLoading] = useState(false);
  const [openingDocument, setOpeningDocument] = useState(false);

  const canForward = submission.status === 'FORWARDED_TO_FPGCR';

  const handleOpenDocument = async () => {
    if (!submission?.documentId) {
      Alert.alert('No Document', 'This submission does not have a linked uploaded document.');
      return;
    }

    try {
      setOpeningDocument(true);
      await documentsApi.openDocument(submission.documentId, submission.document || 'document');
    } catch (error) {
      Alert.alert(
        'Could not open document',
        error?.message || 'Please try again.'
      );
    } finally {
      setOpeningDocument(false);
    }
  };

  const handleForward = () => {
    if (!comments.trim()) {
      Alert.alert('Required', 'Please add review comments.');
      return;
    }

    if (!canForward) {
      Alert.alert(
        'Invalid State',
        `This submission is currently ${getStatusLabel(submission.status)}.`
      );
      return;
    }

    Alert.alert(
      'Forward to FPGC',
      `Forward "${submission.title}" to FPGC for final review?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Forward',
          onPress: async () => {
            try {
              setLoading(true);

              await submissionsApi.forwardToFPGC(submission.id, comments.trim());

              Alert.alert(
                'Forwarded',
                'The submission has been forwarded to FPGC.',
                [
                  {
                    text: 'OK',
                    onPress: () =>
                      navigation.navigate('FPGCRTabs', {
                        screen: 'FPGCRHome',
                      }),
                  },
                ]
              );
            } catch (error) {
              Alert.alert(
                'Forward Failed',
                error?.message || 'Could not forward submission.'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={s.container}>
      <FPGCRHeader title="FPGC-R Review" navigation={navigation} showBack />

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <View style={s.docRow}>
            <View style={s.docIconBox}>
              <Ionicons name="document-attach-outline" size={22} color="#1E56A0" />
            </View>

            <View style={s.docInfo}>
              <Text style={s.docName}>{submission.document}</Text>
              <Text style={s.docSize}>{submission.documentSize}</Text>
            </View>

            <TouchableOpacity
              style={[s.openBtn, (!submission?.documentId || openingDocument) && { opacity: 0.65 }]}
              onPress={handleOpenDocument}
              disabled={!submission?.documentId || openingDocument}
            >
              {openingDocument ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.openBtnText}>{submission?.documentId ? 'Open' : 'No File'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.studentName}>{submission.student.name}</Text>
          <Text style={s.infoText}>{submission.student.course}</Text>
          <Text style={s.infoText}>Reporting period: {submission.reportingPeriod}</Text>
          <Text style={s.infoText}>Status: {getStatusLabel(submission.status)}</Text>
          <Text style={s.cardTitle} numberOfLines={3}>
            {submission.title}
          </Text>

          {!!submission.studentComments && (
            <View style={s.noteRow}>
              <Ionicons name="information-circle-outline" size={16} color="#1E56A0" />
              <Text style={s.noteText}> {submission.studentComments}</Text>
            </View>
          )}
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>FPGC-R Comments</Text>

          <TextInput
            style={s.textArea}
            placeholder="Add FPGC-R comments..."
            placeholderTextColor="#9BA4B5"
            value={comments}
            onChangeText={setComments}
            multiline
            numberOfLines={4}
            editable={!loading && canForward}
          />
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Forward Submission</Text>

          <TouchableOpacity
            style={[s.notifyBtn, (loading || !canForward) && { opacity: 0.6 }]}
            onPress={handleForward}
            disabled={loading || !canForward}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.notifyBtnText}>Forward to FPGC</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export function FPGCRDecisions({ navigation }) {
  const { submissions, loading, refreshing, refresh } = useFPGCRSubmissions();

  const completed = submissions.filter((item) =>
    [
      'FORWARDED_TO_FPGC',
      'APPROVED',
      'REJECTED',
      'EXTERNAL_EVAL_ASSIGNED',
      'EXTERNAL_EVAL_COMPLETED',
    ].includes(item.status)
  );

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#1E56A0" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <FPGCRHeader title="Decisions" navigation={navigation} />

      <FlatList
        data={completed}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        renderItem={({ item }) => (
          <SubmissionCard
            item={item}
            onPress={() =>
              navigation.navigate('FPGCRHdcDecision', {
                submission: item,
              })
            }
          />
        )}
        ListEmptyComponent={
          <View style={s.emptyCard}>
            <Ionicons name="document-text-outline" size={42} color="#9BA4B5" />
            <Text style={s.emptyTitle}>No decisions yet</Text>
            <Text style={s.emptyText}>
              Forwarded or finalised items will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

export function FPGCRProfile({ navigation }) {
  const logout = useAuthStore((state) => state.logout);
  const authUser = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);

  const [signingOut, setSigningOut] = useState(false);

  const profile = {
    name: authUser?.name || 'FPGC-R User',
    email: authUser?.email || 'fpgcr@nust.na',
    role: Array.isArray(roles) && roles.length > 0 ? roles[0] : 'FPGC_R',
    department: 'Faculty Postgraduate Committee',
    phone: '+264 61 207 2200',
  };

  const initials = profile.name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
      <FPGCRHeader title="Profile" navigation={navigation} />

      <View style={s.avatarSection}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>

        <Text style={s.profileName}>{profile.name}</Text>

        <View style={s.rolePill}>
          <Text style={s.rolePillText}>{formatLabel(profile.role)}</Text>
        </View>
      </View>

      <View style={s.infoCard}>
        {[
          { icon: 'mail-outline', label: 'Email', value: profile.email },
          { icon: 'business-outline', label: 'Department', value: profile.department },
          { icon: 'call-outline', label: 'Phone', value: profile.phone },
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

export function FPGCRNotifications({ navigation }) {
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
      <FPGCRHeader title="Notifications" navigation={navigation} showBack />

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
                    !read && { fontWeight: '600', color: '#0D1B2A' },
                  ]}
                >
                  {item.message || item.title}
                </Text>

                <Text style={s.notifTime}>{formatDate(item.created_at)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={s.emptyCard}>
            <Ionicons name="notifications-off-outline" size={42} color="#9BA4B5" />
            <Text style={s.emptyTitle}>No notifications</Text>
            <Text style={s.emptyText}>Workflow alerts will appear here.</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
  },
  header: {
    backgroundColor: '#0D1B2A',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerTitleCenter: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerIcons: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  body: { padding: 16 },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 40 },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  statIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statBody: { flex: 1 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#0D1B2A' },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 4,
  },
  viewMore: { fontSize: 13, color: '#1E56A0', fontWeight: '500' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D1B2A',
    marginBottom: 10,
  },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  typePill: {
    backgroundColor: '#0D1B2A',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  typePillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  statusPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  statusPillText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D1B2A',
    lineHeight: 22,
    marginBottom: 8,
  },
  infoText: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  cardMetaText: { fontSize: 13, color: '#6B7280' },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  noteText: { fontSize: 13, color: '#1E56A0', flex: 1, lineHeight: 18 },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D1B2A',
    marginBottom: 4,
  },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docInfo: { flex: 1 },
  docName: { fontSize: 14, fontWeight: '600', color: '#0D1B2A' },
  docSize: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  openBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  openBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0D1B2A',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  notifyBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  notifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  emptyTitle: { color: '#0D1B2A', fontSize: 16, fontWeight: '700' },
  emptyText: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E56A0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
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
  rolePillText: { fontSize: 13, color: '#1E56A0', fontWeight: '600' },
  infoCard: {
    backgroundColor: '#fff',
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
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#0D1B2A', fontWeight: '500' },
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
  logoutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
  notifCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
  },
  notifUnread: { borderLeftWidth: 4, borderLeftColor: '#1E56A0' },
  notifBody: { flex: 1 },
  notifMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 6,
  },
  notifTime: { fontSize: 12, color: '#9BA4B5' },
});