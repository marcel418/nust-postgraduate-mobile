// src/screens/student/DashboardScreen.js

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
import { notificationsApi } from '../../api/notificationsApi';
import { submissionsApi } from '../../api/submissionsApi';
import { useAuthStore } from '../../store/authStore';
import {
  formatDate,
  getProgressPercentage,
  getStatusColor,
  getStatusLabel,
  normalizeSubmission,
  sortNewestFirst,
} from './studentHelpers';

function getNextTask(latestSubmission) {
  if (!latestSubmission) {
    return {
      id: 'upload-first-report',
      title: 'Upload your first progress report or thesis file',
      status: 'Pending',
      dueDate: 'Start now',
      icon: 'cloud-upload-outline',
      screen: 'Submissions',
    };
  }

  const state = latestSubmission.state;

  if (state === 'DRAFT') {
    return {
      id: 'submit-draft',
      title: 'Submit your draft so the review workflow can start',
      status: 'Pending',
      dueDate: formatDate(latestSubmission.updatedAt),
      icon: 'send-outline',
      screen: 'Submissions',
    };
  }

  if (state === 'REVISIONS_REQUIRED') {
    return {
      id: 'submit-revision',
      title: 'Review feedback and upload a revised document',
      status: 'Action Required',
      dueDate: 'As soon as possible',
      icon: 'refresh-outline',
      screen: 'Submissions',
    };
  }

  if (state === 'REJECTED') {
    return {
      id: 'contact-supervisor',
      title: 'Contact your supervisor about the rejected submission',
      status: 'Action Required',
      dueDate: formatDate(latestSubmission.updatedAt),
      icon: 'chatbubble-ellipses-outline',
      screen: 'FeedbackList',
    };
  }

  if (state === 'APPROVED' || state === 'EXTERNAL_EVAL_COMPLETED') {
    return {
      id: 'review-outcome',
      title: 'Review the latest workflow outcome',
      status: 'Completed',
      dueDate: formatDate(latestSubmission.updatedAt),
      icon: 'checkmark-circle-outline',
      screen: 'Progress',
    };
  }

  return {
    id: 'track-workflow',
    title: `Track current workflow stage: ${getStatusLabel(state)}`,
    status: 'In Progress',
    dueDate: formatDate(latestSubmission.updatedAt),
    icon: 'time-outline',
    screen: 'Progress',
  };
}

export default function DashboardScreen({ navigation }) {
  const authUser = useAuthStore((state) => state.user);

  const [submissions, setSubmissions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = useCallback(async () => {
    try {
      const [submissionResponse, notificationResponse] = await Promise.all([
        submissionsApi.list(),
        notificationsApi.list(),
      ]);

      const submissionItems = submissionResponse?.data?.items || submissionResponse?.items || [];
      const notificationItems = notificationResponse?.data?.items || notificationResponse?.items || [];

      setSubmissions(sortNewestFirst(submissionItems.map(normalizeSubmission)));
      setNotifications(
        [...notificationItems].sort(
          (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
        )
      );
    } catch (error) {
      Alert.alert('Dashboard Error', error?.message || 'Could not load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const latestSubmission = submissions[0] || null;
  const progressPercentage = latestSubmission ? getProgressPercentage(latestSubmission.state) : 0;
  const proposalStage = latestSubmission ? getStatusLabel(latestSubmission.state) : 'Not Started';
  const unreadCount = notifications.filter((item) => !item.read_at && !item.read).length;
  const nextTask = getNextTask(latestSubmission);

  const recentFeedback = useMemo(() => {
    const notificationFeedback = notifications.slice(0, 2).map((item) => ({
      id: `notification-${item.id}`,
      fromInitials: 'PG',
      fromName: item.title || 'PGMS',
      fromRole: item.category || 'Workflow Notification',
      message: item.message || item.title || 'Workflow update received.',
      status: item.read_at || item.read ? 'Read' : 'New',
      actionRequired: !(item.read_at || item.read),
      createdAt: item.created_at,
      raw: item,
    }));

    if (notificationFeedback.length > 0) return notificationFeedback;

    return submissions.slice(0, 2).map((item) => ({
      id: `submission-${item.id}`,
      fromInitials: 'WF',
      fromName: 'Workflow Update',
      fromRole: item.statusLabel,
      message: `Your submission "${item.title}" is currently ${item.statusLabel}.`,
      status: item.statusLabel,
      actionRequired: ['REVISIONS_REQUIRED', 'REJECTED'].includes(item.state),
      createdAt: item.updatedAt,
      raw: item,
    }));
  }, [notifications, submissions]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E56A0" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <AppHeader title="Home" navigation={navigation} />

      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.greetingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>
                Hello, {authUser?.name?.split(' ')?.[0] || 'Student'} 👋
              </Text>
              <Text style={styles.subGreeting}>Your postgraduate journey</Text>
            </View>

            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => navigation.navigate('NotificationsList')}
            >
              <Ionicons name="notifications-outline" size={23} color="#1E56A0" />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>Current Progress</Text>
            <Text style={styles.progressValue}>{progressPercentage}%</Text>
          </View>

          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.max(progressPercentage, 6)}%` }]} />
          </View>

          <View style={styles.stageRow}>
            <Text style={styles.progressLabel}>Current Stage</Text>
            <View style={[styles.stageBadge, { backgroundColor: latestSubmission ? getStatusColor(latestSubmission.state) : '#6B7280' }]}>
              <Text style={styles.stageBadgeText}>{proposalStage}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Submissions')}>
            <Ionicons name="cloud-upload-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>Upload Report</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('FeedbackList')}>
            <Ionicons name="chatbubble-ellipses-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>View Feedback</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Progress')}>
            <Ionicons name="stats-chart-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>View Progress</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Submissions')}>
            <Ionicons name="document-text-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>Submissions</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Feedback</Text>
            <TouchableOpacity onPress={() => navigation.navigate('FeedbackList')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            {recentFeedback.length === 0 ? (
              <Text style={styles.emptyText}>No feedback or workflow notifications yet.</Text>
            ) : (
              recentFeedback.map((item, index) => (
                <View key={item.id}>
                  <TouchableOpacity
                    style={styles.feedbackRow}
                    onPress={() => navigation.navigate('FeedbackDetail', { feedback: item })}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{item.fromInitials}</Text>
                    </View>

                    <View style={styles.feedbackContent}>
                      <View style={styles.feedbackTopRow}>
                        <Text style={styles.feedbackFrom} numberOfLines={1}>
                          {item.fromName}
                          <Text style={styles.feedbackMeta}> · {item.fromRole}</Text>
                        </Text>
                        <Ionicons name="chevron-forward" size={17} color="#9BA4B5" />
                      </View>
                      <Text style={styles.feedbackMessage} numberOfLines={2}>
                        {item.message}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {index < recentFeedback.length - 1 && <View style={styles.itemDivider} />}
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Task</Text>

          <TouchableOpacity
            style={styles.taskCard}
            onPress={() => navigation.navigate(nextTask.screen)}
          >
            <View style={styles.taskIcon}>
              <Ionicons name={nextTask.icon} size={22} color="#1E56A0" />
            </View>

            <View style={styles.taskLeft}>
              <View style={styles.taskTitleRow}>
                <Text style={styles.taskTitle}>{nextTask.title}</Text>
                <View style={[styles.taskBadge, { backgroundColor: getStatusColor(latestSubmission?.state) }]}>
                  <Text style={styles.taskBadgeText}>{nextTask.status}</Text>
                </View>
              </View>

              <View style={styles.taskDateRow}>
                <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                <Text style={styles.taskDate}> {nextTask.dueDate}</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F2F5' },
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  scrollContent: { paddingBottom: 24 },
  body: { padding: 16, gap: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greeting: { fontSize: 20, fontWeight: 'bold', color: '#0D1B2A' },
  subGreeting: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  notificationButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 14 },
  progressLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 14, color: '#6B7280' },
  progressValue: { color: '#1E56A0', fontWeight: '800' },
  progressBarBg: { height: 28, backgroundColor: '#E5E7EB', borderRadius: 14, overflow: 'hidden', marginBottom: 12 },
  progressBarFill: { height: '100%', backgroundColor: '#1E56A0', borderRadius: 14 },
  stageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  stageBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, flexShrink: 1 },
  stageBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', textAlign: 'center' },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionBtn: { backgroundColor: '#1E56A0', borderRadius: 16, padding: 20, alignItems: 'center', justifyContent: 'center', gap: 10, width: '47%' },
  actionText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', textAlign: 'center' },
  section: { gap: 10 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0D1B2A' },
  feedbackRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E56A0', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 14 },
  feedbackContent: { flex: 1, gap: 4 },
  feedbackTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  feedbackFrom: { fontWeight: '600', fontSize: 14, color: '#0D1B2A', flex: 1 },
  feedbackMeta: { fontWeight: '400', color: '#6B7280', fontSize: 13 },
  feedbackMessage: { fontSize: 13, color: '#6B7280', lineHeight: 19 },
  itemDivider: { height: 1, backgroundColor: '#F3F4F6' },
  viewAllText: { color: '#1E56A0', fontWeight: '600', fontSize: 14 },
  emptyText: { color: '#6B7280', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  taskCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  taskIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  taskLeft: { flex: 1, gap: 8 },
  taskTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A', flex: 1 },
  taskBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  taskBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  taskDateRow: { flexDirection: 'row', alignItems: 'center' },
  taskDate: { fontSize: 13, color: '#6B7280' },
});
