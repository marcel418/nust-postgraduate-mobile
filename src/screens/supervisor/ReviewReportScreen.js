// src/screens/supervisor/ReviewReportScreen.js

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AppHeader from '../../components/AppHeader';
import DeadlineExtensionControl from '../../components/common/DeadlineExtensionControl';
import { submissionsApi } from '../../api/submissionsApi';
import { documentsApi } from '../../api/documentsApi';
import {
  formatDate,
  formatLabel,
  getInitials,
  getStatusColor,
  getStatusLabel,
  normalizeSubmission,
} from './supervisorHelpers';

export default function ReviewReportScreen({ route, navigation }) {
  const routeSubmission = route?.params?.submission || null;
  const routeStudent = route?.params?.student || null;

  const [submission, setSubmission] = useState(
    routeSubmission ? normalizeSubmission(routeSubmission.raw || routeSubmission) : null
  );
  const [comments, setComments] = useState('Approved by supervisor.');
  const [submitting, setSubmitting] = useState(false);
  const [opening, setOpening] = useState(false);
  const [loading, setLoading] = useState(!routeSubmission);
  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadSubmission = useCallback(async () => {
    if (routeSubmission?.id) {
      try {
        const response = await submissionsApi.getById(routeSubmission.id);
        const payload = response?.data?.submission || response?.submission || routeSubmission;

        setSubmission(normalizeSubmission(payload));
        setLoading(false);
        setRefreshing(false);
        return;
      } catch (error) {
        setSubmission(normalizeSubmission(routeSubmission.raw || routeSubmission));
        setLoading(false);
        setRefreshing(false);
        return;
      }
    }

    if (routeSubmission) {
      setSubmission(normalizeSubmission(routeSubmission.raw || routeSubmission));
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const response = await submissionsApi.list();
      const items = response?.data?.items || response?.items || [];

      const normalized = items
        .map(normalizeSubmission)
        .filter((item) => {
          if (!routeStudent) return true;

          return (
            String(item.student.id) === String(routeStudent.id) ||
            String(item.student.studentNumber) === String(routeStudent.studentNumber) ||
            item.student.name === routeStudent.name
          );
        })
        .sort(
          (a, b) =>
            new Date(b.updatedAt || 0) -
            new Date(a.updatedAt || 0)
        );

      setSubmission(normalized[0] || null);
    } catch (error) {
      Alert.alert(
        'Could not load submission',
        error?.message || 'Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [routeStudent, routeSubmission]);

  useEffect(() => {
    loadSubmission();
  }, [loadSubmission]);

  const canReview = submission?.state === 'SUBMITTED';

  const displayStudent = useMemo(() => {
    if (submission?.student) return submission.student;

    return {
      name: routeStudent?.name || 'Student',
      studentNumber: routeStudent?.studentNumber || routeStudent?.id || 'N/A',
      course: routeStudent?.course || 'Postgraduate Programme',
    };
  }, [routeStudent, submission]);

  const effectiveDeadline = submission?.extendedDueDate || submission?.dueDate || null;

  const loadHistory = useCallback(async (submissionId) => {
    if (!submissionId) {
      setHistory([]);
      setHistoryLoading(false);
      return;
    }

    try {
      setHistoryLoading(true);

      const response = await submissionsApi.getHistory(submissionId);
      const timeline = response?.data?.timeline || response?.timeline || [];

      setHistory(Array.isArray(timeline) ? timeline : []);
    } catch (error) {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (submission?.id) {
      loadHistory(submission.id);
      return;
    }

    setHistory([]);
  }, [loadHistory, submission?.id]);

  const handleOpenDocument = async () => {
    if (!submission?.documentId) {
      Alert.alert('No Document', 'This submission does not have a linked uploaded document.');
      return;
    }

    try {
      setOpening(true);
      await documentsApi.openDocument(submission.documentId, submission.document);
    } catch (error) {
      Alert.alert(
        'Could not open document',
        error?.message || 'Please try again.'
      );
    } finally {
      setOpening(false);
    }
  };

  const handleApprove = () => {
    if (!submission?.id) return;

    if (!canReview) {
      Alert.alert(
        'Invalid State',
        `This submission is currently ${getStatusLabel(submission.state)}.`
      );
      return;
    }

    Alert.alert(
      'Approve Submission',
      `Approve "${submission.title}" and forward it to HOD?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setSubmitting(true);

              const finalComments =
                comments.trim() ||
                'Approved by supervisor.';

              await submissionsApi.approve(submission.id, finalComments);

              Alert.alert('Success', 'Report approved successfully.', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error) {
              Alert.alert(
                'Approval Failed',
                error?.message || 'Failed to approve. Please try again.'
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleReturn = () => {
    if (!submission?.id) return;

    if (!comments.trim()) {
      Alert.alert(
        'Comments Required',
        'Please add comments before returning.'
      );
      return;
    }

    if (!canReview) {
      Alert.alert(
        'Invalid State',
        `This submission is currently ${getStatusLabel(submission.state)}.`
      );
      return;
    }

    Alert.alert(
      'Return Submission',
      'Return this submission to the student for corrections?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Return',
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true);

              await submissionsApi.returnForChanges(
                submission.id,
                comments.trim()
              );

              Alert.alert('Success', 'Report returned to student.', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error) {
              Alert.alert(
                'Return Failed',
                error?.message || 'Failed to return. Please try again.'
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const refresh = () => {
    setRefreshing(true);
    loadSubmission();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E56A0" />
      </View>
    );
  }

  if (!submission) {
    return (
      <View style={styles.container}>
        <AppHeader title={'Review Progress\nReport'} navigation={navigation} />

        <View style={styles.emptyState}>
          <Ionicons name="folder-open-outline" size={48} color="#9BA4B5" />
          <Text style={styles.emptyTitle}>No submission found</Text>
          <Text style={styles.emptyText}>
            No reviewable submission could be found for this student.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader title={'Review Progress\nReport'} navigation={navigation} />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        <View style={styles.card}>
          <View style={styles.studentTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(displayStudent.name)}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.studentName}>{displayStudent.name}</Text>
              <Text style={styles.studentMeta}>
                Student No: {displayStudent.studentNumber || displayStudent.id}
              </Text>
              <Text style={styles.studentMeta}>
                Course: {displayStudent.course}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: getStatusColor(submission.state),
              },
            ]}
          >
            <Text style={styles.statusBadgeText}>
              {getStatusLabel(submission.state)}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.fileRow}>
            <View style={styles.fileIcon}>
              <Ionicons name="document-text" size={22} color="#1E56A0" />
            </View>

            <View style={styles.fileInfo}>
              <Text style={styles.fileName} numberOfLines={2}>
                {submission.document}
              </Text>
              <Text style={styles.fileSize}>
                {submission.documentSize} · {formatLabel(submission.type)}
              </Text>
              <Text style={styles.fileSize}>
                Uploaded {formatDate(submission.createdAt || submission.updatedAt)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.openBtn,
              (!submission.documentId || opening) && styles.disabledButton,
            ]}
            onPress={handleOpenDocument}
            disabled={!submission.documentId || opening}
          >
            {opening ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons
                  name={submission.documentId ? 'open-outline' : 'document-outline'}
                  size={17}
                  color="#FFFFFF"
                />
                <Text style={styles.openBtnText}>
                  {submission.documentId ? 'Open Uploaded File' : 'No File Linked'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Submission Details</Text>

          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>
              Reporting period: {submission.reportingPeriod}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="layers-outline" size={16} color="#6B7280" />
            <Text style={styles.detailText}>Version: {submission.version}</Text>
          </View>

          {effectiveDeadline && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color="#6B7280" />
              <Text style={styles.detailText}>
                Current deadline: {formatDate(effectiveDeadline)}
              </Text>
            </View>
          )}

          {!!submission.comments && (
            <View style={styles.commentsBox}>
              <Text style={styles.commentsLabel}>Student comments</Text>
              <Text style={styles.commentsText}>{submission.comments}</Text>
            </View>
          )}
        </View>

        {effectiveDeadline && (
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Deadline Extension</Text>

            <DeadlineExtensionControl
              submissionId={submission.id}
              currentDeadlineText={formatDate(effectiveDeadline)}
              onSuccess={loadSubmission}
            />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Workflow History</Text>

          {historyLoading ? (
            <View style={styles.historyLoadingState}>
              <ActivityIndicator size="small" color="#1E56A0" />
              <Text style={styles.historyLoadingText}>Loading workflow history...</Text>
            </View>
          ) : history.length > 0 ? (
            <View style={styles.historyList}>
              {history.map((item) => (
                <View key={`${item.type}-${item.created_at}-${item.label}`} style={styles.historyItem}>
                  <View style={styles.historyDot} />

                  <View style={styles.historyBody}>
                    <Text style={styles.historyLabel}>{item.label}</Text>
                    <Text style={styles.historyMeta}>
                      {item.actor} · {formatDate(item.created_at)}
                    </Text>

                    {item.metadata?.reason ? (
                      <Text style={styles.historyDetail}>{item.metadata.reason}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.historyEmptyState}>
              <Ionicons name="time-outline" size={18} color="#9BA4B5" />
              <Text style={styles.historyEmptyText}>No workflow history available yet.</Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Supervisor Comments</Text>

          <TextInput
            style={styles.textArea}
            placeholder="Type here..."
            placeholderTextColor="#9BA4B5"
            multiline
            numberOfLines={5}
            value={comments}
            onChangeText={setComments}
            textAlignVertical="top"
            editable={!submitting && canReview}
          />
        </View>

        {canReview ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.approveBtn, submitting && styles.disabledButton]}
              onPress={handleApprove}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionBtnText}>Approve</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.returnBtn, submitting && styles.disabledButton]}
              onPress={handleReturn}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.actionBtnText}>Return</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.workflowNotice}>
            <Ionicons name="information-circle-outline" size={18} color="#1E56A0" />
            <Text style={styles.workflowNoticeText}>
              This submission is currently {getStatusLabel(submission.state)} and can no longer be changed by the supervisor.
            </Text>
          </View>
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  studentTop: {
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
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  studentMeta: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 8,
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileIcon: {
    width: 44,
    height: 44,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  fileSize: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  openBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  openBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D1B2A',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#6B7280',
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
  textArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0D1B2A',
    minHeight: 120,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: '#22C55E',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  returnBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.65,
  },
  workflowNotice: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  workflowNoticeText: {
    flex: 1,
    color: '#1E56A0',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  historyLoadingState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  historyLoadingText: {
    color: '#6B7280',
    fontSize: 13,
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1E56A0',
    marginTop: 5,
  },
  historyBody: {
    flex: 1,
  },
  historyLabel: {
    color: '#0D1B2A',
    fontSize: 14,
    fontWeight: '700',
  },
  historyMeta: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  historyDetail: {
    color: '#374151',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  historyEmptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  historyEmptyText: {
    color: '#6B7280',
    fontSize: 13,
  },
  emptyState: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    color: '#0D1B2A',
    fontWeight: '800',
    fontSize: 17,
  },
  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
