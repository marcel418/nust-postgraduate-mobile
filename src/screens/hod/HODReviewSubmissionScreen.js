// src/screens/hod/HODReviewSubmissionScreen.js

import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import HODHeader from '../../components/HODHeader';
import { api } from '../../api/http';
import { documentsApi } from '../../api/documentsApi';

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

function getStatusColor(status) {
  return (
    {
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
    }[status] || '#6B7280'
  );
}

function getStatusLabel(status) {
  return (
    {
      APPROVED_BY_SUPERVISOR: 'Awaiting HOD Action',
      UNDER_INTERNAL_EVAL: 'Under Internal Evaluation',
      INTERNAL_EVAL_COMPLETED: 'Internal Evaluation Complete',
      FORWARDED_TO_FPGCR: 'Forwarded to FPGC-R',
      FORWARDED_TO_FPGC: 'Forwarded to FPGC',
      EXTERNAL_EVAL_ASSIGNED: 'External Evaluator Assigned',
      EXTERNAL_EVAL_COMPLETED: 'External Evaluation Complete',
      REVISIONS_REQUIRED: 'Revisions Required',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
    }[status] || formatLabel(status)
  );
}

function normalizeSubmission(submission = {}) {
  const details = parseDescription(submission.description);
  const state =
    submission.current_state ||
    submission.workflow_state ||
    submission.status ||
    'UNKNOWN';

  const studentId =
    submission.student?.id ||
    submission.student_id ||
    submission.studentId ||
    'N/A';

  const supervisorName =
    submission.supervisor?.name ||
    submission.supervisor_name ||
    'Supervisor Review Completed';

  return {
    id: submission.id,
    raw: submission,
    title: submission.title || details.fileName || submission.document || 'Submission',
    type: formatLabel(submission.submission_type || submission.type),
    state,
    document: details.fileName || submission.document || submission.title || 'Attached document',
    documentSize: details.fileSize || submission.documentSize || 'Metadata saved',
    documentId: details.documentId || submission.documentId || submission.document_id || null,
    reportingPeriod: details.reportingPeriod || submission.reportingPeriod || 'N/A',
    comments: details.comments || submission.comments || '',
    updatedAt: submission.updated_at || submission.updatedAt || submission.created_at || null,
    student: {
      id: studentId,
      name:
        submission.student?.name ||
        submission.student_name ||
        `Student ${String(studentId).slice(0, 8)}`,
      course:
        submission.student?.course ||
        submission.student_course ||
        submission.course ||
        'Postgraduate Programme',
    },
    supervisor: {
      name: supervisorName,
      role: submission.supervisor?.role || 'Supervisor',
    },
    supervisorNote: {
      message:
        submission.supervisorNote?.message ||
        submission.supervisor_note ||
        'The submission has been reviewed and approved by the supervisor.',
      timeAgo:
        submission.supervisorNote?.timeAgo ||
        (submission.updated_at ? formatDate(submission.updated_at) : 'Recently'),
    },
    evaluation: submission.evaluation || null,
  };
}

async function forwardToFPGCR(submissionId, comments) {
  return api.post(`/submissions/${submissionId}/hod/forward-fpgcr`, {
    comments,
  });
}

async function returnSubmission(submissionId, comments) {
  return api.post(`/submissions/${submissionId}/return`, {
    comments,
  });
}

export default function HODReviewSubmissionScreen({ route, navigation }) {
  const submission = useMemo(
    () => normalizeSubmission(route?.params?.submission || {}),
    [route?.params?.submission]
  );

  const [notes, setNotes] = useState('Internal evaluation reviewed by HOD.');
  const [loadingAction, setLoadingAction] = useState(false);
  const [openingDocument, setOpeningDocument] = useState(false);

  const canAssignInternal = submission.state === 'APPROVED_BY_SUPERVISOR';
  const canForwardToFPGCR = submission.state === 'INTERNAL_EVAL_COMPLETED';
  const canReturn = ['APPROVED_BY_SUPERVISOR', 'INTERNAL_EVAL_COMPLETED'].includes(submission.state);
  const isReadOnly = !canAssignInternal && !canForwardToFPGCR && !canReturn;

  const handleOpenDocument = async () => {
    if (!submission.documentId) {
      Alert.alert('No Document', 'This submission does not have a linked uploaded document.');
      return;
    }

    try {
      setOpeningDocument(true);
      await documentsApi.openDocument(submission.documentId, submission.document || 'document');
    } catch (error) {
      Alert.alert('Could not open document', error?.message || 'Please try again.');
    } finally {
      setOpeningDocument(false);
    }
  };

  const handleForward = () => {
    if (!canForwardToFPGCR) {
      Alert.alert(
        'Invalid Workflow State',
        `This submission is currently ${getStatusLabel(submission.state)}.`
      );
      return;
    }

    const finalNotes = notes.trim() || 'Internal evaluation completed. Forwarded to FPGC-R for review.';

    Alert.alert(
      'Forward to FPGC-R',
      `Forward "${submission.title}" to FPGC-R for review?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forward',
          onPress: async () => {
            try {
              setLoadingAction(true);
              await forwardToFPGCR(submission.id, finalNotes);

              Alert.alert('Forwarded', 'Submission forwarded to FPGC-R successfully.', [
                {
                  text: 'OK',
                  onPress: () =>
                    navigation.navigate('HODTabs', {
                      screen: 'HODSubmissions',
                    }),
                },
              ]);
            } catch (error) {
              Alert.alert('Forward Failed', error?.message || 'Could not forward submission.');
            } finally {
              setLoadingAction(false);
            }
          },
        },
      ]
    );
  };

  const handleReturn = () => {
    if (!canReturn) {
      Alert.alert(
        'Invalid Workflow State',
        `This submission is currently ${getStatusLabel(submission.state)}.`
      );
      return;
    }

    if (!notes.trim()) {
      Alert.alert('Required', 'Please add notes explaining what must be changed.');
      return;
    }

    Alert.alert('Return Submission', 'Return this submission for changes?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Return',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoadingAction(true);
            await returnSubmission(submission.id, notes.trim());

            Alert.alert('Returned', 'Submission has been returned for changes.', [
              {
                text: 'OK',
                onPress: () =>
                  navigation.navigate('HODTabs', {
                    screen: 'HODSubmissions',
                  }),
              },
            ]);
          } catch (error) {
            Alert.alert('Return Failed', error?.message || 'Could not return submission.');
          } finally {
            setLoadingAction(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <HODHeader title="Review Submission" navigation={navigation} showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.studentName}>{submission.student.name}</Text>
              <Text style={styles.infoText}>Student No: {submission.student.id}</Text>
              <Text style={styles.infoText}>Course: {submission.student.course}</Text>
              <Text style={styles.infoText}>Reporting period: {submission.reportingPeriod}</Text>
            </View>

            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(submission.state) }]}>
              <Text style={styles.statusBadgeText}>{getStatusLabel(submission.state)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Submission</Text>
          <Text style={styles.submissionTitle}>{submission.title}</Text>
          <Text style={styles.infoText}>Type: {submission.type}</Text>
          <Text style={styles.infoText}>Updated: {formatDate(submission.updatedAt)}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.docRow}>
            <View style={styles.docIconBox}>
              <Ionicons name="document-attach-outline" size={24} color="#1E56A0" />
            </View>

            <View style={styles.docInfo}>
              <Text style={styles.docName} numberOfLines={2}>
                {submission.document}
              </Text>
              <Text style={styles.docSize}>{submission.documentSize}</Text>
            </View>

            <TouchableOpacity
              style={[styles.openBtn, (!submission.documentId || openingDocument) && styles.disabled]}
              onPress={handleOpenDocument}
              disabled={!submission.documentId || openingDocument}
            >
              {openingDocument ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.openBtnText}>{submission.documentId ? 'Open' : 'No File'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {!!submission.comments && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Student Comments</Text>
            <Text style={styles.bodyText}>{submission.comments}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Supervisor Notes</Text>

          <View style={styles.supervisorRow}>
            <View style={styles.supervisorAvatar}>
              <Text style={styles.supervisorAvatarText}>
                {submission.supervisor.name
                  .split(' ')
                  .filter(Boolean)
                  .map((word) => word[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </Text>
            </View>

            <Text style={styles.supervisorName}>
              {submission.supervisor.name} · {submission.supervisor.role}
            </Text>
          </View>

          <Text style={styles.supervisorMessage}>{submission.supervisorNote.message}</Text>
          <Text style={styles.timeAgo}>{submission.supervisorNote.timeAgo}</Text>
        </View>

        {submission.state === 'UNDER_INTERNAL_EVAL' && (
          <View style={styles.noticeCard}>
            <Ionicons name="time-outline" size={22} color="#7C3AED" />
            <Text style={styles.noticeText}>
              This submission is currently with an internal evaluator. HOD action will be available once the evaluation is completed.
            </Text>
          </View>
        )}

        {submission.state === 'INTERNAL_EVAL_COMPLETED' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Internal Evaluation Result</Text>
            <View style={styles.resultRow}>
              <Ionicons name="checkmark-circle-outline" size={22} color="#22C55E" />
              <Text style={styles.bodyText}>
                Internal evaluation has been completed. Review the document and forward it to FPGC-R, or return it for changes.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>HOD Notes</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add notes before taking action..."
            placeholderTextColor="#9BA4B5"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!loadingAction && !isReadOnly}
          />
        </View>

        {canAssignInternal && (
          <TouchableOpacity
            style={styles.assignLink}
            onPress={() => navigation.navigate('HODAssignInternalEvaluator', { submission: submission.raw || submission })}
          >
            <Ionicons name="person-add-outline" size={18} color="#1E56A0" />
            <Text style={styles.assignLinkText}>Assign Internal Evaluator</Text>
          </TouchableOpacity>
        )}

        {canForwardToFPGCR && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>HOD Decision</Text>

            {loadingAction ? (
              <ActivityIndicator size="large" color="#1E56A0" />
            ) : (
              <View style={styles.actionColumn}>
                <TouchableOpacity style={styles.forwardBtn} onPress={handleForward}>
                  <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Forward to FPGC-R</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.returnBtn} onPress={handleReturn}>
                  <Ionicons name="return-up-back-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Return for Changes</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {isReadOnly && (
          <View style={styles.noticeCard}>
            <Ionicons name="lock-closed-outline" size={22} color="#6B7280" />
            <Text style={styles.noticeText}>
              This item is read-only for HOD because it is currently {getStatusLabel(submission.state)}.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 },
  cardTopRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  studentName: { fontSize: 16, fontWeight: '600', color: '#0D1B2A', marginBottom: 4 },
  submissionTitle: { fontSize: 15, fontWeight: '700', color: '#0D1B2A', lineHeight: 22, marginBottom: 8 },
  infoText: { fontSize: 13, color: '#6B7280', marginBottom: 3 },
  bodyText: { fontSize: 14, color: '#374151', lineHeight: 20, flex: 1 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, maxWidth: 150 },
  statusBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700', textAlign: 'center' },
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
    minWidth: 70,
    alignItems: 'center',
  },
  openBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0D1B2A', marginBottom: 12 },
  supervisorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  supervisorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E56A0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supervisorAvatarText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 12 },
  supervisorName: { fontSize: 14, fontWeight: '600', color: '#0D1B2A', flex: 1 },
  supervisorMessage: { fontSize: 14, color: '#6B7280', lineHeight: 21, marginBottom: 6 },
  timeAgo: { fontSize: 12, color: '#9BA4B5' },
  resultRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0D1B2A',
    minHeight: 96,
    textAlignVertical: 'top',
  },
  assignLink: {
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  assignLinkText: { color: '#1E56A0', fontSize: 14, fontWeight: '700' },
  actionColumn: { gap: 10 },
  forwardBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  returnBtn: {
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
  noticeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  noticeText: { color: '#6B7280', fontSize: 13, lineHeight: 19, flex: 1 },
  disabled: { opacity: 0.6 },
});
