// src/screens/student/FeedbackScreen.js

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

import AppHeader from '../../components/AppHeader';
import { notificationsApi } from '../../api/notificationsApi';
import { submissionsApi } from '../../api/submissionsApi';
import { formatDate, getStatusLabel, normalizeSubmission, sortNewestFirst } from './studentHelpers';

function mapNotificationToFeedback(item) {
  const read = !!(item.read_at || item.read);

  return {
    id: `notification-${item.id}`,
    type: 'notification',
    fromInitials: 'PG',
    fromName: item.title || 'PGMS',
    fromRole: item.category || 'Workflow Notification',
    status: read ? 'Read' : 'New',
    actionRequired: !read,
    message: item.message || item.title || 'Workflow update received.',
    createdAt: item.created_at,
    raw: item,
  };
}

function mapSubmissionToFeedback(item) {
  const actionRequired = ['REVISIONS_REQUIRED', 'REJECTED'].includes(item.state);

  return {
    id: `submission-${item.id}`,
    type: 'submission',
    fromInitials: actionRequired ? '!' : 'WF',
    fromName: actionRequired ? 'Action Required' : 'Workflow Update',
    fromRole: getStatusLabel(item.state),
    status: actionRequired ? 'Action Required' : getStatusLabel(item.state),
    actionRequired,
    message: item.comments || `Your submission "${item.title}" is currently ${getStatusLabel(item.state)}.`,
    createdAt: item.updatedAt || item.createdAt,
    raw: item,
  };
}

export default function FeedbackScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeedback = useCallback(async () => {
    try {
      const [notificationResponse, submissionsResponse] = await Promise.all([
        notificationsApi.list(),
        submissionsApi.list(),
      ]);

      const notificationItems = notificationResponse?.data?.items || notificationResponse?.items || [];
      const submissionItems = submissionsResponse?.data?.items || submissionsResponse?.items || [];

      setNotifications(notificationItems);
      setSubmissions(sortNewestFirst(submissionItems.map(normalizeSubmission)));
    } catch (error) {
      Alert.alert('Could not load feedback', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFeedback();
  }, [loadFeedback]);

  const feedback = useMemo(() => {
    const notificationFeedback = notifications.map(mapNotificationToFeedback);

    const submissionFeedback = submissions
      .filter((item) =>
        ['REVISIONS_REQUIRED', 'REJECTED', 'APPROVED', 'EXTERNAL_EVAL_COMPLETED'].includes(item.state)
      )
      .map(mapSubmissionToFeedback);

    return [...notificationFeedback, ...submissionFeedback].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );
  }, [notifications, submissions]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFeedback();
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
      <AppHeader title="Feedback" navigation={navigation} />

      <FlatList
        data={feedback}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('FeedbackDetail', { feedback: item })}
          >
            <View style={styles.topRow}>
              <View style={[styles.avatar, item.actionRequired && styles.warningAvatar]}>
                <Text style={styles.avatarText}>{item.fromInitials}</Text>
              </View>

              <View style={styles.nameCol}>
                <Text style={styles.fromName}>{item.fromName}</Text>
                <Text style={styles.fromRole}>{item.fromRole}</Text>
              </View>

              <View style={styles.statusRow}>
                <Text
                  style={[
                    styles.statusText,
                    { color: item.actionRequired ? '#F59E0B' : '#22C55E' },
                  ]}
                >
                  {item.status}
                </Text>
                {!item.actionRequired && <Ionicons name="checkmark-circle" size={18} color="#22C55E" />}
              </View>
            </View>

            <Text style={styles.message} numberOfLines={3}>{item.message}</Text>
            <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="chatbubble-ellipses-outline" size={48} color="#9BA4B5" />
            <Text style={styles.emptyTitle}>No feedback yet</Text>
            <Text style={styles.emptyText}>Workflow comments and notifications will appear here.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F2F5' },
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  list: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12, gap: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1E56A0', alignItems: 'center', justifyContent: 'center' },
  warningAvatar: { backgroundColor: '#F59E0B' },
  avatarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 15 },
  nameCol: { flex: 1, gap: 2 },
  fromName: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  fromRole: { fontSize: 13, color: '#6B7280' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 12, fontWeight: '700' },
  message: { fontSize: 14, color: '#374151', lineHeight: 22 },
  dateText: { color: '#9BA4B5', fontSize: 12 },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 28, alignItems: 'center', marginTop: 40 },
  emptyTitle: { color: '#0D1B2A', fontSize: 17, fontWeight: '800', marginTop: 10 },
  emptyText: { color: '#6B7280', textAlign: 'center', lineHeight: 20, marginTop: 6 },
});
