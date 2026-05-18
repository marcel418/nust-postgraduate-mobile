// src/screens/evaluator/EvaluatorScreens.js

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
import { documentsApi } from '../../api/documentsApi';
import { submissionsApi } from '../../api/submissionsApi';
import { useAuthStore } from '../../store/authStore';

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
      documentId: parsed.documentId || null,
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

function normalizeAssignment(item = {}) {
  const details = parseDescription(item.description);
  const state = item.current_state || item.workflow_state || 'UNKNOWN';

  return {
    id: item.id,
    raw: item,
    title: item.title || details.fileName || 'Assigned Submission',
    type: formatLabel(item.submission_type),
    status: state === 'UNDER_INTERNAL_EVAL' ? 'PENDING' : state,
    workflowState: state,
    document: details.fileName || item.title || 'Attached document',
    documentSize: details.fileSize || 'Metadata saved',
    documentId: details.documentId,
    documentMimeType: details.mimeType,
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
    deadline: item.due_at || item.updated_at || item.created_at,
    assignedAt: item.updated_at || item.created_at,
  };
}

function getStatusColor(status) {
  return (
    {
      PENDING: '#F59E0B',
      IN_PROGRESS: '#7C3AED',
      COMPLETED: '#22C55E',
      INTERNAL_EVAL_COMPLETED: '#22C55E',
      REVISIONS_REQUIRED: '#F97316',
      UNDER_INTERNAL_EVAL: '#F59E0B',
      UNKNOWN: '#6B7280',
    }[status] || '#6B7280'
  );
}

function getStatusLabel(status) {
  return (
    {
      PENDING: 'Pending',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
      UNDER_INTERNAL_EVAL: 'Pending',
      INTERNAL_EVAL_COMPLETED: 'Completed',
      REVISIONS_REQUIRED: 'Returned',
      UNKNOWN: 'Unknown',
    }[status] || formatLabel(status)
  );
}

function isEvaluationOpen(assignment) {
  return assignment?.workflowState === 'UNDER_INTERNAL_EVAL' || assignment?.status === 'PENDING';
}

// ─── Shared Header ───────────────────────────────────────────────────────────

function EvalHeader({ title, navigation, showBack = false }) {
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
        <TouchableOpacity onPress={() => navigation.navigate('EvalNotifications')}>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() =>
            navigation.navigate('EvalTabs', {
              screen: 'EvalProfile',
            })
          }
        >
          <Ionicons name="person-circle-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Data Hook ────────────────────────────────────────────────────────────────

function useEvaluatorAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAssignments = useCallback(async () => {
    try {
      const response = await submissionsApi.list();
      const items = response?.data?.items || response?.items || [];

      const normalized = items
        .map(normalizeAssignment)
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

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function EvaluatorDashboard({ navigation }) {
  const { assignments, loading, refreshing, refresh } = useEvaluatorAssignments();

  const assigned = assignments.length;
  const pending = assignments.filter((item) => item.status === 'PENDING').length;
  const completed = assignments.filter((item) =>
    ['COMPLETED', 'INTERNAL_EVAL_COMPLETED'].includes(item.status)
  ).length;

  const cards = [
    {
      count: assigned,
      label: 'Assigned Submissions',
      icon: 'document-text-outline',
      color: '#1E56A0',
    },
    {
      count: pending,
      label: 'Pending Evaluations',
      icon: 'time-outline',
      color: '#F59E0B',
    },
    {
      count: completed,
      label: 'Completed',
      icon: 'checkmark-circle-outline',
      color: '#22C55E',
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
      <EvalHeader title="Dashboard" navigation={navigation} />

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
                onPress={() => navigation.navigate('EvalEvaluations')}
              >
                <Text style={s.viewMore}>View More Info</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={s.sectionTitle}>Recent Assignments</Text>

        {assignments.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={42} color="#9BA4B5" />
            <Text style={s.emptyTitle}>No assignments yet</Text>
            <Text style={s.emptyText}>
              New internal evaluation tasks will appear here once assigned by HOD.
            </Text>
          </View>
        ) : (
          assignments.slice(0, 3).map((item) => (
            <TouchableOpacity
              key={item.id}
              style={s.card}
              onPress={() =>
                navigation.navigate('EvalProposalDetail', {
                  assignment: item,
                })
              }
            >
              <View style={s.cardTop}>
                <View style={s.typePill}>
                  <Text style={s.typePillText}>{item.type}</Text>
                </View>

                <View
                  style={[
                    s.statusPill,
                    {
                      backgroundColor: getStatusColor(item.status),
                    },
                  ]}
                >
                  <Text style={s.statusPillText}>
                    {getStatusLabel(item.status)}
                  </Text>
                </View>
              </View>

              <Text style={s.cardTitle} numberOfLines={2}>
                {item.title}
              </Text>

              <View style={s.cardMeta}>
                <Ionicons name="person-outline" size={13} color="#6B7280" />
                <Text style={s.cardMetaText}> {item.student.name}</Text>
                <Text style={s.cardMetaSep}>  ·  </Text>
                <Ionicons name="calendar-outline" size={13} color="#F59E0B" />
                <Text style={[s.cardMetaText, { color: '#F59E0B' }]}>
                  {' '}
                  {formatDate(item.deadline)}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// ─── Evaluations List ─────────────────────────────────────────────────────────

export function EvaluatorEvaluations({ navigation }) {
  const { assignments, loading, refreshing, refresh } = useEvaluatorAssignments();

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator size="large" color="#1E56A0" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <EvalHeader title="Evaluations" navigation={navigation} />

      <FlatList
        data={assignments}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() =>
              navigation.navigate('EvalProposalDetail', {
                assignment: item,
              })
            }
          >
            <View style={s.cardTop}>
              <View style={s.typePill}>
                <Text style={s.typePillText}>{item.type}</Text>
              </View>

              <View
                style={[
                  s.statusPill,
                  {
                    backgroundColor: getStatusColor(item.status),
                  },
                ]}
              >
                <Text style={s.statusPillText}>
                  {getStatusLabel(item.status)}
                </Text>
              </View>
            </View>

            <Text style={s.cardTitle} numberOfLines={2}>
              {item.title}
            </Text>

            <Text style={s.infoText}>
              {item.student.name} · {item.student.course}
            </Text>

            <View style={s.cardMeta}>
              <Ionicons name="calendar-outline" size={13} color="#F59E0B" />
              <Text style={[s.cardMetaText, { color: '#F59E0B' }]}>
                {' '}
                Deadline: {formatDate(item.deadline)}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={s.emptyCard}>
            <Ionicons name="document-text-outline" size={42} color="#9BA4B5" />
            <Text style={s.emptyTitle}>No evaluations assigned</Text>
            <Text style={s.emptyText}>
              Assigned internal evaluation tasks will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Evaluate Proposal ────────────────────────────────────────────────────────

export function EvaluatorProposalDetail({ route, navigation }) {
  const { assignment } = route.params;
  const canEvaluate = isEvaluationOpen(assignment);

  const [checklist, setChecklist] = useState({
    problemClarity: false,
    methodology: false,
    feasibility: false,
  });

  const [comments, setComments] = useState('');
  const [decision, setDecision] = useState(null);
  const [showDecisions, setShowDecisions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openingDocument, setOpeningDocument] = useState(false);

  const decisions = [
    {
      label: 'Approve',
      value: 'APPROVE',
    },
    {
      label: 'Return for Changes',
      value: 'RETURN',
    },
  ];

  const checkItems = [
    {
      key: 'problemClarity',
      label: 'Problem clarity',
    },
    {
      key: 'methodology',
      label: 'Methodology',
    },
    {
      key: 'feasibility',
      label: 'Feasibility',
    },
  ];

  const selectedDecisionLabel = useMemo(() => {
    return decisions.find((item) => item.value === decision)?.label || null;
  }, [decision]);

  const handleOpenDocument = async () => {
    if (!assignment?.documentId) {
      Alert.alert(
        'No Document',
        'This submission does not have a linked uploaded document.'
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

  const handleSubmit = () => {
    if (!canEvaluate) {
      Alert.alert(
        'Evaluation Closed',
        'This submission is no longer open for internal evaluation.'
      );
      return;
    }

    if (!decision) {
      Alert.alert('Required', 'Please select a decision.');
      return;
    }

    if (!comments.trim()) {
      Alert.alert('Required', 'Please add evaluation comments.');
      return;
    }

    Alert.alert(
      'Submit Evaluation',
      `Submit this evaluation as "${selectedDecisionLabel}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              setLoading(true);

              const checklistSummary = checkItems
                .map((item) => {
                  const status = checklist[item.key] ? 'Yes' : 'No';
                  return `${item.label}: ${status}`;
                })
                .join('\n');

              const finalComments = [
                comments.trim(),
                '',
                'Checklist:',
                checklistSummary,
              ].join('\n');

              await submissionsApi.completeInternalEvaluation(assignment.id, {
                decision,
                comments: finalComments,
              });

              Alert.alert(
                'Submitted',
                'Your evaluation has been submitted successfully.',
                [
                  {
                    text: 'OK',
                    onPress: () =>
                      navigation.navigate('EvalTabs', {
                        screen: 'EvalHome',
                      }),
                  },
                ]
              );
            } catch (error) {
              Alert.alert(
                'Submission Failed',
                error?.message || 'Could not submit evaluation. Try again.'
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={s.container}>
      <EvalHeader title="Evaluate Submission" navigation={navigation} showBack />

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.card}>
          <View style={s.cardTop}>
            <View style={s.typePill}>
              <Text style={s.typePillText}>{assignment.type}</Text>
            </View>

            <View
              style={[
                s.statusPill,
                {
                  backgroundColor: getStatusColor(assignment.status),
                },
              ]}
            >
              <Text style={s.statusPillText}>
                {getStatusLabel(assignment.status)}
              </Text>
            </View>
          </View>

          <Text style={s.cardTitle}>{assignment.title}</Text>
          <Text style={s.infoText}>
            {assignment.student.name} · {assignment.student.course}
          </Text>
          <Text style={s.infoText}>
            Reporting period: {assignment.reportingPeriod}
          </Text>
        </View>

        <View style={s.card}>
          <View style={s.docRow}>
            <View style={s.docIconBox}>
              <Ionicons
                name="document-attach-outline"
                size={22}
                color="#1E56A0"
              />
            </View>

            <View style={s.docInfo}>
              <Text style={s.docName} numberOfLines={2}>
                {assignment.document}
              </Text>
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
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={s.openBtnText}>
                  {assignment?.documentId ? 'Open' : 'No File'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {!!assignment.studentComments && (
          <View style={s.card}>
            <Text style={s.sectionTitle}>Student Comments</Text>
            <Text style={s.commentText}>{assignment.studentComments}</Text>
          </View>
        )}

        {!canEvaluate && (
          <View style={s.infoNotice}>
            <Ionicons name="information-circle-outline" size={18} color="#1E56A0" />
            <Text style={s.infoNoticeText}>
              This submission is no longer open for internal evaluation.
            </Text>
          </View>
        )}

        <View style={s.card}>
          <Text style={s.sectionTitle}>Checklist</Text>

          {checkItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[s.checkRow, checklist[item.key] && s.checkRowActive]}
              onPress={() =>
                setChecklist((previous) => ({
                  ...previous,
                  [item.key]: !previous[item.key],
                }))
              }
              disabled={!canEvaluate || loading}
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
                    color: '#0D1B2A',
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
          <Text style={s.sectionTitle}>Evaluation Comments</Text>

          <TextInput
            style={s.textArea}
            placeholder="Add evaluation comments..."
            placeholderTextColor="#9BA4B5"
            value={comments}
            onChangeText={setComments}
            multiline
            numberOfLines={4}
            editable={canEvaluate && !loading}
          />
        </View>

        <View style={s.card}>
          <Text style={s.sectionTitle}>Decision</Text>

          <TouchableOpacity
            style={[s.dropdown, (!canEvaluate || loading) && { opacity: 0.65 }]}
            onPress={() => setShowDecisions(!showDecisions)}
            disabled={!canEvaluate || loading}
          >
            <Text style={[s.dropdownText, !decision && { color: '#9BA4B5' }]}>
              {selectedDecisionLabel || 'Select decision'}
            </Text>

            <Ionicons
              name={showDecisions ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#6B7280"
            />
          </TouchableOpacity>

          {showDecisions && (
            <View style={s.dropdownList}>
              {decisions.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    s.dropdownItem,
                    decision === item.value && s.dropdownItemActive,
                  ]}
                  onPress={() => {
                    setDecision(item.value);
                    setShowDecisions(false);
                  }}
                  disabled={loading}
                >
                  <Text
                    style={[
                      s.dropdownItemText,
                      decision === item.value && {
                        color: '#1E56A0',
                        fontWeight: '700',
                      },
                    ]}
                  >
                    {item.label}
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
              (!canEvaluate || loading) && { opacity: 0.6 },
            ]}
            onPress={handleSubmit}
            disabled={!canEvaluate || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={s.submitBtnText}>
                {canEvaluate ? 'Submit Evaluation' : 'Evaluation Closed'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export function EvaluatorProfile({ navigation }) {
  const logout = useAuthStore((state) => state.logout);
  const authUser = useAuthStore((state) => state.user);
  const roles = useAuthStore((state) => state.roles);

  const [signingOut, setSigningOut] = useState(false);

  const profile = {
    name: authUser?.name || 'Internal Evaluator User',
    email: authUser?.email || 'internal@nust.na',
    role:
      Array.isArray(roles) && roles.length > 0
        ? roles[0]
        : 'INTERNAL_EVALUATOR',
    department: 'Postgraduate Evaluation Committee',
    phone: '+264 61 207 2000',
  };

  const getInitials = (fullName) => {
    if (!fullName) return 'IE';

    return fullName
      .split(' ')
      .filter(Boolean)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatRole = (role) => {
    if (!role) return 'Internal Evaluator';

    return String(role)
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            setSigningOut(true);
            await logout();
          } catch (error) {
            Alert.alert(
              'Sign Out Failed',
              error?.message || 'Could not sign out. Please try again.'
            );
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={profileStyles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={profileStyles.hero}>
          <View style={profileStyles.heroTopRow}>
            <Text style={profileStyles.heroTitle}>Profile</Text>

            <TouchableOpacity
              onPress={() => navigation.navigate('EvalNotifications')}
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          <View style={profileStyles.avatar}>
            <Text style={profileStyles.avatarText}>
              {getInitials(profile.name)}
            </Text>
          </View>

          <Text style={profileStyles.heroName}>{profile.name}</Text>
          <Text style={profileStyles.heroRole}>{formatRole(profile.role)}</Text>
        </View>

        <View style={profileStyles.body}>
          <View style={profileStyles.card}>
            <View style={profileStyles.infoRow}>
              <Ionicons name="person-outline" size={18} color="#6B7280" />
              <View style={profileStyles.infoContent}>
                <Text style={profileStyles.infoLabel}>Full Name</Text>
                <Text style={profileStyles.infoValue}>{profile.name}</Text>
              </View>
            </View>

            <View style={profileStyles.divider} />

            <View style={profileStyles.infoRow}>
              <Ionicons name="mail-outline" size={18} color="#6B7280" />
              <View style={profileStyles.infoContent}>
                <Text style={profileStyles.infoLabel}>Email</Text>
                <Text style={profileStyles.infoValue}>{profile.email}</Text>
              </View>
            </View>

            <View style={profileStyles.divider} />

            <View style={profileStyles.infoRow}>
              <Ionicons name="briefcase-outline" size={18} color="#6B7280" />
              <View style={profileStyles.infoContent}>
                <Text style={profileStyles.infoLabel}>Role</Text>
                <Text style={profileStyles.infoValue}>
                  {formatRole(profile.role)}
                </Text>
              </View>
            </View>

            <View style={profileStyles.divider} />

            <View style={profileStyles.infoRow}>
              <Ionicons name="business-outline" size={18} color="#6B7280" />
              <View style={profileStyles.infoContent}>
                <Text style={profileStyles.infoLabel}>Department</Text>
                <Text style={profileStyles.infoValue}>
                  {profile.department}
                </Text>
              </View>
            </View>

            <View style={profileStyles.divider} />

            <View style={profileStyles.infoRow}>
              <Ionicons name="call-outline" size={18} color="#6B7280" />
              <View style={profileStyles.infoContent}>
                <Text style={profileStyles.infoLabel}>Phone</Text>
                <Text style={profileStyles.infoValue}>{profile.phone}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[
              profileStyles.signOutBtn,
              signingOut && profileStyles.disabledButton,
            ]}
            onPress={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? (
              <ActivityIndicator color="#EF4444" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                <Text style={profileStyles.signOutText}>Sign Out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Notifications ────────────────────────────────────────────────────────────

export function EvaluatorNotifications({ navigation }) {
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
      <EvalHeader title="Notifications" navigation={navigation} showBack />

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
                    !read && {
                      fontWeight: '600',
                      color: '#0D1B2A',
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
            <Ionicons
              name="notifications-off-outline"
              size={42}
              color="#9BA4B5"
            />
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

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  scrollContent: { padding: 16, gap: 12, paddingBottom: 40 },
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
  viewMore: { fontSize: 13, color: '#1E56A0', fontWeight: '500' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0D1B2A',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 0,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  typePill: {
    backgroundColor: '#0D1B2A',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  typePillText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  statusPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  statusPillText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D1B2A',
    lineHeight: 22,
    marginBottom: 8,
  },
  infoText: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
  commentText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  cardMeta: { flexDirection: 'row', alignItems: 'center' },
  cardMetaText: { fontSize: 13, color: '#6B7280' },
  cardMetaSep: { color: '#D1D5DB' },
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
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  infoNotice: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#1E56A0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoNoticeText: {
    color: '#1E56A0',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
    fontWeight: '600',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  checkRowActive: { borderColor: '#22C55E', backgroundColor: '#F0FDF4' },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBoxActive: { backgroundColor: '#22C55E', borderColor: '#22C55E' },
  checkLabel: { fontSize: 14, color: '#6B7280', flex: 1 },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#0D1B2A',
    minHeight: 100,
    textAlignVertical: 'top',
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
  dropdownText: { fontSize: 14, color: '#0D1B2A' },
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
  dropdownItemActive: { backgroundColor: '#EFF6FF' },
  dropdownItemText: { fontSize: 14, color: '#0D1B2A' },
  submitBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
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
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  emptyTitle: {
    color: '#0D1B2A',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});

const profileStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  hero: {
    backgroundColor: '#0D1B2A',
    paddingTop: 56,
    paddingBottom: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  heroTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold' },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1E56A0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    marginBottom: 8,
  },
  avatarText: { color: '#FFFFFF', fontSize: 32, fontWeight: 'bold' },
  heroName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  heroRole: { color: '#9BA4B5', fontSize: 15, textAlign: 'center' },
  body: { padding: 16, gap: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: '#6B7280', marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#0D1B2A', fontWeight: '500' },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginBottom: 32,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  signOutText: { color: '#EF4444', fontSize: 16, fontWeight: '600' },
  disabledButton: { opacity: 0.7 },
});
