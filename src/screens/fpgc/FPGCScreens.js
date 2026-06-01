// src/screens/fpgc/FPGCScreens.js

import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { api } from '../../api/http';
import { submissionsApi } from '../../api/submissionsApi';
import { usersApi } from '../../api/usersApi';
import { documentsApi } from '../../api/documentsApi';
import DeadlineExtensionControl from '../../components/common/DeadlineExtensionControl';
import { useAuthStore } from '../../store/authStore';
import StatusFilterDropdown from '../../components/common/StatusFilterDropdown';
import {
  ALL_STATUS_VALUE,
  SUBMISSION_STATUS_FILTER_OPTIONS,
  filterItemsByStatus,
} from '../../utils/statusFilters';

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
  if (!name) return '?';

  return String(name)
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
      mimeType: '',
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
      mimeType: parsed.mimeType || '',
      documentId:
        parsed.documentId ||
        parsed.document_id ||
        parsed.document?.id ||
        null,
    };
  } catch {
    return {
      comments: description,
      reportingPeriod: 'N/A',
      fileName: '',
      fileSize: '',
      mimeType: '',
      documentId: null,
    };
  }
}

function normalizeSubmission(item = {}) {
  const details = parseDescription(item.description);
  const state = item.current_state || item.workflow_state || 'UNKNOWN';

  return {
    id: item.id,
    raw: item,
    title: item.title || details.fileName || 'Submission',
    type: formatLabel(item.submission_type),
    status: state,
    document: details.fileName || item.title || 'Attached document',
    documentSize: details.fileSize || 'Metadata saved',
    documentId: details.documentId,
    mimeType: details.mimeType,
    reportingPeriod: details.reportingPeriod || 'N/A',
    studentComments: details.comments || '',
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
    updatedAt: item.updated_at || item.created_at,
  };
}

function getStatusColor(status) {
  return (
    {
      FORWARDED_TO_FPGC: '#F59E0B',
      APPROVED: '#22C55E',
      REJECTED: '#EF4444',
      EXTERNAL_EVAL_ASSIGNED: '#7C3AED',
      EXTERNAL_EVAL_COMPLETED: '#22C55E',
    }[status] || '#6B7280'
  );
}

function getStatusLabel(status) {
  return (
    {
      FORWARDED_TO_FPGC: 'Awaiting Final Decision',
      APPROVED: 'Approved',
      REJECTED: 'Rejected',
      EXTERNAL_EVAL_ASSIGNED: 'External Evaluator Assigned',
      EXTERNAL_EVAL_COMPLETED: 'External Evaluation Complete',
    }[status] || formatLabel(status)
  );
}

function FPGCHeader({ title, navigation, showBack = false }) {
  return (
    <View style={s.header}>
      {showBack ? (
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
      ) : (
        <Text style={s.headerTitle}>{title}</Text>
      )}

      {showBack && <Text style={s.headerTitleCenter}>{title}</Text>}

      <View style={s.headerIcons}>
        <TouchableOpacity onPress={() => navigation.navigate('FPGCNotifications')}>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('FPGCProfile')}>
          <Ionicons name="person-circle-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function useFPGCSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await submissionsApi.list();
      const items = response?.data?.items || response?.items || [];

      const normalized = items
        .map(normalizeSubmission)
        .filter((item) =>
          [
            'FORWARDED_TO_FPGC',
            'APPROVED',
            'REJECTED',
            'EXTERNAL_EVAL_ASSIGNED',
            'EXTERNAL_EVAL_COMPLETED',
          ].includes(item.status)
        )
        .sort(
          (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
        );

      setSubmissions(normalized);
    } catch (error) {
      Alert.alert(
        'Could not load FPGC submissions',
        error?.message || 'Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = () => {
    setRefreshing(true);
    load();
  };

  return {
    submissions,
    loading,
    refreshing,
    refresh,
    reload: load,
  };
}

function useExternalEvaluators() {
  const [evaluators, setEvaluators] = useState([]);
  const [loadingEvaluators, setLoadingEvaluators] = useState(false);

  const loadEvaluators = useCallback(async () => {
    try {
      setLoadingEvaluators(true);
      const response = await usersApi.listByRole('EXTERNAL_EVALUATOR');
      const items = response?.data?.items || response?.items || [];
      setEvaluators(items);
    } catch (error) {
      Alert.alert(
        'Could not load external evaluators',
        error?.message || 'Please try again.'
      );
    } finally {
      setLoadingEvaluators(false);
    }
  }, []);

  useEffect(() => {
    loadEvaluators();
  }, [loadEvaluators]);

  return {
    evaluators,
    loadingEvaluators,
    reloadEvaluators: loadEvaluators,
  };
}

function FinalDecisionModal({
  visible,
  submission,
  decision,
  onClose,
  onSubmitted,
}) {
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setComments(
        decision === 'APPROVE'
          ? 'Reviewed by FPGC and approved as the final decision.'
          : 'Reviewed by FPGC and rejected as the final decision.'
      );
    }
  }, [visible, decision]);

  const decisionLabel = decision === 'APPROVE' ? 'Approve' : 'Reject';

  const handleSubmit = async () => {
    if (!submission?.id) {
      Alert.alert('Missing submission', 'No submission selected.');
      return;
    }

    if (!comments.trim()) {
      Alert.alert('Required', 'Please add decision comments.');
      return;
    }

    try {
      setSubmitting(true);

      await submissionsApi.finalFPGCDecision(submission.id, {
        decision,
        comments: comments.trim(),
      });

      Alert.alert(
        decision === 'APPROVE' ? 'Approved' : 'Rejected',
        `The submission has been ${decision === 'APPROVE' ? 'approved' : 'rejected'}.`,
        [
          {
            text: 'OK',
            onPress: onSubmitted,
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Decision Failed',
        error?.message || 'Could not save final decision.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalCard}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>{decisionLabel} Submission</Text>

            <TouchableOpacity onPress={onClose} disabled={submitting}>
              <Ionicons name="close" size={24} color="#0D1B2A" />
            </TouchableOpacity>
          </View>

          <Text style={s.modalSubtitle}>
            {submission?.title || 'Selected submission'}
          </Text>

          <TextInput
            value={comments}
            onChangeText={setComments}
            placeholder="Add final decision comments..."
            placeholderTextColor="#9BA4B5"
            multiline
            textAlignVertical="top"
            editable={!submitting}
            style={s.textArea}
          />

          <TouchableOpacity
            style={[
              decision === 'APPROVE' ? s.approveBtn : s.rejectBtn,
              submitting && { opacity: 0.7 },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.approveBtnText}>{decisionLabel}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function SubmissionCard({ item, onApprove, onReject, onRefresh }) {
  const [openingDocument, setOpeningDocument] = useState(false);

  const canDecide =
    item.status === 'FORWARDED_TO_FPGC' &&
    typeof onApprove === 'function' &&
    typeof onReject === 'function';

  const canOpenDocument = !!item.documentId;
  const effectiveDeadline = item.extendedDueDate || item.dueDate || null;

  const handleOpenDocument = async () => {
    if (!item.documentId) {
      Alert.alert('No Document', 'This submission does not have a linked uploaded document.');
      return;
    }

    try {
      setOpeningDocument(true);
      await documentsApi.openDocument(item.documentId, item.document || item.title || 'document');
    } catch (error) {
      Alert.alert(
        'Could not open document',
        error?.message || 'Please try again.'
      );
    } finally {
      setOpeningDocument(false);
    }
  };

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <Text style={s.studentName}>{item.student.name}</Text>

        <View
          style={[
            s.statusPill,
            {
              backgroundColor: getStatusColor(item.status),
            },
          ]}
        >
          <Text style={s.statusPillText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>

      <Text style={s.infoText}>{item.student.course}</Text>

      <Text style={s.cardTitle} numberOfLines={2}>
        {item.title}
      </Text>

      <View style={s.docRow}>
        <View style={s.docIconBox}>
          <Ionicons name="document-attach-outline" size={20} color="#1E56A0" />
        </View>

        <View style={s.docInfo}>
          <Text style={s.docName} numberOfLines={1}>
            {item.document}
          </Text>
          <Text style={s.docSize}>{item.documentSize}</Text>
        </View>

        <TouchableOpacity
          style={[
            s.openDocBtn,
            (!canOpenDocument || openingDocument) && s.openDocBtnDisabled,
          ]}
          onPress={handleOpenDocument}
          disabled={!canOpenDocument || openingDocument}
        >
          {openingDocument ? (
            <ActivityIndicator size="small" color="#1E56A0" />
          ) : (
            <>
              <Ionicons
                name={canOpenDocument ? 'open-outline' : 'alert-circle-outline'}
                size={15}
                color={canOpenDocument ? '#1E56A0' : '#9BA4B5'}
              />
              <Text
                style={[
                  s.openDocText,
                  !canOpenDocument && {
                    color: '#9BA4B5',
                  },
                ]}
              >
                {canOpenDocument ? 'Open' : 'No File'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={s.metaRow}>
        <Ionicons name="calendar-outline" size={14} color="#6B7280" />
        <Text style={s.infoText}>Updated {formatDate(item.updatedAt)}</Text>
      </View>

      {effectiveDeadline && (
        <View style={s.metaRow}>
          <Ionicons name="time-outline" size={14} color="#6B7280" />
          <Text style={s.infoText}>Deadline {formatDate(effectiveDeadline)}</Text>
        </View>
      )}

      {effectiveDeadline && (
        <DeadlineExtensionControl
          submissionId={item.id}
          currentDeadlineText={formatDate(effectiveDeadline)}
          onSuccess={onRefresh}
        />
      )}

      {canDecide && (
        <View style={s.actionRow}>
          <TouchableOpacity style={s.rejectOutlineBtn} onPress={onReject}>
            <Ionicons name="close-outline" size={18} color="#EF4444" />
            <Text style={s.rejectOutlineText}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.approveSolidBtn} onPress={onApprove}>
            <Ionicons name="checkmark-outline" size={18} color="#fff" />
            <Text style={s.approveSolidText}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function ExternalAssignmentCard({
  item,
  evaluators,
  loadingEvaluators,
  onAssigned,
}) {
  const [selectedEvaluator, setSelectedEvaluator] = useState(null);
  const [showEvaluators, setShowEvaluators] = useState(false);
  const [comments, setComments] = useState('Assigned for external thesis evaluation.');
  const [assigning, setAssigning] = useState(false);
  const [openingDocument, setOpeningDocument] = useState(false);

  useEffect(() => {
    if (!selectedEvaluator && evaluators.length > 0) {
      setSelectedEvaluator(evaluators[0]);
    }
  }, [evaluators, selectedEvaluator]);

  const canAssign = ['FORWARDED_TO_FPGC', 'APPROVED'].includes(item.status);
  const canOpenDocument = !!item.documentId;

  const handleOpenDocument = async () => {
    if (!item.documentId) {
      Alert.alert('No Document', 'This submission does not have a linked uploaded document.');
      return;
    }

    try {
      setOpeningDocument(true);
      await documentsApi.openDocument(item.documentId, item.document || item.title || 'document');
    } catch (error) {
      Alert.alert(
        'Could not open document',
        error?.message || 'Please try again.'
      );
    } finally {
      setOpeningDocument(false);
    }
  };

  const handleAssign = () => {
    if (!selectedEvaluator?.id) {
      Alert.alert('Required', 'Please select an external evaluator.');
      return;
    }

    if (!canAssign) {
      Alert.alert(
        'Invalid State',
        `This submission is currently ${getStatusLabel(item.status)} and cannot be assigned.`
      );
      return;
    }

    Alert.alert(
      'Assign External Evaluator',
      `Assign ${selectedEvaluator.name} to externally evaluate "${item.title}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Assign',
          onPress: async () => {
            try {
              setAssigning(true);

              await submissionsApi.assignExternalEvaluator(item.id, {
                evaluator_id: selectedEvaluator.id,
                comments: comments.trim() || 'Assigned for external thesis evaluation.',
              });

              Alert.alert(
                'Assigned',
                'External evaluator assigned successfully.',
                [
                  {
                    text: 'OK',
                    onPress: onAssigned,
                  },
                ]
              );
            } catch (error) {
              Alert.alert(
                'Assignment Failed',
                error?.message || 'Could not assign external evaluator.'
              );
            } finally {
              setAssigning(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <Text style={s.studentName}>{item.student.name}</Text>

        <View
          style={[
            s.statusPill,
            {
              backgroundColor: getStatusColor(item.status),
            },
          ]}
        >
          <Text style={s.statusPillText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>

      <Text style={s.infoText}>{item.student.course}</Text>

      <Text style={s.cardTitle} numberOfLines={2}>
        {item.title}
      </Text>

      <View style={s.docRow}>
        <View style={s.docIconBox}>
          <Ionicons name="document-attach-outline" size={20} color="#1E56A0" />
        </View>

        <View style={s.docInfo}>
          <Text style={s.docName} numberOfLines={1}>
            {item.document}
          </Text>
          <Text style={s.docSize}>{item.documentSize}</Text>
        </View>

        <TouchableOpacity
          style={[
            s.openDocBtn,
            (!canOpenDocument || openingDocument) && s.openDocBtnDisabled,
          ]}
          onPress={handleOpenDocument}
          disabled={!canOpenDocument || openingDocument}
        >
          {openingDocument ? (
            <ActivityIndicator size="small" color="#1E56A0" />
          ) : (
            <>
              <Ionicons
                name={canOpenDocument ? 'open-outline' : 'alert-circle-outline'}
                size={15}
                color={canOpenDocument ? '#1E56A0' : '#9BA4B5'}
              />
              <Text
                style={[
                  s.openDocText,
                  !canOpenDocument && {
                    color: '#9BA4B5',
                  },
                ]}
              >
                {canOpenDocument ? 'Open' : 'No File'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text style={s.smallLabel}>External Evaluator</Text>

      <TouchableOpacity
        style={s.dropdown}
        onPress={() => setShowEvaluators((value) => !value)}
        disabled={assigning || loadingEvaluators || evaluators.length === 0}
      >
        <Text
          style={[
            s.dropdownText,
            !selectedEvaluator && {
              color: '#9BA4B5',
            },
          ]}
        >
          {loadingEvaluators
            ? 'Loading evaluators...'
            : selectedEvaluator?.name || 'Select external evaluator'}
        </Text>

        <Ionicons
          name={showEvaluators ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#6B7280"
        />
      </TouchableOpacity>

      {showEvaluators && (
        <View style={s.dropdownList}>
          {evaluators.length === 0 ? (
            <View style={s.dropdownEmpty}>
              <Text style={s.dropdownEmptyText}>No external evaluators found.</Text>
            </View>
          ) : (
            evaluators.map((evaluator) => {
              const selected = selectedEvaluator?.id === evaluator.id;
              const role = Array.isArray(evaluator.roles)
                ? evaluator.roles[0]
                : 'EXTERNAL_EVALUATOR';

              return (
                <TouchableOpacity
                  key={evaluator.id}
                  style={[s.dropdownItem, selected && s.dropdownItemActive]}
                  onPress={() => {
                    setSelectedEvaluator(evaluator);
                    setShowEvaluators(false);
                  }}
                  disabled={assigning}
                >
                  <View style={s.evaluatorAvatar}>
                    <Text style={s.evaluatorAvatarText}>{getInitials(evaluator.name)}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        s.dropdownItemText,
                        selected && { color: '#1E56A0', fontWeight: '800' },
                      ]}
                    >
                      {evaluator.name}
                    </Text>

                    <Text style={s.evaluatorMeta}>
                      {evaluator.email} · {formatLabel(role)}
                    </Text>
                  </View>

                  {selected && (
                    <Ionicons name="checkmark" size={18} color="#1E56A0" />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      <Text style={s.smallLabel}>Assignment Comments</Text>

      <TextInput
        value={comments}
        onChangeText={setComments}
        placeholder="Add assignment comments..."
        placeholderTextColor="#9BA4B5"
        multiline
        textAlignVertical="top"
        editable={!assigning}
        style={s.assignmentTextArea}
      />

      <TouchableOpacity
        style={[
          s.assignExternalBtn,
          (!canAssign || assigning || !selectedEvaluator) && { opacity: 0.65 },
        ]}
        onPress={handleAssign}
        disabled={!canAssign || assigning || !selectedEvaluator}
      >
        {assigning ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="person-add-outline" size={18} color="#fff" />
            <Text style={s.assignExternalText}>Assign External Evaluator</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

export function FPGCDashboard({ navigation }) {
  const { submissions, loading, refreshing, refresh } = useFPGCSubmissions();
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS_VALUE);

  const filteredSubmissions = useMemo(
    () => filterItemsByStatus(submissions, statusFilter, (item) => item.status),
    [statusFilter, submissions]
  );

  const pending = filteredSubmissions.filter((item) => item.status === 'FORWARDED_TO_FPGC');
  const approved = filteredSubmissions.filter((item) => item.status === 'APPROVED');
  const rejected = filteredSubmissions.filter((item) => item.status === 'REJECTED');
  const externalAssigned = filteredSubmissions.filter((item) => item.status === 'EXTERNAL_EVAL_ASSIGNED');
  const externalCompleted = filteredSubmissions.filter((item) => item.status === 'EXTERNAL_EVAL_COMPLETED');

  const cards = [
    {
      count: pending.length,
      label: 'Awaiting Final Decision',
      icon: 'document-text-outline',
      color: '#F59E0B',
      screen: 'FPGCAssignments',
      mode: 'decisions',
    },
    {
      count: approved.length,
      label: 'Approved',
      icon: 'checkmark-circle-outline',
      color: '#22C55E',
      screen: 'FPGCApplications',
    },
    {
      count: externalAssigned.length + externalCompleted.length,
      label: 'External Evaluation',
      icon: 'people-outline',
      color: '#7C3AED',
      screen: 'FPGCAssignments',
      mode: 'external',
    },
    {
      count: rejected.length,
      label: 'Rejected',
      icon: 'close-circle-outline',
      color: '#EF4444',
      screen: 'FPGCApplications',
    },
  ];

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#1E56A0" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <FPGCHeader title="Dashboard" navigation={navigation} />

      <ScrollView
        style={s.body}
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
        />

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
                  navigation.navigate(card.screen, card.mode ? { mode: card.mode } : undefined)
                }
              >
                <Text style={s.viewMore}>View More Info</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={s.semesterActionBtn}
          onPress={() => navigation.navigate('SemesterManagement')}
        >
          <Ionicons name="calendar-outline" size={20} color="#1E56A0" />
          <Text style={s.semesterActionText}>Manage Semesters</Text>
          <Ionicons name="chevron-forward" size={18} color="#1E56A0" />
        </TouchableOpacity>

        <Text style={s.sectionTitle}>Recent FPGC Items</Text>

        {submissions.slice(0, 3).map((item) => (
          <SubmissionCard key={item.id} item={item} onRefresh={refresh} />
        ))}

        {submissions.length === 0 && (
          <View style={s.emptyCard}>
            <Ionicons name="folder-open-outline" size={42} color="#9BA4B5" />
            <Text style={s.emptyTitle}>No submissions found</Text>
            <Text style={s.emptyText}>
              FPGC workflow items will appear here.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export function FPGCApplications({ navigation }) {
  const { submissions, loading, refreshing, refresh } = useFPGCSubmissions();
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS_VALUE);

  const filteredSubmissions = useMemo(
    () => filterItemsByStatus(submissions, statusFilter, (item) => item.status),
    [statusFilter, submissions]
  );

  const finalised = filteredSubmissions.filter((item) =>
    ['APPROVED', 'REJECTED', 'EXTERNAL_EVAL_ASSIGNED', 'EXTERNAL_EVAL_COMPLETED'].includes(item.status)
  );

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#1E56A0" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <FPGCHeader title="Applications" navigation={navigation} />

      <View style={s.listHeaderWrap}>
        <StatusFilterDropdown
          label="Submission Status"
          value={statusFilter}
          options={SUBMISSION_STATUS_FILTER_OPTIONS}
          onChange={setStatusFilter}
        />
      </View>

      <FlatList
        data={finalised}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        renderItem={({ item }) => (
          <SubmissionCard item={item} onRefresh={refresh} />
        )}
        ListEmptyComponent={
          <View style={s.emptyCard}>
            <Ionicons name="document-text-outline" size={42} color="#9BA4B5" />
            <Text style={s.emptyTitle}>No finalised applications</Text>
            <Text style={s.emptyText}>
              Approved, rejected, or externally assigned submissions will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

export function FPGCAssignments({ navigation, route }) {
  const { submissions, loading, refreshing, refresh, reload } = useFPGCSubmissions();
  const { evaluators, loadingEvaluators } = useExternalEvaluators();
  const [statusFilter, setStatusFilter] = useState(ALL_STATUS_VALUE);

  const initialMode = route?.params?.mode === 'external' ? 'external' : 'decisions';
  const [mode, setMode] = useState(initialMode);

  useEffect(() => {
    if (route?.params?.mode === 'external' || route?.params?.mode === 'decisions') {
      setMode(route.params.mode);
    }
  }, [route?.params?.mode]);

  const filteredSubmissions = useMemo(
    () => filterItemsByStatus(submissions, statusFilter, (item) => item.status),
    [statusFilter, submissions]
  );

  const pending = filteredSubmissions.filter((item) => item.status === 'FORWARDED_TO_FPGC');
  const externalCandidates = filteredSubmissions.filter((item) =>
    ['FORWARDED_TO_FPGC', 'APPROVED'].includes(item.status)
  );

  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [decision, setDecision] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openDecision = (item, selectedDecision) => {
    setSelectedSubmission(item);
    setDecision(selectedDecision);
    setModalVisible(true);
  };

  const closeDecision = () => {
    setModalVisible(false);
    setSelectedSubmission(null);
    setDecision(null);
  };

  const afterSubmitted = async () => {
    closeDecision();
    await reload();
  };

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#1E56A0" />
      </View>
    );
  }

  const data = mode === 'external' ? externalCandidates : pending;

  return (
    <View style={s.container}>
      <FPGCHeader
        title={mode === 'external' ? 'External Examiners' : 'Final Decisions'}
        navigation={navigation}
      />

      <View style={s.segmentWrap}>
        <TouchableOpacity
          style={[s.segmentButton, mode === 'decisions' && s.segmentButtonActive]}
          onPress={() => setMode('decisions')}
        >
          <Text style={[s.segmentText, mode === 'decisions' && s.segmentTextActive]}>
            Final Decisions
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.segmentButton, mode === 'external' && s.segmentButtonActive]}
          onPress={() => setMode('external')}
        >
          <Text style={[s.segmentText, mode === 'external' && s.segmentTextActive]}>
            External Examiners
          </Text>
        </TouchableOpacity>
      </View>

      <View style={s.listHeaderWrap}>
        <StatusFilterDropdown
          label="Submission Status"
          value={statusFilter}
          options={SUBMISSION_STATUS_FILTER_OPTIONS}
          onChange={setStatusFilter}
        />
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        ListHeaderComponent={
          <Text style={[s.sectionTitle, { marginBottom: 4 }]}> 
            {mode === 'external'
              ? 'Assign External Evaluator'
              : 'Submissions Awaiting FPGC Decision'}
          </Text>
        }
        renderItem={({ item }) =>
          mode === 'external' ? (
            <ExternalAssignmentCard
              item={item}
              evaluators={evaluators}
              loadingEvaluators={loadingEvaluators}
              onAssigned={reload}
            />
          ) : (
            <SubmissionCard
              item={item}
              onApprove={() => openDecision(item, 'APPROVE')}
              onReject={() => openDecision(item, 'REJECT')}
              onRefresh={reload}
            />
          )
        }
        ListEmptyComponent={
          <View style={s.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={42} color="#9BA4B5" />
            <Text style={s.emptyTitle}>
              {mode === 'external' ? 'No eligible submissions' : 'No pending decisions'}
            </Text>
            <Text style={s.emptyText}>
              {mode === 'external'
                ? 'Approved or FPGC-forwarded submissions eligible for external evaluation assignment will appear here.'
                : 'Submissions forwarded by FPGC-R will appear here.'}
            </Text>
          </View>
        }
      />

      <FinalDecisionModal
        visible={modalVisible}
        submission={selectedSubmission}
        decision={decision}
        onClose={closeDecision}
        onSubmitted={afterSubmitted}
      />
    </View>
  );
}

export function FPGCProfile({ navigation }) {
  const logout = useAuthStore((state) => state.logout);
  const authUser = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);

  const [signingOut, setSigningOut] = useState(false);

  const profile = {
    name: authUser?.name || 'FPGC User',
    email: authUser?.email || 'fpgc@nust.na',
    role: Array.isArray(roles) && roles.length > 0 ? roles[0] : 'FPGC',
    department: 'Faculty Postgraduate Committee',
    phone: '+264 61 207 2300',
  };

  const initials = profile.name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
      <FPGCHeader title="Profile" navigation={navigation} />

      <View style={s.avatarSection}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>

        <Text style={s.profileName}>{profile.name}</Text>

        <View style={s.rolePill}>
          <Text style={s.rolePillText}>{formatLabel(profile.role)}</Text>
        </View>
      </View>

      <View style={s.infoCard}>
        {[
          { icon: 'mail-outline', label: 'Email', value: profile.email },
          { icon: 'business-outline', label: 'Department', value: profile.department },
          { icon: 'call-outline', label: 'Phone', value: profile.phone },
        ].map((row, index, array) => (
          <View
            key={row.label}
            style={[s.infoRow, index < array.length - 1 && s.infoRowBorder]}
          >
            <Ionicons
              name={row.icon}
              size={20}
              color="#1E56A0"
              style={{ width: 28 }}
            />

            <View>
              <Text style={s.infoLabel}>{row.label}</Text>
              <Text style={s.infoValue}>{row.value}</Text>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[s.logoutBtn, signingOut && { opacity: 0.7 }]}
        onPress={handleLogout}
        disabled={signingOut}
      >
        {signingOut ? (
          <ActivityIndicator color="#EF4444" />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={s.logoutText}>Log Out</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

export function FPGCNotifications({ navigation }) {
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
        <ActivityIndicator size="large" color="#1E56A0" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <FPGCHeader title="Notifications" navigation={navigation} showBack />

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
                color={read ? '#6B7280' : '#1E56A0'}
              />

              <View style={s.notifBody}>
                <Text
                  style={[
                    s.notifMessage,
                    !read && { fontWeight: '600', color: '#0D1B2A' },
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
            <Text style={s.emptyText}>Workflow alerts will appear here.</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
  },
  header: {
    backgroundColor: '#0D1B2A',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  headerTitleCenter: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  headerIcons: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  body: { padding: 16 },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  statCard: {
    backgroundColor: '#fff',
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
  statBody: { flex: 1 },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: '#0D1B2A' },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 4,
  },
  semesterActionBtn: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  semesterActionText: { flex: 1, fontSize: 14, color: '#1E56A0', fontWeight: '800' },
  viewMore: { fontSize: 13, color: '#1E56A0', fontWeight: '500' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D1B2A',
    marginBottom: 10,
  },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 10,
  },
  studentName: { fontSize: 16, fontWeight: '600', color: '#0D1B2A', flex: 1 },
  statusPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  statusPillText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  infoText: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  cardTitle: { fontSize: 14, color: '#374151', lineHeight: 20, marginBottom: 8 },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  docIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: { flex: 1 },
  docName: { color: '#0D1B2A', fontSize: 13, fontWeight: '600' },
  docSize: { color: '#6B7280', fontSize: 12, marginTop: 2 },
  openDocBtn: {
    minWidth: 76,
    minHeight: 36,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  openDocBtnDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  openDocText: {
    color: '#1E56A0',
    fontSize: 12,
    fontWeight: '800',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  rejectOutlineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  rejectOutlineText: { color: '#EF4444', fontWeight: '800' },
  approveSolidBtn: {
    flex: 1,
    backgroundColor: '#1E56A0',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  approveSolidText: { color: '#fff', fontWeight: '800' },
  approveBtn: {
    backgroundColor: '#22C55E',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  rejectBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  approveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  emptyTitle: { color: '#0D1B2A', fontSize: 16, fontWeight: '700' },
  emptyText: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  avatarSection: { alignItems: 'center', paddingVertical: 28 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E56A0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0D1B2A',
    marginBottom: 8,
  },
  rolePill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  rolePillText: { fontSize: 13, color: '#1E56A0', fontWeight: '600' },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    paddingHorizontal: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  infoValue: { fontSize: 14, color: '#0D1B2A', fontWeight: '500' },
  logoutBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
  notifCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 14,
  },
  notifUnread: { borderLeftWidth: 4, borderLeftColor: '#1E56A0' },
  notifBody: { flex: 1 },
  notifMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 6,
  },
  notifTime: { fontSize: 12, color: '#9BA4B5' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 27, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: { color: '#0D1B2A', fontSize: 21, fontWeight: '800' },
  modalSubtitle: { color: '#6B7280', lineHeight: 20 },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    minHeight: 120,
    color: '#0D1B2A',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  segmentWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 16,
    marginBottom: 0,
    padding: 4,
    flexDirection: 'row',
    gap: 4,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#1E56A0',
  },
  segmentText: {
    color: '#6B7280',
    fontWeight: '800',
    fontSize: 12,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  listHeaderWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  smallLabel: {
    color: '#0D1B2A',
    fontWeight: '800',
    fontSize: 13,
    marginTop: 10,
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
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
  dropdownEmpty: { padding: 14, alignItems: 'center' },
  dropdownEmptyText: { color: '#6B7280', fontSize: 13 },
  evaluatorAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E56A0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evaluatorAvatarText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  evaluatorMeta: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  assignmentTextArea: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    minHeight: 86,
    color: '#0D1B2A',
    fontSize: 14,
    textAlignVertical: 'top',
  },
  assignExternalBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  assignExternalText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});