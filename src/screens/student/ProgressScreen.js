// src/screens/student/ProgressScreen.js

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import AppHeader from '../../components/AppHeader';
import { submissionsApi } from '../../api/submissionsApi';
import {
  formatDate,
  getProgressPercentage,
  getStatusColor,
  getStatusLabel,
  normalizeSubmission,
  sortNewestFirst,
} from './studentHelpers';

const BASE_MILESTONES = [
  { key: 'SUBMITTED', title: 'Submitted', states: ['SUBMITTED'] },
  { key: 'SUPERVISOR', title: 'Supervisor Review', states: ['APPROVED_BY_SUPERVISOR'] },
  { key: 'HOD', title: 'HOD Review', states: ['UNDER_INTERNAL_EVAL'] },
  { key: 'INTERNAL', title: 'Internal Evaluation', states: ['INTERNAL_EVAL_COMPLETED'] },
  { key: 'FPGCR', title: 'FPGC-R Review', states: ['FORWARDED_TO_FPGCR'] },
  { key: 'FPGC', title: 'FPGC Decision', states: ['FORWARDED_TO_FPGC', 'APPROVED', 'REJECTED'] },
  { key: 'EXTERNAL', title: 'External Evaluation', states: ['EXTERNAL_EVAL_ASSIGNED', 'EXTERNAL_EVAL_COMPLETED'] },
];

function getMilestoneStatus(milestone, currentState) {
  if (currentState === 'REJECTED') {
    if (milestone.key === 'FPGC') return 'Rejected';
  }

  if (currentState === 'REVISIONS_REQUIRED') {
    if (['SUBMITTED', 'SUPERVISOR'].includes(milestone.key)) return 'Completed';
    if (milestone.key === 'HOD') return 'Revision Required';
    return 'Pending';
  }

  const stateOrder = [
    'DRAFT',
    'SUBMITTED',
    'APPROVED_BY_SUPERVISOR',
    'UNDER_INTERNAL_EVAL',
    'INTERNAL_EVAL_COMPLETED',
    'FORWARDED_TO_FPGCR',
    'FORWARDED_TO_FPGC',
    'APPROVED',
    'EXTERNAL_EVAL_ASSIGNED',
    'EXTERNAL_EVAL_COMPLETED',
  ];

  const currentIndex = stateOrder.indexOf(currentState);
  const milestoneIndex = Math.min(...milestone.states.map((state) => stateOrder.indexOf(state)).filter((index) => index >= 0));

  if (milestone.states.includes(currentState)) return 'In Progress';
  if (currentIndex > milestoneIndex) return 'Completed';
  return 'Pending';
}

function getMilestoneColor(status) {
  switch (status) {
    case 'Completed':
      return '#22C55E';
    case 'In Progress':
      return '#7C3AED';
    case 'Revision Required':
      return '#F97316';
    case 'Rejected':
      return '#EF4444';
    default:
      return '#F59E0B';
  }
}

export default function ProgressScreen({ navigation }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadMilestones = useCallback(async () => {
    try {
      const response = await submissionsApi.list();
      const items = response?.data?.items || response?.items || [];
      setSubmissions(sortNewestFirst(items.map(normalizeSubmission)));
    } catch (error) {
      Alert.alert('Could not load progress', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMilestones();
  }, [loadMilestones]);

  const latestSubmission = submissions[0] || null;

  const milestones = useMemo(() => {
    if (!latestSubmission) {
      return BASE_MILESTONES.map((item) => ({ ...item, status: 'Pending', date: '--' }));
    }

    return BASE_MILESTONES.map((item) => ({
      ...item,
      status: getMilestoneStatus(item, latestSubmission.state),
      date: item.states.includes(latestSubmission.state) ? formatDate(latestSubmission.updatedAt) : '--',
    }));
  }, [latestSubmission]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMilestones();
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
      <AppHeader title="Progress Timeline" navigation={navigation} />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{latestSubmission?.title || 'No active submission'}</Text>
          <Text style={styles.summaryText}>
            Current stage: {latestSubmission ? getStatusLabel(latestSubmission.state) : 'Not Started'}
          </Text>

          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${latestSubmission ? Math.max(getProgressPercentage(latestSubmission.state), 6) : 4}%`,
                  backgroundColor: latestSubmission ? getStatusColor(latestSubmission.state) : '#6B7280',
                },
              ]}
            />
          </View>

          <Text style={styles.summaryPercent}>
            {latestSubmission ? getProgressPercentage(latestSubmission.state) : 0}% complete
          </Text>
        </View>

        <View style={styles.card}>
          {milestones.map((milestone, index) => {
            const isLast = index === milestones.length - 1;
            const color = getMilestoneColor(milestone.status);

            return (
              <View key={milestone.key} style={styles.milestoneRow}>
                <View style={styles.leftCol}>
                  <View style={[styles.dot, { backgroundColor: color }]}>
                    {milestone.status === 'Completed' && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                  </View>
                  {!isLast && <View style={styles.line} />}
                </View>

                <View style={[styles.milestoneContent, !isLast && styles.milestoneContentSpaced]}>
                  <View style={styles.milestoneTextCol}>
                    <Text style={styles.milestoneTitle}>{milestone.title}</Text>
                    <Text style={styles.milestoneDate}>{milestone.date}</Text>
                  </View>
                  <Text style={[styles.statusText, { color }]}>{milestone.status}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F2F5' },
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  body: { padding: 16 },
  summaryCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12 },
  summaryTitle: { fontSize: 16, fontWeight: '800', color: '#0D1B2A', marginBottom: 4 },
  summaryText: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  progressBarBg: { height: 12, backgroundColor: '#E5E7EB', borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 6 },
  summaryPercent: { fontSize: 12, color: '#1E56A0', fontWeight: '700' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 32 },
  milestoneRow: { flexDirection: 'row', gap: 16 },
  leftCol: { alignItems: 'center', width: 16 },
  dot: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  line: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
  milestoneContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  milestoneContentSpaced: { paddingBottom: 24 },
  milestoneTextCol: { gap: 4, flex: 1 },
  milestoneTitle: { fontSize: 15, fontWeight: '600', color: '#0D1B2A' },
  milestoneDate: { fontSize: 13, color: '#6B7280' },
  statusText: { fontSize: 13, fontWeight: '700', textAlign: 'right' },
});
