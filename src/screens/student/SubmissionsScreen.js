// src/screens/student/SubmissionsScreen.js

import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
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
import { api } from '../../api/http';

import { documentsApi } from '../../api/documentsApi';

const REPORTING_PERIODS = ['Today', 'This Week', 'This Month', 'Last 30 Days'];

const getStatusColor = (status) => {
  switch (status) {
    case 'APPROVED':
      return '#22C55E';
    case 'SUBMITTED':
      return '#7C3AED';
    case 'REVISIONS_REQUIRED':
      return '#F59E0B';
    case 'REJECTED':
      return '#EF4444';
    case 'DRAFT':
      return '#6B7280';
    default:
      return '#6B7280';
  }
};

const getStatusLabel = (status) => {
  if (!status) return 'Unknown';

  if (status === 'SUBMITTED') return 'In Review';

  return String(status)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatFileSize = (bytes) => {
  if (!bytes) return 'Unknown size';

  const mb = bytes / (1024 * 1024);

  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`;
  }

  return `${(bytes / 1024).toFixed(1)} KB`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';

  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
};

const parseDescription = (description) => {
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
};

export default function SubmissionsScreen({ navigation }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [comments, setComments] = useState('');
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const submissionCountText = useMemo(() => {
    if (submissions.length === 1) return '1 submission';
    return `${submissions.length} submissions`;
  }, [submissions.length]);

  const loadSubmissions = useCallback(async () => {
    try {
      const response = await api.get('/submissions');
      const items = response?.data?.items || [];

      const sorted = [...items].sort(
        (a, b) =>
          new Date(b.created_at || b.updated_at || 0) -
          new Date(a.created_at || a.updated_at || 0)
      );

      setSubmissions(sorted);
    } catch (error) {
      Alert.alert(
        'Could not load submissions',
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

  const handleRefresh = () => {
    setRefreshing(true);
    loadSubmissions();
  };

  const resetForm = () => {
    setSelectedPeriod('');
    setComments('');
    setSelectedFile(null);
    setPeriodDropdownOpen(false);
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const file = result.assets?.[0];

      if (!file) {
        Alert.alert('No File Selected', 'Please select a valid PDF or DOCX file.');
        return;
      }

      setSelectedFile({
        name: file.name,
        size: file.size || 0,
        sizeLabel: formatFileSize(file.size),
        uri: file.uri,
        mimeType: file.mimeType || 'application/octet-stream',
      });
    } catch (error) {
      Alert.alert('Error', 'Could not open file picker.');
    }
  };

  const uploadDocument = async () => {
    if (!selectedFile) return null;

    const formData = new FormData();

    formData.append('file', {
      uri: selectedFile.uri,
      name: selectedFile.name,
      type: selectedFile.mimeType,
    });

    const response = await api.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response?.data?.document || null;
  };

  const createAndSubmitProgressReport = async ({ document }) => {
    const descriptionPayload = {
      reportingPeriod: selectedPeriod,
      comments: comments.trim(),
      fileName: selectedFile?.name || document?.original_filename || '',
      fileSize: selectedFile?.sizeLabel || '',
      mimeType: selectedFile?.mimeType || document?.mime_type || '',
      documentId: document?.id || null,
    };

    const createResponse = await api.post('/submissions', {
      submission_type: 'PROGRESS_REPORT',
      title: selectedFile?.name || 'Progress Report',
      description: JSON.stringify(descriptionPayload),
    });

    const submission = createResponse?.data?.submission;

    if (!submission?.id) {
      throw new Error('Submission was created, but no submission ID was returned.');
    }

    await api.post(`/submissions/${submission.id}/submit`, {});

    return submission;
  };

  const handleSubmit = async () => {
    if (!selectedPeriod) {
      Alert.alert('Missing Field', 'Please select a reporting period.');
      return;
    }

    if (!selectedFile) {
      Alert.alert('Missing File', 'Please select a PDF or DOCX file to upload.');
      return;
    }

    setSubmitting(true);

    try {
      const document = await uploadDocument();

      await createAndSubmitProgressReport({
        document,
      });

      resetForm();
      setUploadModalVisible(false);

      await loadSubmissions();

      Alert.alert('Success', 'Progress report submitted successfully.');
    } catch (error) {
      Alert.alert(
        'Submission Failed',
        error?.message || 'Failed to submit. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDocument = async (documentId, fileName) => {
  if (!documentId) {
    Alert.alert('No Document', 'This submission does not have a linked document.');
    return;
  }

  try {
    await documentsApi.openDocument(documentId, fileName);
  } catch (error) {
    Alert.alert(
      'Could not open document',
      error?.message || 'Please try again.'
    );
  }
};

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="document-text-outline" size={34} color="#1E56A0" />
      </View>

      <Text style={styles.emptyTitle}>No submissions yet</Text>
      <Text style={styles.emptyText}>
        Upload your first progress report to start the workflow.
      </Text>

      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => setUploadModalVisible(true)}
      >
        <Ionicons name="add" size={18} color="#FFFFFF" />
        <Text style={styles.emptyButtonText}>Upload Report</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSubmissionCard = (item) => {
    const details = parseDescription(item.description);
    const status = item.current_state || item.workflow_state || 'DRAFT';
    const statusColor = getStatusColor(status);
    const displayFileName = details.fileName || item.title || 'Progress Report';
    const displayFileSize = details.fileSize || 'Metadata saved';

    return (
      <View key={item.id} style={styles.card}>
        <View style={styles.fileRow}>
          <View style={styles.fileIcon}>
            <Ionicons name="document-text" size={24} color="#1E56A0" />
          </View>

          <View style={styles.fileInfo}>
            <Text style={styles.fileName} numberOfLines={1}>
              {displayFileName}
            </Text>

            <Text style={styles.fileMeta}>
              {displayFileSize} · {formatDate(item.created_at)}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusColor,
              },
            ]}
          >
            <Text style={styles.statusText}>{getStatusLabel(status)}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={14} color="#6B7280" />
          <Text style={styles.detailText}>
            Period: {details.reportingPeriod || 'N/A'}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="layers-outline" size={14} color="#6B7280" />
          <Text style={styles.detailText}>
            Version: {item.current_version_no || 1}
          </Text>
        </View>

        {!!details.comments && (
          <View style={styles.detailRow}>
            <Ionicons name="chatbubble-outline" size={14} color="#6B7280" />
            <Text style={styles.detailText} numberOfLines={2}>
              {details.comments}
            </Text>
          </View>
        )}

        {details.documentId && (
  <TouchableOpacity
    style={styles.openDocumentBtn}
    onPress={() => handleOpenDocument(details.documentId, displayFileName)}
  >
    <Ionicons name="open-outline" size={16} color="#1E56A0" />
    <Text style={styles.openDocumentText}>Open Uploaded File</Text>
  </TouchableOpacity>
)}

        {status !== 'DRAFT' && (
          <View style={styles.workflowNotice}>
            <Ionicons name="lock-closed-outline" size={14} color="#1E56A0" />
            <Text style={styles.workflowNoticeText}>
              This submission is now in workflow.
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
        <Text style={styles.loadingText}>Loading submissions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Submissions"
        navigation={navigation}
        rightAction={
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => setUploadModalVisible(true)}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.uploadBtnText}>Upload</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.body}
        contentContainerStyle={[
          styles.bodyContent,
          submissions.length === 0 && styles.emptyBodyContent,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.count}>{submissionCountText}</Text>

        {submissions.length === 0
          ? renderEmptyState()
          : submissions.map(renderSubmissionCard)}
      </ScrollView>

      <Modal
        visible={uploadModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          if (!submitting) {
            setUploadModalVisible(false);
          }
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                if (!submitting) {
                  setUploadModalVisible(false);
                }
              }}
              disabled={submitting}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Upload Progress Report</Text>

            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              style={styles.fileUploadArea}
              onPress={handlePickFile}
              disabled={submitting}
            >
              {selectedFile ? (
                <View style={styles.selectedFileRow}>
                  <Ionicons name="document-text" size={32} color="#1E56A0" />

                  <View style={{ flex: 1 }}>
                    <Text style={styles.selectedFileName} numberOfLines={2}>
                      {selectedFile.name}
                    </Text>
                    <Text style={styles.selectedFileSize}>
                      {selectedFile.sizeLabel}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => setSelectedFile(null)}
                    disabled={submitting}
                  >
                    <Ionicons name="close-circle" size={22} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={42} color="#6B7280" />
                  <Text style={styles.uploadAreaText}>
                    Tap to upload file: PDF/DOCX only
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Reporting Period</Text>

            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setPeriodDropdownOpen(!periodDropdownOpen)}
              disabled={submitting}
            >
              <Text
                style={[
                  styles.dropdownText,
                  !selectedPeriod && { color: '#9BA4B5' },
                ]}
              >
                {selectedPeriod || 'Select'}
              </Text>

              <Ionicons
                name={periodDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={20}
                color="#6B7280"
              />
            </TouchableOpacity>

            {periodDropdownOpen && (
              <View style={styles.dropdownOptions}>
                {REPORTING_PERIODS.map((period) => (
                  <TouchableOpacity
                    key={period}
                    style={styles.dropdownOption}
                    onPress={() => {
                      setSelectedPeriod(period);
                      setPeriodDropdownOpen(false);
                    }}
                    disabled={submitting}
                  >
                    <Text style={styles.dropdownOptionText}>{period}</Text>

                    {selectedPeriod === period && (
                      <Ionicons name="checkmark" size={16} color="#1E56A0" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.fieldLabel}>Comments</Text>

            <TextInput
              style={styles.textArea}
              placeholder="Type here..."
              placeholderTextColor="#9BA4B5"
              multiline
              numberOfLines={4}
              value={comments}
              onChangeText={setComments}
              textAlignVertical="top"
              editable={!submitting}
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.submitBtnText}>Submit</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
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
  uploadBtn: {
    backgroundColor: '#1E56A0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
  },
  bodyContent: {
    paddingTop: 16,
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
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 36,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    color: '#0D1B2A',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  emptyButton: {
    backgroundColor: '#1E56A0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 10,
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
    fontWeight: '600',
    color: '#0D1B2A',
  },
  fileMeta: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  workflowNotice: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#1E56A0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  workflowNoticeText: {
    fontSize: 13,
    color: '#1E56A0',
    flex: 1,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  modalHeader: {
    backgroundColor: '#0D1B2A',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 12,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
  },
  modalBodyContent: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  fileUploadArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 12,
  },
  uploadAreaText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  selectedFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  selectedFileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  selectedFileSize: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0D1B2A',
    marginBottom: 8,
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dropdownText: {
    fontSize: 15,
    color: '#0D1B2A',
  },
  dropdownOptions: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 16,
    overflow: 'hidden',
  },
  dropdownOption: {
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownOptionText: {
    fontSize: 15,
    color: '#374151',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#0D1B2A',
    minHeight: 120,
    marginBottom: 20,
  },
  submitBtn: {
    backgroundColor: '#1E56A0',
    borderRadius: 30,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    marginHorizontal: 40,
    flexDirection: 'row',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.7,
  },

  openDocumentBtn: {
  backgroundColor: '#EFF6FF',
  borderRadius: 10,
  paddingVertical: 11,
  paddingHorizontal: 12,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  borderWidth: 1,
  borderColor: '#BFDBFE',
},
openDocumentText: {
  color: '#1E56A0',
  fontSize: 13,
  fontWeight: '700',
},
});

