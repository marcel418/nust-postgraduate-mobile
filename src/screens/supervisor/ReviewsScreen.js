// src/screens/supervisor/ReviewsScreen.js

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '../../components/AppHeader';
import { submissionsApi } from '../../api/submissionsApi';

const FILTERS = [
  { label: 'Pending', value: 'SUBMITTED' },
  { label: 'Approved', value: 'APPROVED_BY_SUPERVISOR' },
  { label: 'Returned', value: 'REVISIONS_REQUIRED' },
  { label: 'All', value: 'ALL' },
];

function formatState(state) {
  if (!state) return 'Unknown';

  if (state === 'SUBMITTED') return 'In Review';

  return String(state)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value) {
  if (!value) return 'N/A';

  try {
    return new Date(value).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

function getStatusColor(state) {
  switch (state) {
    case 'SUBMITTED':
      return '#7C3AED';
    case 'APPROVED_BY_SUPERVISOR':
      return '#22C55E';
    case 'REVISIONS_REQUIRED':
      return '#F59E0B';
    case 'REJECTED':
      return '#EF4444';
    case 'DRAFT':
      return '#6B7280';
    default:
      return '#6B7280';
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

function getStudentDisplayName(submission) {
  return (
    submission.student_name ||
    submission.student?.name ||
    submission.created_by_name ||
    'Student Submission'
  );
}

function getStudentSubText(submission) {
  if (submission.student_number) return submission.student_number;
  if (submission.student?.student_number) return submission.student.student_number;
  if (submission.student_id) return `Student ID: ${String(submission.student_id).slice(0, 8)}...`;
  return 'Postgraduate student';
}

function getInitials(name) {
  if (!name) return 'ST';

  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ReviewsScreen({ navigation }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeFilter, setActiveFilter] = useState('SUBMITTED');
  const [processingId, setProcessingId] = useState(null);

  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [returnComments, setReturnComments] = useState('');

  const loadSubmissions = useCallback(async () => {
    try {
      const response = await submissionsApi.list();
      const items = response?.data?.items || response?.items || [];

      const sorted = [...items].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || 0) -
          new Date(a.updated_at || a.created_at || 0)
      );

      setSubmissions(sorted);
    } catch (error) {
      Alert.alert(
        'Could not load reviews',
        error?.message || 'Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const filteredSubmissions = useMemo(() => {
    if (activeFilter === 'ALL') return submissions;

    return submissions.filter(
      (item) => (item.current_state || item.workflow_state) === activeFilter
    );
  }, [activeFilter, submissions]);

  const pendingCount = useMemo(
    () =>
      submissions.filter(
        (item) => (item.current_state || item.workflow_state) === 'SUBMITTED'
      ).length,
    [submissions]
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadSubmissions();
  };

  const handleApprove = (submission) => {
    Alert.alert(
      'Approve Submission',
      `Approve "${submission.title}" and forward it to the next workflow stage?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setProcessingId(submission.id);

              await submissionsApi.approve(
                submission.id,
                'Approved by supervisor.'
              );

              await loadSubmissions();

              Alert.alert(
                'Approved',
                'The submission was approved successfully.'
              );
            } catch (error) {
              Alert.alert(
                'Approval Failed',
                error?.message || 'Could not approve this submission.'
              );
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const openReturnModal = (submission) => {
    setSelectedSubmission(submission);
    setReturnComments('');
    setReturnModalVisible(true);
  };

  const closeReturnModal = () => {
    if (processingId) return;

    setReturnModalVisible(false);
    setSelectedSubmission(null);
    setReturnComments('');
  };

  const handleReturn = async () => {
    if (!selectedSubmission) return;

    if (!returnComments.trim()) {
      Alert.alert(
        'Comments Required',
        'Please explain what the student must revise.'
      );
      return;
    }

    try {
      setProcessingId(selectedSubmission.id);

      await submissionsApi.returnForChanges(
        selectedSubmission.id,
        returnComments.trim()
      );

      setReturnModalVisible(false);
      setSelectedSubmission(null);
      setReturnComments('');

      await loadSubmissions();

      Alert.alert(
        'Returned',
        'The submission was returned to the student for changes.'
      );
    } catch (error) {
      Alert.alert(
        'Return Failed',
        error?.message || 'Could not return this submission.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="checkmark-circle-outline"
        size={48}
        color="#9BA4B5"
      />
      <Text style={styles.emptyTitle}>
        {activeFilter === 'SUBMITTED' ? 'All caught up!' : 'No reviews found'}
      </Text>
      <Text style={styles.emptyText}>
        {activeFilter === 'SUBMITTED'
          ? 'No pending submissions to review.'
          : 'There are no submissions matching this filter.'}
      </Text>
    </View>
  );

  const renderSubmission = (submission) => {
    const state = submission.current_state || submission.workflow_state || 'UNKNOWN';
    const statusColor = getStatusColor(state);
    const details = parseDescription(submission.description);
    const canReview = state === 'SUBMITTED';
    const isProcessing = processingId === submission.id;

    const studentName = getStudentDisplayName(submission);
    const studentSubText = getStudentSubText(submission);
    const displayTitle = details.fileName || submission.title || 'Progress Report';

    return (
      <View key={submission.id} style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(studentName)}</Text>
          </View>

          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{studentName}</Text>
            <Text style={styles.studentCourse} numberOfLines={1}>
              {studentSubText}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{formatState(state)}</Text>
          </View>
        </View>

        <View style={styles.fileRow}>
          <View style={styles.fileIcon}>
            <Ionicons
              name="document-text"
              size={18}
              color="#1E56A0"
            />
          </View>

          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={1}>
              {displayTitle}
            </Text>

            <Text style={styles.fileMeta}>
              {details.fileSize || 'Version ' + (submission.current_version_no || 1)} ·{' '}
              {formatDate(submission.updated_at || submission.created_at)}
            </Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={15} color="#6B7280" />
          <Text style={styles.detailText}>
            Reporting period: {details.reportingPeriod || 'N/A'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="layers-outline" size={15} color="#6B7280" />
          <Text style={styles.detailText}>
            Type: {formatState(submission.submission_type)}
          </Text>
        </View>

        {!!details.comments && (
          <View style={styles.commentsBox}>
            <Text style={styles.commentsLabel}>Student comments</Text>
            <Text style={styles.commentsText}>{details.comments}</Text>
          </View>
        )}

        {canReview ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.returnButton, isProcessing && styles.disabledButton]}
              onPress={() => openReturnModal(submission)}
              disabled={isProcessing}
            >
              <Ionicons
                name="return-down-back-outline"
                size={17}
                color="#EF4444"
              />
              <Text style={styles.returnButtonText}>Return</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.approveButton, isProcessing && styles.disabledButton]}
              onPress={() => handleApprove(submission)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-outline"
                    size={17}
                    color="#FFFFFF"
                  />
                  <Text style={styles.approveButtonText}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.workflowNotice}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#1E56A0"
            />
            <Text style={styles.workflowNoticeText}>
              This submission is currently {formatState(state)}.
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E56A0" />
        <Text style={styles.loadingText}>Loading reviews...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Reviews"
        navigation={navigation}
        rightAction={
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>{pendingCount}</Text>
          </View>
        }
      />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Supervisor Review Queue</Text>
        <Text style={styles.summaryText}>
          Review submitted reports, approve valid submissions, or return them to
          students for correction.
        </Text>
      </View>

      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {FILTERS.map((filter) => {
            const active = activeFilter === filter.value;

            return (
              <TouchableOpacity
                key={filter.value}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setActiveFilter(filter.value)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    active && styles.filterPillTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={[
          styles.bodyContent,
          filteredSubmissions.length === 0 && styles.emptyBodyContent,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.count}>
          {filteredSubmissions.length}{' '}
          {filteredSubmissions.length === 1 ? 'review' : 'reviews'}
        </Text>

        {filteredSubmissions.length === 0
          ? renderEmptyState()
          : filteredSubmissions.map(renderSubmission)}
      </ScrollView>

      <Modal
        visible={returnModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeReturnModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Return for Changes</Text>

              <TouchableOpacity
                onPress={closeReturnModal}
                disabled={!!processingId}
              >
                <Ionicons name="close" size={24} color="#0D1B2A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Add clear feedback for the student before returning this
              submission.
            </Text>

            <TextInput
              value={returnComments}
              onChangeText={setReturnComments}
              placeholder="Example: Please revise the methodology section and upload the corrected report."
              placeholderTextColor="#9BA4B5"
              multiline
              textAlignVertical="top"
              style={styles.modalTextArea}
              editable={!processingId}
            />

            <TouchableOpacity
              style={[
                styles.modalReturnButton,
                processingId && styles.disabledButton,
              ]}
              onPress={handleReturn}
              disabled={!!processingId}
            >
              {processingId ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.modalReturnText}>Return to Student</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
  },
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  counterBadge: {
    backgroundColor: '#1E56A0',
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  counterText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
  },
  summaryTitle: {
    color: '#0D1B2A',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryText: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 19,
  },
  filterWrapper: {
    marginBottom: 4,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterPillActive: {
    backgroundColor: '#1E56A0',
    borderColor: '#1E56A0',
  },
  filterPillText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 13,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
  },
  bodyContent: {
    paddingTop: 12,
    paddingBottom: 32,
  },
  emptyBodyContent: {
    flexGrow: 1,
  },
  count: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D1B2A',
  },
  emptyText: {
    fontSize: 14,
    color: '#9BA4B5',
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E56A0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  studentInfo: {
    flex: 1,
    gap: 2,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  studentCourse: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
  },
  fileIcon: {
    width: 36,
    height: 36,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  fileMeta: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    color: '#6B7280',
    fontSize: 13,
    flex: 1,
  },
  commentsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  commentsLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  commentsText: {
    color: '#374151',
    fontSize: 13,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  returnButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  returnButtonText: {
    color: '#EF4444',
    fontWeight: '800',
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#1E56A0',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  workflowNotice: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#1E56A0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  workflowNoticeText: {
    color: '#1E56A0',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 27, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: '#0D1B2A',
    fontSize: 21,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#6B7280',
    lineHeight: 20,
  },
  modalTextArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    minHeight: 120,
    color: '#0D1B2A',
    fontSize: 14,
  },
  modalReturnButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  modalReturnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.7,
  },
});