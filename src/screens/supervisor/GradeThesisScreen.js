// src/screens/supervisor/GradeThesisScreen.js

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
import { submissionsApi } from '../../api/submissionsApi';
import { documentsApi } from '../../api/documentsApi';
import {
  formatDate,
  getInitials,
  getStatusColor,
  getStatusLabel,
  normalizeSubmission,
} from './supervisorHelpers';

export default function GradeThesisScreen({ navigation }) {
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [grade, setGrade] = useState('');
  const [comments, setComments] = useState('Supervisor thesis grade submitted.');
  const [submitting, setSubmitting] = useState(false);
  const [opening, setOpening] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTheses = useCallback(async () => {
    try {
      const response = await submissionsApi.list();
      const items = response?.data?.items || response?.items || [];

      const theses = items
        .map(normalizeSubmission)
        .filter((item) => item.type === 'THESIS')
        .sort(
          (a, b) =>
            new Date(b.updatedAt || 0) -
            new Date(a.updatedAt || 0)
        );

      setSubmissions(theses);

      if (!selectedSubmission && theses.length > 0) {
        setSelectedSubmission(theses[0]);
      } else if (selectedSubmission) {
        const refreshed = theses.find((item) => item.id === selectedSubmission.id);
        if (refreshed) setSelectedSubmission(refreshed);
      }
    } catch (error) {
      Alert.alert(
        'Could not load theses',
        error?.message || 'Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSubmission]);

  useEffect(() => {
    loadTheses();
  }, [loadTheses]);

  const canGrade = selectedSubmission?.state === 'SUBMITTED';

  const pendingCount = useMemo(
    () => submissions.filter((item) => item.state === 'SUBMITTED').length,
    [submissions]
  );

  const refresh = () => {
    setRefreshing(true);
    loadTheses();
  };

  const handleOpenDocument = async () => {
    if (!selectedSubmission?.documentId) {
      Alert.alert('No Document', 'This thesis does not have a linked uploaded document.');
      return;
    }

    try {
      setOpening(true);
      await documentsApi.openDocument(
        selectedSubmission.documentId,
        selectedSubmission.document
      );
    } catch (error) {
      Alert.alert(
        'Could not open document',
        error?.message || 'Please try again.'
      );
    } finally {
      setOpening(false);
    }
  };

  const handleSubmitGrade = () => {
    if (!selectedSubmission?.id) {
      Alert.alert('Missing Thesis', 'Please select a thesis first.');
      return;
    }

    if (!canGrade) {
      Alert.alert(
        'Invalid State',
        `This thesis is currently ${getStatusLabel(selectedSubmission.state)}.`
      );
      return;
    }

    if (!grade.trim()) {
      Alert.alert('Missing Grade', 'Please enter a grade.');
      return;
    }

    const gradeNum = Number(grade);

    if (Number.isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100) {
      Alert.alert('Invalid Grade', 'Grade must be between 0 and 100.');
      return;
    }

    Alert.alert(
      'Submit Grade',
      `Submit ${gradeNum}% for "${selectedSubmission.title}" and approve it to the next stage?`,
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

              const finalComments = [
                `Supervisor thesis grade: ${gradeNum}%.`,
                comments.trim() || 'Supervisor thesis grade submitted.',
              ].join('\n');

              await submissionsApi.approve(selectedSubmission.id, finalComments);

              Alert.alert('Success', 'Grade submitted and thesis approved successfully.', [
                {
                  text: 'OK',
                  onPress: async () => {
                    setGrade('');
                    await loadTheses();
                  },
                },
              ]);
            } catch (error) {
              Alert.alert(
                'Submit Failed',
                error?.message || 'Failed to submit grade. Please try again.'
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
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
      <AppHeader
        title="Grade Thesis"
        navigation={navigation}
        rightAction={
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>{pendingCount}</Text>
          </View>
        }
      />

      <ScrollView
        style={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        {submissions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={48} color="#9BA4B5" />
            <Text style={styles.emptyTitle}>No thesis submissions</Text>
            <Text style={styles.emptyText}>
              Thesis submissions assigned to you will appear here.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Select Thesis</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.thesisPicker}
            >
              {submissions.map((item) => {
                const selected = selectedSubmission?.id === item.id;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.thesisChip, selected && styles.thesisChipActive]}
                    onPress={() => setSelectedSubmission(item)}
                    disabled={submitting}
                  >
                    <Text
                      style={[
                        styles.thesisChipText,
                        selected && styles.thesisChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {item.student.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {selectedSubmission && (
              <>
                <View style={styles.card}>
                  <View style={styles.studentTop}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {getInitials(selectedSubmission.student.name)}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{selectedSubmission.student.name}</Text>
                      <Text style={styles.studentMeta}>
                        Student No: {selectedSubmission.student.studentNumber}
                      </Text>
                      <Text style={styles.studentMeta}>
                        Course: {selectedSubmission.student.course}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: getStatusColor(selectedSubmission.state),
                      },
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {getStatusLabel(selectedSubmission.state)}
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
                        {selectedSubmission.document}
                      </Text>
                      <Text style={styles.fileSize}>
                        {selectedSubmission.documentSize} · Version {selectedSubmission.version}
                      </Text>
                      <Text style={styles.fileSize}>
                        Updated {formatDate(selectedSubmission.updatedAt)}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.openBtn,
                      (!selectedSubmission.documentId || opening) && styles.disabledButton,
                    ]}
                    onPress={handleOpenDocument}
                    disabled={!selectedSubmission.documentId || opening}
                  >
                    {opening ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name={selectedSubmission.documentId ? 'open-outline' : 'document-outline'}
                          size={17}
                          color="#FFFFFF"
                        />
                        <Text style={styles.openBtnText}>
                          {selectedSubmission.documentId ? 'Open Thesis File' : 'No File Linked'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.card}>
                  <Text style={styles.fieldLabel}>Grade Input</Text>

                  <View style={styles.gradeRow}>
                    <TextInput
                      style={styles.gradeInput}
                      placeholder="Enter a value between 0-100"
                      placeholderTextColor="#9BA4B5"
                      keyboardType="numeric"
                      value={grade}
                      onChangeText={setGrade}
                      maxLength={3}
                      editable={canGrade && !submitting}
                    />
                    <Text style={styles.percentSymbol}>%</Text>
                  </View>
                </View>

                <View style={styles.card}>
                  <Text style={styles.fieldLabel}>Comments</Text>

                  <TextInput
                    style={styles.textArea}
                    placeholder="Add grading comments..."
                    placeholderTextColor="#9BA4B5"
                    multiline
                    numberOfLines={4}
                    value={comments}
                    onChangeText={setComments}
                    textAlignVertical="top"
                    editable={canGrade && !submitting}
                  />
                </View>

                <View style={styles.card}>
                  <Text style={styles.fieldLabel}>Submit Grade</Text>

                  <TouchableOpacity
                    style={[
                      styles.submitBtn,
                      (!canGrade || submitting) && styles.disabledButton,
                    ]}
                    onPress={handleSubmitGrade}
                    disabled={!canGrade || submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitBtnText}>
                        {canGrade ? 'Submit Grade' : 'Thesis Not Open for Grading'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
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
  sectionTitle: {
    color: '#0D1B2A',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 10,
  },
  thesisPicker: {
    gap: 8,
    paddingBottom: 12,
  },
  thesisChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: 180,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  thesisChipActive: {
    backgroundColor: '#1E56A0',
    borderColor: '#1E56A0',
  },
  thesisChipText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 13,
  },
  thesisChipTextActive: {
    color: '#FFFFFF',
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
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
  },
  gradeInput: {
    flex: 1,
    fontSize: 15,
    color: '#0D1B2A',
  },
  percentSymbol: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6B7280',
  },
  textArea: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#0D1B2A',
    minHeight: 120,
  },
  submitBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  disabledButton: {
    opacity: 0.65,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    color: '#0D1B2A',
    fontSize: 17,
    fontWeight: '800',
  },
  emptyText: {
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
