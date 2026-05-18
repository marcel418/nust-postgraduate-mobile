// src/screens/hod/HODDashboardScreen.js

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
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

import HODHeader from '../../components/HODHeader';
import { submissionsApi } from '../../api/submissionsApi';

const HOD_VISIBLE_STATES = [
  'APPROVED_BY_SUPERVISOR',
  'UNDER_INTERNAL_EVAL',
  'INTERNAL_EVAL_COMPLETED',
  'FORWARDED_TO_FPGCR',
  'FORWARDED_TO_FPGC',
  'EXTERNAL_EVAL_ASSIGNED',
  'EXTERNAL_EVAL_COMPLETED',
  'REVISIONS_REQUIRED',
  'APPROVED',
  'REJECTED',
];

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
    };
  }

  try {
    const parsed = JSON.parse(description);

    return {
      comments: parsed.comments || '',
      reportingPeriod: parsed.reportingPeriod || 'N/A',
      fileName: parsed.fileName || '',
      fileSize: parsed.fileSize || '',
      documentId: parsed.documentId || parsed.document_id || null,
    };
  } catch {
    return {
      comments: description,
      reportingPeriod: 'N/A',
      fileName: '',
      fileSize: '',
      documentId: null,
    };
  }
}

function normalizeSubmission(item = {}) {
  const details = parseDescription(item.description);
  const state = item.current_state || item.workflow_state || item.status || 'UNKNOWN';
  const studentId = item.student_id || item.student?.id || item.studentId || 'N/A';

  return {
    ...item,
    id: item.id,
    status: state,
    type: formatLabel(item.submission_type || item.type),
    title: item.title || details.fileName || 'Submission',
    document: details.fileName || item.document || item.title || 'Attached document',
    documentSize: details.fileSize || item.documentSize || 'Metadata saved',
    documentId: details.documentId || item.documentId || item.document_id || null,
    reportingPeriod: details.reportingPeriod || item.reportingPeriod || 'N/A',
    comments: details.comments || item.comments || '',
    updatedAt: item.updated_at || item.updatedAt || item.created_at || item.createdAt || null,
    student: {
      id: studentId,
      name:
        item.student_name ||
        item.student?.name ||
        `Student ${String(studentId).slice(0, 8)}`,
      course:
        item.student_course ||
        item.student?.course ||
        item.course ||
        'Postgraduate Programme',
    },
  };
}

async function getHODBackendSubmissions() {
  const response = await submissionsApi.list();
  const items = response?.data?.items || response?.items || [];

  return items
    .map(normalizeSubmission)
    .filter((item) => HOD_VISIBLE_STATES.includes(item.status))
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

const getStatusColor = (status) =>
  ({
    APPROVED_BY_SUPERVISOR: '#F59E0B',
    UNDER_INTERNAL_EVAL: '#7C3AED',
    INTERNAL_EVAL_COMPLETED: '#22C55E',
    FORWARDED_TO_FPGCR: '#1E56A0',
    FORWARDED_TO_FPGC: '#1E56A0',
    EXTERNAL_EVAL_ASSIGNED: '#7C3AED',
    EXTERNAL_EVAL_COMPLETED: '#22C55E',
    REVISIONS_REQUIRED: '#F97316',
    APPROVED: '#22C55E',
    REJECTED: '#EF4444',
  }[status] || '#6B7280');

const getStatusLabel = (status) =>
  ({
    APPROVED_BY_SUPERVISOR: 'Awaiting HOD Action',
    UNDER_INTERNAL_EVAL: 'Under Internal Review',
    INTERNAL_EVAL_COMPLETED: 'Ready for HOD Decision',
    FORWARDED_TO_FPGCR: 'Forwarded to FPGC-R',
    FORWARDED_TO_FPGC: 'Forwarded to FPGC',
    EXTERNAL_EVAL_ASSIGNED: 'External Evaluator Assigned',
    EXTERNAL_EVAL_COMPLETED: 'External Evaluation Complete',
    REVISIONS_REQUIRED: 'Revisions Required',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
  }[status] || formatLabel(status));

const getStatusWidth = (status) =>
  ({
    APPROVED_BY_SUPERVISOR: '25%',
    UNDER_INTERNAL_EVAL: '45%',
    INTERNAL_EVAL_COMPLETED: '65%',
    FORWARDED_TO_FPGCR: '75%',
    FORWARDED_TO_FPGC: '85%',
    EXTERNAL_EVAL_ASSIGNED: '90%',
    EXTERNAL_EVAL_COMPLETED: '95%',
    APPROVED: '100%',
    REJECTED: '100%',
    REVISIONS_REQUIRED: '35%',
  }[status] || '20%');

export default function HODDashboardScreen({ navigation }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await getHODBackendSubmissions();
      setSubmissions(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Could not load HOD dashboard', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const reviewCount = submissions.filter((item) => item.status === 'APPROVED_BY_SUPERVISOR').length;
  const assignCount = reviewCount;
  const pendingCount = submissions.filter((item) => item.status === 'UNDER_INTERNAL_EVAL').length;
  const completedCount = submissions.filter((item) => item.status === 'INTERNAL_EVAL_COMPLETED').length;

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
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
      <HODHeader title="Dashboard" navigation={navigation} />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() =>
              navigation.navigate('HODTabs', {
                screen: 'HODSubmissions',
                params: { filter: 'APPROVED_BY_SUPERVISOR' },
              })
            }
          >
            <Text style={styles.statNumber}>{reviewCount}</Text>
            <Text style={styles.statLabel}>New{`\n`}Submissions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('HODTabs', { screen: 'HODAssignments' })}
          >
            <Text style={styles.statNumber}>{assignCount}</Text>
            <Text style={styles.statLabel}>Assign{`\n`}Evaluators</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() =>
              navigation.navigate('HODTabs', {
                screen: 'HODSubmissions',
                params: { filter: 'UNDER_INTERNAL_EVAL' },
              })
            }
          >
            <Text style={styles.statNumber}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending{`\n`}Reviews</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() =>
              navigation.navigate('HODTabs', {
                screen: 'HODSubmissions',
                params: { filter: 'INTERNAL_EVAL_COMPLETED' },
              })
            }
          >
            <Text style={styles.statNumber}>{completedCount}</Text>
            <Text style={styles.statLabel}>Ready{`\n`}to Forward</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('HODTabs', { screen: 'HODSubmissions' })}
          >
            <Ionicons name="document-text-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>Review{`\n`}Submissions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('HODTabs', { screen: 'HODAssignments' })}
          >
            <Ionicons name="person-add-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>Assign{`\n`}Evaluators</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('HODNotifications')}
          >
            <Ionicons name="notifications-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>View{`\n`}Alerts</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Recent Submissions</Text>

        {submissions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="folder-open-outline" size={42} color="#9BA4B5" />
            <Text style={styles.emptyTitle}>No HOD submissions yet</Text>
            <Text style={styles.emptyText}>Supervisor-approved submissions will appear here.</Text>
          </View>
        ) : (
          submissions.slice(0, 6).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.submissionCard}
              onPress={() => navigation.navigate('HODReviewSubmission', { submission: item })}
            >
              <View style={styles.submissionInfo}>
                <Text style={styles.studentName}>{item.student.name}</Text>
                <Text style={styles.submissionCourse}>{item.student.course}</Text>
                <Text style={styles.submissionTitle} numberOfLines={2}>{item.title}</Text>

                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: getStatusWidth(item.status),
                        backgroundColor: getStatusColor(item.status),
                      },
                    ]}
                  >
                    <Text style={styles.progressPill}>{getStatusLabel(item.status)}</Text>
                  </View>
                </View>

                <Text style={styles.updatedText}>Updated {formatDate(item.updatedAt)}</Text>
              </View>

              <TouchableOpacity
                style={styles.viewBtn}
                onPress={() => navigation.navigate('HODReviewSubmission', { submission: item })}
              >
                <Text style={styles.viewBtnText}>View</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        )}
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
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  body: { padding: 16 },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#0D1B2A' },
  statLabel: { fontSize: 12, color: '#6B7280', textAlign: 'center' },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1E56A0',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0D1B2A', marginBottom: 10 },
  submissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  submissionInfo: { flex: 1, gap: 6 },
  studentName: { fontSize: 16, fontWeight: '600', color: '#0D1B2A' },
  submissionCourse: { fontSize: 13, color: '#6B7280' },
  submissionTitle: { fontSize: 13, color: '#374151', lineHeight: 18 },
  progressBarBg: {
    height: 24,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    paddingRight: 8,
    minWidth: 60,
  },
  progressPill: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold', textAlign: 'right' },
  updatedText: { fontSize: 12, color: '#9BA4B5' },
  viewBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  viewBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { color: '#0D1B2A', fontSize: 16, fontWeight: '700' },
  emptyText: { color: '#6B7280', fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
