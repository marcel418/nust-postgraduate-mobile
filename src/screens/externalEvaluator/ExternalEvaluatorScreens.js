// src/screens/externalEvaluator/ExternalEvaluatorScreens.js

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

const colors = {
  header: '#0D1B2A',
  primary: '#1E56A0',
  background: '#F0F2F5',
  card: '#FFFFFF',
  text: '#0D1B2A',
  muted: '#6B7280',
  softBlue: '#EFF6FF',
  warning: '#F59E0B',
  success: '#22C55E',
  danger: '#EF4444',
  purple: '#7C3AED',
};

function ExtHeader({ title, navigation, showBack = false }) {
  return (
    <View style={s.header}>
      {showBack ? (
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ) : (
        <Text style={s.headerTitle}>{title}</Text>
      )}

      {showBack && <Text style={s.headerTitleCenter}>{title}</Text>}

      <View style={s.headerIcons}>
        <TouchableOpacity onPress={() => navigation.navigate('ExtNotifications')}>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('ExtProfile')}>
          <Ionicons name="person-circle-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

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

function getInitials(name) {
  if (!name) return 'EE';

  return name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
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
      documentId: parsed.documentId || null,
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

function statusLabel(status) {
  return (
    {
      EXTERNAL_EVAL_ASSIGNED: 'Pending',
      EXTERNAL_EVAL_COMPLETED: 'Completed',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
    }[status] || formatLabel(status)
  );
}

function statusColor(status) {
  return (
    {
      EXTERNAL_EVAL_ASSIGNED: colors.warning,
      EXTERNAL_EVAL_COMPLETED: colors.success,
      APPROVED: colors.success,
      REJECTED: colors.danger,
    }[status] || colors.muted
  );
}

function normalizeAssignment(item = {}) {
  const details = parseDescription(item.description);
  const state = item.current_state || item.workflow_state || 'UNKNOWN';

  return {
    id: item.id,
    raw: item,
    title: item.title || details.fileName || 'Assigned Thesis',
    type: formatLabel(item.submission_type || 'THESIS'),
    workflowState: state,
    status: state,
    document: details.fileName || item.title || 'Attached thesis document',
    documentSize: details.fileSize || 'Metadata saved',
    documentId: details.documentId,
    reportingPeriod: details.reportingPeriod || 'N/A',
    assignmentNote: details.comments || item.description || '',
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
    supervisor: item.supervisor_name || 'Supervisor Review Completed',
    dueDate: item.due_at || item.updated_at || item.created_at,
    assignedAt: item.updated_at || item.created_at,
  };
}

function useExternalAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAssignments = useCallback(async () => {
    try {
      const response = await submissionsApi.list();
      const items = response?.data?.items || response?.items || [];

      const normalized = items
        .map(normalizeAssignment)
        .filter((item) =>
          ['EXTERNAL_EVAL_ASSIGNED', 'EXTERNAL_EVAL_COMPLETED'].includes(
            item.workflowState
          )
        )
        .sort(
          (a, b) =>
            new Date(b.assignedAt || 0) - new Date(a.assignedAt || 0)
        );

      setAssignments(normalized);
    } catch (error) {
      Alert.alert(
        'Could not load assignments',
        error?.message || 'Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  const refresh = () => {
    setRefreshing(true);
    loadAssignments();
  };

  return {
    assignments,
    loading,
    refreshing,
    refresh,
    reload: loadAssignments,
  };
}

function AssignmentCard({ item, onPress }) {
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
              backgroundColor: statusColor(item.workflowState),
            },
          ]}
        >
          <Text style={s.statusPillText}>
            {statusLabel(item.workflowState)}
          </Text>
        </View>
      </View>

      <Text style={s.cardTitle} numberOfLines={2}>
        {item.title}
      </Text>

      <Text style={s.infoText}>
        {item.student.name} · {item.student.course}
      </Text>

      <Text style={s.infoText}>Supervisor: {item.supervisor}</Text>

      <View style={s.cardMeta}>
        <Ionicons name="document-text-outline" size={13} color={colors.primary} />
        <Text style={[s.cardMetaText, { color: colors.primary }]}>
          {' '}
          {item.document} · {item.documentSize}
        </Text>
      </View>

      <View style={s.cardMeta}>
        <Ionicons name="calendar-outline" size={13} color={colors.warning} />
        <Text style={[s.cardMetaText, { color: colors.warning }]}>
          {' '}
          Due {formatDate(item.dueDate)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export function ExternalEvaluatorDashboard({ navigation }) {
  const { assignments, loading, refreshing, refresh } = useExternalAssignments();

  const assigned = assignments.length;
  const pending = assignments.filter(
    (item) => item.workflowState === 'EXTERNAL_EVAL_ASSIGNED'
  ).length;
  const completed = assignments.filter(
    (item) => item.workflowState === 'EXTERNAL_EVAL_COMPLETED'
  ).length;

  const cards = [
    {
      count: assigned,
      label: 'Assigned Theses',
      icon: 'document-text-outline',
      color: colors.primary,
      screen: 'ExtTheses',
    },
    {
      count: pending,
      label: 'Pending Grading',
      icon: 'time-outline',
      color: colors.warning,
      screen: 'ExtTheses',
    },
    {
      count: completed,
      label: 'Completed',
      icon: 'checkmark-circle-outline',
      color: colors.success,
      screen: 'ExtClaims',
    },
  ];

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ExtHeader title="Dashboard" navigation={navigation} />

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
                  navigation.navigate('ExtTabs', {
                    screen: card.screen,
                  })
                }
              >
                <Text style={s.viewMore}>View More Info</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={s.sectionTitle}>Recent Assignments</Text>

        {assignments.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="folder-open-outline" size={42} color="#9BA4B5" />
            <Text style={s.emptyTitle}>No assignments yet</Text>
            <Text style={s.emptyText}>
              External evaluation tasks assigned by FPGC will appear here.
            </Text>
          </View>
        ) : (
          assignments.slice(0, 3).map((item) => (
            <AssignmentCard
              key={item.id}
              item={item}
              onPress={() =>
                navigation.navigate('ExtThesisDetail', {
                  assignment: item,
                })
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

export function ExternalEvaluatorTheses({ navigation }) {
  const { assignments, loading, refreshing, refresh } = useExternalAssignments();

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ExtHeader title="Thesis Review" navigation={navigation} />

      <FlatList
        data={assignments}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        renderItem={({ item }) => (
          <AssignmentCard
            item={item}
            onPress={() =>
              navigation.navigate('ExtThesisDetail', {
                assignment: item,
              })
            }
          />
        )}
        ListEmptyComponent={
          <View style={s.emptyCard}>
            <Ionicons name="document-text-outline" size={42} color="#9BA4B5" />
            <Text style={s.emptyTitle}>No thesis assignments</Text>
            <Text style={s.emptyText}>
              Assigned theses will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

export function ExternalEvaluatorThesisDetail({ route, navigation }) {
  const { assignment } = route.params;

  const [checklist, setChecklist] = useState({
    originality: false,
    methodology: false,
    writing: false,
    references: false,
  });

  const [recommendation, setRecommendation] = useState(null);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [comments, setComments] = useState('');
  const [grade, setGrade] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [openingDocument, setOpeningDocument] = useState(false);

  const canSubmit = assignment.workflowState === 'EXTERNAL_EVAL_ASSIGNED';

  const recommendations = [
    'Approved',
    'Minor Revisions',
    'Major Revisions',
    'Rejected',
  ];

  const checklistItems = [
    {
      key: 'originality',
      label: 'Originality and relevance',
    },
    {
      key: 'methodology',
      label: 'Methodology strength',
    },
    {
      key: 'writing',
      label: 'Writing quality and structure',
    },
    {
      key: 'references',
      label: 'References and citations',
    },
  ];

  const handleOpenDocument = async () => {
    if (!assignment?.documentId) {
      Alert.alert(
        'No Document',
        'This assignment does not have a linked uploaded document.'
      );
      return;
    }

    try {
      setOpeningDocument(true);
      await documentsApi.openDocument(assignment.documentId, assignment.document);
    } catch (error) {
      Alert.alert(
        'Could not open document',
        error?.message || 'Please try again.'
      );
    } finally {
      setOpeningDocument(false);
    }
  };

  const handleSubmit = async () => {
    const numericGrade = Number(grade);

    if (!canSubmit) {
      Alert.alert(
        'Already Completed',
        'This external evaluation is no longer open for submission.'
      );
      return;
    }

    if (!recommendation) {
      Alert.alert('Required', 'Please select a recommendation.');
      return;
    }

    if (!comments.trim()) {
      Alert.alert('Required', 'Please add comments.');
      return;
    }

    if (Number.isNaN(numericGrade) || numericGrade < 0 || numericGrade > 100) {
      Alert.alert('Invalid grade', 'Grade must be between 0 and 100.');
      return;
    }

    Alert.alert(
      'Submit Evaluation',
      `Submit external evaluation with grade ${numericGrade}%?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              setSubmitting(true);

              const checklistSummary = checklistItems
                .map((item) => `${item.label}: ${checklist[item.key] ? 'Yes' : 'No'}`)
                .join('\n');

              const finalComments = [
                comments.trim(),
                '',
                'Checklist:',
                checklistSummary,
              ].join('\n');

              await submissionsApi.submitExternalEvaluation(assignment.id, {
                grade: numericGrade,
                recommendation,
                comments: finalComments,
              });

              Alert.alert(
                'Submitted',
                'Evaluation submitted successfully.',
                [
                  {
                    text: 'OK',
                    onPress: () =>
                      navigation.navigate('ExtTabs', {
                        screen: 'ExtHome',
                      }),
                  },
                ]
              );
            } catch (error) {
              Alert.alert(
                'Submission Failed',
                error?.message || 'Could not submit the evaluation.'
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={s.container}>
      <ExtHeader title="Grade Thesis" navigation={navigation} showBack />

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <View style={s.docRow}>
            <View style={s.docIconBox}>
              <Ionicons name="document-attach-outline" size={22} color={colors.primary} />
            </View>

            <View style={s.docInfo}>
              <Text style={s.docName}>{assignment.document}</Text>
              <Text style={s.docSize}>{assignment.documentSize}</Text>
            </View>

            <TouchableOpacity
              style={[
                s.openBtn,
                (!assignment?.documentId || openingDocument) && { opacity: 0.65 },
              ]}
              onPress={handleOpenDocument}
              disabled={!assignment?.documentId || openingDocument}
            >
              {openingDocument ? (
                <ActivityIndicator color={colors.card} size="small" />
              ) : (
                <Text style={s.openBtnText}>
                  {assignment?.documentId ? 'Open' : 'No File'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.studentName}>{assignment.student.name}</Text>
          <Text style={s.infoText}>{assignment.student.course}</Text>
          <Text style={s.infoText}>Supervisor: {assignment.supervisor}</Text>
          <Text style={s.infoText}>Status: {statusLabel(assignment.workflowState)}</Text>

          {!!assignment.assignmentNote && (
            <View style={s.noteBox}>
              <Text style={s.noteLabel}>Assignment note</Text>
              <Text style={s.noteText}>{assignment.assignmentNote}</Text>
            </View>
          )}
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Checklist</Text>

          {checklistItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[s.checkRow, checklist[item.key] && s.checkRowActive]}
              onPress={() =>
                setChecklist((previous) => ({
                  ...previous,
                  [item.key]: !previous[item.key],
                }))
              }
              disabled={!canSubmit || submitting}
            >
              <View
                style={[
                  s.checkBox,
                  checklist[item.key] && s.checkBoxActive,
                ]}
              >
                {checklist[item.key] && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>

              <Text
                style={[
                  s.checkLabel,
                  checklist[item.key] && {
                    color: colors.text,
                    fontWeight: '600',
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Grade Input</Text>

          <View style={s.gradeRow}>
            <TextInput
              style={s.gradeInput}
              placeholder="Enter a value between 0-100"
              placeholderTextColor="#9BA4B5"
              keyboardType="numeric"
              value={grade}
              onChangeText={setGrade}
              maxLength={3}
              editable={canSubmit && !submitting}
            />

            <Text style={s.percentSymbol}>%</Text>
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Comments</Text>

          <TextInput
            style={s.textArea}
            placeholder="Add evaluation comments..."
            placeholderTextColor="#9BA4B5"
            value={comments}
            onChangeText={setComments}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            editable={canSubmit && !submitting}
          />
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Recommendation</Text>

          <TouchableOpacity
            style={s.dropdown}
            onPress={() => setShowRecommendations((value) => !value)}
            disabled={!canSubmit || submitting}
          >
            <Text
              style={[
                s.dropdownText,
                !recommendation && {
                  color: '#9BA4B5',
                },
              ]}
            >
              {recommendation || 'Select'}
            </Text>

            <Ionicons
              name={showRecommendations ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#6B7280"
            />
          </TouchableOpacity>

          {showRecommendations && (
            <View style={s.dropdownList}>
              {recommendations.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    s.dropdownItem,
                    recommendation === item && s.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setRecommendation(item);
                    setShowRecommendations(false);
                  }}
                >
                  <Text
                    style={[
                      s.dropdownItemText,
                      recommendation === item && {
                        color: colors.primary,
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Submit Evaluation</Text>

          <TouchableOpacity
            style={[
              s.submitBtn,
              (!canSubmit || submitting) && {
                opacity: 0.7,
              },
            ]}
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={s.submitBtnText}>
                {canSubmit ? 'Submit Evaluation' : 'Evaluation Completed'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export function ExternalEvaluatorClaims({ navigation }) {
  const { assignments, loading, refreshing, refresh } = useExternalAssignments();

  const completedAssignments = assignments.filter(
    (item) => item.workflowState === 'EXTERNAL_EVAL_COMPLETED'
  );

  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [claimAmount, setClaimAmount] = useState('');
  const [bankName, setBankName] = useState('Bank Windhoek');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('External Evaluator User');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedAssignmentId && completedAssignments.length > 0) {
      setSelectedAssignmentId(completedAssignments[0].id);
    }
  }, [completedAssignments, selectedAssignmentId]);

  const selectedAssignment = completedAssignments.find(
    (item) => item.id === selectedAssignmentId
  );

  const handleSubmit = async () => {
    if (!selectedAssignment?.id) {
      Alert.alert(
        'No Completed Evaluation',
        'Claims can only be submitted after an external evaluation is completed.'
      );
      return;
    }

    if (
      !claimAmount.trim() ||
      !bankName.trim() ||
      !accountNumber.trim() ||
      !accountHolder.trim()
    ) {
      Alert.alert('Required', 'Please complete the claim form.');
      return;
    }

    try {
      setSubmitting(true);

      await submissionsApi.submitExternalClaim(selectedAssignment.id, {
        amount: claimAmount.trim(),
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_holder: accountHolder.trim(),
        comments: comments.trim(),
      });

      Alert.alert('Submitted', 'Honorarium claim submitted successfully.', [
        {
          text: 'OK',
          onPress: () =>
            navigation.navigate('ExtTabs', {
              screen: 'ExtHome',
            }),
        },
      ]);
    } catch (error) {
      Alert.alert(
        'Claim Failed',
        error?.message || 'Could not submit claim.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ExtHeader title="Claim Honorarium" navigation={navigation} />

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        <View style={s.card}>
          <Text style={s.sectionTitle}>Completed Evaluations</Text>

          {completedAssignments.length === 0 ? (
            <View style={s.emptyInline}>
              <Ionicons name="information-circle-outline" size={24} color={colors.muted} />
              <Text style={s.emptyInlineText}>
                No completed external evaluations are available for claims yet.
              </Text>
            </View>
          ) : (
            completedAssignments.map((item) => {
              const selected = selectedAssignmentId === item.id;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[s.claimAssignmentCard, selected && s.claimAssignmentSelected]}
                  onPress={() => setSelectedAssignmentId(item.id)}
                  disabled={submitting}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.claimAssignmentTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={s.infoText}>
                      {item.student.name} · Completed {formatDate(item.assignedAt)}
                    </Text>
                  </View>

                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={selected ? colors.primary : '#9BA4B5'}
                  />
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Amount Input</Text>

          <View style={s.claimRow}>
            <Text style={s.claimCurrency}>N$</Text>

            <TextInput
              style={s.claimInput}
              placeholder="Enter amount"
              placeholderTextColor="#9BA4B5"
              keyboardType="numeric"
              value={claimAmount}
              onChangeText={setClaimAmount}
              editable={!submitting}
            />
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Bank Details</Text>

          <TextInput
            style={s.fieldInput}
            placeholder="Bank Name"
            placeholderTextColor="#9BA4B5"
            value={bankName}
            onChangeText={setBankName}
            editable={!submitting}
          />

          <TextInput
            style={s.fieldInput}
            placeholder="Account Number"
            placeholderTextColor="#9BA4B5"
            value={accountNumber}
            onChangeText={setAccountNumber}
            keyboardType="numeric"
            editable={!submitting}
          />

          <TextInput
            style={s.fieldInput}
            placeholder="Account Holder"
            placeholderTextColor="#9BA4B5"
            value={accountHolder}
            onChangeText={setAccountHolder}
            editable={!submitting}
          />
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Notes</Text>

          <TextInput
            style={[s.textArea, { minHeight: 96 }]}
            placeholder="Add claim notes if needed..."
            placeholderTextColor="#9BA4B5"
            value={comments}
            onChangeText={setComments}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!submitting}
          />
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Submit Claim</Text>

          <TouchableOpacity
            style={[
              s.submitBtn,
              (!selectedAssignment || submitting) && {
                opacity: 0.7,
              },
            ]}
            onPress={handleSubmit}
            disabled={!selectedAssignment || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={s.submitBtnText}>Submit Claim</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export function ExternalEvaluatorProfile({ navigation }) {
  const logout = useAuthStore((state) => state.logout);
  const authUser = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);

  const [institution, setInstitution] = useState('External Institution');
  const [expertise, setExpertise] = useState('Thesis Evaluation');
  const [phone, setPhone] = useState('+264 61 207 2000');
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const profile = {
    name: authUser?.name || 'External Evaluator User',
    email: authUser?.email || 'external@nust.na',
    role:
      Array.isArray(roles) && roles.length > 0
        ? roles[0]
        : 'EXTERNAL_EVALUATOR',
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      Alert.alert(
        'Saved',
        'Profile details updated locally for this session.'
      );
    } finally {
      setSaving(false);
    }
  };

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
      <ExtHeader title="Profile" navigation={navigation} />

      <View style={s.profileHero}>
        <View style={s.profileAvatar}>
          <Text style={s.profileAvatarText}>{getInitials(profile.name)}</Text>
        </View>

        <Text style={s.profileName}>{profile.name}</Text>

        <Text style={s.profileEmail}>{profile.email}</Text>

        <View style={s.rolePill}>
          <Text style={s.rolePillText}>{formatLabel(profile.role)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.profileScroll} showsVerticalScrollIndicator={false}>
        <View style={s.card}>
          <Text style={s.sectionTitle}>Profile Details</Text>

          <TextInput
            style={s.fieldInput}
            value={institution}
            onChangeText={setInstitution}
            placeholder="Institution"
            placeholderTextColor="#9BA4B5"
          />

          <TextInput
            style={s.fieldInput}
            value={expertise}
            onChangeText={setExpertise}
            placeholder="Expertise"
            placeholderTextColor="#9BA4B5"
          />

          <TextInput
            style={s.fieldInput}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone"
            placeholderTextColor="#9BA4B5"
          />
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Document Upload</Text>

          <View style={s.fileRow}>
            <View style={s.fileIcon}>
              <Ionicons name="document-text" size={20} color={colors.muted} />
            </View>

            <View style={s.fileInfo}>
              <Text style={s.fileName}>External_Evaluator_Profile.pdf</Text>
              <Text style={s.fileSize}>Optional profile document</Text>
            </View>
          </View>

          <TouchableOpacity
            style={s.openBtn}
            onPress={() =>
              Alert.alert(
                'Upload Coming Soon',
                'Document upload can be connected to the documents API later.'
              )
            }
          >
            <Text style={s.openBtnText}>Update</Text>
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Save Changes</Text>

          <TouchableOpacity
            style={[s.submitBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={s.submitBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[s.logoutBtn, signingOut && { opacity: 0.7 }]}
          onPress={handleLogout}
          disabled={signingOut}
        >
          {signingOut ? (
            <ActivityIndicator color={colors.danger} size="small" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              <Text style={s.logoutText}>Log Out</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export function ExternalEvaluatorNotifications({ navigation }) {
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
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ExtHeader title="Notifications" navigation={navigation} showBack />

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
                color={read ? colors.muted : colors.primary}
              />

              <View style={s.notifBody}>
                <Text
                  style={[
                    s.notifMessage,
                    !read && {
                      fontWeight: '600',
                      color: colors.text,
                    },
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
            <Text style={s.emptyText}>
              Workflow alerts will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  body: {
    padding: 16,
  },
  list: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  header: {
    backgroundColor: colors.header,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitleCenter: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  backBtn: {
    paddingRight: 6,
  },
  statCard: {
    backgroundColor: colors.card,
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
  statBody: {
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  statLabel: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 2,
    marginBottom: 4,
  },
  viewMore: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 10,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 10,
  },
  typePill: {
    backgroundColor: colors.header,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  typePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  statusPill: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  cardMetaText: {
    fontSize: 13,
    color: colors.muted,
  },
  cardMetaSep: {
    fontSize: 13,
    color: '#CBD5E1',
  },
  infoText: {
    fontSize: 13,
    color: colors.muted,
    marginBottom: 4,
  },
  noteBox: {
    backgroundColor: colors.softBlue,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  noteLabel: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  noteText: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 19,
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  docIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.softBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  docSize: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  openBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  openBtnText: {
    color: colors.card,
    fontWeight: '600',
    fontSize: 13,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  checkRowActive: {
    backgroundColor: colors.softBlue,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkLabel: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  gradeInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  percentSymbol: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.muted,
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: colors.text,
    minHeight: 110,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
  },
  dropdownText: {
    fontSize: 14,
    color: colors.text,
  },
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
  },
  dropdownItemActive: {
    backgroundColor: colors.softBlue,
  },
  dropdownItemText: {
    fontSize: 14,
    color: colors.text,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  submitBtnText: {
    color: colors.card,
    fontSize: 16,
    fontWeight: '700',
  },
  claimAssignmentCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  claimAssignmentSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.softBlue,
  },
  claimAssignmentTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  claimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  claimCurrency: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  claimInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  fieldInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
    marginBottom: 10,
  },
  profileHero: {
    backgroundColor: colors.header,
    paddingVertical: 24,
    alignItems: 'center',
  },
  profileAvatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 34,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  profileEmail: {
    color: '#9BA4B5',
    fontSize: 13,
    marginBottom: 8,
  },
  rolePill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  rolePillText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  profileScroll: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fileIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  fileSize: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  logoutBtn: {
    borderWidth: 1.5,
    borderColor: colors.danger,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.card,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '700',
  },
  notifCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
  },
  notifUnread: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  notifBody: {
    flex: 1,
  },
  notifMessage: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 6,
  },
  notifTime: {
    fontSize: 12,
    color: '#9BA4B5',
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyInline: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptyInlineText: {
    color: colors.muted,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});