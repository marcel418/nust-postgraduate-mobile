// src/screens/hod/HODWorkflowScreens.js

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { usersApi } from '../../api/usersApi';
import { submissionsApi } from '../../api/submissionsApi';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

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

function getInitials(name) {
  if (!name) return '?';

  return String(name)
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
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

  return {
    id: submission.id,
    raw: submission,
    title: submission.title || details.fileName || submission.document || 'Submission',
    type: submission.type || formatLabel(submission.submission_type),
    state,
    document: details.fileName || submission.document || submission.title || 'Attached document',
    documentSize: details.fileSize || submission.documentSize || 'Metadata saved',
    documentId: details.documentId || submission.documentId || submission.document_id || null,
    reportingPeriod: details.reportingPeriod || submission.reportingPeriod || 'N/A',
    comments: details.comments || submission.comments || '',
    studentName:
      submission.student?.name ||
      submission.student_name ||
      `Student ${String(studentId).slice(0, 8)}`,
    studentId,
    course:
      submission.student?.course ||
      submission.student_course ||
      submission.course ||
      'Postgraduate Programme',
    updatedAt: submission.updated_at || submission.created_at || submission.deadline || null,
  };
}

function CalendarPicker({ selectedDate, onSelectDate }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const isSelected = (day) =>
    selectedDate &&
    day &&
    selectedDate.getDate() === day &&
    selectedDate.getMonth() === month &&
    selectedDate.getFullYear() === year;

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((currentYear) => currentYear - 1);
    } else {
      setMonth((currentMonth) => currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((currentYear) => currentYear + 1);
    } else {
      setMonth((currentMonth) => currentMonth + 1);
    }
  };

  return (
    <View>
      <View style={cal.nav}>
        <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
          <Ionicons name="chevron-back" size={20} color="#0D1B2A" />
        </TouchableOpacity>

        <Text style={cal.monthYear}>
          {MONTHS[month]} {year}
        </Text>

        <TouchableOpacity onPress={nextMonth} style={cal.navBtn}>
          <Ionicons name="chevron-forward" size={20} color="#0D1B2A" />
        </TouchableOpacity>
      </View>

      <View style={cal.dayNames}>
        {DAYS.map((day) => (
          <Text key={day} style={cal.dayName}>
            {day}
          </Text>
        ))}
      </View>

      <View style={cal.grid}>
        {cells.map((day, index) => (
          <TouchableOpacity
            key={`${day || 'empty'}-${index}`}
            disabled={!day}
            style={[cal.cell, isSelected(day) && cal.selectedCell]}
            onPress={() => day && onSelectDate(new Date(year, month, day))}
          >
            <Text
              style={[
                cal.cellText,
                isSelected(day) && cal.selectedText,
                !day && { opacity: 0 },
              ]}
            >
              {day || 0}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {selectedDate ? (
        <Text style={cal.selectedLabel}>
          Selected:{' '}
          {selectedDate.toLocaleDateString('en-NA', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </Text>
      ) : null}
    </View>
  );
}

async function forwardToFPGCR(submissionId, comments) {
  return api.post(`/submissions/${submissionId}/hod/forward-fpgcr`, {
    comments,
  });
}

function DocumentSummaryCard({ submission, onOpenDocument, openingDocument, onReview }) {
  return (
    <View style={styles.card}>
      <View style={styles.docRow}>
        <View style={styles.docIconBox}>
          <Ionicons name="document-attach-outline" size={22} color="#1E56A0" />
        </View>

        <View style={styles.docInfo}>
          <Text style={styles.docName} numberOfLines={2}>
            {submission.document}
          </Text>
          <Text style={styles.docSize}>
            {submission.documentSize} · {submission.type}
          </Text>
          <Text style={styles.docSize}>Status: {formatLabel(submission.state)}</Text>
        </View>
      </View>

      <View style={styles.docButtonRow}>
        <TouchableOpacity
          style={[styles.openBtn, (!submission.documentId || openingDocument) && styles.disabled]}
          onPress={onOpenDocument}
          disabled={!submission.documentId || openingDocument}
        >
          {openingDocument ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.openBtnText}>{submission.documentId ? 'Open File' : 'No File'}</Text>
          )}
        </TouchableOpacity>

        {onReview ? (
          <TouchableOpacity style={styles.reviewBtn} onPress={onReview}>
            <Text style={styles.reviewBtnText}>Review</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {!!submission.comments && (
        <View style={styles.commentsBox}>
          <Text style={styles.commentsLabel}>Student comments</Text>
          <Text style={styles.commentsText}>{submission.comments}</Text>
        </View>
      )}
    </View>
  );
}

export function HODAssignInternalEvaluatorScreen({ route, navigation }) {
  const submission = route?.params?.submission || {};
  const normalizedSubmission = useMemo(() => normalizeSubmission(submission), [submission]);

  const [evaluators, setEvaluators] = useState([]);
  const [selectedEvaluator, setSelectedEvaluator] = useState(null);
  const [showList, setShowList] = useState(false);
  const [deadline, setDeadline] = useState(null);
  const [comments, setComments] = useState('Assigned for internal evaluation.');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [openingDocument, setOpeningDocument] = useState(false);

  const loadEvaluators = useCallback(async () => {
    try {
      setLoading(true);
      const response = await usersApi.listByRole('INTERNAL_EVALUATOR');
      const items = response?.data?.items || response?.items || [];
      setEvaluators(items);

      if (!selectedEvaluator && items.length > 0) {
        setSelectedEvaluator(items[0]);
      }
    } catch (error) {
      Alert.alert('Could not load evaluators', error?.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedEvaluator]);

  useEffect(() => {
    loadEvaluators();
  }, [loadEvaluators]);

  const handleOpenDocument = async () => {
    if (!normalizedSubmission.documentId) {
      Alert.alert('No Document', 'This submission does not have a linked uploaded document.');
      return;
    }

    try {
      setOpeningDocument(true);
      await documentsApi.openDocument(normalizedSubmission.documentId, normalizedSubmission.document);
    } catch (error) {
      Alert.alert('Could not open document', error?.message || 'Please try again.');
    } finally {
      setOpeningDocument(false);
    }
  };

  const handleAssign = () => {
    if (!normalizedSubmission.id) {
      Alert.alert('Missing Submission', 'No submission was passed to this screen.');
      return;
    }

    if (!selectedEvaluator?.id) {
      Alert.alert('Required', 'Please select an internal evaluator.');
      return;
    }

    if (!deadline) {
      Alert.alert('Required', 'Please select a deadline.');
      return;
    }

    if (normalizedSubmission.state !== 'APPROVED_BY_SUPERVISOR') {
      Alert.alert(
        'Invalid Workflow State',
        `This submission is currently ${formatLabel(normalizedSubmission.state)}. Only supervisor-approved submissions can be assigned.`
      );
      return;
    }

    Alert.alert(
      'Assign Internal Evaluator',
      `Assign ${selectedEvaluator.name} to evaluate "${normalizedSubmission.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: async () => {
            try {
              setAssigning(true);

              const assignmentComments = [
                comments.trim() || 'Assigned for internal evaluation.',
                `Deadline: ${deadline.toLocaleDateString('en-NA', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}`,
              ].join('\n');

              await submissionsApi.assignInternalEvaluator(normalizedSubmission.id, {
                evaluator_id: selectedEvaluator.id,
                comments: assignmentComments,
              });

              Alert.alert('Assigned', `${selectedEvaluator.name} assigned successfully.`, [
                {
                  text: 'OK',
                  onPress: () =>
                    navigation.navigate('HODTabs', {
                      screen: 'HODAssignments',
                    }),
                },
              ]);
            } catch (error) {
              Alert.alert('Assignment Failed', error?.message || 'Could not assign evaluator. Try again.');
            } finally {
              setAssigning(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#1E56A0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HODHeader title="Assign Internal Evaluator" navigation={navigation} showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryIcon}>
              <Ionicons name="person-outline" size={24} color="#1E56A0" />
            </View>

            <View style={styles.summaryInfo}>
              <Text style={styles.studentName}>{normalizedSubmission.studentName}</Text>
              <Text style={styles.infoText}>Student No: {normalizedSubmission.studentId}</Text>
              <Text style={styles.infoText}>Course: {normalizedSubmission.course}</Text>
              <Text style={styles.infoText}>Reporting period: {normalizedSubmission.reportingPeriod}</Text>
            </View>
          </View>
        </View>

        <DocumentSummaryCard
          submission={normalizedSubmission}
          openingDocument={openingDocument}
          onOpenDocument={handleOpenDocument}
          onReview={() => navigation.navigate('HODReviewSubmission', { submission })}
        />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Select Evaluator</Text>

          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowList((value) => !value)}
            disabled={assigning}
          >
            <Text style={[styles.dropdownText, !selectedEvaluator && { color: '#9BA4B5' }]}>
              {selectedEvaluator ? selectedEvaluator.name : 'Select an evaluator'}
            </Text>

            <Ionicons name={showList ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
          </TouchableOpacity>

          {showList && (
            <View style={styles.dropdownList}>
              {evaluators.length === 0 ? (
                <View style={styles.emptyEvaluator}>
                  <Text style={styles.emptyEvaluatorText}>No internal evaluators found.</Text>
                </View>
              ) : (
                evaluators.map((evaluator) => {
                  const selected = selectedEvaluator?.id === evaluator.id;
                  const role = Array.isArray(evaluator.roles) ? evaluator.roles[0] : 'INTERNAL_EVALUATOR';

                  return (
                    <TouchableOpacity
                      key={evaluator.id}
                      style={[styles.dropdownItem, selected && styles.dropdownItemActive]}
                      onPress={() => {
                        setSelectedEvaluator(evaluator);
                        setShowList(false);
                      }}
                      disabled={assigning}
                    >
                      <View style={styles.evalMiniAvatar}>
                        <Text style={styles.evalMiniAvatarText}>{getInitials(evaluator.name)}</Text>
                      </View>

                      <View style={styles.evalDropdownInfo}>
                        <Text
                          style={[
                            styles.dropdownItemText,
                            selected && { color: '#1E56A0', fontWeight: '700' },
                          ]}
                        >
                          {evaluator.name}
                        </Text>
                        <Text style={styles.evaluatorMeta}>
                          {evaluator.email} · {formatLabel(role)}
                        </Text>
                      </View>

                      {selected && <Ionicons name="checkmark" size={18} color="#1E56A0" />}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Select Deadline</Text>
          <CalendarPicker selectedDate={deadline} onSelectDate={setDeadline} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Assignment Comments</Text>
          <TextInput
            value={comments}
            onChangeText={setComments}
            placeholder="Add assignment notes or instructions"
            placeholderTextColor="#9BA4B5"
            multiline
            textAlignVertical="top"
            editable={!assigning}
            style={styles.textArea}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Assign Evaluator</Text>

          {selectedEvaluator ? <Text style={styles.selectedLabel}>Selected: {selectedEvaluator.name}</Text> : null}
          {deadline ? <Text style={styles.selectedLabel}>Deadline: {formatDate(deadline)}</Text> : null}

          <TouchableOpacity
            style={[styles.assignBtn, assigning && styles.disabled]}
            onPress={handleAssign}
            disabled={assigning}
          >
            {assigning ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
                <Text style={styles.assignBtnText}>Assign</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export function HODProposeExternalScreen({ route, navigation }) {
  const submission = route?.params?.submission || {};
  const normalizedSubmission = useMemo(() => normalizeSubmission(submission), [submission]);

  const [comments, setComments] = useState('Internal evaluation completed. Forwarded to FPGC-R for review.');
  const [loading, setLoading] = useState(false);
  const [openingDocument, setOpeningDocument] = useState(false);

  const canForward = normalizedSubmission.state === 'INTERNAL_EVAL_COMPLETED';

  const handleOpenDocument = async () => {
    if (!normalizedSubmission.documentId) {
      Alert.alert('No Document', 'This submission does not have a linked uploaded document.');
      return;
    }

    try {
      setOpeningDocument(true);
      await documentsApi.openDocument(normalizedSubmission.documentId, normalizedSubmission.document);
    } catch (error) {
      Alert.alert('Could not open document', error?.message || 'Please try again.');
    } finally {
      setOpeningDocument(false);
    }
  };

  const handleForward = () => {
    if (!normalizedSubmission.id) {
      Alert.alert('Missing Submission', 'No submission was passed to this screen.');
      return;
    }

    if (!canForward) {
      Alert.alert(
        'Invalid Workflow State',
        `This submission is currently ${formatLabel(normalizedSubmission.state)}.`
      );
      return;
    }

    Alert.alert(
      'Forward to FPGC-R',
      `Forward "${normalizedSubmission.title}" to FPGC-R for review?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forward',
          onPress: async () => {
            try {
              setLoading(true);
              await forwardToFPGCR(normalizedSubmission.id, comments.trim() || 'Forwarded to FPGC-R for review.');

              Alert.alert('Forwarded', 'Submission forwarded to FPGC-R successfully.', [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('HODDashboard'),
                },
              ]);
            } catch (error) {
              Alert.alert('Forward Failed', error?.message || 'Could not forward submission.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <HODHeader title="Forward to FPGC-R" navigation={navigation} showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.studentName}>{normalizedSubmission.studentName}</Text>
          <Text style={styles.infoText}>{normalizedSubmission.course}</Text>
          <Text style={[styles.infoText, styles.italicTitle]}>
            "{normalizedSubmission.title}"
          </Text>
          <Text style={styles.infoText}>Status: {formatLabel(normalizedSubmission.state)}</Text>
        </View>

        <DocumentSummaryCard
          submission={normalizedSubmission}
          openingDocument={openingDocument}
          onOpenDocument={handleOpenDocument}
          onReview={() => navigation.navigate('HODReviewSubmission', { submission })}
        />

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Forwarding Comments</Text>
          <TextInput
            value={comments}
            onChangeText={setComments}
            placeholder="Add comments for FPGC-R..."
            placeholderTextColor="#9BA4B5"
            multiline
            textAlignVertical="top"
            editable={!loading && canForward}
            style={styles.textArea}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Submit to FPGC-R</Text>

          <TouchableOpacity
            style={[styles.forwardBtn, (!canForward || loading) && styles.disabled]}
            onPress={handleForward}
            disabled={!canForward || loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                <Text style={styles.assignBtnText}>Forward to FPGC-R</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  loading: {
    flex: 1,
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '600', color: '#0D1B2A', marginBottom: 4 },
  infoText: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  italicTitle: { fontStyle: 'italic', marginTop: 4 },
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
  docButtonRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  openBtn: {
    flex: 1,
    backgroundColor: '#1E56A0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
  },
  openBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  reviewBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  reviewBtnText: { color: '#1E56A0', fontWeight: '700', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0D1B2A', marginBottom: 12 },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
  },
  dropdownText: { fontSize: 14, color: '#0D1B2A', flex: 1 },
  dropdownList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownItemActive: { backgroundColor: '#EFF6FF' },
  dropdownItemText: { fontSize: 14, color: '#0D1B2A' },
  evalMiniAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E56A0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evalMiniAvatarText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  evalDropdownInfo: { flex: 1 },
  evaluatorMeta: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  emptyEvaluator: { padding: 16, alignItems: 'center' },
  emptyEvaluatorText: { color: '#6B7280', fontSize: 13 },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    minHeight: 110,
    color: '#0D1B2A',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  commentsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
    gap: 4,
  },
  commentsLabel: { color: '#6B7280', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  commentsText: { color: '#374151', fontSize: 13, lineHeight: 19 },
  assignBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  forwardBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  assignBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  selectedLabel: { fontSize: 14, color: '#1E56A0', fontWeight: '500', marginBottom: 12 },
  disabled: { opacity: 0.6 },
});

const cal = StyleSheet.create({
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  navBtn: { padding: 8 },
  monthYear: { fontSize: 15, fontWeight: 'bold', color: '#0D1B2A' },
  dayNames: { flexDirection: 'row', marginBottom: 4 },
  dayName: { flex: 1, textAlign: 'center', fontSize: 12, color: '#6B7280', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  selectedCell: { backgroundColor: '#1E56A0' },
  cellText: { fontSize: 13, color: '#0D1B2A', fontWeight: '500' },
  selectedText: { color: '#FFFFFF', fontWeight: '800' },
  selectedLabel: { marginTop: 10, color: '#1E56A0', fontSize: 13, fontWeight: '700' },
});
