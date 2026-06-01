// src/screens/supervisor/DashboardScreen.js

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
import StatusFilterDropdown from '../../components/common/StatusFilterDropdown';
import { submissionsApi } from '../../api/submissionsApi';
import {
  formatDate,
  getInitials,
  getProgressFromState,
  getStatusColor,
  getStatusLabel,
  groupStudentsFromSubmissions,
  normalizeSubmission,
  SUPERVISOR_VISIBLE_STATES,
} from './supervisorHelpers';
import {
  ALL_STATUS_VALUE,
  SUBMISSION_STATUS_FILTER_OPTIONS,
  filterItemsByStatus,
} from '../../utils/statusFilters';

export default function SupervisorDashboardScreen({ navigation }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS_VALUE);

  const loadData = useCallback(async () => {
    try {
      const response = await submissionsApi.list();
      const items = response?.data?.items || response?.items || [];

      const visibleItems = items
        .map(normalizeSubmission)
        .filter((item) => SUPERVISOR_VISIBLE_STATES.includes(item.state))
        .sort(
          (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
        );

      setSubmissions(visibleItems);
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
    loadData();
  }, [loadData]);

  const filteredSubmissions = useMemo(
    () => filterItemsByStatus(submissions, statusFilter, (item) => item.state),
    [statusFilter, submissions]
  );

  const students = useMemo(
    () => groupStudentsFromSubmissions(filteredSubmissions.map((item) => item.raw || item)),
    [filteredSubmissions]
  );

  const pendingCount = filteredSubmissions.filter((item) => item.state === 'SUBMITTED').length;
  const returnedCount = filteredSubmissions.filter((item) => item.state === 'REVISIONS_REQUIRED').length;
  const thesisCount = filteredSubmissions.filter(
    (item) => item.type === 'THESIS' && item.state === 'SUBMITTED'
  ).length;

  const recentSubmissions = filteredSubmissions.slice(0, 5);

  const refresh = () => {
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
      <AppHeader title={'Supervisor\nDashboard'} navigation={navigation} />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        <StatusFilterDropdown
          label="Submission Status"
          value={statusFilter}
          options={SUBMISSION_STATUS_FILTER_OPTIONS}
          onChange={setStatusFilter}
          style={{ marginBottom: 16 }}
        />

        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Students')}
          >
            <Text style={styles.statNumber}>{students.length}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Reviews')}
          >
            <Text style={styles.statNumber}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending{'\n'}Reviews</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('GradeThesis')}
          >
            <Text style={styles.statNumber}>{thesisCount}</Text>
            <Text style={styles.statLabel}>Thesis to{'\n'}Grade</Text>
          </TouchableOpacity>
        </View>

        {returnedCount > 0 && (
          <View style={styles.noticeCard}>
            <Ionicons name="return-down-back-outline" size={20} color="#F59E0B" />
            <Text style={styles.noticeText}>
              {returnedCount} submission{returnedCount === 1 ? '' : 's'} currently require student revisions.
            </Text>
          </View>
        )}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Reviews')}
          >
            <Ionicons name="document-text-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>Review{'\n'}Reports</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('SubmitDocuments')}
          >
            <Ionicons name="cloud-upload-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>Submit{'\n'}Documents</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('GradeThesis')}
          >
            <Ionicons name="checkmark-outline" size={28} color="#FFFFFF" />
            <Text style={styles.actionText}>Grade{'\n'}Thesis</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Recent Submissions</Text>

        {recentSubmissions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="folder-open-outline" size={42} color="#9BA4B5" />
            <Text style={styles.emptyTitle}>No submissions available</Text>
            <Text style={styles.emptyText}>
              Student submissions assigned to the supervisor will appear here.
            </Text>
          </View>
        ) : (
          recentSubmissions.map((submission) => (
            <View key={submission.id} style={styles.submissionCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(submission.student.name)}
                </Text>
              </View>

              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{submission.student.name}</Text>
                <Text style={styles.studentCourse} numberOfLines={1}>
                  {submission.typeLabel} · {formatDate(submission.updatedAt)}
                </Text>

                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${getProgressFromState(submission.state)}%` },
                    ]}
                  >
                    <Text style={styles.progressPill}>
                      {getProgressFromState(submission.state)}%
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(submission.state) },
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {getStatusLabel(submission.state)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.viewBtn}
                onPress={() =>
                  navigation.navigate('ReviewReport', { submission })
                }
              >
                <Text style={styles.viewBtnText}>View</Text>
              </TouchableOpacity>
            </View>
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
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  body: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 4,
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
  noticeCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  noticeText: {
    flex: 1,
    color: '#92400E',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#1E56A0',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D1B2A',
    marginBottom: 10,
  },
  submissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E56A0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  studentInfo: {
    flex: 1,
    gap: 6,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  studentCourse: {
    fontSize: 13,
    color: '#6B7280',
  },
  progressBarBg: {
    height: 24,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#1E56A0',
    borderRadius: 12,
    justifyContent: 'center',
    paddingRight: 8,
    minWidth: 50,
  },
  progressPill: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  viewBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  viewBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 26,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: '#0D1B2A',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
